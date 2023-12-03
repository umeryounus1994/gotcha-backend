const sgMail = require('@sendgrid/mail')

const sgMailApiKey = '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'

sgMail.setApiKey(sgMailApiKey)

// ${price}
module.exports.sendEmail = (email, password, fullName) => {
    
  console.log(email +" : "+password)
    sgMail.send({
      to: email,
      from: { name: 'TagTap AR', email: 'tag.tap.app@gmail.com' } ,
      subject: 'TagTap AR - Password Reset',
      text: `Hello ${fullName}, <br> Welocome to TagTap AR Application. <br> Your new password is: ${password} `,
      html: `<p>Hello ${fullName}, <br> Welocome to TagTap AR Application. <br>Your new password is: <b>${password}</b></p>`

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
  console.log(msg)
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
