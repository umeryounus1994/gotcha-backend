const mongoose = require('mongoose');
const schema = mongoose.Schema;

const notificationSchema = new schema({
  Name: {
    type: String,
    required: true,
  },
  Description: {
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

const Notifications = (module.exports = mongoose.model(
  'notifications',
  notificationSchema
));
