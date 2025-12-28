const RNGData = require('../models/rng-data.model');
const Prizes = require('../models/prizes.model');
const PrizePoolData = require('../models/prize-pool-data.model');
const MainPrizePool = require('../models/main-prize-pool.model');
const rngSelector = require('../utilities/rng-prize-selector');
const moment = require('moment');
const excel = require('node-excel-export');

// List all RNG data entries with optional date filtering
exports.list = function (req, res) {
  const query = { IsDeleted: false };
  
  // Date filtering
  if (req.query.startDate && req.query.endDate) {
    const startDate = moment(req.query.startDate, 'DD/MM/YYYY').startOf('day').toDate();
    const endDate = moment(req.query.endDate, 'DD/MM/YYYY').endOf('day').toDate();
    query.DropDate = { $gte: startDate, $lte: endDate };
  }

  RNGData.find(query)
    .populate('MainPrizePoolId', 'Product')
    .sort({ DropDate: -1, DropTime: -1 })
    .exec(function (err, data) {
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
          lines: data.length,
        });
      }
    });
};

// Generate a new RNG prize drop
exports.generateDrop = async function (req, res) {
  try {
    // Select prize using RNG
    const selectedPrize = await rngSelector.selectPrize();
    
    if (!selectedPrize) {
      return res.json({
        success: false,
        message: 'No prizes available in the pool',
        data: null,
      });
    }

    // Generate random location
    const location = rngSelector.generateRandomLocation();
    
    // Generate RNG seed
    const rngSeed = rngSelector.generateRNGSeed();
    
    // Generate unique Prize ID
    const prizeId = await rngSelector.generatePrizeId();
    
    // Get current date/time
    const now = moment();
    const dropDate = now.toDate();
    const dropTime = now.format('HH:mm:ss');

    // Create Prize entry (user-facing)
    const prize = new Prizes();
    prize.PrizeId = prizeId;
    prize.MainPrizePoolId = selectedPrize._id;
    prize.PrizeDescription = selectedPrize.Product;
    prize.PrizeValue = selectedPrize.PrizeValue;
    prize.Location = {
      type: 'Point',
      coordinates: [location.longitude, location.latitude],
    };
    prize.RNGSeed = rngSeed;
    prize.DropDate = dropDate;
    prize.DropTime = dropTime;
    prize.Status = 'Active';
    await prize.save();

    // Create RNG Data entry (audit log)
    const rngEntry = new RNGData();
    rngEntry.DropDate = dropDate;
    rngEntry.DropTime = dropTime;
    rngEntry.PrizeId = prizeId;
    rngEntry.PrizeDescription = selectedPrize.Product;
    rngEntry.Value = selectedPrize.PrizeValue;
    rngEntry.Latitude = location.latitude;
    rngEntry.Longitude = location.longitude;
    rngEntry.RNGSeed = rngSeed;
    rngEntry.MainPrizePoolId = selectedPrize._id;
    rngEntry.PrizeEntryId = prize._id;
    await rngEntry.save();

    // Create Prize Pool Data entry (ledger)
    const prizePoolEntry = new PrizePoolData();
    prizePoolEntry.Date = dropDate;
    prizePoolEntry.Time = dropTime;
    prizePoolEntry.PrizeId = prizeId;
    prizePoolEntry.PrizeDescription = selectedPrize.Product;
    prizePoolEntry.Value = selectedPrize.PrizeValue;
    prizePoolEntry.From = 'Gotcha System';
    prizePoolEntry.To = 'Map';
    prizePoolEntry.EventType = 'Created';
    prizePoolEntry.Status = 'Active';
    prizePoolEntry.Notes = 'Dropped to map';
    prizePoolEntry.PrizeEntryId = prize._id;
    prizePoolEntry.RNGDataId = rngEntry._id;
    
    // Set promotional period (e.g., "30 Oct - 28 Nov 2025")
    // You can configure this or make it dynamic based on your needs
    const promoStart = moment().format('D MMM');
    const promoEnd = moment().add(30, 'days').format('D MMM YYYY');
    prizePoolEntry.PromotionalPeriod = `${promoStart} - ${promoEnd}`;
    
    await prizePoolEntry.save();

    res.json({
      success: true,
      message: 'Prize drop generated successfully!',
      data: {
        prize: prize,
        rngData: rngEntry,
      },
    });
  } catch (error) {
    console.error('Error generating prize drop:', error);
    res.json({
      success: false,
      message: 'Error generating prize drop',
      data: error,
    });
  }
};

// Export RNG Data to Excel
exports.exportExcel = function (req, res) {
  const query = { IsDeleted: false };
  
  // Date filtering
  if (req.query.startDate && req.query.endDate) {
    const startDate = moment(req.query.startDate, 'DD/MM/YYYY').startOf('day').toDate();
    const endDate = moment(req.query.endDate, 'DD/MM/YYYY').endOf('day').toDate();
    query.DropDate = { $gte: startDate, $lte: endDate };
  }

  RNGData.find(query)
    .populate('MainPrizePoolId', 'Product')
    .sort({ DropDate: -1, DropTime: -1 })
    .exec(function (err, data) {
      if (err) {
        res.json({
          success: false,
          message: 'Server Error',
          data: err,
        });
      } else {
        if (data.length > 0) {
          // Prepare data for export
          const exportData = data.map(entry => ({
            DropDate: moment(entry.DropDate).format('DD/MM/YYYY'),
            DropTime: entry.DropTime,
            PrizeId: entry.PrizeId,
            PrizeDescription: entry.PrizeDescription,
            Value: entry.Value,
            Latitude: entry.Latitude,
            Longitude: entry.Longitude,
            RNGSeed: entry.RNGSeed,
            Product: entry.MainPrizePoolId ? entry.MainPrizePoolId.Product : 'N/A'
          }));

          // Excel specification
          const styles = {
            headerDark: {
              fill: {
                fgColor: { rgb: 'FF000000' }
              },
              font: {
                color: { rgb: 'FFFFFFFF' },
                sz: 14,
                bold: true
              }
            }
          };

          const specification = {
            DropDate: {
              displayName: 'Drop Date',
              headerStyle: styles.headerDark,
              width: 120
            },
            DropTime: {
              displayName: 'Drop Time',
              headerStyle: styles.headerDark,
              width: 100
            },
            PrizeId: {
              displayName: 'Prize ID',
              headerStyle: styles.headerDark,
              width: 120
            },
            PrizeDescription: {
              displayName: 'Prize Description',
              headerStyle: styles.headerDark,
              width: 200
            },
            Value: {
              displayName: 'Value (AUD)',
              headerStyle: styles.headerDark,
              width: 120
            },
            Latitude: {
              displayName: 'Latitude',
              headerStyle: styles.headerDark,
              width: 120
            },
            Longitude: {
              displayName: 'Longitude',
              headerStyle: styles.headerDark,
              width: 120
            },
            RNGSeed: {
              displayName: 'RNG Seed',
              headerStyle: styles.headerDark,
              width: 200
            },
            Product: {
              displayName: 'Product',
              headerStyle: styles.headerDark,
              width: 150
            }
          };

          const heading = [
            ['RNG Data Export', 'A1', 'I1']
          ];

          const merges = [
            { start: { row: 1, column: 1 }, end: { row: 1, column: 9 } }
          ];

          const report = excel.buildExport([
            {
              name: 'RNG Data',
              heading: heading,
              merges: merges,
              specification: specification,
              data: exportData
            }
          ]);

          const fileName = `RNGData_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
          res.attachment(fileName);
          return res.send(report);
        } else {
          res.json({
            success: false,
            message: 'No data to export',
            data: []
          });
        }
      }
    });
};

// Export RNG Data to CSV
exports.exportCSV = function (req, res) {
  const query = { IsDeleted: false };
  
  // Date filtering
  if (req.query.startDate && req.query.endDate) {
    const startDate = moment(req.query.startDate, 'DD/MM/YYYY').startOf('day').toDate();
    const endDate = moment(req.query.endDate, 'DD/MM/YYYY').endOf('day').toDate();
    query.DropDate = { $gte: startDate, $lte: endDate };
  }

  RNGData.find(query)
    .populate('MainPrizePoolId', 'Product')
    .sort({ DropDate: -1, DropTime: -1 })
    .exec(function (err, data) {
      if (err) {
        res.json({
          success: false,
          message: 'Server Error',
          data: err,
        });
      } else {
        if (data.length > 0) {
          // CSV Headers
          const headers = [
            'Drop Date', 'Drop Time', 'Prize ID', 'Prize Description', 'Value (AUD)',
            'Latitude', 'Longitude', 'RNG Seed', 'Product'
          ];

          // Convert to CSV
          const csvRows = [headers.join(',')];
          
          data.forEach(entry => {
            const row = [
              moment(entry.DropDate).format('DD/MM/YYYY'),
              entry.DropTime,
              `"${entry.PrizeId}"`,
              `"${entry.PrizeDescription}"`,
              entry.Value,
              entry.Latitude,
              entry.Longitude,
              `"${entry.RNGSeed}"`,
              `"${entry.MainPrizePoolId ? entry.MainPrizePoolId.Product : 'N/A'}"`
            ];
            csvRows.push(row.join(','));
          });

          const csv = csvRows.join('\n');
          const fileName = `RNGData_${moment().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
          
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          return res.send(csv);
        } else {
          res.json({
            success: false,
            message: 'No data to export',
            data: []
          });
        }
      }
    });
};

// Get RNG data statistics
exports.getStats = function (req, res) {
  const query = { IsDeleted: false };
  
  // Date filtering
  if (req.query.startDate && req.query.endDate) {
    const startDate = moment(req.query.startDate, 'DD/MM/YYYY').startOf('day').toDate();
    const endDate = moment(req.query.endDate, 'DD/MM/YYYY').endOf('day').toDate();
    query.DropDate = { $gte: startDate, $lte: endDate };
  }

  RNGData.countDocuments(query, function (err, count) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: 'RNG Data Statistics',
        data: {
          lines: count,
        },
      });
    }
  });
};

