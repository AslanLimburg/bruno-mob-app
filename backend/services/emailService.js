const nodemailer = require('nodemailer');
const pool = require('../config/database');
const { EMAIL, COMPANY } = require('../config/constants');

// SMTP транспорт (для production)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'noreply@brunotoken.com',
        pass: process.env.SMTP_PASS || 'your-password'
    }
});

// ==========================================
// СУЩЕСТВУЮЩИЕ ФУНКЦИИ (для верификации)
// ==========================================

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

// ==========================================
// НОВЫЕ ФУНКЦИИ (для Super Admin)
// ==========================================

// Отправка уведомления о блокировке
const sendBlockNotification = async (userEmail, reason, isBlacklisted = false) => {
    try {
        const subject = isBlacklisted 
            ? 'Your Bruno Token Account Has Been Blacklisted'
            : 'Your Bruno Token Account Has Been Blocked';

        const message = isBlacklisted
            ? `Dear User,\n\nYour Bruno Token account (${userEmail}) has been permanently blacklisted.\n\nReason: ${reason}\n\nIf you believe this is a mistake, please contact our support team.\n\nBest regards,\nBruno Token Team`
            : `Dear User,\n\nYour Bruno Token account (${userEmail}) has been temporarily blocked.\n\nReason: ${reason}\n\nYou can contact our support team to resolve this issue.\n\nBest regards,\nBruno Token Team`;

        // Логируем в консоль (development mode)
        console.log('\n========================================');
        console.log('📧 ADMIN NOTIFICATION (Development Mode)');
        console.log('========================================');
        console.log('To:', userEmail);
        console.log('Subject:', subject);
        console.log('Message:', message);
        console.log('========================================\n');

        // Сохраняем в БД для истории
        await pool.query(
            `INSERT INTO email_notifications (email, subject, message, status) 
             VALUES ($1, $2, $3, 'sent')`,
            [userEmail, subject, message]
        );

        return { success: true };
    } catch (error) {
        console.error('Failed to send block notification:', error);
        return { success: false, error: error.message };
    }
};

// Отправка уведомления о разблокировке
const sendUnblockNotification = async (userEmail) => {
    try {
        const subject = 'Your Bruno Token Account Has Been Unblocked';
        const message = `Dear User,\n\nGood news! Your Bruno Token account (${userEmail}) has been unblocked.\n\nYou can now access all features of your account.\n\nBest regards,\nBruno Token Team`;

        // Логируем в консоль
        console.log('\n========================================');
        console.log('📧 ADMIN NOTIFICATION (Development Mode)');
        console.log('========================================');
        console.log('To:', userEmail);
        console.log('Subject:', subject);
        console.log('Message:', message);
        console.log('========================================\n');

        // Сохраняем в БД
        await pool.query(
            `INSERT INTO email_notifications (email, subject, message, status) 
             VALUES ($1, $2, $3, 'sent')`,
            [userEmail, subject, message]
        );

        return { success: true };
    } catch (error) {
        console.error('Failed to send unblock notification:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendEmail,
    sendBlockNotification,
    sendUnblockNotification
};