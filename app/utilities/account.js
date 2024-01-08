const sgMail = require('@sendgrid/mail')
const dotenv = require('dotenv').config();

const sgMailApiKey = process.env.SENDGRID_API_KEY;

sgMail.setApiKey(sgMailApiKey)

// ${price}
module.exports.sendEmail = (email, password, fullName) => {
    
    sgMail.send({
      to: email,
      from: 'support@trygotcha.com' ,
      subject: 'Gotcha Bros - Password Reset',
      text: `Hi ${fullName}, <br><br> In order to reset your password please use the temporary password we have provided below along with the email you have used to sign up to the app. 
      <br><br> Your temporary password is: ${password} 
      <br><br> Steps to take
      <br><br> Step 1: copy temporary password 
      <br> Step 2: Open Gotcha app
      <br> Step 3: Login in with email 
      <br> Step 4: Use temporary password we provided
      <br><br> If you have any questions please reply back to this email 
      <br><br> Thanks`,
      html: `<p>Hi ${fullName}, <br><br> In order to reset your password please use the temporary password we have provided below along with the email you have used to sign up to the app. 
      <br><br>Your temporary password is: <b>${password}</b>
      <br><br> Steps to take
      <br><br> Step 1: copy temporary password 
      <br> Step 2: Open Gotcha app
      <br> Step 3: Login in with email 
      <br> Step 4: Use temporary password we provided
      <br><br> If you have any questions please reply back to this email 
      <br><br> Thanks
      </p>`

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
