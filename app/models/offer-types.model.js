const mongoose = require('mongoose');
const schema = mongoose.Schema;

const offerTypesSchema = new schema({
  Name: {
    type: String,
    required: true,
  },
  Category: String,
  AppPicture:  {
    type: String,
    default: null,
  },
  ModelPicture:  {
    type: String,
    default: null,
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

const OfferTypes = (module.exports = mongoose.model(
  'offer-types',
  offerTypesSchema
));
