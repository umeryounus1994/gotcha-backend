const mongoose = require('mongoose');
const schema = mongoose.Schema;

const userCardsSchema = new schema({
  cardholderName: {
    type: String,
    required: true,
  },
  expMonth: {
    type: Number,
    required: true,
  },
  expYear: {
    type: Number
  },
  billingAddress: {
    type: Object,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
  },
  cardDetails: {
    type: Object,
    required: true,
  },
  CreationTimestamp: {
    type: Date,
    default: Date.now,
  },
  cardId: {
    type: String,
    required: true,
  },

});

const UserCards = (module.exports = mongoose.model('UserCards', userCardsSchema));
