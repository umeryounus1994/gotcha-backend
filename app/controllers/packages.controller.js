let Packages = require('../models/packages.model');

// Add:
exports.add = function (req, res) {
  var Name = req.body.Name;
  var Cost = req.body.Cost;
  var AllowedDrops = req.body.AllowedDrops;

  var package = new Packages();
  package.Name = Name;
  package.Cost = Cost;
  package.AllowedDrops = AllowedDrops;

  package.save(function (err) {
    if (err) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: err,
      });
    } else {
      console.log('New Package Added.');
      res.json({
        success: true,
        message: 'Successfully Added!',
        data: package,
      });
    }
  });
};

exports.list = function (req, res) {
  var query = {};
  Packages.find(query, function (err, data) {
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
  var Name = req.body.Name;
  var Cost = req.body.Cost;
  var AllowedDrops = req.body.AllowedDrops;
  var selection = { _id: Id };
  var updatedData = {
    IsActive: IsActive,
    Name: Name,
    Cost: Cost,
    AllowedDrops: AllowedDrops,
  };
  Packages.update(selection, updatedData, function callback(errr, doc) {
    if (errr) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: errr,
      });
    } else {
      console.log('Package Updated.');
      res.json({
        success: true,
        message: 'Successfully Updated!',
        data: doc,
      });
    }
  });
};

exports.delete = function (req, res) {
  var Id = req.body.Id;
  var selection = { _id: Id };
  Packages.remove(selection, function callback(err, doc) {
    if (err) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: err,
      });
    } else {
      console.log('Package Deleted.');
      res.json({
        success: true,
        message: 'Successfully Deleted!',
        data: doc,
      });
    }
  });
};
