const OfferTypes = require('../models/offer-types.model');
const Packages = require('../models/packages.model');
const Sponsors = require('../models/sponsors.model');

exports.init = function (req, res) {
  var offerTypesData = [
    {
      _id: '5ec43bd29ff6134be84d7dab',
      Name: 'Primary',
    },
    // {
    //   _id: '5ec43c3dce2b0f59a0d874df',
    //   Name: 'Collectibles',
    // },
    // {
    //   _id: '5ec43c5cce2b0f59a0d874e0',
    //   Name: 'Cryptocurrencies',
    // },
    // {
    //   _id: '5ecc44d56867c03a18c5f344',
    //   Name: 'Others',
    // },
  ];

  // var packagesData = [
  //   {
  //     _id: '5ec6d4b0faf29f79347343db',
  //     Name: 'Free',
  //     Cost: 0,
  //     AllowedDrops: 10,
  //   },
  //   {
  //     _id: '5ec6d50ffaf29f79347343dc',
  //     Name: 'Basic',
  //     Cost: 100,
  //     AllowedDrops: 100,
  //   },
  //   {
  //     _id: '5ec6d528faf29f79347343dd',
  //     Name: 'Gold',
  //     Cost: 150,
  //     AllowedDrops: 10000,
  //   },
  //   {
  //     _id: '5ec6d53bfaf29f79347343de',
  //     Name: 'Premium',
  //     Cost: 200,
  //     AllowedDrops: 100000,
  //   },
  // ];

  var sponsorData = [
    {
      _id: '5ecc1cae5d468b4454bb5562',
      IsOwner: true,
      ContactName: 'Administrator',
      ContactNumber: '+601121676167',
      ContactEmail: 'huzaifa8580@gmail.com',
      BusinessName: 'Gotcha App',
      BusinessWebsite: 'https://techciao.com/',
      Email: 'gotcha.ar.app@gmail.com',
      Password: '$2b$10$PIG1jT5pTIJzxffOCU4R8.lZvIvog.3Ne7hKCEYd30a.cv7wt4hQq',
      Package: null,
    },
  ];

  OfferTypes.insertMany(offerTypesData);
  // Packages.insertMany(packagesData);
  Sponsors.insertMany(sponsorData);

  res.json('Done');
};
