const mongoose = require('mongoose');
const schema = mongoose.Schema;

const affiliateSaleSchema = new schema({
  AffiliateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'affiliates',
    required: true,
  },
  Amount: {
    type: Number,
    required: true,
    default: 0,
  },
  SaleDate: {
    type: Date,
    default: Date.now,
  },
  UserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    default: null,
  },
  Notes: {
    type: String,
    default: '',
  },
  CreationTimestamp: {
    type: Date,
    default: Date.now,
  },
});

const AffiliateSale = (module.exports = mongoose.model('affiliate-sales', affiliateSaleSchema));
