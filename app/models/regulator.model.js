const mongoose = require('mongoose');
const schema = mongoose.Schema;

const regulatorSchema = new schema({
  Email: {
    type: String,
    required: true,
    unique: true,
  },
  Password: {
    type: String,
    required: true,
  },
  FullName: {
    type: String,
    required: true,
  },
  Role: {
    type: String,
    enum: ['Regulator', 'Admin'],
    default: 'Regulator',
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

const Regulator = (module.exports = mongoose.model('regulators', regulatorSchema));

