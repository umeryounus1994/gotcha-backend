const mongoose = require('mongoose');
const schema = mongoose.Schema;

const packagesSchema = new schema({
  Name: {
    type: String,
    required: true,
  },
  Price: {
    type: String,
    required: true,
  },
  Coins: {
    type: Number,
    required: true,
  },
  FreeCoins: {
    type: Number
  },
  FreeCoinsText: {
    type: String
  },
  PackageImage: {
    type: String,
    default: null,
  }, 
  IsBanner: {
    type: Boolean,
    default: false,
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
