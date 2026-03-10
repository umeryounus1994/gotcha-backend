const mongoose = require('mongoose');
const schema = mongoose.Schema;

const userTeamSchema = new schema({
  OwnerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  InvitedEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  JoinedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    default: null,
  },
  Status: {
    type: String,
    enum: ['invited', 'joined'],
    default: 'invited',
  },
  CreationTimestamp: {
    type: Date,
    default: Date.now,
  },
});

userTeamSchema.index({ OwnerUserId: 1, InvitedEmail: 1 }, { unique: true });

const UserTeam = (module.exports = mongoose.model('user-teams', userTeamSchema));

