const mongoose = require('mongoose');
const schema = mongoose.Schema;

const fulfillmentPackageSchema = new schema({
  Name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  SubscriptionPriceWeekly: {
    type: Number,
    required: true, // 0 for free tiers like Rookie
    min: 0,
  },
  SecuredPrizesCap: {
    type: Number,
    required: true,
    min: 0,
  },
  ProcessingWindowDays: {
    type: Number,
    required: true,
    min: 1,
  },
  MaxShippedPerWeek: {
    type: Number,
    required: true,
    min: 0,
  },
  InsuranceAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  // For Hustler → Boss unlock rule (minimum paid duration in weeks)
  MinPaidWeeksForBoss: {
    type: Number,
    default: 0,
    min: 0,
  },
  Image: {
    type: String,
    default: null,
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

const FulfillmentPackage = (module.exports = mongoose.model('fulfillment-packages', fulfillmentPackageSchema));

