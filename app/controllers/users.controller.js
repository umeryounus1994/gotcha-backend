let Users = require("../models/users.model");
let UserCoins = require("../models/user-coins.model");
let Offers = require("../models/offers.model");
let OffersClaimedModel = require('../models/offer-claimed.model');
const PackagesModel = require("../models/packages.model");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const uploadProfilePicture = require("../utilities/uploaders/profile-image.uploader");
const mediaUpload = require("../utilities/media_upload");

let mailer = require("../utilities/mailer");

let jwt = require("jsonwebtoken");
let Constants = require("../app.constants");
let EmailAccount = require("../utilities/account");
const moment = require('moment')
const momenttz = require('moment-timezone');

momenttz.tz.setDefault('Australia/Brisbane');

// Login:
exports.login = function (req, res) {
  var Email = req.body.Email;
  var Password = req.body.Password;

  Users.findOne({ Email: Email.toLowerCase().trim() }, function (err, user) {
    if (err) res.send(err);
    else {
      if (user) {
        var userPassword = user.Password;

        bcrypt.compare(Password, userPassword, async function (err, matched) {
          if (matched) {
            if (user.IsActive) {
              var usercoins = await UserCoins.findOne({ UserId: user._id });
              var currDate = momenttz();
              var PurchasePackageExpired = false;
              if(user.PackageExpiryDate && user.PackageExpiryDate != ""){
                var cDate = momenttz(user.PackageExpiryDate);
                if(cDate < currDate){
                  PurchasePackageExpired = false
                } else {
                  PurchasePackageExpired = true;
                }
              }
              let userData = {
                Id: user._id,
                Name: user.FullName,
                ContactNumber: user.ContactNumber,
                Email: user.Email,
                AccountNumber: user.AccountNumber,
                BSB: user.BSB,
                // ETHAddress: user.ETHAddress,
                // YearOfBirth: user.YearOfBirth,
                // PostCode: user.PostCode,
                // Gender: user.Gender,
                ProfilePicture: user?.ProfilePicture,
                PurchasePackage: user?.PurchasePackage,
                PurchasePackageExpired: PurchasePackageExpired,
                HeldCoins: usercoins?.HeldCoins || 0
              };

              let token = jwt.sign(userData, Constants.JWT.secret, {
                expiresIn: "10d", // expires in 10 days
              });

              res.json({
                success: true,
                message: "Welcome Back!",
                data: userData,
                token: token,
              });
            } else {
              res.json({
                success: false,
                message: "Account suspended, please contact administrator.",
                data: null,
              });
            }
          } else {
            res.json({
              success: false,
              message: "Incorrect Password",
              data: null,
            });
          }
        });
      } else {
        res.json({
          success: false,
          message: "User Not Registered",
          data: null,
        });
      }
    }
  });
};

// Signup:
exports.signup = function (req, res) {
  var FullName = req.body.FullName;
  var Email = req.body.Email.toLowerCase().trim();
  var Password = req.body.Password;
  var AreaId = req.body.AreaId;
  var YearOfBirth = req.body.YearOfBirth;
  var PostCode = req.body.PostCode;
  var Gender = req.body.Gender;
  var ContactNumber = req.body.ContactNumber;

  Users.findOne({ Email: Email }, function (err, exist) {
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
          data: Email,
        });
      } else {
        //Hasing Pass:
        bcrypt.hash(Password, saltRounds, function (err, hash) {
          //Register User:
          var user = new Users();
          user.FullName = FullName;
          user.Email = Email.toLowerCase().trim();
          user.Password = hash;
          user.AreaId = AreaId;
          user.YearOfBirth = YearOfBirth;
          user.PostCode = PostCode;
          user.Gender = Gender;
          user.ContactNumber = ContactNumber;

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
                ETHAddress: null,
                ProfilePicture: null,
                AreaId: user.AreaId,
                YearOfBirth: user.YearOfBirth,
                PostCode: user.PostCode,
                Gender: user.Gender,
              };

              if (user.ProfilePicture) {
                userData.ProfilePicture =
                  req.protocol +
                  "://" +
                  req.headers.host +
                  "/uploads/profile/" +
                  user.ProfilePicture;
              }

              let token = jwt.sign(userData, Constants.JWT.secret, {
                expiresIn: "10d", // expires in 10 days
              });

              console.log("New User Registered.");
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
};


module.exports.updateUserProfile = async (useerId, userForm, options, callback) => {
	var query = {_id: useerId};
	Users.findOneAndUpdate(query, userForm, options, callback);
}

// Get All Notification User 
module.exports.getAllNotificationUser = (callback) => {
	Users.find({Token: {$ne: ""}, IsDeleted: false, IsActive: true},callback);
}

module.exports.saveWatchadCoins = function (req, res) {
  const { UserId, action } = req.body;
  const COIN_VALUE = 200000; // Fixed value for each watched ad

  if (!UserId || !action) {
    return res.status(400).json({
      success: false,
      message: "UserId and action are required",
      data: null
    });
  }

  // Find existing user
  UserCoins.findOne({ UserId: UserId }, function (err, userData) {
    if (err) {
      return res.json({
        success: false,
        message: "Server Error",
        data: err
      });
    }

    if (!userData) {
      var userCoints = new UserCoins();
      userCoints.UserId = UserId;
      userCoints.HeldCoins = COIN_VALUE;
      userCoints.save();
      res.json({
        success: true,
        message: "Coins added successfully",
        data: {
          HeldCoins: COIN_VALUE
        }
      });
    }

    if (action === 'add') {
      // Add coins for watching ad
      userData.HeldCoins = (userData.HeldCoins || 0) + COIN_VALUE;
      
      userData.save(function (err, updatedUser) {
        if (err) {
          return res.json({
            success: false,
            message: "Error saving coins",
            data: err
          });
        }

        res.json({
          success: true,
          message: "Coins added successfully",
          data: {
            HeldCoins: updatedUser.HeldCoins
          }
        });
      });
    } else if (action === 'deduct') {
      // Check if user has enough coins
      if ((userData.HeldCoins || 0) < COIN_VALUE) {
        return res.json({
          success: false,
          message: "Insufficient coins",
          data: null
        });
      }

      // Deduct coins
      userData.HeldCoins = (userData.HeldCoins || 0) - COIN_VALUE;
      
      userData.save(function (err, updatedUser) {
        if (err) {
          return res.json({
            success: false,
            message: "Error deducting coins",
            data: err
          });
        }

        res.json({
          success: true,
          message: "Coins deducted successfully",
          data: {
            HeldCoins: updatedUser.HeldCoins
          }
        });
      });
    } else {
      res.json({
        success: false,
        message: "Invalid action. Use 'add' or 'deduct'",
        data: null
      });
    }
  });
};

exports.updateProfile = function (req, res) {

  // uploadProfilePicture(req, res, function (err) {
  //   if (err) {
  //     res.json({
  //       success: false,
  //       message: "Server error, try again later.",
  //       data: err,
  //     });
  //   }
    var Id = req.body.Id;
    //console.log("body ",req.body)
    Users.findOne({ _id: Id }, function (err, user) {
      if (err) {
        res.json({
          success: false,
          message: "Validation Error",
          data: err,
        });
      } else {
        if (user) {
          var selection = { _id: Id };

          var updatedData = {};

          let userData = {
            Id: user._id,
            Name: user.FullName,
            ContactNumber: user.ContactNumber,
            Email: user.Email,
            ETHAddress: user.ETHAddress,
            ProfilePicture: null,
          };

          // if (req.file) {
          //   updatedData.ProfilePicture = req.file.filename;

          //   userData.ProfilePicture =
          //     "https://" +
          //     req.headers.host +
          //     "/uploads/profile/" +
          //     user.ProfilePicture;
          // }

          // if(req.files && req.files.ProfilePicture){
          //   updatedData.ProfilePicture = req.files.ProfilePicture[0].location;
          // }

          if (req.body.ETHAddress) {
            updatedData.ETHAddress = req.body.ETHAddress;
            userData.ETHAddress = req.body.ETHAddress;
          }

          if (req.body.Name) {
            updatedData.FullName = req.body.Name;
            userData.Name = req.body.Name;
          }

          Users.updateOne(selection, updatedData, function callback(errr, doc) {
            if (errr) {
              res.json({
                success: false,
                message: "Validation Error",
                data: errr,
              });
            } else {
              console.log("User Profile Updated.");
              res.json({
                success: true,
                message: "Successfully Updated!",
                data: userData,
              });
            }
          });
        } else {
          res.json({
            success: false,
            message: "No User Found",
            data: null,
          });
        }
      }
    });
  // });
};

exports.wallet = function (req, res) {
  var UserId = req.query.UserId;
  var query = { ClaimedBy: UserId };
  var selection = {
    __v: 0,
    IsActive: 0,
    ClaimedBy: 0,
    Location: 0,
  };

  if (UserId) {
    OffersClaimedModel.find(query, selection, function (err, data) {
      if (err) {
        res.json({
          success: false,
          message: "Server Error",
          data: err,
        });
      } else {
        if (data.length == 0) {
          res.json({
            success: true,
            message: "No Records Found.",
            data: null,
          });
        } else {
          let vouchers = [];
          let cryptocurrency = [];
          let other = [];
          let rating = [];
          let collectibles = [];
          let walletOffers = [];

          data.forEach((offer) => {

              let temp = {
                SponsorId: offer.OfferedBy?._id || "",
                SponsorName: offer.OfferedBy?.BusinessName || "",
                SponsorLogo: offer.OfferedBy?.BusinessLogo || "",
                SponsorNumber: offer.OfferedBy?.ContactNumber || "",
                OfferType: offer?.Type?.Name || "",
                OfferId: offer?._id || "",
                OfferValue: offer?.Value || 0,
                OfferLink: offer?.Link || "",
                OfferName: offer?.Name || "",
                OfferEmail: offer?.Email || "",
                OfferIcon: offer?.Icon || "",
                OfferStatus: offer?.Status || "",
                OfferSettled: offer?.IsSettled || false,
                CreationTimestamp: offer?.CreationTimestamp || ""
              };
  
              walletOffers.push(temp);


            // if (offer.Type._id == '5ecc44d56867c03a18c5f344') {
            //   other.push(temp);
            // }
            // if (offer.Type._id == "5ec43bd29ff6134be84d7dab") {
            //   vouchers.push(temp);
            // }
            // if (offer.Type._id == "5ec43c5cce2b0f59a0d874e0") {
            //   cryptocurrency.push(temp);
            // }
            // if (offer.Type._id == "5f9325294e59085014dad9ec") {
            //   rating.push(temp);
            // }
            // if (offer.Type._id == "5ec43c3dce2b0f59a0d874df") {
            //   collectibles.push(temp);
            // }
          });

          // var wallet = {
          //   Other: other,
          //   Vouchers: vouchers,
          //   Cryptocurrency: cryptocurrency,
          //   Rating: rating,
          //   Collectibles: collectibles,
          // };

          res.json({
            success: true,
            message: "Wallet Record Fetched.",
            data: walletOffers,
          });
        }
      }
    })
      .populate({
        path: "OfferedBy",
        select: ["_id", "BusinessName", "BusinessLogo", "ContactNumber"],
      })
      .populate({
        path: "Type",
        select: ["Name"],
      });
  } else {
    res.json({
      success: false,
      message: "Invalid Params",
      data: [],
    });
  }
};

exports.walletByCurrentDate = function (req, res) {
  var UserId = req.query.UserId;
  const today = moment().startOf('day')
  var query = { 
    ClaimedBy: UserId, 
    CreationTimestamp: { 
      $gte: today.toDate(), 
      $lte: moment(today).endOf('day').toDate()
    } 
  };

  console.log("query ",query)
  var selection = {
    __v: 0,
    IsActive: 0,
    ClaimedBy: 0,
    Location: 0,
  };

  if (UserId) {
    OffersClaimedModel.find(query, selection, function (err, data) {
      if (err) {
        res.json({
          success: false,
          message: "Server Error",
          data: err,
        });
      } else {
        if (data.length == 0) {
          res.json({
            success: true,
            message: "No Records Found.",
            data: null,
          });
        } else {
          let vouchers = [];
          let cryptocurrency = [];
          let other = [];
          let rating = [];
          let collectibles = [];
          let walletOffers = [];

          data.forEach((offer) => {
              let temp = {
                SponsorId: offer.OfferedBy._id,
                SponsorName: offer.OfferedBy.BusinessName,
                SponsorLogo: offer.OfferedBy.BusinessLogo,
                SponsorNumber: offer.OfferedBy.ContactNumber,
                OfferType: offer.Type.Name,
                OfferId: offer._id,
                OfferValue: offer.Value || 0,
                OfferLink: offer.Link,
                OfferName: offer.Name,
                OfferEmail: offer.Email,
                OfferIcon: offer.Icon,
                CreationTimestamp: offer.CreationTimestamp
              };
  
              walletOffers.push(temp);


            // if (offer.Type._id == '5ecc44d56867c03a18c5f344') {
            //   other.push(temp);
            // }
            // if (offer.Type._id == "5ec43bd29ff6134be84d7dab") {
            //   vouchers.push(temp);
            // }
            // if (offer.Type._id == "5ec43c5cce2b0f59a0d874e0") {
            //   cryptocurrency.push(temp);
            // }
            // if (offer.Type._id == "5f9325294e59085014dad9ec") {
            //   rating.push(temp);
            // }
            // if (offer.Type._id == "5ec43c3dce2b0f59a0d874df") {
            //   collectibles.push(temp);
            // }
          });

          // var wallet = {
          //   Other: other,
          //   Vouchers: vouchers,
          //   Cryptocurrency: cryptocurrency,
          //   Rating: rating,
          //   Collectibles: collectibles,
          // };

          res.json({
            success: true,
            message: "Wallet Record Fetched.",
            data: walletOffers,
          });
        }
      }
    })
      .populate({
        path: "OfferedBy",
        select: ["_id", "BusinessName", "BusinessLogo", "ContactNumber"],
      })
      .populate({
        path: "Type",
        select: ["Name"],
      });
  } else {
    res.json({
      success: false,
      message: "Invalid Params",
      data: null,
    });
  }
};
exports.getSingleUserDetails = function (req, res) {
  var UserId = req.body.UserId;
  var query = { 
    _id: UserId
  };

  if (UserId) {
    Users.findOne(query, function (err, data) {
      if (err) {
        res.json({
          success: false,
          message: "Server Error",
          data: err,
        });
      } else {
        var currDate = momenttz();
           if(data.PackageExpiryDate){
                var cDate = momenttz(data.PackageExpiryDate);
                if(cDate < currDate){
                  data.PurchasePackageExpired = false
                } else {
                  data.PurchasePackageExpired = true;
                }
              } else {
                data.PurchasePackageExpired = false;
              }
        res.json({
          success: true,
          message:" Record Found.",
          data: data,
        });
      }
    });
  } else {
    res.json({
      success: false,
      message: "Invalid Params",
      data: null,
    });
  }
};

exports.updateLocation = function (req, res) {
  var Id = req.body.Id;
  var Latitude = req.body.Latitude;
  var Longitude = req.body.Longitude;
  var selection = { _id: Id };

  var location = {
    type: "Point",
    coordinates: [parseFloat(Longitude), parseFloat(Latitude)],
  };

  var updatedData = { Location: location, LocationTimestamp: new Date() };
  Users.update(selection, updatedData, function callback(errr, doc) {
    if (errr) {
      res.json({
        success: false,
        message: "Validation Error",
        data: errr,
      });
    } else {
      console.log("User Location Updated.");
      res.json({
        success: true,
        message: "Successfully Updated!",
        data: doc,
      });
    }
  });
};

exports.list = function (req, res) {
  var query = {};
  var selection = {
    __v: 0,
  };
  Users.find(query, selection, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: "Server Error",
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: data.length + " Records Found.",
        data: data,
      });
    }
  });
};

exports.updateStatus = function (req, res) {
  var Id = req.body.Id;
  var IsActive = req.body.IsActive;
  var IsDeleted = req.body.IsDeleted;
  var selection = { _id: Id };
  var updatedData = { IsActive: IsActive, IsDeleted: IsDeleted};
  Users.update(selection, updatedData, function callback(errr, doc) {
    if (errr) {
      res.json({
        success: false,
        message: "Validation Error",
        data: errr,
      });
    } else {
      console.log("User Updated.");
      res.json({
        success: true,
        message: "Successfully Updated!",
        data: doc,
      });
    }
  });
};

exports.delete = function (req, res) {
  var Id = req.body.Id;
  var selection = { _id: Id };
  Users.remove(selection, function callback(err, doc) {
    if (err) {
      res.json({
        success: false,
        message: "Validation Error",
        data: err,
      });
    } else {
      console.log("User Deleted.");
      res.json({
        success: true,
        message: "Successfully Deleted!",
        data: doc,
      });
    }
  });
};

exports.forgetPassword = function (req, res) {
  var Email = req.body.Email;

  Users.findOne({ Email: Email }, function (err, user) {
    if (err) res.send(err);
    else {
      if (user) {
        var userId = user._id;
        var userFullName = user.FullName;

        var newPassword = "changeme" + Math.floor(Math.random() * 10000);

        //Hasing Pass:
        bcrypt.hash(newPassword, saltRounds, function (err, hash) {
          if (err) {
            res.json({
              success: false,
              message: "Validation Error",
              data: err,
            });
          } else {
            var selection = { _id: userId };
            var updatedData = { Password: hash };
            Users.updateOne(
              selection,
              updatedData,
              function callback(errr, doc) {
                if (errr) {
                  res.json({
                    success: false,
                    message: "Validation Error",
                    data: errr,
                  });
                } else {
                  EmailAccount.sendEmail(Email, newPassword, userFullName)
                  res.json({
                    success: true,
                    message:
                      "New password has been sent to your email address.",
                    data: null,
                  });
                }
              }
            );
          }
        });
      } else {
        res.json({
          success: false,
          message: "No User Found",
          data: null,
        });
      }
    }
  });
};

exports.updatePassword = function (req, res) {
  var UserId = req.body.UserId;
  var OldPassword = req.body.OldPassword;
  var NewPassword = req.body.NewPassword;

  var selection = { _id: UserId };

  Users.findOne(selection, function (err, user) {
    if (err) res.send(err);
    else {
      if (user) {
        var currentPassword = user.Password;

        // Chacking Password:
        bcrypt.compare(OldPassword, currentPassword, function (err, matched) {
          if (matched) {
            //Hasing Pass:
            bcrypt.hash(NewPassword, saltRounds, function (err, hash) {
              var updatedData = { Password: hash };
              Users.updateOne(
                selection,
                updatedData,
                function callback(errr, doc) {
                  if (errr) {
                    res.json({
                      success: false,
                      message: "Validation Error",
                      data: errr,
                    });
                  } else {
                    console.log("User Password Updated.");
                    res.json({
                      success: true,
                      message: "Password Updated.",
                      data: null,
                    });
                  }
                }
              );
            });
          } else {
            res.json({
              success: false,
              message: "Incorrect Old Password",
              data: null,
            });
          }
        });
      } else {
        res.json({
          success: false,
          message: "No User Found",
          data: null,
        });
      }
    }
  });
};

exports.deleteWallet = function (req, res) {
  var UserId = req.query.UserId;
  var query = { ClaimedBy: UserId };

  if (UserId) {
    Offers.deleteMany(query, function (err, data) {
      if (err) {
        res.json({
          success: false,
          message: "Server Error",
          data: err,
        });
      } else {
        console.log("Wallet Removed!");
        res.json({
          success: true,
          message: "Deleted",
          data: data,
        });
      }
    });
  } else {
    res.json({
      success: false,
      message: "Invalid Params",
      data: null,
    });
  }
};

exports.socialLogin = function (req, res) {
  var Email = req.body.Email;
  var Name = req.body.Name;

  Users.findOne({ Email: Email }, function (err, user) {
    if (err) {
      res.json({
        success: false,
        message: "Validation Error",
        data: err,
      });
    } else {
      if (user) {
        if (user.IsActive) {
          var currDate = momenttz();
          var PurchasePackageExpired = false;
           if(user.PackageExpiryDate){
                var cDate = momenttz(user.PackageExpiryDate);
                if(cDate < currDate){
                  PurchasePackageExpired = false
                } else {
                  PurchasePackageExpired = true;
                }
              }
          let userData = {
            Id: user._id,
            Name: user.FullName,
            ContactNumber: user.ContactNumber,
            Email: user.Email,
            ETHAddress: user.ETHAddress,
            AccountNumber: user.AccountNumber,
            BSB: user.BSB,
            ProfilePicture: user?.ProfilePicture,
            PurchasePackage: user?.PurchasePackage,
            PurchasePackageExpired: PurchasePackageExpired
          };

          let token = jwt.sign(userData, Constants.JWT.secret, {
            expiresIn: "10d", // expires in 10 days
          });

          res.json({
            success: true,
            message: "Welcome Back!",
            data: userData,
            token: token,
          });
        } else {
          res.json({
            success: false,
            message: "Account suspended, please contact administrator.",
            data: null,
          });
        }
      } else {
        //Registering:
        bcrypt.hash("ABC373@gd332", saltRounds, function (err, hash) {
          //Register User:
          var user = new Users();
          user.FullName = Name;
          user.Email = Email;
          user.Password = hash;

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
                AccountNumber: user.AccountNumber,
                BSB: user.BSB,
              };

              let token = jwt.sign(userData, Constants.JWT.secret, {
                expiresIn: "10d", // expires in 10 days
              });

              console.log("New User Registered.");
              res.json({
                success: true,
                message: "Successfully Login!",
                data: userData,
                token: token,
              });
            }
          });
        });
      }
    }
  });
};



// @Umer Purchase Package
exports.purchasePackage = function (req, res) {
  var EmailList = req.body.Email;


  if(!EmailList) {
    return res.json({
      success: false,
      message: "Email is required",
      data: null,
    });
  }
  if(!req.body.PackagePrice) {
   return  res.json({
      success: false,
      message: "Package Price is required",
      data: null,
    });
  }
  const promiseArr = [];
  return new Promise((resolve, reject) => {
    for (let key in EmailList) {
      promiseArr.push(
        new Promise(async (resolvve, rejectt) => {
          Users.findOne({ Email: EmailList[key] }, function (err, user) {
            if (err) rejectt(false);
            else {
              if (user) {
                var userId = user._id;
           
                var selection = { _id: userId };
                var updatedData = { PurchasePackage: true,
                  PackagePrice: req.body.PackagePrice,
                  PackageDate: req.body.PackageDate || new Date(),
                  PackageExpiryDate: req.body.PackageExpiryDate || new Date() };
                Users.updateOne(
                  selection,
                  updatedData,
                  function callback(errr, doc) {
                    if (errr) {
                      rejectt(false)
                    } else {
                      resolvve(true);
                    }
                  }
                );
              } else {
                rejectt(false)
              }
            }
          });
            resolvve(true);
        })
    )
    }
      return Promise.all(promiseArr).then(ress => {
          return res.json({
              status: true,
              message: "Package has been purchase successfully",
              data: null
          })
      })
  });

 
};

exports.remainingCoins = async function (req, res) {
  var UserId = req.body.UserId;
  var usercoins = await UserCoins.findOne({ UserId: UserId });
  res.json({
    success: true,
    message: 'Coins',
    data: usercoins?.HeldCoins || 0,
  });
  
};

exports.getCoins = async function (req, res) {
  var Email = req.body.Email;

  if(!Email) {
    return res.json({
      success: false,
      message: "Email is required",
      data: null,
    });
  }
  if(!req.body.PackagePrice) {
   return  res.json({
      success: false,
      message: "Package Price is required",
      data: null,
    });
  }
  var packageData = await PackagesModel.findOne({Price: req.body.PackagePrice});
  if(!packageData){
    return  res.json({
      success: false,
      message: "Package not found",
      data: null,
    });
  }
  var userData = await Users.findOne({Email: req.body.Email});
  if(!userData){
    return  res.json({
      success: false,
      message: "User with email not found",
      data: null,
    });
  }
  var findUserCoins = await UserCoins.findOne({ UserId: userData?._id });
  if(!findUserCoins){
    var userCoints = new UserCoins();
    userCoints.UserId = userData?._id;
    if(packageData?.FreeCoins > 0){
      userCoints.HeldCoins = packageData?.Coins + packageData?.FreeCoins;
    } else {
      userCoints.HeldCoins = packageData?.Coins;
    }
    
    userCoints.save();
    res.json({
      success: true,
      message: "Coins added successfully",
      data: {
        HeldCoins: userCoints.HeldCoins
      }
    });
  } else {
    if(packageData?.FreeCoins > 0){
      findUserCoins.HeldCoins = packageData?.Coins + packageData?.FreeCoins;
    } else {
      findUserCoins.HeldCoins = packageData?.Coins;
    }
    findUserCoins.save();
    res.json({
      success: true,
      message: "Coins added successfully",
      data: {
        HeldCoins: findUserCoins.HeldCoins
      }
    });
  }
};
