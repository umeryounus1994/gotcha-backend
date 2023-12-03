const mongoose = require('mongoose');
const schema = mongoose.Schema;

const areaListSchema = new schema({
  Name: {
    type: String,
    required: true,
  },
  Category: String,
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

const AreaLists = (module.exports = mongoose.model(
  'area-lists',
  areaListSchema
));
