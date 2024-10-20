let userCoinDetails = require("../models/user-coin-details.view");
let offerClaimedDetails = require("../models/offer-claimed.model");
var ObjectId = require('mongodb').ObjectID;
const excel = require('node-excel-export');
const usersModel = require("../models/users.model");
const { ObjectID } = require("mongoose/lib/schema/index");
var moment = require('moment');
const mongoose = require('mongoose');
const schema = mongoose.Schema;
const momenttz = require('moment-timezone');
momenttz.tz.setDefault('Australia/Brisbane');
exports.list = function (req, res) {
  var query = {TotalCoin: {$gt: 0},  IsActive: true};
  var selection = {
    ClaimedCoinList: 0,
  };
  userCoinDetails.find(query, selection, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: "Server Error",
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: data.length + " Records Found.",
        data: data,
      });
    }
  })
  .sort({TotalCoin: -1})
};

exports.listByArea = function (req, res) {
  var query = {TotalCoin: {$gt: 0},  IsActive: true, AreaId: ObjectId(req.body.AreaId)};
  var selection = {
    ClaimedCoinList: 0,
  };
  userCoinDetails.find(query, selection, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: "Server Error",
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: data.length + " Records Found.",
        data: data,
      });
    }
  })
  .sort({TotalCoin: -1})
};

exports.listAllActive = function (req, res) {
  var query = { IsActive: true};
  var selection = {
    ClaimedCoinList: 0,
  };
  userCoinDetails.find(query, selection, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: "Server Error",
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: data.length + " Records Found.",
        data: data,
      });
    }
  })
  .sort({TotalCoin: -1})
};

exports.listAllUser = function (req, res) {
  const { startDate, endDate } = req.query;
  let sDate = '';
  let eDate = ''
  if(startDate){
    sDate = new Date(startDate);
  }
  if(endDate){
    eDate = new Date(endDate);
  }

  // Initialize the base query
  const query = { IsDeleted: false };

  // Validate and parse dates
  if (startDate) {
    const parsedStartDate = new Date(startDate);
    if (!isNaN(parsedStartDate.getTime())) { // Check for valid date
      sDate = parsedStartDate; // Start date
    } else {
      return res.status(400).json({ success: false, message: "Invalid start date format." });
    }
  }

  if (endDate) {
    const parsedEndDate = new Date(endDate);
    if (!isNaN(parsedEndDate.getTime())) { // Check for valid date
      // Initialize CreationTimestamp if it hasn't been yet
      if (!query.CreationTimestamp) {
        query.CreationTimestamp = {};
      }
      eDate = parsedEndDate; // End date
    } else {
      return res.status(400).json({ success: false, message: "Invalid end date format." });
    }
  }
  if (startDate && endDate) {
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    
    if (!isNaN(parsedStartDate.getTime()) && !isNaN(parsedEndDate.getTime())) {
      // Ensure that the start date is less than the end date
      if (parsedStartDate < parsedEndDate) {
        // Initialize CreationTimestamp if it hasn't been yet
        if (!query.CreationTimestamp) {
          query.CreationTimestamp = {};
        }
        sDate = parsedStartDate; // Greater than start date
        eDate = parsedEndDate; // Less than end date
      } else {
        return res.status(400).json({ success: false, message: "Start date must be less than end date." });
      }
    } else {
      return res.status(400).json({ success: false, message: "Invalid date format." });
    }
  }
  if(!startDate && !endDate){
    sDate = new Date();
    eDate = new Date();
  }
  if(startDate && !endDate){
    eDate = new Date();
  }
  

  const userDetailsAggregation = usersModel.aggregate([
    {
      // Match users based on CreationTimestamp
      $match: {
        IsDeleted: false,
        CreationTimestamp: {
          $gte: new Date(sDate),
          $lte: new Date(eDate)
        }
      }
    },
    {
      // Lookup to get claimed offers
      $lookup: {
        from: 'offersclaimeds',
        localField: '_id',
        foreignField: 'ClaimedBy',
        as: 'claimedOffers'
      }
    },
    {
      // Unwind the claimedOffers array, preserving users without claims
      $unwind: {
        path: '$claimedOffers',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      // Match to filter claimed offers based on their CreationTimestamp
      $match: {
        $or: [
          {
            'claimedOffers.CreationTimestamp': {
              $gte: new Date(sDate),
              $lte: new Date(eDate)
            }
          },
          { 'claimedOffers': { $exists: false } }
        ]
      }
  
    },
    {
      // Group by user ID and sum the coins
      $group: {
        _id: '$_id',
        FullName: { $first: '$FullName' },
        Email: { $first: '$Email' },
        ContactNumber: { $first: '$ContactNumber' },
        AccountNumber: { $first: '$AccountNumber' },
        BSB: { $first: '$BSB' },
        TotalCoin: {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ['$claimedOffers.CreationTimestamp', new Date(sDate)] },
                  { $lte: ['$claimedOffers.CreationTimestamp', new Date(eDate)] }
                ]
              },
              then: { $ifNull: ['$claimedOffers.Value', 0] },
              else: 0
            }
          }
        },
        PurchasePackage: { $first: '$PurchasePackage' },
        PackagePrice: { $first: '$PackagePrice' },
        PackageExpiryDate: { $first: '$PackageExpiryDate' },
        IsActive: { $first: '$IsActive' },
        claimedCoins: { $push: '$claimedOffers.ClaimedCoinList' },
        CreationTimestamp: { $first: '$CreationTimestamp' },
        claimedOffers: { $push: '$claimedOffers' } 
      }
    },
    {
      // Final projection
      $project: {
        _id: 1,
        FullName: 1,
        Email: 1,
        ContactNumber: 1,
        AccountNumber: 1,
        BSB: 1,
        TotalCoin: 1,
        PurchasePackage: 1,
        PackagePrice: 1,
        PackageExpiryDate: 1,
        CreationTimestamp: 1,
        IsActive: 1,
        PurchasePackageExpired: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$PackageExpiryDate', null] },
                { $lt: ['$PackageExpiryDate', new Date()] }
              ]
            },
            then: true,
            else: false
          }
        }
      }
    },
  ]).exec(function(err, finalD) {
    if (err) {
      return res.json({
        success: false,
        message: "Server Error",
        data: err,
      });
    }
  
    res.json({
      success: true,
      message: finalD.length + " Records Found.",
      data: finalD,
    });
  });
  
  
  
  
};

// You can define styles as json object
const styles = {
  headerDark: {
      fill: {
          fgColor: {
              rgb: '353834'
          }
      },
      font: {
          color: {
              rgb: 'FFFFFFFF'
          },
          sz: 18,
          bold: true,
          underline: false
      }
  },
  headerGrey: {
      fill: {
          fgColor: {
              rgb: '353834'
          }
      },
      font: {
          color: {
              rgb: 'FFFFFFFF'
          },
          sz: 14,
          bold: true,
          underline: false
      }
  },
  cellPink: {
      fill: {
          fgColor: {
              rgb: 'FFFFCCFF'
          }
      }
  },
  cellGreen: {
      fill: {
          fgColor: {
              rgb: '5BC137'
          }
      }
  }
};

const heading = [
  [{ value: 'Gotcha App', style: styles.headerDark }, { value: 'b1', style: styles.headerDark }, { value: 'c1', style: styles.headerDark }],
  ['List of all the users data', 'b2', 'c2'] // <-- It can be only values
];

//Here you specify the export structure
const specification = {
  FullName: { // <- the key should match the actual data key
      displayName: 'Full Name', // <- Here you specify the column header
      headerStyle: styles.headerGrey, // <- Header style
      //   cellStyle: function(value, row) { // <- style renderer function
      //     // if the status is 1 then color in green else color in red
      //     // Notice how we use another cell value to style the current one
      //     // return (row.status_id == 1) ? styles.cellGreen : {fill: {fgColor: {rgb: 'FFFF0000'}}}; // <- Inline cell style is possible 
      //   },
      width: 190 // <- width in pixels
  },
  Email: {
    displayName: 'Email',
    headerStyle: styles.headerGrey,
    // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
    //   // return (value == 1) ? 'Active' : 'Inactive';
    // },
    width: 220 // <- width in chars (when the number is passed as string)
  },
  // YearOfBirth: {
  //   displayName: 'Year of Birth',
  //   headerStyle: styles.headerGrey,
  //   // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
  //   //   // return (value == 1) ? 'Active' : 'Inactive';
  //   // },
  //   width: 100 // <- width in chars (when the number is passed as string)
  // },
  // Gender: {
  //     displayName: 'Gender',
  //     headerStyle: styles.headerGrey,
  //     // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
  //     //   // return (value == 1) ? 'Active' : 'Inactive';
  //     // },
  //     width: 100 // <- width in chars (when the number is passed as string)
  // },
  TotalCoin: {
      displayName: 'Total Coin',
      headerStyle: styles.headerGrey,
      //   cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
      //     // return (value == 1) ? 'Active' : 'Inactive';
      //   },
      width: 100 // <- width in chars (when the number is passed as string)
  },
  CreationTimestamp: {
      displayName: 'Registration Date',
      headerStyle: styles.headerGrey,
      // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
      //   // return (value == 1) ? 'Active' : 'Inactive';
      // },
      width: 180 // <- width in chars (when the number is passed as string)
  }
}

// Define an array of merges. 1-1 = A:1
// The merges are independent of the data.
// A merge will overwrite all data _not_ in the top-left cell.
const merges = [
  { start: { row: 1, column: 1 }, end: { row: 1, column: 4 } },
  { start: { row: 2, column: 1 }, end: { row: 2, column: 4 } }

]

exports.exportExcel = function (req, res) {
  var query = {IsActive: true};
  var selection = {
    ClaimedCoinList: 0,
  };
  userCoinDetails.find(query, selection, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: "Server Error",
        data: err,
      });
    } else {
      if(data.length > 0) {
            //Array of objects representing rows
            // const dataset = bookingData;
            // console.log("dataset" + dataset)

            // Create the excel report.
            // This function will return Buffer
            const report = excel.buildExport(
              [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                  {
                      name: 'UserDataList', // <- Specify sheet name (optional)
                      heading: heading, // <- Raw heading array (optional)
                      merges: merges, // <- Merge cell ranges
                      specification: specification, // <- Report specification
                      data: data // <-- Report data
                  }
              ]
          );

          // You can then return this straight
          res.attachment('UserDataList.xlsx'); // This is sails.js specific (in general you need to set headers)
          return res.send(report);
      }
      else {
        res.json({
          success: false,
          message: "No customer to export",
          data: []
        });
      }
    }
  })
  .sort({TotalCoin: -1})
};