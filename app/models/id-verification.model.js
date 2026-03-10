const mongoose = require('mongoose');
const schema = mongoose.Schema;

const idVerificationSchema = new schema({
  UserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  IdFrontUrl: {
    type: String,
    default: '',
  },
  IdBackUrl: {
    type: String,
    default: '',
  },
  SelfieUrl: {
    type: String,
    default: '',
  },
  AddressDocUrl: {
    type: String,
    default: '',
  },
  Status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'not_approved'],
    default: 'draft',
  },
  Notes: {
    type: String,
    default: '',
  },
  SubmittedAt: {
    type: Date,
    default: null,
  },
  ReviewedAt: {
    type: Date,
    default: null,
  },
  ReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    default: null,
  },
  CreationTimestamp: {
    type: Date,
    default: Date.now,
  },
});

idVerificationSchema.index({ UserId: 1 });
idVerificationSchema.index({ Status: 1 });

const IdVerification = (module.exports = mongoose.model('id-verifications', idVerificationSchema));

