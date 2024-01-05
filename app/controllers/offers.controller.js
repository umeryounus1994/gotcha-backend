let Offers = require('../models/offers.model');
let OffersClaimedModel = require('../models/offer-claimed.model');

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
    query = {_id: { '$gt': lastId}};
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
  OffersClaimedModel.updateOne(query, {Status: "requested"}, function (err, data) {
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

exports.claim = async function (req, res) {
  var OfferId = req.body.OfferId;
  var UserId = req.body.UserId;
  let selection;
  let updatedData;

  let offerData = await Offers.findById(OfferId);
  let userExist = false;
  let userExistData;
  let userExistIndex;
  let a = moment(new Date()); 
  let reAvailabilityTime;
  if(offerData.ReAppear){
    reAvailabilityTime = a.clone().add(offerData.ReAppearTime, 'hours'); 
  } else {
    reAvailabilityTime = a.clone().add(100, 'years'); 
  }

  offerData.ClaimedBy.forEach((element,i)=>{
    if(element.UserId == UserId){
      userExist = true;
      userExistData = element;
      userExistIndex = i;
    }
  });

  offerData.IsActive = false;
  
  // if(userExist){
  //   selection = { _id: OfferId, 'ClaimedBy._id': userExistData._id };
  //   updatedData = { $set: { 'ClaimedBy.$.UserId': UserId, 'ClaimedBy.$.CreationTimestamp': new Date(), 'ClaimedBy.$.AvailabilityTimestamp': reAvailabilityTime } };
  // } else {
  //   selection = { _id: OfferId };
  //   updatedData = { $push: { 'ClaimedBy.UserId': UserId, 'ClaimedBy.CreationTimestamp': new Date(), 'ClaimedBy.AvailabilityTimestamp': reAvailabilityTime } };
  // }

  // Offers.updateOne(selection, updatedData, async function callback(errr, doc) {
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
        OfferId: offerData._id,
        Type: offerData.Type,
        OfferedBy: offerData.OfferedBy,
        Type: offerData.Type,
        Value: offerData.Value,
        Link: offerData.Link,
        Name: offerData.Name,
        Email: offerData.Email,
        Location: offerData.Location,
        Icon: offerData.Icon,
      }
      const OffersClaimedDoc = await OffersClaimedModel.create(reqData);

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
  .populate({path:'OfferedBy', select:[ 'BusinessName', 'BusinessWebsite', 'BusinessLogo', 'ContactNumber']})
  .populate({path:'Type', select:[ 'Name', 'AppPicture', 'ModelPicture']})
  .populate({path: 'MarkerType', select: ['Name', 'Picture']});
  filteredOffers = []
  offerData.forEach((element) => {
    let obj = element.ClaimedBy.find(user => user.UserId == userId);
    //console.log("obj ",obj);
    if(obj == undefined){
      filteredOffers.push(element);
    } else if(obj.AvailabilityTimestamp <= currentDate) {
      filteredOffers.push(element);
    }
    
  });  


    let msg = '';

    offersList = [];
    filteredOffers.forEach((element)=>{
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
  .populate({path:'OfferedBy', select:[ 'BusinessName', 'BusinessWebsite', 'BusinessLogo', 'ContactNumber']})
  .populate({path:'Type', select:[ 'Name']})

  filteredOffers = []
  offerData.forEach((element) => {
    let obj = element.ClaimedBy.find(user => user.UserId == userId);
    //console.log("obj ",obj);
    if(obj == undefined){
      filteredOffers.push(element);
    } else if(obj.AvailabilityTimestamp <= currentDate) {
      filteredOffers.push(element);
    }
    
  });  


    let msg = '';

    offersList = [];
    filteredOffers.forEach((element)=>{
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

  Offers.updateMany({},{Type: '613b1b4afbdc53762644c70b'}, {new: true}, function (err, data) {
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
          Offers.deleteOne(selection, function callback(err, doc) {});
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
