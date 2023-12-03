const mongoose = require('mongoose');
const schema = mongoose.Schema;

const sponsorSchema = new schema({
  IsOwner: {
    type: Boolean,
    required: true,
    default: false,
  },
  Package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'packages',
  },
  BusinessName: {
    type: String,
    required: true,
  },
  BusinessWebsite: {
    type: String,
    required: true,
  },
  BusinessLogo: {
    type: String,
  },
  ContactName: {
    type: String,
    default: null,
  },
  ContactNumber: {
    type: String,
    default: null,
  },
  ContactEmail: {
    type: String,
    default: null,
  },
  Email: {
    type: String,
    required: true,
  },
  Password: {
    type: String,
    required: true,
  },
  IsActive: {
    type: Boolean,
    default: true,
  },
  CreationTimestamp: {
    type: Date,
    default: Date.now,
  },
});

const Sponsors = (module.exports = mongoose.model('sponsors', sponsorSchema));
