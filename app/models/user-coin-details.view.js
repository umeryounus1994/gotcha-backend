const mongoose = require('mongoose');
const schema = mongoose.Schema;

const userCoinDetailsSchema = new schema({
  FullName: {
    type: String,
  },
  Email: {
    type: String,
  },
  Password: {
    type: String,
  },
  ContactNumber: {
    type: String,
  },
  ProfilePicture: {
    type: String,
    default: null,
  },
  Location: {
    type: Object,
  },
  IsActive: {
    type: Boolean,
    default: true,
  },
  IsDeleted: {
    type: Boolean,
    default: false,
  },
  TotalCoin: {
    type: Number,
  },
  ClaimedCoinList: {
    type: Array,
  },
  YearOfBirth: {
    type: Number, // 1950 till 2022
    default: 2022, 
  },
  Gender: {
    type: String, // Male, Female
    default: "Male",
  },
  AreaName: {
    type: String,
    default: ''
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
    // @Umer New Fields End
  CreationTimestamp: {
    type: Date,
    default: Date.now,
  },
});

const userCoinDetails = (module.exports = mongoose.model('user-coin-detail', userCoinDetailsSchema));
