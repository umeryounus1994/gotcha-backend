const mongoose = require('mongoose');
const schema = mongoose.Schema;

const versionSchema = new schema({
  Version: {
    type: String,
    required: true,
  },
  BuildNumber: {
    type: String,
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

const Versions = (module.exports = mongoose.model('version', versionSchema));