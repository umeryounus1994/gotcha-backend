const PrizePoolData = require('../models/prize-pool-data.model');
const moment = require('moment-timezone');
const excel = require('node-excel-export');
const mongoose = require('mongoose');

// List all prize pool data entries with optional date filtering
exports.list = function (req, res) {
  const query = { IsDeleted: false };
  
  // Promotional period filtering (current month, next month, or specific month)
  if (req.query.promotionalPeriod) {
    const period = req.query.promotionalPeriod.toLowerCase();
    const nowAEST = moment().tz('Australia/Sydney');
    
    if (period === 'current' || period === 'currentmonth') {
      // Filter by current month's promotional period
      const monthStart = nowAEST.clone().startOf('month').add(1, 'second');
      const monthEnd = nowAEST.clone().endOf('month').subtract(1, 'second');
      const timezone = nowAEST.isDST() ? 'AEDT' : 'AEST';
      const promoStartStr = monthStart.format('D MMM YYYY h:mm:ss a');
      const promoEndStr = monthEnd.format('D MMM YYYY h:mm:ss a');
      const promoPeriodPattern = `${promoStartStr} - ${promoEndStr} ${timezone}`;
      query.PromotionalPeriod = promoPeriodPattern;
    } else if (period === 'next' || period === 'nextmonth') {
      // Filter by next month's promotional period
      const nextMonth = nowAEST.clone().add(1, 'month');
      const monthStart = nextMonth.clone().startOf('month').add(1, 'second');
      const monthEnd = nextMonth.clone().endOf('month').subtract(1, 'second');
      const timezone = nextMonth.isDST() ? 'AEDT' : 'AEST';
      const promoStartStr = monthStart.format('D MMM YYYY h:mm:ss a');
      const promoEndStr = monthEnd.format('D MMM YYYY h:mm:ss a');
      const promoPeriodPattern = `${promoStartStr} - ${promoEndStr} ${timezone}`;
      query.PromotionalPeriod = promoPeriodPattern;
    } else {
      // Custom promotional period string match
      query.PromotionalPeriod = { $regex: req.query.promotionalPeriod, $options: 'i' };
    }
  }
  
  // Date filtering
  if (req.query.startDate && req.query.endDate) {
    const startDate = moment(req.query.startDate, 'DD/MM/YYYY').startOf('day').toDate();
    const endDate = moment(req.query.endDate, 'DD/MM/YYYY').endOf('day').toDate();
    query.Date = { $gte: startDate, $lte: endDate };
  }

  // Optional status filter
  if (req.query.status) {
    query.Status = req.query.status;
  }

  // Optional event type filter
  if (req.query.eventType) {
    query.EventType = req.query.eventType;
  }

  PrizePoolData.find(query)
    .populate('UserId', 'FullName Email')
    .populate('PrizeEntryId', 'PrizeId PrizeDescription')
    .sort({ Date: -1, Time: -1 })
    .exec(function (err, data) {
      if (err) {
        res.json({
          success: false,
          message: 'Server Error',
          data: err,
        });
      } else {
        // Calculate total prize pool value
        const totalValue = data.reduce((sum, entry) => sum + (entry.Value || 0), 0);

        res.json({
          success: true,
          message: data.length + ' Records Found.',
          data: data,
          lines: data.length,
          totalPoolValue: totalValue,
        });
      }
    });
};

// Add new prize pool data entry (usually done automatically, but can be manual)
exports.add = function (req, res) {
  const entryForm = req.body;
  const now = moment();

  const entry = new PrizePoolData();
  entry.Date = entryForm.Date ? moment(entryForm.Date).toDate() : now.toDate();
  entry.Time = entryForm.Time || now.format('HH:mm:ss');
  entry.PrizeId = entryForm.PrizeId;
  entry.PrizeDescription = entryForm.PrizeDescription;
  entry.Value = entryForm.Value;
  entry.From = entryForm.From || 'Gotcha System';
  entry.To = entryForm.To || 'Map';
  entry.EventType = entryForm.EventType || 'Created';
  entry.Status = entryForm.Status || 'Active';
  entry.Notes = entryForm.Notes || '';
  entry.UserIdVerified = entryForm.UserIdVerified || false;
  entry.UserId = entryForm.UserId || null;
  entry.PromotionalPeriod = entryForm.PromotionalPeriod || '';
  entry.PrizeEntryId = entryForm.PrizeEntryId || null;
  entry.RNGDataId = entryForm.RNGDataId || null;

  entry.save(function (err, result) {
    if (err) {
      res.json({
        success: false,
        message: 'Error in Connecting to DB',
        data: err,
      });
    } else {
      res.json({
        success: true,
        message: 'Successfully Added!',
        data: result,
      });
    }
  });
};

// Update prize pool data entry
exports.update = function (req, res) {
  const Id = req.body.Id;
  const entryForm = req.body;

  const selection = { _id: Id };
  const updatedData = {};

  if (entryForm.Status) updatedData.Status = entryForm.Status;
  if (entryForm.Notes) updatedData.Notes = entryForm.Notes;
  if (entryForm.UserIdVerified !== undefined) updatedData.UserIdVerified = entryForm.UserIdVerified;
  if (entryForm.EventType) updatedData.EventType = entryForm.EventType;
  if (entryForm.To) updatedData.To = entryForm.To;

  PrizePoolData.updateOne(selection, updatedData, function (err, doc) {
    if (err) {
      res.json({
        success: false,
        message: 'Validation Error',
        data: err,
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

// Get claimed prizes by month (current month or next month)
exports.getClaimedByMonth = function (req, res) {
  const query = { 
    IsDeleted: false,
    EventType: 'Claimed' // Only get claimed prizes
  };
  
  const month = req.query.month ? req.query.month.toLowerCase() : 'current';
  const nowAEST = moment().tz('Australia/Sydney');
  
  let monthStart, monthEnd, timezone, promoPeriodPattern;
  
  if (month === 'current' || month === 'currentmonth') {
    // Current month
    monthStart = nowAEST.clone().startOf('month').add(1, 'second');
    monthEnd = nowAEST.clone().endOf('month').subtract(1, 'second');
    timezone = nowAEST.isDST() ? 'AEDT' : 'AEST';
  } else if (month === 'next' || month === 'nextmonth') {
    // Next month
    const nextMonth = nowAEST.clone().add(1, 'month');
    monthStart = nextMonth.clone().startOf('month').add(1, 'second');
    monthEnd = nextMonth.clone().endOf('month').subtract(1, 'second');
    timezone = nextMonth.isDST() ? 'AEDT' : 'AEST';
  } else {
    // Invalid month parameter
    return res.json({
      success: false,
      message: 'Invalid month parameter. Use "current" or "next"',
      data: null,
    });
  }
  
  promoPeriodPattern = `${monthStart.format('D MMM YYYY h:mm:ss a')} - ${monthEnd.format('D MMM YYYY h:mm:ss a')} ${timezone}`;
  query.PromotionalPeriod = promoPeriodPattern;
  
  PrizePoolData.find(query)
    .populate('UserId', 'FullName Email')
    .populate('PrizeEntryId', 'PrizeId PrizeDescription')
    .sort({ Date: -1, Time: -1 })
    .exec(function (err, data) {
      if (err) {
        res.json({
          success: false,
          message: 'Server Error',
          data: err,
        });
      } else {
        const totalValue = data.reduce((sum, entry) => sum + (entry.Value || 0), 0);
        const uniqueUsers = new Set();
        data.forEach(entry => {
          if (entry.UserId) {
            uniqueUsers.add(entry.UserId._id.toString());
          }
        });
        
        res.json({
          success: true,
          message: `${data.length} claimed prize(s) found for ${month} month`,
          data: {
            prizes: data,
            count: data.length,
            totalValue: totalValue,
            uniqueUsers: uniqueUsers.size,
            promotionalPeriod: promoPeriodPattern,
            month: month
          },
        });
      }
    });
};

// Get prize pool data statistics
exports.getStats = function (req, res) {
  const query = { IsDeleted: false };
  
  // Promotional period filtering
  if (req.query.promotionalPeriod) {
    const period = req.query.promotionalPeriod.toLowerCase();
    const nowAEST = moment().tz('Australia/Sydney');
    
    if (period === 'current' || period === 'currentmonth') {
      const monthStart = nowAEST.clone().startOf('month').add(1, 'second');
      const monthEnd = nowAEST.clone().endOf('month').subtract(1, 'second');
      const timezone = nowAEST.isDST() ? 'AEDT' : 'AEST';
      const promoPeriodPattern = `${monthStart.format('D MMM YYYY h:mm:ss a')} - ${monthEnd.format('D MMM YYYY h:mm:ss a')} ${timezone}`;
      query.PromotionalPeriod = promoPeriodPattern;
    } else if (period === 'next' || period === 'nextmonth') {
      const nextMonth = nowAEST.clone().add(1, 'month');
      const monthStart = nextMonth.clone().startOf('month').add(1, 'second');
      const monthEnd = nextMonth.clone().endOf('month').subtract(1, 'second');
      const timezone = nextMonth.isDST() ? 'AEDT' : 'AEST';
      const promoPeriodPattern = `${monthStart.format('D MMM YYYY h:mm:ss a')} - ${monthEnd.format('D MMM YYYY h:mm:ss a')} ${timezone}`;
      query.PromotionalPeriod = promoPeriodPattern;
    }
  }
  
  // Date filtering
  if (req.query.startDate && req.query.endDate) {
    const startDate = moment(req.query.startDate, 'DD/MM/YYYY').startOf('day').toDate();
    const endDate = moment(req.query.endDate, 'DD/MM/YYYY').endOf('day').toDate();
    query.Date = { $gte: startDate, $lte: endDate };
  }

  PrizePoolData.find(query, function (err, data) {
    if (err) {
      res.json({
        success: false,
        message: 'Server Error',
        data: err,
      });
    } else {
      const totalValue = data.reduce((sum, entry) => sum + (entry.Value || 0), 0);
      
      res.json({
        success: true,
        message: 'Prize Pool Data Statistics',
        data: {
          lines: data.length,
          totalPoolValue: totalValue,
        },
      });
    }
  });
};

// Export Prize Pool Data to Excel
exports.exportExcel = function (req, res) {
  const query = { IsDeleted: false };
  
  // Date filtering
  if (req.query.startDate && req.query.endDate) {
    const startDate = moment(req.query.startDate, 'DD/MM/YYYY').startOf('day').toDate();
    const endDate = moment(req.query.endDate, 'DD/MM/YYYY').endOf('day').toDate();
    query.Date = { $gte: startDate, $lte: endDate };
  }

  // Optional status filter
  if (req.query.status) {
    query.Status = req.query.status;
  }

  // Optional event type filter
  if (req.query.eventType) {
    query.EventType = req.query.eventType;
  }

  PrizePoolData.find(query)
    .populate('UserId', 'FullName Email')
    .sort({ Date: -1, Time: -1 })
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
            Date: moment(entry.Date).format('DD/MM/YYYY'),
            Time: entry.Time,
            PrizeId: entry.PrizeId,
            PrizeDescription: entry.PrizeDescription,
            Value: entry.Value,
            From: entry.From,
            To: entry.To,
            EventType: entry.EventType,
            Status: entry.Status,
            Notes: entry.Notes || '',
            UserIdVerified: entry.UserIdVerified ? 'Yes' : 'No',
            UserName: entry.UserId ? (entry.UserId.FullName || 'N/A') : 'N/A',
            UserEmail: entry.UserId ? (entry.UserId.Email || 'N/A') : 'N/A',
            PromotionalPeriod: entry.PromotionalPeriod || ''
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
            Date: {
              displayName: 'Date',
              headerStyle: styles.headerDark,
              width: 120
            },
            Time: {
              displayName: 'Time',
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
            From: {
              displayName: 'From',
              headerStyle: styles.headerDark,
              width: 150
            },
            To: {
              displayName: 'To',
              headerStyle: styles.headerDark,
              width: 150
            },
            EventType: {
              displayName: 'Event Type',
              headerStyle: styles.headerDark,
              width: 150
            },
            Status: {
              displayName: 'Status',
              headerStyle: styles.headerDark,
              width: 100
            },
            Notes: {
              displayName: 'Notes',
              headerStyle: styles.headerDark,
              width: 250
            },
            UserIdVerified: {
              displayName: 'User ID Verified',
              headerStyle: styles.headerDark,
              width: 120
            },
            UserName: {
              displayName: 'User Name',
              headerStyle: styles.headerDark,
              width: 150
            },
            UserEmail: {
              displayName: 'User Email',
              headerStyle: styles.headerDark,
              width: 200
            },
            PromotionalPeriod: {
              displayName: 'Promotional Period',
              headerStyle: styles.headerDark,
              width: 200
            }
          };

          const heading = [
            ['Prize Pool Data Export', 'A1', 'N1']
          ];

          const merges = [
            { start: { row: 1, column: 1 }, end: { row: 1, column: 14 } }
          ];

          const report = excel.buildExport([
            {
              name: 'Prize Pool Data',
              heading: heading,
              merges: merges,
              specification: specification,
              data: exportData
            }
          ]);

          const fileName = `PrizePoolData_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
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

// Export Prize Pool Data to CSV
exports.exportCSV = function (req, res) {
  const query = { IsDeleted: false };
  
  // Date filtering
  if (req.query.startDate && req.query.endDate) {
    const startDate = moment(req.query.startDate, 'DD/MM/YYYY').startOf('day').toDate();
    const endDate = moment(req.query.endDate, 'DD/MM/YYYY').endOf('day').toDate();
    query.Date = { $gte: startDate, $lte: endDate };
  }

  PrizePoolData.find(query)
    .populate('UserId', 'FullName Email')
    .sort({ Date: -1, Time: -1 })
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
            'Date', 'Time', 'Prize ID', 'Prize Description', 'Value (AUD)',
            'From', 'To', 'Event Type', 'Status', 'Notes',
            'User ID Verified', 'User Name', 'User Email', 'Promotional Period'
          ];

          // Convert to CSV
          const csvRows = [headers.join(',')];
          
          data.forEach(entry => {
            const row = [
              moment(entry.Date).format('DD/MM/YYYY'),
              entry.Time,
              `"${entry.PrizeId}"`,
              `"${entry.PrizeDescription}"`,
              entry.Value,
              `"${entry.From}"`,
              `"${entry.To}"`,
              `"${entry.EventType}"`,
              `"${entry.Status}"`,
              `"${(entry.Notes || '').replace(/"/g, '""')}"`,
              entry.UserIdVerified ? 'Yes' : 'No',
              `"${entry.UserId ? (entry.UserId.FullName || 'N/A') : 'N/A'}"`,
              `"${entry.UserId ? (entry.UserId.Email || 'N/A') : 'N/A'}"`,
              `"${entry.PromotionalPeriod || ''}"`
            ];
            csvRows.push(row.join(','));
          });

          const csv = csvRows.join('\n');
          const fileName = `PrizePoolData_${moment().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
          
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

// Mark prize as rewarded
exports.markRewarded = async function (req, res) {
  const prizePoolDataId = req.body.Id || req.body.prizeEntryId;
  const notes = req.body.notes || 'Rewarded User With Prize';

  if (!prizePoolDataId) {
    return res.json({
      success: false,
      message: 'Prize Pool Data ID is required',
      data: null,
    });
  }

  try {
    // Validate ObjectId format

    if (!mongoose.Types.ObjectId.isValid(prizePoolDataId)) {
      return res.json({
        success: false,
        message: 'Invalid Prize Pool Data ID format',
        data: null,
      });
    }

    // Find the prize pool entry by its _id
    const entry = await PrizePoolData.findById(prizePoolDataId);

    if (!entry) {
      return res.json({
        success: false,
        message: 'Prize pool entry not found',
        data: null,
      });
    }

    if (entry.Status === 'Rewarded') {
      return res.json({
        success: false,
        message: 'Prize pool entry is already marked as rewarded',
        data: null,
      });
    }

    // Update status
    entry.Status = 'Rewarded';
    entry.EventType = 'Rewarded';
    entry.Notes = notes;
    entry.To = 'Gotcha HQ';
    await entry.save();

    res.json({
      success: true,
      message: 'Prize marked as rewarded!',
      data: entry,
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Server Error',
      data: error,
    });
  }
};

