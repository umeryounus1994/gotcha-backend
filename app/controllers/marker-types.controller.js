let MarkerTypes = require('../models/marker-types.model');

exports.addMarkerType = function (markerTypeForm, callback) {
  MarkerTypes.create(markerTypeForm, callback);
};

module.exports.updateMarkerType = async (offerTypeId, markerTypeForm, options, callback) => {
	var query = {_id: offerTypeId};
	MarkerTypes.findOneAndUpdate(query, markerTypeForm, options, callback);
}

exports.add = function (req, res) {
  var Name = req.body.Name;

  var offerType = new MarkerTypes();
  offerType.Name = Name;

  offerType.save(function (err) {
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
        data: offerType,
      });
    }
  });
};

exports.listAll = function (req, res) {
  var query = { IsDeleted: false };
  MarkerTypes.find(query, function (err, data) {
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
  MarkerTypes.find(query, function (err, data) {
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
  MarkerTypes.update(selection, updatedData, function callback(errr, doc) {
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