const mongoose = require('mongoose');
const schema = mongoose.Schema;

const prizePoolDataSchema = new schema({
  Date: {
    type: Date,
    required: true,
  },
  Time: {
    type: String,
    required: true, // e.g., "14:22:00"
  },
  PrizeId: {
    type: String,
    required: true, // e.g., "PZ-883"
  },
  PrizeDescription: {
    type: String,
    required: true, // e.g., "iPhone 6"
  },
  Value: {
    type: Number,
    required: true, // Value in AUD
  },
  From: {
    type: String,
    required: true, // e.g., "Gotcha System", "Player_122", "Player_314"
  },
  To: {
    type: String,
    required: true, // e.g., "Player_122", "Player_314", "Gotcha HQ"
  },
  EventType: {
    type: String,
    enum: ['Claimed', 'Stolen', '24 Hour Timer Ended', 'Created', 'Rewarded', 'Auto-transfer'],
    required: true,
  },
  Status: {
    type: String,
    enum: ['Active', 'Rewarded', 'Expired', 'Stolen'],
    default: 'Active',
  },
  Notes: {
    type: String,
    default: '', // e.g., "Dropped to map", "Auto-transfer event", "Rewarded User With Prize"
  },
  UserIdVerified: {
    type: Boolean,
    default: false,
  },
  UserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    default: null, // Reference to user if applicable
  },
  PromotionalPeriod: {
    type: String,
    default: '', // e.g., "30 Oct - 28 Nov 2025"
  },
  PrizeEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'prizes',
    default: null, // Reference to the prize entry
  },
  RNGDataId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'rng-data',
    default: null, // Reference to RNG data entry
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
prizePoolDataSchema.index({ Date: -1, Time: -1 });
prizePoolDataSchema.index({ PrizeId: 1 });
prizePoolDataSchema.index({ Status: 1, EventType: 1 });
prizePoolDataSchema.index({ IsDeleted: 1 });
prizePoolDataSchema.index({ UserId: 1 });

const PrizePoolData = (module.exports = mongoose.model('prize-pool-data', prizePoolDataSchema));

