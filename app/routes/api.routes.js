const router = require("express").Router();
const authRoutes = require("express").Router();
const mediaUpload = require("../utilities/media_upload");
var admin = require('firebase-admin');
let Users = require("../models/users.model");
let jwt = require("jsonwebtoken");
var serviceAccount = require("../tagtap-firebase-adminsdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//const adminController = require('../controllers/admin.controller');
const offerTypesController = require("../controllers/offer-types.controller");
const markerTypesController = require("../controllers/marker-types.controller");
const areaListsController = require("../controllers/area-list.controller");
const notificationController = require("../controllers/notifications.controller");
const usersController = require("../controllers/users.controller");
const userCoinDetailsController = require("../controllers/user-coin-details.controller");
const sponsorsController = require("../controllers/sponsors.controller");
const packagesController = require("../controllers/packages.controller");
const offersController = require("../controllers/offers.controller");
const setupController = require("../controllers/setup.controller");
const dashboardController = require("../controllers/dashboard.controller");
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
          // user.AreaId = AreaId;
          // user.YearOfBirth = YearOfBirth;
          // user.PostCode = PostCode;
          // user.Gender = req.body.Gender;
          user.ContactNumber = req.body.ContactNumber;
          user.PurchasePackage = req.body.PurchasePackage || false;
          user.PurchasePackageExpired = req.body.PurchasePackageExpired || true;
          user.PackageDate = req.body.PackageDate || "",
          user.PackageExpiryDate = req.body.PackageExpiryDate || ""

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

// userCoinDetails (view)
authRoutes.route("/users/system-leader-board").get(userCoinDetailsController.list);
authRoutes.route("/users/system-leader-board-areaid").post(userCoinDetailsController.listByArea);
authRoutes.route("/users/list-all-active").get(userCoinDetailsController.listAllActive);
authRoutes.route("/users/list-all-users").get(userCoinDetailsController.listAllUser);
authRoutes.route("/users/export-excel").get(userCoinDetailsController.exportExcel);


// Packages:
authRoutes.route("/packages").get(packagesController.list);
authRoutes.route("/packages").post(packagesController.add);
authRoutes.route("/packages/update").post(packagesController.update);
authRoutes.route("/packages/delete").post(packagesController.delete);

// Dashboard:
authRoutes.route("/dashboard/statsAdmin").get(dashboardController.statsAdmin);
authRoutes
  .route("/dashboard/statsSponsor")
  .get(dashboardController.statsSponsors);

// Delete Wallet:
router.route("/danger/walletClear67").get(usersController.deleteWallet);



//@Umer Package purchase
authRoutes.route("/users/purchase-package").post(usersController.purchasePackage);

//module.exports = router;


router.route("/offers/hold-offer").post(offersController.holdOffer);

module.exports = {
  apiRoutes: router,
  authRoutes: authRoutes,
};
