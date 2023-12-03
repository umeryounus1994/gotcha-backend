let AreaLists = require('../models/area-list.model');

// Add:
exports.add = function (req, res) {
  var Name = req.body.Name;

  var AreaList = new AreaLists();
  AreaList.Name = Name;

  AreaList.save(function (err) {
    if (err) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: err,
      });
    } else {
      console.log('New Offer Type Added.');
      res.json({
        success: true,
        message: 'Successfully Added!',
        data: AreaList,
      });
    }
  });
};

exports.listAll = function (req, res) {
  var query = { IsDeleted: false };
  AreaLists.find(query, function (err, data) {
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
  var query = { IsActive: true, IsDeleted: false };
  AreaLists.find(query, function (err, data) {
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
  var Id = req.body.Id;
  var IsActive = req.body.IsActive;
  var IsDeleted = req.body.IsDeleted;
  var Name = req.body.Name;
  var selection = { _id: Id };
  var updatedData = {
    IsDeleted: IsDeleted,
    IsActive: IsActive,
    Name: Name,
  };
  AreaLists.update(selection, updatedData, function callback(errr, doc) {
    if (errr) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: errr,
      });
    } else {
      console.log('AreaLists Updated.');
      res.json({
        success: true,
        message: 'Successfully Updated!',
        data: doc,
      });
    }
  });
};