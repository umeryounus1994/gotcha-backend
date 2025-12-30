// Import: Dependencies:
let express = require("express");
let mongoose = require("mongoose");
let path = require("path");
var cookieParser = require('cookie-parser');
let cors = require("cors");
let Constants = require("./app/app.constants");
var logger = require('morgan');
var multer = require('multer');
var OffersHeld = require('./app/models/offer-held.model.js');
var OffersClaimedModel = require('./app/models/offer-claimed.model.js');
var Prizes = require('./app/models/prizes.model.js');
var PrizePoolData = require('./app/models/prize-pool-data.model.js');
var moment = require('moment-timezone'); // require
moment().format(); 
global.CronJob = require('./app/cron.js');

// Import: Routes
let routes = require("./app/routes/api.routes");

// MongoDB
mongoose
  .connect(Constants.Mongo.Connection, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected.");
  })
  .catch((err) => console.log(err));

// Initialise the app
let app = express();

app.use(cors());
app.use(logger('dev'));
// app.use(upload.array()); 

app.use(express.json({limit: '250mb', extended: true}));
app.use(express.urlencoded({limit: '250mb', extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

app.get("/", function (req, res) {
  res.sendFile(path.resolve("public/index.html"));
});

// Use Api routes in the App
// app.use('/api', apiRoutes);
app.use("/api", routes.authRoutes);
// app.use("/api", Token.checkToken, routes.apiRoutes);
app.use("/api", routes.apiRoutes);

app.use((req, res, next) => {
  res.status(404).send("404 error the page resource was not found!");
});

// Setup server port
var port = process.env.PORT || Constants.Port;
app.listen(port, function () {
  console.log("Running Services on port " + port);
});



async function checkAndUpdateOffer() {
  try {
    const heldOffers = await OffersHeld.find({ Status: 'pending' }).sort({ CreationTimestamp: 1 });

    for (const heldOffer of heldOffers) {
      const timeDiff = moment().diff(moment(heldOffer.CreationTimestamp), 'hours');

      if (timeDiff >= 24) {
        heldOffer.Status = 'claimed';
        await heldOffer.save();

        const findOffersClaimedModel = await OffersClaimedModel.findOne({
          OfferId: heldOffer.OfferId,
          ClaimedBy: heldOffer.UserId
        });

        if (findOffersClaimedModel) {
          findOffersClaimedModel.Status = "requested";
          await findOffersClaimedModel.save();
          console.log('claimed');
        }
      }
    }
  } catch (error) {
    console.error("Error in checkAndUpdateOffer:", error);
  }
}
function startInterval() {
  checkAndUpdateOffer().finally(() => {
    setTimeout(startInterval, 3600000); // 1 hour
  });
}

startInterval();

// Check for month changes and rollback prizes to new month (using AEST timezone)
async function checkAndRollbackPrizes() {
  try {
    // Find all active, unclaimed prizes
    const activePrizes = await Prizes.find({
      Status: 'Active',
      IsActive: true,
      IsDeleted: false,
      ClaimedBy: null // Only check unclaimed prizes
    });

    let rolledBackCount = 0;
    const nowAEST = moment().tz('Australia/Sydney');
    const currentMonthAEST = nowAEST.month();
    const currentYearAEST = nowAEST.year();

    for (const prize of activePrizes) {
      // Check if we're in a different month/year than when the prize was dropped (using AEST)
      const prizeDropDateAEST = moment(prize.DropDate).tz('Australia/Sydney');
      const prizeDropMonth = prizeDropDateAEST.month();
      const prizeDropYear = prizeDropDateAEST.year();

      // If we're in a different month/year, rollback (re-activate) with new month's promotional period
      if (currentMonthAEST !== prizeDropMonth || currentYearAEST !== prizeDropYear) {
        // Check if a rollback entry already exists for this month to avoid duplicates
        const monthStartAEST = nowAEST.clone().startOf('month');
        const monthEndAEST = nowAEST.clone().endOf('month');
        
        const existingRollbackEntry = await PrizePoolData.findOne({
          PrizeEntryId: prize._id,
          EventType: 'Created',
          Date: {
            $gte: monthStartAEST.toDate(),
            $lte: monthEndAEST.toDate()
          }
        });

        if (existingRollbackEntry) {
          // Already rolled back this month, skip
          continue;
        }

        // Re-activate prize with new month's promotional period
        prize.Status = 'Active';
        prize.DropDate = nowAEST.clone().startOf('day').toDate(); // Reset to today in AEST
        prize.DropTime = nowAEST.format('HH:mm:ss');
        await prize.save();

        // Create new "Created" event with new month's promotional period
        const promoStart = monthStartAEST.clone().add(1, 'second').format('D MMM YYYY h:mm:ss a');
        const promoEnd = monthEndAEST.clone().subtract(1, 'second').format('D MMM YYYY h:mm:ss a');
        const timezone = nowAEST.isDST() ? 'AEDT' : 'AEST';
        
        const prizePoolEntry = new PrizePoolData();
        prizePoolEntry.Date = nowAEST.toDate();
        prizePoolEntry.Time = nowAEST.format('HH:mm:ss');
        prizePoolEntry.PrizeId = prize.PrizeId;
        prizePoolEntry.PrizeDescription = prize.PrizeDescription;
        prizePoolEntry.Value = prize.PrizeValue;
        prizePoolEntry.From = 'Gotcha System';
        prizePoolEntry.To = 'Map';
        prizePoolEntry.EventType = 'Created';
        prizePoolEntry.Status = 'Active';
        prizePoolEntry.Notes = `Rolled back to new month - ${promoStart} - ${promoEnd} ${timezone}`;
        prizePoolEntry.UserId = null;
        prizePoolEntry.PrizeEntryId = prize._id;
        prizePoolEntry.PromotionalPeriod = `${promoStart} - ${promoEnd} ${timezone}`;
        await prizePoolEntry.save();

        rolledBackCount++;
        console.log(`Prize ${prize.PrizeId} rolled back to new month: ${promoStart} - ${promoEnd} ${timezone}`);
      }
    }

    if (rolledBackCount > 0) {
      console.log(`Checked ${activePrizes.length} prize(s): ${rolledBackCount} rolled back to new month`);
    }
  } catch (error) {
    console.error("Error in checkAndRollbackPrizes:", error);
  }
}

function startPrizeRollbackInterval() {
  checkAndRollbackPrizes().finally(() => {
    setTimeout(startPrizeRollbackInterval, 3600000); // Check every hour
  });
}

startPrizeRollbackInterval();

