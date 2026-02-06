const mongoose = require('mongoose');
const schema = mongoose.Schema;

const affiliateSchema = new schema({
  FullName: {
    type: String,
    required: true,
  },
  Email: {
    type: String,
    required: true,
    unique: true,
  },
  Password: {
    type: String,
    required: true,
  },
  AffiliateURL: {
    type: String,
    required: true,
    unique: true,
  },
  TrackingID: {
    type: String,
    required: true,
    unique: true,
  },
  PayoutsDriveUrl: {
    type: String,
    default: '',
  },
  Status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
  },
  RegistrationDate: {
    type: Date,
    default: Date.now,
  },
  CreationTimestamp: {
    type: Date,
    default: Date.now,
  },
});

const Affiliates = (module.exports = mongoose.model('affiliates', affiliateSchema));
