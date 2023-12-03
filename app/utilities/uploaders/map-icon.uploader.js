const multer = require('multer');
var path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './public/uploads/map/');
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
const upload = multer({ storage: storage }).single('Icon');

module.exports = upload;
