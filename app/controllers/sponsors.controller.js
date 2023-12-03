let Sponsors = require('../models/sponsors.model');

const bcrypt = require('bcrypt');
const saltRounds = 10;

let mailer = require('../utilities/mailer');

const uploadBusinessLogo = require('../utilities/uploaders/business-logo.uploader');

exports.login = function (req, res) {
  var Email = req.body.Email;
  var Password = req.body.Password;

  Sponsors.findOne({ Email: Email }, function (err, user) {
    if (err) res.send(err);
    else {
      if (user) {
        var userPassword = user.Password;

        bcrypt.compare(Password, userPassword, function (err, matched) {
          if (matched) {
            if (user.IsActive) {
              if (user.BusinessLogo) {
                user.BusinessLogo =
                  'https://' +
                  req.headers.host +
                  '/uploads/sponsors/' +
                  user.BusinessLogo;
              }

              res.json({
                success: true,
                message: 'Welcome Back!',
                data: user,
              });
            } else {
              res.json({
                success: false,
                message: 'Account suspended, contact administrator.',
                data: null,
              });
            }
          } else {
            res.json({
              success: false,
              message: 'Incorrect Password',
              data: null,
            });
          }
        });
      } else {
        res.json({
          success: false,
          message: 'No User Found',
          data: null,
        });
      }
    }
  }).populate({
    path: 'Package',
    select: [],
  });
};

exports.register = function (req, res) {
  uploadBusinessLogo(req, res, function (err) {
    if (err) {
      res.json({
        success: false,
        message: 'Server error, try again later.',
        data: err,
      });
    }

    var BusinessLogo = null;

    if (req.file) {
      BusinessLogo = req.file.filename;
    }

    var BusinessName = req.body.BusinessName;
    var BusinessWebsite = req.body.BusinessWebsite;
    var ContactName = req.body.ContactName;
    var ContactNumber = req.body.ContactNumber;
    var ContactEmail = req.body.ContactEmail;
    var Email = req.body.Email;
    var Password = req.body.Password;
    var Package = req.body.Package;

    Sponsors.findOne({ Email: Email }, function (err, exist) {
      if (err) {
        res.json({
          success: false,
          message: 'Validation Error',
          data: err,
        });
      } else {
        if (exist) {
          res.json({
            success: false,
            message: 'Account already exists with this email: ' + Email,
            data: null,
          });
        } else {
          //Hasing Pass:
          bcrypt.hash(Password, saltRounds, function (err, hash) {
            var sponsor = new Sponsors();
            sponsor.BusinessName = BusinessName;
            sponsor.BusinessWebsite = BusinessWebsite;
            sponsor.ContactName = ContactName;
            sponsor.ContactNumber = ContactNumber;
            sponsor.ContactEmail = ContactEmail;
            sponsor.Email = Email;
            sponsor.Password = hash;
            sponsor.Package = Package;
            sponsor.BusinessLogo = BusinessLogo;

            sponsor.save(function (err) {
              if (err) {
                res.json({
                  success: false,
                  message: 'Validation Error',
                  data: err,
                });
              } else {
                console.log('New Sponsor Registered.');
                res.json({
                  success: true,
                  message: 'Successfully Registered!',
                  data: sponsor,
                });
              }
            });
          });
        }
      }
    });
  });
};

exports.updateCredentials = function (req, res) {
  var Id = req.body.Id;
  var Email = req.body.Email;
  var Password = req.body.Password;

  var selection = { _id: Id };

  // Getting User Data:
  Sponsors.findOne(selection, function (err, user) {
    if (err) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: err,
      });
    } else {
      if (user) {
        // Email Check:
        if (Email != user.Email) {
          Sponsors.find({ Email: Email }, function (err, users) {
            if (err) {
              res.json({
                success: false,
                message: 'Validation Error',
                data: err,
              });
            } else {
              if (users.length == 0) {
                // Password Check:
                if (Password != '') {
                  bcrypt.hash(Password, saltRounds, function (err, hash) {
                    var updatedData = {
                      Email: Email,
                      Password: hash,
                    };
                    Sponsors.updateOne(
                      selection,
                      updatedData,
                      function callback(errr, doc) {
                        if (errr) {
                          res.json({
                            success: false,
                            message: 'Validation Error',
                            data: errr,
                          });
                        } else {
                          console.log('Sponsor Credentials Updated.');
                          res.json({
                            success: true,
                            message: 'Successfully Updated!',
                            data: doc,
                          });
                        }
                      }
                    );
                  });
                } else {
                  var updatedData = { Email: Email };
                  Sponsors.updateOne(selection, updatedData, function callback(
                    errr,
                    doc
                  ) {
                    if (errr) {
                      res.json({
                        success: false,
                        message: 'Validation Error',
                        data: errr,
                      });
                    } else {
                      console.log('Sponsor Credentials Updated.');
                      res.json({
                        success: true,
                        message: 'Successfully Updated!',
                        data: doc,
                      });
                    }
                  });
                }
              } else {
                res.json({
                  success: false,
                  message: 'Account already exists with this email: ' + Email,
                  data: null,
                });
              }
            }
          });
        } else {
          // Password Check:
          if (Password != '') {
            bcrypt.hash(Password, saltRounds, function (err, hash) {
              var updatedData = {
                Email: Email,
                Password: hash,
              };
              Sponsors.updateOne(selection, updatedData, function callback(
                errr,
                doc
              ) {
                if (errr) {
                  res.json({
                    success: false,
                    message: 'Validation Error',
                    data: errr,
                  });
                } else {
                  console.log('Sponsor Credentials Updated.');
                  res.json({
                    success: true,
                    message: 'Successfully Updated!',
                    data: doc,
                  });
                }
              });
            });
          } else {
            console.log('Sponsor Credentials Updated.');
            res.json({
              success: true,
              message: 'Successfully Updated!',
              data: null,
            });
          }
        }
      } else {
        res.json({
          success: false,
          message: 'No User Found.',
          data: null,
        });
      }
    }
  });
};

exports.updateDetailsSettings = function (req, res) {

    var Id = req.body.Id;
    var BusinessName = req.body.BusinessName;
    var BusinessWebsite = req.body.BusinessWebsite;

    var selection = { _id: Id };
    var updatedData = {
      BusinessName: BusinessName,
      BusinessWebsite: BusinessWebsite,
      // BusinessLogo: BusinessLogo,
    };
    Sponsors.updateOne(selection, updatedData, function callback(errr, doc) {
      if (errr) {
        res.json({
          success: false,
          message: 'Validation Error',
          data: errr,
        });
      } else {
        console.log('Sponsor Updated.');
        res.json({
          success: true,
          message: 'Successfully Updated!',
          data: doc,
        });
      }
    });
};

exports.list = function (req, res) {
  var query = { IsOwner: false };
  var selection = {
    __v: 0,
  };
  Sponsors.find(query, selection, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: data.length + ' Records Found.',
        data: data,
      });
    }
  }).populate({
    path: 'Package',
    select: ['Name'],
  });
};

exports.updateStatus = function (req, res) {
  var Id = req.body.Id;
  var IsActive = req.body.IsActive;
  var selection = { _id: Id };
  var updatedData = { IsActive: IsActive };
  Sponsors.update(selection, updatedData, function callback(errr, doc) {
    if (errr) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: errr,
      });
    } else {
      console.log('Sponsor Status Updated.');
      res.json({
        success: true,
        message: 'Successfully Updated!',
        data: doc,
      });
    }
  });
};

exports.update = function (req, res) {
  uploadBusinessLogo(req, res, function (err) {
    if (err) {
      res.json({
        success: false,
        message: 'Server error, try again later.',
        data: err,
      });
    }

    var BusinessLogo = null;

    if (req.file) {
      BusinessLogo = req.file.filename;
    }

    var Id = req.body.Id;
    var BusinessName = req.body.BusinessName;
    var BusinessWebsite = req.body.BusinessWebsite;
    var ContactName = req.body.ContactName;
    var ContactNumber = req.body.ContactNumber;
    var ContactEmail = req.body.ContactEmail;
    var Email = req.body.Email;
    var Password = req.body.Password;
    var Package = req.body.Package;

    var selection = { _id: Id };

    var updatedData = {
      BusinessName: BusinessName,
      BusinessWebsite: BusinessWebsite,
      ContactName: ContactName,
      ContactNumber: ContactNumber,
      ContactEmail: ContactEmail,
      Email: Email,
      Package: Package,
      BusinessLogo: BusinessLogo,
    };

    // Getting User Data:
    Sponsors.findOne(selection, function (err, user) {
      if (err) {
        res.json({
          success: false,
          message: 'Validation Error',
          data: err,
        });
      } else {
        if (user) {
          // Email Check:
          if (Email != user.Email) {
            Sponsors.find({ Email: Email }, function (err, users) {
              if (err) {
                res.json({
                  success: false,
                  message: 'Validation Error',
                  data: err,
                });
              } else {
                if (users.length == 0) {
                  // Password Check:
                  if (Password != '') {
                    bcrypt.hash(Password, saltRounds, function (err, hash) {
                      var updatedData = {
                        Email: Email,
                        Password: hash,
                      };
                      Sponsors.updateOne(
                        selection,
                        updatedData,
                        function callback(errr, doc) {
                          if (errr) {
                            res.json({
                              success: false,
                              message: 'Validation Error',
                              data: errr,
                            });
                          } else {
                            console.log('Sponsor Credentials Updated.');
                            res.json({
                              success: true,
                              message: 'Successfully Updated!',
                              data: doc,
                            });
                          }
                        }
                      );
                    });
                  } else {
                    Sponsors.updateOne(
                      selection,
                      updatedData,
                      function callback(errr, doc) {
                        if (errr) {
                          res.json({
                            success: false,
                            message: 'Validation Error',
                            data: errr,
                          });
                        } else {
                          console.log('Sponsor Credentials Updated.');
                          res.json({
                            success: true,
                            message: 'Successfully Updated!',
                            data: doc,
                          });
                        }
                      }
                    );
                  }
                } else {
                  res.json({
                    success: false,
                    message: 'Account already exists with this email: ' + Email,
                    data: null,
                  });
                }
              }
            });
          } else {
            // Password Check:
            if (Password != '') {
              bcrypt.hash(Password, saltRounds, function (err, hash) {
                updatedData.Password = hash;
                Sponsors.updateOne(selection, updatedData, function callback(
                  errr,
                  doc
                ) {
                  if (errr) {
                    res.json({
                      success: false,
                      message: 'Validation Error',
                      data: errr,
                    });
                  } else {
                    console.log('Sponsor Credentials Updated.');
                    res.json({
                      success: true,
                      message: 'Successfully Updated!',
                      data: doc,
                    });
                  }
                });
              });
            } else {
              Sponsors.updateOne(selection, updatedData, function callback(
                errr,
                doc
              ) {
                if (errr) {
                  res.json({
                    success: false,
                    message: 'Validation Error',
                    data: errr,
                  });
                } else {
                  console.log('Sponsor Credentials Updated.');
                  res.json({
                    success: true,
                    message: 'Successfully Updated!',
                    data: null,
                  });
                }
              });
            }
          }
        } else {
          res.json({
            success: false,
            message: 'No User Found.',
            data: null,
          });
        }
      }
    });
  });
};

exports.delete = function (req, res) {
  var Id = req.body.Id;
  var selection = { _id: Id };
  Sponsors.remove(selection, function callback(err, doc) {
    if (err) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: err,
      });
    } else {
      console.log('Sponsor Deleted.');
      res.json({
        success: true,
        message: 'Successfully Deleted!',
        data: doc,
      });
    }
  });
};

exports.forgetPassword = function (req, res) {
  var Email = req.body.Email;

  Sponsors.findOne({ Email: Email }, function (err, user) {
    if (err) res.send(err);
    else {
      if (user) {
        var userId = user._id;
        var userFullName = user.BusinessName;

        var newPassword = 'changeme' + Math.floor(Math.random() * 10000);

        //Hasing Pass:
        bcrypt.hash(newPassword, saltRounds, function (err, hash) {
          if (err) {
            res.json({
              success: false,
              message: 'Validation Error',
              data: err,
            });
          } else {
            var selection = { _id: userId };
            var updatedData = { Password: hash };
            Sponsors.updateOne(selection, updatedData, function callback(
              errr,
              doc
            ) {
              if (errr) {
                res.json({
                  success: false,
                  message: 'Validation Error',
                  data: errr,
                });
              } else {
                mailer.sendMail(Email, newPassword, userFullName);
                console.log('Sponsor Password Updated.');
                res.json({
                  success: true,
                  message: 'New password has been sent to your email address.',
                  data: null,
                });
              }
            });
          }
        });
      } else {
        res.json({
          success: false,
          message: 'No User Found',
          data: null,
        });
      }
    }
  });
};
