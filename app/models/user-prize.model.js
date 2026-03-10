const mongoose = require('mongoose');
const schema = mongoose.Schema;

const trackingHistorySchema = new schema(
  {
    Status: {
      type: String,
      required: true,
    },
    Location: {
      type: String,
      default: '',
    },
    Timestamp: {
      type: Date,
      default: Date.now,
    },
    Raw: {
      type: Object,
      default: null,
    },
  },
  { _id: false }
);

const userPrizeSchema = new schema({
  UserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  PrizeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'prizes',
    required: true,
  },
  Status: {
    type: String,
    enum: ['active', 'secured', 'waiting', 'processing', 'shipped', 'cancelled'],
    default: 'active',
  },
  SecuredAt: {
    type: Date,
    default: null,
  },
  ProcessingStartsAt: {
    type: Date,
    default: null,
  },
  ShippedAt: {
    type: Date,
    default: null,
  },
  ShopifyOrderId: {
    type: String,
    default: '',
  },
  TrackingNumber: {
    type: String,
    default: '',
  },
  TrackingHistory: {
    type: [trackingHistorySchema],
    default: [],
  },
  Notes: {
    type: String,
    default: '',
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

userPrizeSchema.index({ UserId: 1, Status: 1 });
userPrizeSchema.index({ PrizeId: 1 });

const UserPrize = (module.exports = mongoose.model('user-prizes', userPrizeSchema));

