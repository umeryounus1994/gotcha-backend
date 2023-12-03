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

const offersSchema = new schema({
  Type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'offer-types',
    required: false,
  },
  MarkerType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'marker-types',
    required: false,
  },
  ClaimedBy: [{
    UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'users'},
    CreationTimestamp: {type: Date},
    AvailabilityTimestamp: {type: Date}
  }],
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
    default: ''
    // required: true,
  },
  LinkButtonText: {
    type: String,
    default: ''
  },
  Email: {
    type: String,
    // required: true,
  },
  Name: {
    type: String,
    required: true,
  },
  Expire: {
    type: Date,
    required: true,
  },
  Location: {
    type: pointSchema,
    required: true,
  },
  IsActive: {
    type: Boolean,
    default: true,
  },
  ReAppear: {
    type: Boolean,
    default: false,
  },
  ReAppearTime: {
    type: Number,
    default: 0
  },
  CreationTimestamp: {
    type: Date,
    default: Date.now,
  },
});

const Offers = (module.exports = mongoose.model('offers', offersSchema));
