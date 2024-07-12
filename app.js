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
var offersClaimedModel = require('./app/models/offer-claimed.model.js');
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

offersClaimedModel.updateMany({Status: "pending"}).then((offers) => {
}).catch((err) => {
console.log("Error updating offers: ", err);
});
