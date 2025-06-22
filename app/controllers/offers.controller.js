let Offers = require('../models/offers.model');
let OffersHeld = require('../models/offer-held.model');
let OffersClaimedModel = require('../models/offer-claimed.model');
let UserCoins = require('../models/user-coins.model');
const uploadIcon = require('../utilities/uploaders/map-icon.uploader');
const haversine = require('haversine');
var moment = require('moment'); // require
moment().format();

exports.addOffer = function (offers, callback) {
  Offers.insertMany(offers, callback);
};

exports.add = function (req, res) {
  uploadIcon(req, res, function (err) {
    if (err) {
      res.json({
        success: false,
        message: 'Server error, try again later.',
        data: err,
      });
    } else {
      var Icon = null;

      if (req.file) {
        Icon = req.file.filename;
      }

      var OfferedBy = req.body.OfferedBy;
      var Type = req.body.Type;
      var Value = req.body.Value;
      var Link = req.body.Link;
      var Email = req.body.Email;
      var Name = req.body.Name;
      var Expire = req.body.Expire;
      var LocationsArray = JSON.parse(req.body.Locations);

      offers = [];

      LocationsArray.forEach((loc) => {
        var location = { type: 'Point', coordinates: [loc.lng, loc.lat] };

        var offer = new Offers();
        offer.OfferedBy = OfferedBy;
        offer.OfferedBy = OfferedBy;
        offer.Type = Type;
        offer.Value = Value;
        offer.Link = Link;
        offer.Email = Email;
        offer.Name = Name;
        offer.Expire = Expire;
        offer.Location = location;
        offer.Icon = Icon;

        offers.push(offer);
      });

      Offers.insertMany(offers, function callback(errAdd, insertedDocs) {
        if (errAdd) {
          res.json({
            success: false,
            message: 'Validation Error',
            data: errAdd,
          });
        } else {
          res.json({
            success: true,
            message: 'Successfully Added!',
            data: insertedDocs,
          });
        }
      });
    }
  });
};

exports.list = function (req, res) {
  deleteExpired();

  var lastId = req.query.id;
  var query = {};
  const pageSize = 500;
  if (lastId) {
    query = { _id: { '$gt': lastId } };
  }
  var selection = {
    __v: 0,
  };

  Offers.find(query, selection, function (err, data) {
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
  })
    .populate({
      path: 'ClaimedBy',
      select: ['Email'],
    })
    .populate({
      path: 'OfferedBy',
      select: ['BusinessName'],
    })
    .populate({
      path: 'Type',
      select: ['Name', 'Category'],
    })
    .populate({
      path: 'MarkerType',
      select: ['Name', 'Picture'],
    })
    .sort({ '_id': 1 }).limit(pageSize)

};

exports.listCount = function (req, res) {

  Offers.find(function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: data + ' Records Found.',
        data: data,
      });
    }
  }).countDocuments();
};

exports.Claimedlist = function (req, res) {
  deleteExpired();

  var OfferedBy = req.query.id;
  var query = {
    IsSettled: false,
    Status: "requested"
  };

  if (OfferedBy) {
    query.OfferedBy = OfferedBy;
  }

  OffersClaimedModel.find(query, function (err, data) {
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
        count: data.length
      });
    }
  })
    .populate({
      path: 'ClaimedBy',
      select: ['Email', 'FullName', 'AccountNumber', 'BSB'],
    })
    .populate({
      path: 'OfferedBy',
      select: ['BusinessName'],
    })
    .populate({
      path: 'Type',
      select: ['Name', 'Category'],
    })
    .populate({
      path: 'MarkerType',
      select: ['Name', 'Picture'],
    });
};

exports.ClaimRequest = function (req, res) {

  var id = req.query.OfferId;
  if (!id) {
    return res.json({
      success: false,
      message: 'No ID Provided.',
    });
  }
  var query = {
    _id: id
  };
  OffersClaimedModel.updateOne(query, { Status: "requested" }, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: "Claim Requested Successfully.",
      });
    }
  })
};

exports.claimed = function (req, res) {
  var OfferedBy = req.query.id;
  var query = { IsActive: false };

  if (OfferedBy) {
    query = { IsActive: false, OfferedBy: OfferedBy };
  }

  var selection = {
    __v: 0,
  };
  Offers.find(query, selection, function (err, data) {
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
  })
    .populate({
      path: 'ClaimedBy',
      select: ['Email'],
    })
    .populate({
      path: 'OfferedBy',
      select: ['BusinessName'],
    })
    .populate({
      path: 'Type',
      select: ['Name'],
    })
    .populate({
      path: 'MarkerType',
      select: ['Name', 'Picture'],
    });
};



exports.holdOffer = async function (req, res) {
  var OfferId = req.body.OfferId;
  var UserId = req.body.UserId;
  let findCoins = await UserCoins.findOne({ UserId: UserId });
  if (!findCoins || findCoins?.HeldCoins < 200000) {
    return res.json({
      success: false,
      message: 'Not enough coins to plant this offer',
      data: null,
    });
  }

  // let heldOfferUser = await OffersHeld.findOne({ OfferId: OfferId, UserId: UserId, Status: 'pending' });
  // if(heldOfferUser){
  //   return res.json({
  //     success: false,
  //     message: 'You have already placed this offer before',
  //     data: null,
  //   });
  // }
  let offerData = await Offers.findById(OfferId);
  if (!offerData) {
    return res.json({
      success: false,
      message: 'Offer not found.',
      data: null,
    });
  }

  // Find the first held offer for the given OfferId
  let heldOffer = await OffersHeld.findOne({ OfferId: OfferId, Status: 'pending' }).sort({ CreationTimestamp: 1 });

  // If there is an existing pending offer, check if 24 hours have passed
  if (heldOffer) {
    let timeDiff = moment().diff(moment(heldOffer.CreationTimestamp), 'hours'); // Time difference in hours

    if (timeDiff >= 24) {
      // If 24 hours have passed, update the status to 'claimed'
      heldOffer.Status = 'claimed';
      await heldOffer.save(); // Save the updated status
      var findOffersClaimedModel = await OffersClaimedModel.findOne({ OfferId: OfferId, ClaimedBy: heldOffer?.UserId });
      if (findOffersClaimedModel) {
        findOffersClaimedModel.Status = "requested";
        findOffersClaimedModel.save();
        findCoins.HeldCoins = findCoins?.HeldCoins - 200000;
        findCoins.save();
      }
      res.json({
        success: false,
        message: 'Offer was automatically claimed after 24 hours.',
        data: null,
      });
      return; // Exit the function since the offer was claimed
    }
  }

  // If no pending offer or 24 hours haven't passed, continue with holding the offer


  // Check if the offer has already been claimed by someone else
  let existingClaim = await OffersHeld.find({ OfferId: OfferId, Status: 'claimed' });
  if (existingClaim && existingClaim.length > 0) {
    return res.json({
      success: false,
      message: 'Offer already claimed.',
      data: null,
    });
  }
  const { lng, lat } = req.body;
  if (!lng || !lat) {
    return res.status(400).json({
      success: false,
      message: "Latitude and Longitude are required",
      data: null
    });
  }

  let a = moment(new Date());
  if (offerData.ReAppear) {
    reAvailabilityTime = a.clone().add(offerData.ReAppearTime, 'hours');
  } else {
    reAvailabilityTime = a.clone().add(100, 'years');
  }

  offerData.ClaimedBy.forEach((element, i) => {
    if (element.UserId == UserId) {
      userExist = true;
      userExistData = element;
      userExistIndex = i;
    }
  });

  //offerData.IsActive = false;
  await offerData.save();
  var location = { type: 'Point', coordinates: [req.body.lng, req.body.lat] };
  if (!heldOffer) {
    let requestData = {
      HeldBy: UserId,
      OfferId: offerData._id,
      Location: location,
      Status: 'pending', // Set the status as pending initially
      CreationTimestamp: Date.now(), // Store when the offer was held,
      HeldType: req.body.HeldType
    };

    // Create the held offer entry
    const heldData = await OffersHeld.create(requestData);
    const findClaimedOffer = await OffersClaimedModel.findOne({ OfferHeldId: heldData?._id });
    if (!findClaimedOffer) {
      let reqData = {
        OfferHeldId: heldData._id,
        ClaimedBy: UserId,
        OfferId: OfferId,
        Type: offerData.Type,
        OfferedBy: offerData.OfferedBy,
        Value: offerData.Value,
        Link: offerData.Link,
        Name: offerData.Name,
        Email: offerData.Email,
        Location: location,
        Icon: offerData.Icon,
        Status: 'pending',
        HeldType: req.body.HeldType
      }
      await OffersClaimedModel.create(reqData);
    } else {
      findClaimedOffer.ClaimedBy = UserId;
      findClaimedOffer.Status = 'pending';
      findClaimedOffer.HeldType = req.body.HeldType;
      findClaimedOffer.save();
    }
    findCoins.HeldCoins = findCoins?.HeldCoins - 200000;
    findCoins.save();
    offerData.Location = location;
    offerData.save();
    // Send success response
    return res.json({
      success: true,
      message: 'Offer successfully held!',
      data: null,
    });
  } else {
    const findClaimedOffer = await OffersClaimedModel.findOne({ OfferHeldId: heldOffer?._id });
    heldOffer.HeldBy = UserId;
    heldOffer.Location = location;
    heldOffer.HeldType = req.body.HeldType;
    heldOffer.save();
    findClaimedOffer.ClaimedBy = UserId;
    findClaimedOffer.Status = 'pending';
    findClaimedOffer.HeldType = req.body.HeldType;
    findClaimedOffer.save();
    findCoins.HeldCoins = findCoins?.HeldCoins - 200000;
    findCoins.save();
    offerData.Location = location;
    offerData.save();
    return res.json({
      success: true,
      message: 'Offer successfully held!',
      data: null,
    });
  }


};

exports.remainingOfferTime = async function (req, res) {
  var OfferId = req.body.OfferId;

  // Check if the offer has already been claimed by someone else
  let existingClaim = await OffersHeld.findOne({ OfferId: OfferId, Status: 'claimed' });
  if (existingClaim) {
    return res.json({
      success: false,
      message: 'Offer already claimed.',
      data: null,
    });
  }

  // Find the first held offer for the given OfferId
  let heldOffer = await OffersHeld.findOne({ OfferId: OfferId, Status: 'pending' }).sort({ CreationTimestamp: 1 });
  if (heldOffer) {
    let timeDiff = moment().diff(moment(heldOffer.CreationTimestamp), 'hours'); // Time difference in hours
    res.json({
      success: true,
      message: 'Remaining Time Data',
      data: 24 - timeDiff,
    });
  } else {
    res.json({
      success: true,
      message: 'Remaining Time Data',
      data: 24,
    });
  }

};



exports.claim = async function (req, res) {
  var OfferId = req.body.OfferId;

  let lastHeldOffer = await OffersHeld.findOne({ OfferId: OfferId })
    .sort({ CreationTimestamp: -1 }); // or use a timestamp field if available

  let ClaimedOffer = await OffersHeld.findOne({ OfferId: OfferId, Status: "claimed" });
  if (ClaimedOffer) {
    res.json({
      success: false,
      message: 'Offer already claimed',
      data: null,
    });
  }

  if (!lastHeldOffer) {
    res.json({
      success: false,
      message: 'This offer is not held by any user',
      data: null,
    });
  }
  var UserId = lastHeldOffer?.UserId;

  let offerData = await Offers.findById(OfferId);

  let a = moment(new Date());
  if (offerData.ReAppear) {
    reAvailabilityTime = a.clone().add(offerData.ReAppearTime, 'hours');
  } else {
    reAvailabilityTime = a.clone().add(100, 'years');
  }

  offerData.ClaimedBy.forEach((element, i) => {
    if (element.UserId == UserId) {
      userExist = true;
      userExistData = element;
      userExistIndex = i;
    }
  });

  offerData.IsActive = false;

  offerData.save(async function (err) {
    if (err) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: err,
      });
    } else {
      // console.log("update offer doc ",doc)
      let reqData = {
        ClaimedBy: UserId,
        OfferId: OfferId,
        Type: offerData.Type,
        OfferedBy: offerData.OfferedBy,
        Type: offerData.Type,
        Value: offerData.Value,
        Link: offerData.Link,
        Name: offerData.Name,
        Email: offerData.Email,
        Location: offerData.Location,
        Icon: offerData.Icon,
        Status: 'requested'
      }
      await OffersClaimedModel.create(reqData);
      lastHeldOffer.Status = "claimed";
      lastHeldOffer.save();

      res.json({
        success: true,
        message: 'Successfully Claimed!',
        data: null,
      });
    }
  });
};

exports.get = async function (req, res) {
  deleteExpired();
  //console.log("body ",req.body)
  var userId = req.body.userId;
  var lat = req.body.latitude;
  var lng = req.body.longitude;
  var distance = parseInt(req.body.distance);

  //console.log("lat ",lat, ' lng: ', lng, ' distance: ',distance, ' userId: ',userId)
  // let currentLocation = {
  //   type: 'Point',
  //   coordinates: [parseFloat(lng), parseFloat(lat)],
  // };
  const userLocation = {
    latitude: lat,
    longitude: lng
  }

  let currentDate = new Date();
  //console.log("currentDate ",currentDate)
  //   let offerData = await Offers.find({
  //     Expire: { $gte: currentDate }, IsActive: true 
  //     })
  //  .populate({path:'OfferedBy', select:[ 'BusinessName', 'BusinessWebsite', 'BusinessLogo', 'ContactNumber']});

  let offerData = await Offers.find({
    // $or: [
    //   { $and: [ {'ClaimedBy.$.UserId': userId}, {'ClaimedBy.$.AvailabilityTimestamp': { $lte: currentDate } } ] },
    //   {'ClaimedBy.$.UserId': { $ne: userId } }
    // ],
    Expire: { $gte: currentDate }, IsActive: true
  })
    .populate({ path: 'OfferedBy', select: ['BusinessName', 'BusinessWebsite', 'BusinessLogo', 'ContactNumber'] })
    .populate({ path: 'Type', select: ['Name', 'AppPicture', 'ModelPicture'] })
    .populate({ path: 'MarkerType', select: ['Name', 'Picture'] });
  filteredOffers = []
  offerData.forEach((element) => {
    let obj = element.ClaimedBy.find(user => user.UserId == userId);
    //console.log("obj ",obj);
    if (obj == undefined) {
      filteredOffers.push(element);
    } else if (obj.AvailabilityTimestamp <= currentDate) {
      filteredOffers.push(element);
    }

  });


  let msg = '';

  offersList = [];
  filteredOffers.forEach((element) => {
    let endLocation = {
      latitude: element.Location.coordinates[1],
      longitude: element.Location.coordinates[0]
    }
    //console.log("endLocation ", endLocation)
    const locationDistance = haversine(userLocation, endLocation, { unit: 'meter' })
    // console.log("locationDistance ", locationDistance)
    if (locationDistance < distance) {
      offersList.push(element)
    }
  })



  if (offersList.length == 0) {
    msg = 'No Offers Found';
  } else {
    msg = offersList.length + ' Offers Found.';
  }

  res.json({
    success: true,
    message: msg,
    data: offersList,
  });


  // Offers.aggregate(
  //   [
  //     {
  //       $match: { Expire: { $gte: currentDate }, IsActive: true  },
  //     },
  //     {
  //       $lookup: {
  //         from: 'sponsors',
  //         as: 'Sponsor',
  //         let: { id: '$OfferedBy' },
  //         pipeline: [
  //           { $match: { $expr: { $eq: ['$_id', '$$id'] } } },
  //           {
  //             $project: {
  //               BusinessName: 1,
  //               BusinessWebsite: 1,
  //               BusinessLogo: 1,
  //               ContactNumber: 1,
  //             },
  //           },
  //         ],
  //       },
  //     },
  //     {
  //       $project: {
  //         __v: 0,
  //         CreationTimestamp: 0,
  //         IsAdminOffer: 0,
  //         IsActive: 0,
  //       },
  //     },
  //     {
  //       $limit: 50,
  //     },
  //   ],
  //   function (err, data) {
  //     if (err) {
  //       console.log(err);
  //       res.json({
  //         success: false,
  //         message: 'Server Error',
  //         data: err,
  //       });
  //     } else {
  //       let msg = '';

  //       offersList = [];
  //       data.forEach((element)=>{
  //         let endLocation = {
  //           latitude: element.Location.coordinates[1],
  //           longitude: element.Location.coordinates[0]
  //       }
  //       console.log("endLocation ", endLocation)
  //       const locationDistance = haversine(userLocation, endLocation, { unit: 'meter' })
  //       console.log("locationDistance ", locationDistance)
  //       if (locationDistance < distance) {
  //         offersList.push(element)
  //       }
  //       })



  //       if (offersList.length == 0) {
  //         msg = 'No Offers Found';
  //       } else {
  //         msg = offersList.length + ' Offers Found.';
  //       }

  //       res.json({
  //         success: true,
  //         message: msg,
  //         data: offersList,
  //       });
  //     }
  //   }

  // );

};

exports.getByTypeId = async function (req, res) {
  deleteExpired();
  //console.log("body ",req.body);
  var typeId = req.body.typeId;
  var userId = req.body.userId;
  var lat = req.body.latitude;
  var lng = req.body.longitude;
  var distance = parseInt(req.body.distance);

  // let currentLocation = {
  //   type: 'Point',
  //   coordinates: [parseFloat(lng), parseFloat(lat)],
  // };
  const userLocation = {
    latitude: lat,
    longitude: lng
  }

  let currentDate = new Date();
  //console.log("currentDate ",currentDate)
  //   let offerData = await Offers.find({
  //     Expire: { $gte: currentDate }, IsActive: true 
  //     })
  //  .populate({path:'OfferedBy', select:[ 'BusinessName', 'BusinessWebsite', 'BusinessLogo', 'ContactNumber']});

  let offerData = await Offers.find({
    // $or: [
    //   { $and: [ {'ClaimedBy.$.UserId': userId}, {'ClaimedBy.$.AvailabilityTimestamp': { $lte: currentDate } } ] },
    //   {'ClaimedBy.$.UserId': { $ne: userId } }
    // ],
    Type: typeId,
    Expire: { $gte: currentDate }, IsActive: true
  })
    .populate({ path: 'OfferedBy', select: ['BusinessName', 'BusinessWebsite', 'BusinessLogo', 'ContactNumber'] })
    .populate({ path: 'Type', select: ['Name'] })

  filteredOffers = []
  offerData.forEach((element) => {
    let obj = element.ClaimedBy.find(user => user.UserId == userId);
    //console.log("obj ",obj);
    if (obj == undefined) {
      filteredOffers.push(element);
    } else if (obj.AvailabilityTimestamp <= currentDate) {
      filteredOffers.push(element);
    }

  });


  let msg = '';

  offersList = [];
  filteredOffers.forEach((element) => {
    let endLocation = {
      latitude: element.Location.coordinates[1],
      longitude: element.Location.coordinates[0]
    }
    //console.log("endLocation ", endLocation)
    const locationDistance = haversine(userLocation, endLocation, { unit: 'meter' })
    // console.log("locationDistance ", locationDistance)
    if (locationDistance < distance) {
      offersList.push(element)
    }
  })



  if (offersList.length == 0) {
    msg = 'No Offers Found';
  } else {
    msg = offersList.length + ' Offers Found.';
  }

  res.json({
    success: true,
    message: msg,
    data: offersList,
  });


  // Offers.aggregate(
  //   [
  //     {
  //       $match: { Expire: { $gte: currentDate }, IsActive: true  },
  //     },
  //     {
  //       $lookup: {
  //         from: 'sponsors',
  //         as: 'Sponsor',
  //         let: { id: '$OfferedBy' },
  //         pipeline: [
  //           { $match: { $expr: { $eq: ['$_id', '$$id'] } } },
  //           {
  //             $project: {
  //               BusinessName: 1,
  //               BusinessWebsite: 1,
  //               BusinessLogo: 1,
  //               ContactNumber: 1,
  //             },
  //           },
  //         ],
  //       },
  //     },
  //     {
  //       $project: {
  //         __v: 0,
  //         CreationTimestamp: 0,
  //         IsAdminOffer: 0,
  //         IsActive: 0,
  //       },
  //     },
  //     {
  //       $limit: 50,
  //     },
  //   ],
  //   function (err, data) {
  //     if (err) {
  //       console.log(err);
  //       res.json({
  //         success: false,
  //         message: 'Server Error',
  //         data: err,
  //       });
  //     } else {
  //       let msg = '';

  //       offersList = [];
  //       data.forEach((element)=>{
  //         let endLocation = {
  //           latitude: element.Location.coordinates[1],
  //           longitude: element.Location.coordinates[0]
  //       }
  //       console.log("endLocation ", endLocation)
  //       const locationDistance = haversine(userLocation, endLocation, { unit: 'meter' })
  //       console.log("locationDistance ", locationDistance)
  //       if (locationDistance < distance) {
  //         offersList.push(element)
  //       }
  //       })



  //       if (offersList.length == 0) {
  //         msg = 'No Offers Found';
  //       } else {
  //         msg = offersList.length + ' Offers Found.';
  //       }

  //       res.json({
  //         success: true,
  //         message: msg,
  //         data: offersList,
  //       });
  //     }
  //   }

  // );

};


exports.updateScript = function (req, res) {

  Offers.updateMany({}, { Type: '613b1b4afbdc53762644c70b' }, { new: true }, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: data + ' Records updated.',
        data: data,
      });
    }
  })
};

exports.count = function (req, res) {
  var Id = req.body.Id;
  var query = { OfferedBy: Id };
  Offers.find(query, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: data + ' Records Found.',
        data: data,
      });
    }
  }).countDocuments();
};

exports.delete = function (req, res) {
  var Id = req.body.Id;
  OffersClaimedModel.findByIdAndUpdate(Id, { IsSettled: true }, function callback(err, doc) {
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

function deleteExpired() {
  Offers.find({}, function (err, data) {
    if (err) {
      return;
    } else {
      data.forEach((offer) => {
        var currentDate = new Date();
        var offerDate = new Date(offer.Expire);
        if (offerDate < currentDate) {
          var selection = { _id: offer._id };
          Offers.deleteOne(selection, function callback(err, doc) { });
        }
      });
    }
  });
}

// exports.get = function (req, res) {
//   var lat = req.query.lat;
//   var lng = req.query.lng;

//   console.log('User Location', lat, lng);

//   var query = {
//     Location: {
//       $near: {
//         $geometry: { type: 'Point', coordinates: [lng, lat] },
//         $minDistance: 0,
//         $maxDistance: 1000,
//       },
//     },
//   };
//   var selection = {
//     __v: 0,
//   };
//   Offers.aggregate(
//     [
//       {
//         $geoNear: {
//           near: { type: 'Point', coordinates: [-73.99279, 40.719296] },
//           distanceField: 'dist.calculated',
//           maxDistance: 1000,
//           includeLocs: 'dist.location',
//           spherical: true,
//         },
//       },
//     ],
//     function (err, data) {
//       if (err) {
//         res.json({
//           success: false,
//           message: 'Server Error',
//           data: err,
//         });
//       } else {
//         res.json({
//           success: true,
//           message: data.length + ' Records Found.',
//           data: data,
//         });
//       }
//     }
//   )
//     // .populate({
//     //   path: 'ClaimedBy',
//     //   select: ['Email'],
//     // })
//     // .populate({
//     //   path: 'Type',
//     //   select: ['Name'],
//     // });
// };
