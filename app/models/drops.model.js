const mongoose = require('mongoose');
const schema = mongoose.Schema;

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const offerSchema = new mongoose.Schema({
  Type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sponsor',
    required: true,
  },
  Location: {
    type: pointSchema,
    required: true,
  },
});

const dropsSchema = new schema({
  Location: {
    type: pointSchema,
    required: true,
  },
  Offers: {
    type: [offerSchema],
    required: true,
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

const Games = (module.exports = mongoose.model('drops', dropsSchema));
