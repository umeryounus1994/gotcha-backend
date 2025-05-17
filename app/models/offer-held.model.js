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

const offersHeldSchema = new schema({
  OfferId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'offers',
    required: true,
  },
  HeldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
  },
  Location: {
    type: pointSchema,
    required: true,
  },
  IsActive: {
    type: Boolean,
    default: false,
  },
  Status: {
    type: String,
    default: "pending", // pending, requested
  },
  CreationTimestamp: {
    type: Date
  },
  UpdatedTimestamp: {
    type: Date,
    default: Date.now
  },
});

const OffersHeld = (module.exports = mongoose.model('offersHeld', offersHeldSchema));
