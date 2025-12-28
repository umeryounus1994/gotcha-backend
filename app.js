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
var moment = require('moment'); // require
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

// Auto-expire prizes after 24 hours
async function checkAndExpirePrizes() {
  try {
    const twentyFourHoursAgo = moment().subtract(24, 'hours').toDate();
    
    // Find prizes that are still Active (not claimed), not deleted, and were dropped more than 24 hours ago
    const expiredPrizes = await Prizes.find({
      Status: 'Active',
      IsActive: true,
      IsDeleted: false,
      ClaimedBy: null, // Only expire unclaimed prizes
      DropDate: { $lte: twentyFourHoursAgo }
    });

    for (const prize of expiredPrizes) {
      // Check if a Prize Pool Data entry already exists for this expiration (avoid duplicates)
      const existingEntry = await PrizePoolData.findOne({
        PrizeEntryId: prize._id,
        EventType: '24 Hour Timer Ended'
      });

      if (existingEntry) {
        // Already processed, skip
        continue;
      }

      // Update prize status
      prize.Status = 'Expired';
      await prize.save();

      // Create Prize Pool Data entry for "24 Hour Timer Ended" event
      const now = moment();
      const prizePoolEntry = new PrizePoolData();
      prizePoolEntry.Date = now.toDate();
      prizePoolEntry.Time = now.format('HH:mm:ss');
      prizePoolEntry.PrizeId = prize.PrizeId;
      prizePoolEntry.PrizeDescription = prize.PrizeDescription;
      prizePoolEntry.Value = prize.PrizeValue;
      prizePoolEntry.From = 'Gotcha System';
      prizePoolEntry.To = 'Gotcha HQ';
      prizePoolEntry.EventType = '24 Hour Timer Ended';
      prizePoolEntry.Status = 'Active';
      prizePoolEntry.Notes = '24 Hour Timer Ended - Prize expired automatically';
      prizePoolEntry.UserId = null; // Unclaimed prize
      prizePoolEntry.PrizeEntryId = prize._id;
      
      // Preserve promotional period from original entry if exists
      const originalEntry = await PrizePoolData.findOne({ 
        PrizeEntryId: prize._id,
        EventType: 'Created'
      });
      if (originalEntry && originalEntry.PromotionalPeriod) {
        prizePoolEntry.PromotionalPeriod = originalEntry.PromotionalPeriod;
      }
      
      await prizePoolEntry.save();
      
      console.log(`Prize ${prize.PrizeId} expired after 24 hours`);
    }

    if (expiredPrizes.length > 0) {
      console.log(`Auto-expired ${expiredPrizes.length} prize(s) after 24 hours`);
    }
  } catch (error) {
    console.error("Error in checkAndExpirePrizes:", error);
  }
}

function startPrizeExpireInterval() {
  checkAndExpirePrizes().finally(() => {
    setTimeout(startPrizeExpireInterval, 3600000); // Check every hour
  });
}

startPrizeExpireInterval();

