const mongoose = require('mongoose');
const schema = mongoose.Schema;

const userCoinsSchema = new schema({
  UserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
  },
  HeldCoins: {
    type: Number,
    required: true,
  },
  BankfulResponse : {
    type: [Object], // or more strictly: [mongoose.Schema.Types.Mixed]
    default: []
  },
  CardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserCards',
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

const UserCoins = (module.exports = mongoose.model('UserCoins', userCoinsSchema));
