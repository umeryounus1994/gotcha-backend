const mongoose = require('mongoose');
const schema = mongoose.Schema;

const markerTypesSchema = new schema({
  Name: {
    type: String,
    required: true,
  },
  Picture:  {
    type: String,
    default: "",
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

const MarkerTypes = (module.exports = mongoose.model(
  'marker-types',
  markerTypesSchema
));
