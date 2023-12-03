const mongoose = require('mongoose');
const schema = mongoose.Schema;

const packagesSchema = new schema({
  Name: {
    type: String,
    required: true,
  },
  AllowedDrops: {
    type: Number,
    required: true,
  },
  Cost: {
    type: Number,
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

const Packages = (module.exports = mongoose.model('packages', packagesSchema));
