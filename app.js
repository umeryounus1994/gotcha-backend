// Import: Dependencies:
let express = require("express");
let mongoose = require("mongoose");
let path = require("path");
var cookieParser = require('cookie-parser');
let cors = require("cors");
let Constants = require("./app/app.constants");
let Token = require("./app/token");
var logger = require('morgan');
var multer = require('multer');
var upload = multer();
var OffersHeld = require('./app/models/offer-held.model.js');
var OffersClaimedModel = require('./app/models/offer-claimed.model.js');
var moment = require('moment'); // require
moment().format(); 
// global.CronJob = require('./app/cron.js');

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
    console.log(heldOffers)

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
    setTimeout(startInterval, 3600000); // 1 minute
  });
}

startInterval();

