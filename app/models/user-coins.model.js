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
  BonusCoins: { // @Umer Added for bonus coins
    type: Number,
    default: 0,
  },
  BankfulResponse : {
    type: [Object], // or more strictly: [mongoose.Schema.Types.Mixed]
    default: []
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
