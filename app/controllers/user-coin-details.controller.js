let userCoinDetails = require("../models/user-coin-details.view");
var ObjectId = require('mongodb').ObjectID;
const excel = require('node-excel-export');
const usersModel = require("../models/users.model");
const { ObjectID } = require("mongoose/lib/schema/index");

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
  var query = { IsDeleted: false};
  var selection = {
    ClaimedCoinList: 0,
  };
  userCoinDetails.find(query, selection, async function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: "Server Error",
        data: err,
      });
    } else {
      let finalD = [];
      for (const d of data) {
        const us = await usersModel.findOne({ _id: new ObjectId(d._id) });
        d.PurchasePackage = us.PurchasePackage;
        d.PackagePrice = us.PackagePrice;
        finalD.push(d);
      }
      res.json({
        success: true,
        message: finalD.length + " Records Found.",
        data: finalD,
      });
    }
  })
  .sort({TotalCoin: -1})
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