let Users = require('../models/users.model');
let Offers = require('../models/offers.model');

exports.statsAdmin = function (req, res) {
  let data = {
    Users: 0,
    Vouchers: 0,
    Collectibles: 0,
    Cryptocurrencies: 0,
    Others: 0,
  };

  Users.find({ IsActive: true }, function (err, users) {
    if (err) res.send(err);
    else {
      data.Users = users.length;

      Offers.find({}, function (err, offers) {
        if (err) res.send(err);
        else {
          offers.forEach((offer) => {
            if (offer.Type == '5ec43bd29ff6134be84d7dab') {
              data.Vouchers = data.Vouchers + 1;
            }
            if (offer.Category == 'Collectibles') {
              data.Collectibles = data.Collectibles + 1;
            }
            if (offer.Type == '5ec43c5cce2b0f59a0d874e0') {
              data.Others = data.Others + 1;
            }
            if (offer.Type == '5ecc44d56867c03a18c5f344') {
              data.Cryptocurrencies = data.Cryptocurrencies + 1;
            }
          });

          res.json({
            success: true,
            message: 'Data Fatched!',
            data: data,
          });
        }
      });
    }
  });
};

exports.statsSponsors = function (req, res) {
  let UserId = req.query.UserId;

  let data = {
    Users: 0,
    Vouchers: 0,
    Coupon: 0,
    Cryptocurrency: 0,
  };

  Users.find({ IsActive: true }, function (errUser, users) {
    if (errUser) {
      res.json({
        success: false,
        message: 'Server Error!',
        data: errUser,
      });
    } else {
      data.Users = users.length;

      Offers.find({ OfferedBy: UserId }, function (errOffer, offers) {
        if (errOffer) {
          res.json({
            success: false,
            message: 'Server Error!',
            data: errOffer,
          });
        } else {
          offers.forEach((offer) => {
            if (offer.Type == '5ec43bd29ff6134be84d7dab') {
              data.Vouchers = data.Vouchers + 1;
            }
            if (offer.Type == '5ec43c3dce2b0f59a0d874df') {
              data.Coupon = data.Coupon + 1;
            }
            if (offer.Type == '5ec43c5cce2b0f59a0d874e0') {
              data.Cryptocurrency = data.Cryptocurrency + 1;
            }
          });
          res.json({
            success: true,
            message: 'Data Fatched!',
            data: data,
          });
        }
      });
    }
  });
};
