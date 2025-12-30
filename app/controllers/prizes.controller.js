const Prizes = require('../models/prizes.model');
const PrizePoolData = require('../models/prize-pool-data.model');
const Users = require('../models/users.model');
const moment = require('moment');

// List all prizes (with optional filters)
exports.list = function (req, res) {
  const query = { IsDeleted: false };
  
  // Optional filters
  if (req.query.status) {
    query.Status = req.query.status;
  }
  if (req.query.userId) {
    query.ClaimedBy = req.query.userId;
  }

  Prizes.find(query)
    .populate('MainPrizePoolId', 'Product PrizeValue')
    .populate('ClaimedBy', 'FullName Email')
    .sort({ CreationTimestamp: -1 })
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
        });
      }
    });
};

// Get prizes near user location (for user-facing API)
exports.getNearby = function (req, res) {
  const lat = parseFloat(req.body.latitude);
  const lng = parseFloat(req.body.longitude);
  const distance = parseInt(req.body.distance) || 1000; // Default 1km

  if (!lat || !lng) {
    return res.json({
      success: false,
      message: 'Latitude and Longitude are required',
      data: null,
    });
  }

  const query = {
    IsDeleted: false,
    IsActive: true,
    Status: 'Active',
    Location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: distance,
      },
    },
  };

  Prizes.find(query)
    .populate('MainPrizePoolId', 'Product PrizeValue SKUPhoto')
    .sort({ CreationTimestamp: -1 })
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
          message: data.length + ' Prizes Found.',
          data: data,
        });
      }
    });
};

// Claim a prize
exports.claim = async function (req, res) {
  const prizeId = req.body.prizeId;
  const userId = req.body.userId;

  if (!prizeId || !userId) {
    return res.json({
      success: false,
      message: 'Prize ID and User ID are required',
      data: null,
    });
  }

  try {
    const prize = await Prizes.findById(prizeId);
    if (!prize) {
      return res.json({
        success: false,
        message: 'Prize not found',
        data: null,
      });
    }

    if (prize.Status !== 'Active') {
      return res.json({
        success: false,
        message: `Prize is not available for claiming. Current status: ${prize.Status}`,
        data: null,
      });
    }

    // Check if prize has already been claimed by someone else (race condition protection)
    if (prize.ClaimedBy && prize.ClaimedBy.toString() !== userId.toString()) {
      return res.json({
        success: false,
        message: 'Prize has already been claimed by another user',
        data: null,
      });
    }

    // Get user info
    const user = await Users.findById(userId);
    if (!user) {
      return res.json({
        success: false,
        message: 'User not found',
        data: null,
      });
    }

    // Update prize status
    prize.Status = 'Claimed';
    prize.ClaimedBy = userId;
    await prize.save();

    // Create Prize Pool Data entry for audit trail
    const now = moment();
    const prizePoolEntry = new PrizePoolData();
    prizePoolEntry.Date = now.toDate();
    prizePoolEntry.Time = now.format('HH:mm:ss');
    prizePoolEntry.PrizeId = prize.PrizeId;
    prizePoolEntry.PrizeDescription = prize.PrizeDescription;
    prizePoolEntry.Value = prize.PrizeValue;
    prizePoolEntry.From = 'Gotcha System';
    prizePoolEntry.To = `Player_${userId}`;
    prizePoolEntry.EventType = 'Claimed';
    prizePoolEntry.Status = 'Active';
    prizePoolEntry.Notes = 'Prize claimed by user';
    prizePoolEntry.UserIdVerified = false; // Can be updated later
    prizePoolEntry.UserId = userId;
    prizePoolEntry.PrizeEntryId = prize._id;
    await prizePoolEntry.save();

    res.json({
      success: true,
      message: 'Prize successfully claimed!',
      data: prize,
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Server Error',
      data: error,
    });
  }
};

// Get single prize details
exports.getById = function (req, res) {
  const prizeId = req.params.id || req.body.prizeId;

  Prizes.findById(prizeId)
    .populate('MainPrizePoolId', 'Product PrizeValue SKUPhoto')
    .populate('ClaimedBy', 'FullName Email')
    .exec(function (err, data) {
      if (err) {
        res.json({
          success: false,
          message: 'Server Error',
          data: err,
        });
      } else if (!data) {
        res.json({
          success: false,
          message: 'Prize not found',
          data: null,
        });
      } else {
        res.json({
          success: true,
          message: 'Prize found',
          data: data,
        });
      }
    });
};

// Mark prize as stolen
exports.markStolen = async function (req, res) {
  const prizeId = req.body.prizeId;
  const stolenByUserId = req.body.stolenByUserId;
  const notes = req.body.notes || 'Prize stolen';

  if (!prizeId) {
    return res.json({
      success: false,
      message: 'Prize ID is required',
      data: null,
    });
  }

  try {
    const prize = await Prizes.findById(prizeId);
    if (!prize) {
      return res.json({
        success: false,
        message: 'Prize not found',
        data: null,
      });
    }

    if (prize.Status !== 'Active') {
      return res.json({
        success: false,
        message: 'Prize is not available',
        data: null,
      });
    }

    // Update prize status
    prize.Status = 'Stolen';
    if (stolenByUserId) {
      prize.ClaimedBy = stolenByUserId;
    }
    await prize.save();

    // Get user info if provided
    let userInfo = 'Unknown';
    if (stolenByUserId) {
      const user = await Users.findById(stolenByUserId);
      userInfo = user ? `Player_${stolenByUserId}` : `Player_${stolenByUserId}`;
    }

    // Create Prize Pool Data entry
    const now = moment();
    const prizePoolEntry = new PrizePoolData();
    prizePoolEntry.Date = now.toDate();
    prizePoolEntry.Time = now.format('HH:mm:ss');
    prizePoolEntry.PrizeId = prize.PrizeId;
    prizePoolEntry.PrizeDescription = prize.PrizeDescription;
    prizePoolEntry.Value = prize.PrizeValue;
    prizePoolEntry.From = 'Gotcha System';
    prizePoolEntry.To = userInfo;
    prizePoolEntry.EventType = 'Stolen';
    prizePoolEntry.Status = 'Active';
    prizePoolEntry.Notes = notes;
    prizePoolEntry.UserId = stolenByUserId || null;
    prizePoolEntry.PrizeEntryId = prize._id;
    await prizePoolEntry.save();

    res.json({
      success: true,
      message: 'Prize marked as stolen!',
      data: prize,
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Server Error',
      data: error,
    });
  }
};

// Manually expire a prize (admin/manual trigger)
exports.handleTimerEnded = async function (req, res) {
  const prizeId = req.body.prizeId;
  const notes = req.body.notes || 'Prize manually expired';

  if (!prizeId) {
    return res.json({
      success: false,
      message: 'Prize ID is required',
      data: null,
    });
  }

  try {
    const prize = await Prizes.findById(prizeId);
    if (!prize) {
      return res.json({
        success: false,
        message: 'Prize not found',
        data: null,
      });
    }

    // Update prize status
    prize.Status = 'Expired';
    await prize.save();

    // Create Prize Pool Data entry
    const now = moment();
    const prizePoolEntry = new PrizePoolData();
    prizePoolEntry.Date = now.toDate();
    prizePoolEntry.Time = now.format('HH:mm:ss');
    prizePoolEntry.PrizeId = prize.PrizeId;
    prizePoolEntry.PrizeDescription = prize.PrizeDescription;
    prizePoolEntry.Value = prize.PrizeValue;
    prizePoolEntry.From = prize.ClaimedBy ? `Player_${prize.ClaimedBy}` : 'Gotcha System';
    prizePoolEntry.To = 'Gotcha HQ';
    prizePoolEntry.EventType = '24 Hour Timer Ended'; // Keep event type for backward compatibility
    prizePoolEntry.Status = 'Active';
    prizePoolEntry.Notes = notes;
    prizePoolEntry.UserId = prize.ClaimedBy || null;
    prizePoolEntry.PrizeEntryId = prize._id;
    
    // Preserve promotional period from original entry if exists
    const originalEntry = await PrizePoolData.findOne({ 
      PrizeEntryId: prize._id,
      EventType: 'Created'
    });
    if (originalEntry && originalEntry.PromotionalPeriod) {
      prizePoolEntry.PromotionalPeriod = originalEntry.PromotionalPeriod;
    }
    
    await prizePoolEntry.save();

    res.json({
      success: true,
      message: 'Prize expired successfully!',
      data: prize,
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Server Error',
      data: error,
    });
  }
};

