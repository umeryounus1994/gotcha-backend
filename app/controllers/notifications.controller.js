let Notifications = require('../models/notifications.model');

// Add:
exports.add = function (req, res) {
  let Name = req.body.Name;
  let Description = req.body.Description;

  var Notification = new Notifications();
  Notification.Name = Name;
  Notification.Description = Description;

  Notification.save(function (err) {
    if (err) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: 'Successfully Added!',
        data: Notification,
      });
    }
  });
};

exports.listAll = function (req, res) {
  var query = { IsDeleted: false };
  Notifications.find(query, function (err, data) {
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


exports.list = function (req, res) {
  var query = { IsDeleted: false, IsActive: true };
  Notifications.find(query, function (err, data) {
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

exports.update = function (req, res) {
  let Id = req.body.Id;
  let IsActive = req.body.IsActive;
  let IsDeleted = req.body.IsDeleted;
  let Name = req.body.Name;
  let Description = req.body.Description;
  let selection = { _id: Id };
  let updatedData = {
    IsActive: IsActive,
    Name: Name,
    Description: Description,
    IsDeleted: IsDeleted,
  };
  Notifications.update(selection, updatedData, function callback(errr, doc) {
    if (errr) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: errr,
      });
    } else {
      res.json({
        success: true,
        message: 'Successfully Updated!',
        data: doc,
      });
    }
  });
};