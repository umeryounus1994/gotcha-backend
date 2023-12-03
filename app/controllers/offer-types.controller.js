let OfferTypes = require('../models/offer-types.model');

exports.addOfferType = function (offerTypeForm, callback) {
  OfferTypes.create(offerTypeForm, callback);
};

module.exports.updateOfferType = async (offerTypeId, offerTypeForm, options, callback) => {
	var query = {_id: offerTypeId};
	OfferTypes.findOneAndUpdate(query, offerTypeForm, options, callback);
}

exports.listAll = function (req, res) {
  var query = { IsDeleted: false };
  OfferTypes.find(query, function (err, data) {
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
  OfferTypes.find(query, function (err, data) {
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
  OfferTypes.update(selection, updatedData, function callback(errr, doc) {
    if (errr) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: errr,
      });
    } else {
      console.log('OfferTypes Updated.');
      res.json({
        success: true,
        message: 'Successfully Updated!',
        data: doc,
      });
    }
  });
};