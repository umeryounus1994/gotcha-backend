const mongoose = require('mongoose');
const schema = mongoose.Schema;

const mainPrizePoolSchema = new schema({
  Product: {
    type: String,
    required: true,
  },
  SKUPhoto: {
    type: String,
    default: '',
  },
  Rarity: {
    type: Number,
    required: true,
    default: 1, // Higher number = more likely to appear
  },
  MaxPerDay: {
    type: Number,
    required: true,
    default: 1,
  },
  PrizeValue: {
    type: Number,
    required: true,
    default: 0, // Value in AUD
  },
  DailyCounter: {
    type: Number,
    default: 0, // Tracks how many times this prize was dropped today
  },
  LastResetDate: {
    type: Date,
    default: Date.now, // Track when daily counter was last reset
  },
  IsActive: {
    type: Boolean,
    default: true,
  },
  IsDeleted: {
    type: Boolean,
    default: false,
  },
  CreationTimestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for efficient queries
mainPrizePoolSchema.index({ IsActive: 1, IsDeleted: 1 });
mainPrizePoolSchema.index({ LastResetDate: 1 });

const MainPrizePool = (module.exports = mongoose.model('main-prize-pool', mainPrizePoolSchema));

