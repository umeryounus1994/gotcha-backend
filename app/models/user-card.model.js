const mongoose = require('mongoose');
const schema = mongoose.Schema;

const userCardsSchema = new schema({
  pmt_numb: {
    type: String,
    required: true,
  },
  exp_mm: {
    type: Number,
    required: true,
  },
  exp_yy: {
    type: Number,
    required: true,
  },
  pmt_key: {
    type: Number
  },
  cust_phone: {
    type: String,
    required: true,
  },
  cust_email: {
    type: String,
  },
  cust_fname: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  address_1: {
    type: String,
    required: true,
  },
  cust_lname: {
    type: String,
    required: true,
  },
  IsActive: {
    type: Boolean,
    default: true,
  },
  UserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
  },
  customer_vault_idmes: {
    type: Number,
  },
  customer_id: {
    type: Number,
  },
  CreationTimestamp: {
    type: Date,
    default: Date.now,
  },
});

const UserCards = (module.exports = mongoose.model('UserCards', userCardsSchema));
