let Versions = require('../models/versions.model');

// Add:
exports.add = function (req, res) {
  var Version = req.body.Version;
  var BuildNumber = req.body.BuildNumber;

  var version = new Versions();
  version.Version = Version;
  version.BuildNumber = BuildNumber;

  version.save(function (err) {
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
        data: version,
      });
    }
  });
};

// List:
exports.list = function (req, res) {
  var query = { IsDeleted: false };
  Versions.find(query, function (err, data) {
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

// Update:
exports.update = function (req, res) {
  var Id = req.body.Id;
  var Version = req.body.Version;
  var BuildNumber = req.body.BuildNumber;
  var IsActive = req.body.IsActive;

  var selection = { _id: Id };
  var updatedData = {
    Version: Version,
    BuildNumber: BuildNumber,
    IsActive: IsActive,
  };

  Versions.findOneAndUpdate(selection, updatedData, { new: true }, function (err, result) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: 'Successfully Updated!',
        data: result,
      });
    }
  });
};

// Delete:
exports.delete = function (req, res) {
  var Id = req.params.Id;
  var selection = { _id: Id };
  var updatedData = { IsDeleted: true };

  Versions.findOneAndUpdate(selection, updatedData, { new: true }, function (err, result) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: 'Successfully Deleted!',
        data: result,
      });
    }
  });
};