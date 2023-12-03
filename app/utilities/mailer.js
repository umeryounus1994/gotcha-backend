'use strict';
const nodemailer = require('nodemailer');
let Constants = require('../app.constants');

// async..await is not allowed in global scope, must use a wrapper
async function sendMail(email, password, name) {
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: Constants.MailCredentials.Server,
    port: 465,
    secure: true,
    auth: {
      user: Constants.MailCredentials.Email,
      pass: Constants.MailCredentials.Password,
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Parachute App" <' + Constants.MailCredentials.Email + '>', // sender address
    to: email,
    subject: 'Password Reset', // Subject line
    //text: 'Hello world?', // plain text body
    html:
      '<br>' +
      '<img style="height: 80%; width: auto;" src="https://services.etherland.me/logo.png">' +
      '<br>' +
      '<br><p>Hi ' +
      name +
      ' ,</p><br>' +
      '<p>A request to reset the password of your account has been made.</p>' +
      '<p>Here is your temporary password: <b>' +
      password +
      '</b></p>' +
      '<p>It will expire in 7 days, so do not forget to change it on the web application, in the Profile Page.</p>' +
      '<br><br>' +
      '<p>Thanks</p>' +
      '<p>The Parachute team</p>',
  });

  console.log('Message sent: %s', info.messageId);
}

module.exports = {
  sendMail,
};
