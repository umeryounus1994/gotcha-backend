const MainPrizePool = require('../models/main-prize-pool.model');
const Prizes = require('../models/prizes.model');
const moment = require('moment');

/**
 * Selects a prize from the main prize pool using weighted random selection
 * Skips prizes that have reached their daily max
 * @returns {Object|null} Selected prize object or null if no prize available
 */
exports.selectPrize = async function () {
  try {
    // Get current date for daily counter check
    const today = moment().startOf('day').toDate();
    
    // Find all active prizes
    const allPrizes = await MainPrizePool.find({
      IsActive: true,
      IsDeleted: false
    });

    if (allPrizes.length === 0) {
      return null; // No prizes available
    }

    // Reset daily counters for prizes that need it
    await MainPrizePool.updateMany(
      { LastResetDate: { $lt: today } },
      { 
        $set: { 
          DailyCounter: 0,
          LastResetDate: today
        } 
      }
    );

    // Reload prizes after reset to get updated counters
    const updatedPrizes = await MainPrizePool.find({
      IsActive: true,
      IsDeleted: false
    });

    // Filter prizes that haven't reached daily max
    const eligiblePrizes = updatedPrizes.filter(prize => {
      // If reset date is before today, it was just reset, so it's eligible
      if (moment(prize.LastResetDate).isBefore(today, 'day')) {
        return true;
      }
      // Otherwise check if counter is less than max
      return prize.DailyCounter < prize.MaxPerDay;
    });

    if (eligiblePrizes.length === 0) {
      return null;
    }

    // Calculate total weight
    const totalWeight = eligiblePrizes.reduce((sum, prize) => sum + prize.Rarity, 0);

    // Generate random number between 0 and totalWeight
    let random = Math.random() * totalWeight;

    // Select prize based on weighted random
    let selectedPrize = null;
    for (const prize of eligiblePrizes) {
      random -= prize.Rarity;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    // Fallback to first prize if selection failed (shouldn't happen)
    if (!selectedPrize) {
      selectedPrize = eligiblePrizes[0];
    }

    // Increment daily counter
    selectedPrize.DailyCounter += 1;
    if (moment(selectedPrize.LastResetDate).isBefore(today, 'day')) {
      selectedPrize.LastResetDate = today;
      selectedPrize.DailyCounter = 1; // Reset to 1 since we just used it
    }
    await selectedPrize.save();

    return selectedPrize;
  } catch (error) {
    console.error('Error in RNG prize selection:', error);
    return null;
  }
};

/**
 * Generates a random location on the map (restricted to Australia)
 * @param {Object} bounds - Optional bounds {minLat, maxLat, minLng, maxLng}
 *                          If not provided, uses Australia's geographic bounds
 * @returns {Object} {latitude, longitude}
 */
exports.generateRandomLocation = function (bounds = null) {
  // Australia's geographic bounds
  // Latitude: -43.6 (south) to -10.7 (north) - Full Australia including Tasmania
  // Longitude: 113.0 (west) to 153.6 (east) - Full Australia
  // 
  // For mainland Australia (more practical):
  // Latitude: -37.5 to -10.7
  // Longitude: 113.0 to 153.6
  //
  // For major populated areas (cities):
  // Latitude: -37.5 to -12.0
  // Longitude: 115.0 to 153.0
  
  const defaultBounds = {
    // Mainland Australia bounds (excluding remote islands)
    minLat: -37.5,   // Southernmost point (Victoria/Tasmania area)
    maxLat: -10.7,   // Northernmost point (Queensland)
    minLng: 113.0,   // Westernmost point (Western Australia)
    maxLng: 153.6    // Easternmost point (Queensland/NSW)
  };

  const b = bounds || defaultBounds;

  // Generate random coordinates within bounds
  const latitude = b.minLat + Math.random() * (b.maxLat - b.minLat);
  const longitude = b.minLng + Math.random() * (b.maxLng - b.minLng);

  return { latitude, longitude };
};

/**
 * Generates a unique RNG seed
 * @returns {String} RNG seed string
 */
exports.generateRNGSeed = function () {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `seed_${timestamp}_${random}`;
};

/**
 * Generates a unique Prize ID
 * @returns {String} Prize ID (e.g., "PZ-883")
 */
exports.generatePrizeId = async function () {

  let unique = false;
  let prizeId;
  
  while (!unique) {
    const randomNum = Math.floor(Math.random() * 9000) + 1000; // 4-digit number
    prizeId = `PZ-${randomNum}`;
    
    const existing = await Prizes.findOne({ PrizeId: prizeId });
    if (!existing) {
      unique = true;
    }
  }
  
  return prizeId;
};

