Admin = require('../models/admin.model');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const uploadProfilePicture = require('../utilities/uploaders/profile-image.uploader');

// Login:
exports.login = function (req, res) {
  var UserName = req.body.UserName;
  var Password = req.body.Password;

  Admin.findOne({ UserName: UserName }, function (err, user) {
    if (err) res.send(err);
    else {
      if (user) {
        var userPassword = user.Password;
        var userName = user.UserName;

        bcrypt.compare(Password, userPassword, function (err, matched) {
          if (matched) {
            let userData = {
              Id: user._id,
              UserName: user.UserName,
              Email: user.Email,
              ProfilePicture:
                req.protocol +
                '://' +
                req.headers.host +
                '/uploads/profile/' +
                user.ProfilePicture,
            };
            res.json({
              success: true,
              message: 'Welcome ' + userName,
              data: userData,
            });
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
  });
};

// Register:
exports.register = function (req, res) {
  var UserName = req.body.UserName;
  var Email = req.body.Email;
  var Password = req.body.Password;

  Admin.findOne({ UserName: UserName }, function (err, exist) {
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
          message: 'UserName already exists!',
          data: UserName,
        });
      } else {
        //Hasing Pass:
        bcrypt.hash(Password, saltRounds, function (err, hash) {
          //Register User:
          var admin = new Admin();
          admin.UserName = UserName;
          admin.Email = Email;
          admin.Password = hash;

          admin.save(function (err) {
            if (err) res.json(err);
            else console.log('New Admin Registered.');
            res.json({
              success: true,
              message: 'Successfully registered!',
              data: admin,
            });
          });
        });
      }
    }
  });
};

exports.update = function (req, res) {
  var Id = req.body.Id;
  var UserName = req.body.UserName;
  var Email = req.body.Email;
  var Password = req.body.Password;

  var selection = { _id: Id };

  if (Password != '') {
    bcrypt.hash(Password, saltRounds, function (err, hash) {
      var updatedData = { UserName: UserName, Email: Email, Password: hash };
      Admin.updateOne(selection, updatedData, function callback(errr, doc) {
        if (errr) {
          res.json({
            success: false,
            message: 'Validation Error',
            data: errr,
          });
        } else {
          console.log('Admin Updated.');
          res.json({
            success: true,
            message: 'Successfully Updated!',
            data: doc,
          });
        }
      });
    });
  } else {
    var updatedData = { UserName: UserName, Email: Email };
    Admin.updateOne(selection, updatedData, function callback(errr, doc) {
      if (errr) {
        res.json({
          success: false,
          message: 'Validation Error',
          data: errr,
        });
      } else {
        console.log('Admin Updated.');
        res.json({
          success: true,
          message: 'Successfully Updated!',
          data: doc,
        });
      }
    });
  }
};

exports.updateStatus = function (req, res) {
  var Id = req.body.Id;
  var IsActive = req.body.IsActive;
  var selection = { _id: Id };
  var updatedData = { IsActive: IsActive };
  Admin.updateOne(selection, updatedData, function callback(errr, doc) {
    if (errr) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: errr,
      });
    } else {
      console.log('Admin Status Updated.');
      res.json({
        success: true,
        message: 'Successfully Updated!',
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
  Admin.find(query, selection, function (err, data) {
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
  });
};
