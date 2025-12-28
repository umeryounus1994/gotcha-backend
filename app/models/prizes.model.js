const mongoose = require('mongoose');
const schema = mongoose.Schema;

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const prizesSchema = new schema({
  PrizeId: {
    type: String,
    required: true,
    unique: true, // e.g., "PZ-883"
  },
  MainPrizePoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'main-prize-pool',
    required: true,
  },
  PrizeDescription: {
    type: String,
    required: true, // e.g., "iPhone 6", "DJI Osmo Mobile SE Gimbal"
  },
  PrizeValue: {
    type: Number,
    required: true, // Value in AUD
  },
  Location: {
    type: pointSchema,
    required: true,
  },
  RNGSeed: {
    type: String,
    default: '', // RNG seed used for this drop
  },
  ClaimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    default: null,
  },
  Status: {
    type: String,
    enum: ['Active', 'Claimed', 'Stolen', 'Expired', 'Rewarded'],
    default: 'Active',
  },
  DropDate: {
    type: Date,
    required: true,
  },
  DropTime: {
    type: String,
    required: true, // e.g., "14:22:00"
  },
  ExpireDate: {
    type: Date,
    default: null, // Optional expiration date
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

// Create geospatial index for efficient nearby queries
prizesSchema.index({ Location: '2dsphere' });
prizesSchema.index({ Status: 1, IsActive: 1, IsDeleted: 1 });
prizesSchema.index({ PrizeId: 1 });
prizesSchema.index({ DropDate: -1 });

const Prizes = (module.exports = mongoose.model('prizes', prizesSchema));

