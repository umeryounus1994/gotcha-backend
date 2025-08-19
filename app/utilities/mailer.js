'use strict';
const nodemailer = require('nodemailer');
let Constants = require('../app.constants');

const sgMail = require("@sendgrid/mail");

const sgMailApiKey = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(sgMailApiKey);

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


async function sendMailReceipt(email, name, receiptUrl) {

  sgMail
    .send({
      to: email,
      from: { name: "GotchaApp", email: "gotchadoesadvertising@gmail.com" },
      subject: 'Your Payment Receipt',
      text: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
        <div style="text-align: center;">
          <img style="height: 60px; width: auto;" src="https://app-gotcha-85faj.ondigitalocean.app/logo.png" alt="GotchaApp Logo">
          <h2 style="margin: 20px 0; color: #4CAF50;">Payment Receipt</h2>
        </div>
        
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thank you for your payment! You can view or download your receipt by clicking the link below:</p>
        
        <p style="text-align: center; margin-top: 20px;">
          <a href="${receiptUrl}" target="_blank" style="display: inline-block; padding: 12px 20px; background-color: #4CAF50; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Receipt
          </a>
        </p>
        
        <p style="margin-top: 20px;">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #4CAF50;">${receiptUrl}</p>
        
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #888;">
          <p>Thanks for choosing GotchaApp!</p>
          <p>The GotchaApp Team</p>
        </div>
      </div>
    `,
      html: `<br><br> ${`
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
        <div style="text-align: center;">
          <img style="height: 60px; width: auto;" src="https://app-gotcha-85faj.ondigitalocean.app/logo.png" alt="GotchaApp Logo">
          <h2 style="margin: 20px 0; color: #4CAF50;">Payment Receipt</h2>
        </div>
        
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thank you for your payment! You can view or download your receipt by clicking the link below:</p>
        
        <p style="text-align: center; margin-top: 20px;">
          <a href="${receiptUrl}" target="_blank" style="display: inline-block; padding: 12px 20px; background-color: #4CAF50; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Receipt
          </a>
        </p>
        
        <p style="margin-top: 20px;">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #4CAF50;">${receiptUrl}</p>
        
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #888;">
          <p>Thanks for choosing GotchaApp!</p>
          <p>The GotchaApp Team</p>
        </div>
      </div>
    `}`,
    })
    .then(
      () => {},
      (error) => {
        console.error(error);

        if (error.response) {
          console.error(error.response.body);
        }
      }
    );
}

module.exports = {
  sendMail,
  sendMailReceipt
};
