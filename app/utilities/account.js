const sgMail = require('@sendgrid/mail')
const dotenv = require('dotenv').config();

const sgMailApiKey = process.env.SENDGRID_API_KEY;

sgMail.setApiKey(sgMailApiKey)

// ${price}
module.exports.sendEmail = (email, password, fullName) => {
    
    sgMail.send({
      to: email,
      from: 'support@trygotcha.com' ,
      subject: 'TagTap AR - Password Reset',
      text: `Hello ${fullName}, <br> Welcome to TagTap AR Application. <br> Your new password is: ${password} `,
      html: `<p>Hello ${fullName}, <br> Welcome to TagTap AR Application. <br>Your new password is: <b>${password}</b></p>`

    }).then(() => {}, error => {
        console.error(error);
     
        if (error.response) {
          console.error(error.response.body)
        }
      });

}


module.exports.sendTemplate = (to,from, templateId, dynamic_template_data) => {
  const msg = {
    to,
    from: { name: 'TagTap AR', email: from },
    templateId,
    dynamic_template_data
  };
  sgMail.send(msg)
    .then((response) => {
      console.log('mail-sent-successfully', {templateId, dynamic_template_data });
      console.log('response', response);
      /* assume success */

    })
    .catch((error) => {
      /* log friendly error */
      console.error('send-grid-error: ', error.toString());
    });
};
