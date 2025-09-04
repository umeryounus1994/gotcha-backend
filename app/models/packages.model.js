const mongoose = require('mongoose');
const schema = mongoose.Schema;

const packagesSchema = new schema({
  Name: {
    type: String,
    required: true,
  },
  Price: {
    type: Number,
    required: true,
  },
  Coins: {
    type: Number,
    required: true,
  },
  FreeCoins: {
    type: Number
  },
  PackageImage: {
    type: String,
    default: null,
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

const Packages = (module.exports = mongoose.model('packages', packagesSchema));
