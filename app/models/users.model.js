const mongoose = require('mongoose');
const schema = mongoose.Schema;

var SocialAccounts = mongoose.Schema({
  Type: String,
  Id: String,
  Details: Object,
  CreationTimestamp: {
    type: Date,
    default: Date.now,
  },
});

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const userSchema = new schema({
  AreaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'area-lists',
  },
  FullName: {
    type: String,
    required: true,
  },
  Email: {
    type: String,
    required: true,
    unique: true,
  },
  Password: {
    type: String,
    required: true,
  },
  ContactNumber: {
    type: String,
    default: "",
  },
  ETHAddress: {
    type: String,
    default: "",
  },
  ProfilePicture: {
    type: String,
    default: "",
  },
  Address: {
    type: String,
    default: "",
  },
  SocialAccounts: [SocialAccounts],
  Location: {
    type: pointSchema,
  },
  LocationTimestamp: Date,
  YearOfBirth: {
    type: Number, // 1950 till 2022
    default: 2022, 
  },
  PostCode: {
    type: String,
    default: "",
  },
  Gender: {
    type: String, // Male, Female
    default: "Male",
  },
  Token:{
    type: String, // Firebase Device Token For Sending Push Notifications 
    default:""
  },
  AccountNumber:{
    type: String, 
    default:""
  },
  BSB:{
    type: String,
    default:""
  },
  //@Umer Added Fields for package purchase
  PurchasePackage:{
    type: Boolean,
    default:false
  },
  PackagePrice:{
    type: String,
    default:""
  },
  PackageDate:{
    type: Date
  },
  PackageExpiryDate:{
    type: Date
  },
  PurchasePackageExpired: {
    type: Boolean
  },
  // @Umer New Fields End
  IsActive: {
    type: Boolean,
    default: true,
  },
  IsDeleted: {
    type: Boolean,
    default: false,
  },
  AffiliateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'affiliates',
    default: null,
  },
  CreationTimestamp: {
    type: Date,
    default: Date.now,
  },
  SquareCustomerId : {type: String}
});


const Users = (module.exports = mongoose.model('users', userSchema));
