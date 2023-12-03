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

const offersClaimedSchema = new schema({
  OfferId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'offers',
    required: true,
  },
  Type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'offer-types',
    required: false,
  },
  ClaimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
  },
  OfferedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sponsors',
  },
  Value: {
    type: Number,
    required: true,
  },
  Icon: {
    type: String,
    // required: true,
  },
  Link: {
    type: String,
    // required: true,
  },
  Email: {
    type: String,
    // required: true,
  },
  Name: {
    type: String,
    required: true,
  },
  Location: {
    type: pointSchema,
    required: true,
  },
  IsSettled: {
    type: Boolean,
    default: false,
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
    type: Date,
    default: Date.now,
  },
});

const OffersClaimed = (module.exports = mongoose.model('offersClaimed', offersClaimedSchema));
