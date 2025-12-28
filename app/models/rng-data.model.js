const mongoose = require('mongoose');
const schema = mongoose.Schema;

const rngDataSchema = new schema({
  DropDate: {
    type: Date,
    required: true,
  },
  DropTime: {
    type: String,
    required: true, // e.g., "8:03:15"
  },
  PrizeId: {
    type: String,
    required: true, // e.g., "prize_001", "PZ-883"
  },
  PrizeDescription: {
    type: String,
    required: true, // e.g., "Apple iPhone 16 Pro Max"
  },
  Value: {
    type: Number,
    required: true, // Value in AUD
  },
  Latitude: {
    type: Number,
    required: true,
  },
  Longitude: {
    type: Number,
    required: true,
  },
  RNGSeed: {
    type: String,
    required: true, // e.g., "seed_987654"
  },
  MainPrizePoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'main-prize-pool',
    required: true,
  },
  PrizeEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'prizes',
    default: null, // Reference to the prize entry created
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
rngDataSchema.index({ DropDate: -1, DropTime: -1 });
rngDataSchema.index({ PrizeId: 1 });
rngDataSchema.index({ IsDeleted: 1, IsActive: 1 });

const RNGData = (module.exports = mongoose.model('rng-data', rngDataSchema));

