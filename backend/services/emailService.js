const { EMAIL, COMPANY } = require('../config/constants');

const templates = {
  email_verification: (data) => {
    return {
      subject: 'Verify Your Email - Bruno Token',
      code: data.code
    };
  },
  password_reset: (data) => {
    return {
      subject: 'Reset Password - Bruno Token',
      resetUrl: data.resetUrl
    };
  }
};

const sendEmail = async ({ to, template, data }) => {
  try {
    const emailTemplate = templates[template](data);
    
    console.log('\n========================================');
    console.log('📧 EMAIL (Development Mode)');
    console.log('========================================');
    console.log('To:', to);
    console.log('Subject:', emailTemplate.subject);
    
    if (data.code) {
      console.log('\n🔑 VERIFICATION CODE:', data.code);
      console.log('\n⚠️  USE THIS CODE TO VERIFY EMAIL');
    }
    
    if (data.resetUrl) {
      console.log('\n🔗 RESET URL:', data.resetUrl);
      console.log('\n⚠️  USE THIS LINK TO RESET PASSWORD');
    }
    
    console.log('========================================\n');
    
    return { messageId: 'dev-mode-no-email-sent' };
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

module.exports = { sendEmail };
