const multer = require('multer');
var path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './public/uploads/sponsors/');
  },
  filename: function (req, file, callback) {
    var filetype = '';
    if (file.mimetype === 'image/gif') {
      filetype = 'gif';
    }
    if (file.mimetype === 'image/png') {
      filetype = 'png';
    }
    if (file.mimetype === 'image/jpeg') {
      filetype = 'jpg';
    }
    callback(null, Date.now() + '.' + filetype);
  },
});
const upload = multer({ storage: storage }).single('BusinessLogo');

module.exports = upload;

// var storage =   multer.diskStorage({
//   destination: function (req, file, callback) {
//     callback(null, './uploads');
//   },
//   filename: function (req, file, callback) {
//     callback(null, file.fieldname + '-' + Date.now());
//   }
// });
// var upload = multer({ storage : storage}).single('userPhoto');
