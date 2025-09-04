let Packages = require('../models/packages.model');

// Add:
exports.add = function (req, res) {
  var Name = req.body.Name;
  var Price = req.body.Price;
  var Coins = req.body.Coins;
  var FreeCoins = req.body.FreeCoins;
  
var PackageImage = null;
  if(req.files && req.files.PackageImage){
    PackageImage = req.files.PackageImage[0].location;
  }
  var package = new Packages();
  package.Name = Name;
  package.Price = Price;
  package.Coins = Coins;
  package.FreeCoins = FreeCoins;
  package.PackageImage = PackageImage;

  package.save(function (err) {
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
  var FreeCoins = req.body.FreeCoins;
  var Price = req.body.Price;
  var Coins = req.body.Coins;
  var PackageImage = null;
  var selection = { _id: Id };
  if (req.files && req.files.PackageImage) {
    PackageImage = req.files.PackageImage[0].location;
  }
  var updatedData = {
    IsActive: IsActive,
    Name: Name,
    Coins: Coins,
    Price: Price,
    FreeCoins: FreeCoins,
    PackageImage: PackageImage,
    IsActive: true
  };
  Packages.update(selection, updatedData, function callback(errr, doc) {
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

exports.delete = function (req, res) {
  var Id = req.params.Id;
  var selection = { _id: Id };
  Packages.remove(selection, function callback(err, doc) {
    if (err) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: 'Successfully Deleted!',
        data: doc,
      });
    }
  });
};
