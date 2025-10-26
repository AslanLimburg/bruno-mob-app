const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const pool = require('../config/database');
const { EMAIL, COMPANY } = require('../config/constants');

// SMTP транспорт (для production) - используется для верификации
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'noreply@brunotoken.com',
        pass: process.env.SMTP_PASS || 'your-password'
    }
});

// Resend - для Vector of Destiny прогнозов
const resend = new Resend(process.env.RESEND_API_KEY);

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
    
    console.log('📧 Sending email to:', to);
    
    // Генерируем HTML
    let html = '';
    if (template === 'email_verification') {
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">✉️ Email Verification</h1>
          <p>Your verification code is:</p>
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="color: #4F46E5; font-size: 32px; letter-spacing: 8px; margin: 0;">${data.code}</h2>
          </div>
          <p style="color: #666;">This code will expire in 15 minutes.</p>
        </div>
      `;
    } else if (template === 'password_reset') {
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">🔐 Reset Password</h1>
          <p>Click below to reset:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${data.resetUrl}" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Reset Password</a>
          </div>
        </div>
      `;
    }
    
    // Отправляем через Resend
    const { data: result, error } = await resend.emails.send({
      from: 'Bruno Token <onboarding@resend.dev>',
      to: [to],
      subject: emailTemplate.subject,
      html: html
    });
    
    if (error) {
      console.error('❌ Resend error:', error);
      // Логируем для fallback
      if (data.code) console.log('🔑 VERIFICATION CODE:', data.code);
      if (data.resetUrl) console.log('🔗 RESET URL:', data.resetUrl);
      return { messageId: 'error-logged' };
    }
    
    console.log('✅ Email sent! ID:', result.id);
    return { messageId: result.id };
    
  } catch (error) {
    console.error('❌ Email send error:', error);
    if (data.code) console.log('🔑 CODE:', data.code);
    if (data.resetUrl) console.log('🔗 URL:', data.resetUrl);
    return { messageId: 'error' };
  }
};

const sendVerificationEmail = async (to, data) => {
  return sendEmail({ to, template: 'email_verification', data });
};

const sendPasswordResetEmail = async (to, data) => {
  return sendEmail({ to, template: 'password_reset', data });
};


// ==========================================
// PASSWORD RESET (Resend)
// ==========================================

const sendPasswordResetEmailResend = async (userEmail, userName, resetUrl) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'BrunoToken <noreply@brunotoken.com>',
      to: [userEmail],
      subject: '🔐 Reset Your Password - BrunoToken',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">🔐 Reset Your Password</h1>
          <p>Hello ${userName || 'User'},</p>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy this link to your browser:</p>
          <p style="background: #F3F4F6; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
            ${resetUrl}
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">BrunoToken Platform</p>
        </div>
      `
    });

    if (error) {
      console.error('❌ Password reset email error:', error);
      return { success: false, error };
    }

    console.log('✅ Password reset email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Email service error:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// ФУНКЦИИ ДЛЯ SUPER ADMIN
// ==========================================

const sendBlockNotification = async (userEmail, reason, isBlacklisted = false) => {
    try {
        const subject = isBlacklisted 
            ? 'Your Bruno Token Account Has Been Blacklisted'
            : 'Your Bruno Token Account Has Been Blocked';

        const message = isBlacklisted
            ? `Dear User,\n\nYour Bruno Token account (${userEmail}) has been permanently blacklisted.\n\nReason: ${reason}\n\nIf you believe this is a mistake, please contact our support team.\n\nBest regards,\nBruno Token Team`
            : `Dear User,\n\nYour Bruno Token account (${userEmail}) has been temporarily blocked.\n\nReason: ${reason}\n\nYou can contact our support team to resolve this issue.\n\nBest regards,\nBruno Token Team`;

        console.log('\n========================================');
        console.log('📧 ADMIN NOTIFICATION (Development Mode)');
        console.log('========================================');
        console.log('To:', userEmail);
        console.log('Subject:', subject);
        console.log('Message:', message);
        console.log('========================================\n');

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

const sendUnblockNotification = async (userEmail) => {
    try {
        const subject = 'Your Bruno Token Account Has Been Unblocked';
        const message = `Dear User,\n\nGood news! Your Bruno Token account (${userEmail}) has been unblocked.\n\nYou can now access all features of your account.\n\nBest regards,\nBruno Token Team`;

        console.log('\n========================================');
        console.log('📧 ADMIN NOTIFICATION (Development Mode)');
        console.log('========================================');
        console.log('To:', userEmail);
        console.log('Subject:', subject);
        console.log('Message:', message);
        console.log('========================================\n');

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

// ==========================================
// ФУНКЦИИ ДЛЯ VECTOR OF DESTINY (Resend)
// ==========================================

const sendForecast = async (userEmail, userName, forecastText, language) => {
    try {
        console.log(`📧 Sending forecast to ${userEmail} (${language})...`);
        
        const subjects = {
            en: '✨ Your Weekly Forecast is Ready!',
            ru: '✨ Ваш недельный прогноз готов!',
            ar: '✨ توقعاتك الأسبوعية جاهزة!',
            es: '✨ ¡Tu pronóstico semanal está listo!',
            zh: '✨ 您的每周预测已准备好！',
            hi: '✨ आपका साप्ताहिक पूर्वानुमान तैयार है!',
            fr: '✨ Vos prévisions hebdomadaires sont prêtes !',
            de: '✨ Ihre Wochenprognose ist fertig!'
        };
        
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: [userEmail],
            subject: subjects[language] || subjects['en'],
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #F9FAFB;">
                    <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h1 style="color: #4F46E5; margin-bottom: 20px;">✨ Vector of Destiny</h1>
                        <p style="font-size: 16px; color: #333; margin-bottom: 10px;">Hello ${userName},</p>
                        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Your personalized weekly forecast is ready:</p>
                        <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4F46E5;">
                            ${forecastText.split('\n\n').map(paragraph => 
                                `<p style="margin: 15px 0; line-height: 1.6; color: #374151;">${paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`
                            ).join('')}
                        </div>
                        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
                        <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
                            This forecast was generated for you by Vector of Destiny.<br>
                            Visit <a href="http://localhost:3000/vector-destiny" style="color: #4F46E5;">your dashboard</a> to view more.
                        </p>
                    </div>
                </div>
            `
        });
        
        if (error) {
            console.error('❌ Resend error:', error);
            return { success: false, error: error.message };
        }
        
        console.log(`✅ Email sent successfully! ID: ${data.id}`);
        return { success: true, emailId: data.id };
        
    } catch (error) {
        console.error('❌ Send email error:', error);
        return { success: false, error: error.message };
    }
};

const sendWelcomeVectorDestiny = async (userEmail, userName) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: [userEmail],
            subject: '🎉 Welcome to Vector of Destiny!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #4F46E5;">✨ Welcome to Vector of Destiny</h1>
                    <p style="font-size: 16px; color: #333;">Hello ${userName}!</p>
                    <p style="font-size: 14px; color: #666;">
                        Thank you for subscribing to Vector of Destiny. 
                        You will receive personalized weekly forecasts based on your birth chart.
                    </p>
                    <p style="font-size: 14px; color: #666;">
                        Your first forecast will arrive soon!
                    </p>
                </div>
            `
        });
        
        if (error) {
            console.error('❌ Resend error:', error);
            return { success: false, error: error.message };
        }
        
        console.log(`✅ Welcome email sent! ID: ${data.id}`);
        return { success: true, emailId: data.id };
        
    } catch (error) {
        console.error('❌ Send welcome error:', error);
        return { success: false, error: error.message };
    }
};

// ==========================================
// ФУНКЦИИ ДЛЯ TRANSACTIONS
// ==========================================

const sendTransactionSent = async (userEmail, userName, amount, crypto, recipientEmail) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Bruno Token <info@brunotoken.com>',
            to: [userEmail],
            subject: `💸 ${crypto} Sent Successfully`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #4F46E5;">💸 Transaction Sent</h1>
                    <p>Hello ${userName},</p>
                    <p>Your transaction has been processed successfully:</p>
                    <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Amount:</strong> ${amount} ${crypto}</p>
                        <p><strong>To:</strong> ${recipientEmail}</p>
                        <p><strong>Status:</strong> ✅ Completed</p>
                    </div>
                    <p>Thank you for using Bruno Token!</p>
                </div>
            `
        });
        
        if (error) {
            console.error('❌ Resend error:', error);
            return { success: false, error: error.message };
        }
        
        console.log(`✅ Transaction sent email delivered! ID: ${data.id}`);
        return { success: true, emailId: data.id };
        
    } catch (error) {
        console.error('❌ Send transaction email error:', error);
        return { success: false, error: error.message };
    }
};

const sendTransactionReceived = async (userEmail, userName, amount, crypto, senderEmail) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Bruno Token <info@brunotoken.com>',
            to: [userEmail],
            subject: `💰 You Received ${amount} ${crypto}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #10B981;">💰 Funds Received!</h1>
                    <p>Hello ${userName},</p>
                    <p>Good news! You've received cryptocurrency:</p>
                    <div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                        <p><strong>Amount:</strong> ${amount} ${crypto}</p>
                        <p><strong>From:</strong> ${senderEmail}</p>
                    </div>
                    <p>The funds are now available in your wallet.</p>
                </div>
            `
        });
        
        if (error) {
            console.error('❌ Resend error:', error);
            return { success: false, error: error.message };
        }
        
        console.log(`✅ Transaction received email delivered! ID: ${data.id}`);
        return { success: true, emailId: data.id };
        
    } catch (error) {
        console.error('❌ Send transaction email error:', error);
        return { success: false, error: error.message };
    }
};

// ==========================================
// ФУНКЦИИ ДЛЯ LOTTERY
// ==========================================

const sendLotteryEntry = async (userEmail, userName, ticketCount, lotteryName) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Bruno Token <info@brunotoken.com>',
            to: [userEmail],
            subject: `🎟️ Lottery Entry Confirmed - ${lotteryName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #F59E0B;">🎟️ You're In!</h1>
                    <p>Hello ${userName},</p>
                    <p>Your lottery entry has been confirmed:</p>
                    <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Lottery:</strong> ${lotteryName}</p>
                        <p><strong>Tickets:</strong> ${ticketCount}</p>
                        <p><strong>Status:</strong> ✅ Entered</p>
                    </div>
                    <p>Good luck! 🍀</p>
                </div>
            `
        });
        
        if (error) {
            console.error('❌ Resend error:', error);
            return { success: false, error: error.message };
        }
        
        console.log(`✅ Lottery entry email delivered! ID: ${data.id}`);
        return { success: true, emailId: data.id };
        
    } catch (error) {
        console.error('❌ Send lottery email error:', error);
        return { success: false, error: error.message };
    }
};

const sendLotteryWin = async (userEmail, userName, prize, lotteryName) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Bruno Token <info@brunotoken.com>',
            to: [userEmail],
            subject: `🎉 Congratulations! You Won ${prize}!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div style="background: white; padding: 30px; border-radius: 12px;">
                        <h1 style="color: #F59E0B; text-align: center;">🎉 YOU WON! 🎉</h1>
                        <p style="font-size: 18px; text-align: center;">Congratulations ${userName}!</p>
                        <div style="background: #FEF3C7; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <p style="font-size: 24px; font-weight: bold; color: #F59E0B; margin: 0;">${prize}</p>
                            <p style="color: #92400E; margin-top: 10px;">${lotteryName}</p>
                        </div>
                        <p style="text-align: center;">Your prize has been credited to your account!</p>
                        <p style="text-align: center; color: #6B7280; font-size: 14px; margin-top: 30px;">
                            Thank you for participating in Bruno Token Lottery!
                        </p>
                    </div>
                </div>
            `
        });
        
        if (error) {
            console.error('❌ Resend error:', error);
            return { success: false, error: error.message };
        }
        
        console.log(`✅ Lottery win email delivered! ID: ${data.id}`);
        return { success: true, emailId: data.id };
        
    } catch (error) {
        console.error('❌ Send lottery win email error:', error);
        return { success: false, error: error.message };
    }
};

const sendLotteryWinEmail = async (userEmail, userName, amount, lotteryName) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'BrunoToken <noreply@brunotoken.com>',
      to: [userEmail],
      subject: `🎉 Congratulations! You won ${amount} BRT in ${lotteryName}!`,
      html: `
        <h1>🎊 Congratulations, ${userName}!</h1>
        <p>You won <strong>${amount} BRT</strong> in the <strong>${lotteryName}</strong> lottery!</p>
        <p>The prize has been credited to your account.</p>
        <p>Check your dashboard: <a href="https://brunotoken.com/dashboard">View Balance</a></p>
        <hr>
        <p style="color: #666; font-size: 12px;">BrunoToken Platform</p>
      `
    });

    if (error) {
      console.error('❌ Lottery email error:', error);
      return { success: false, error };
    }

    console.log('✅ Lottery win email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Email service error:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// ФУНКЦИИ ДЛЯ CHALLENGE
// ==========================================

const sendChallengeCreated = async (userEmail, userName, challengeTitle, stake, participants) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Bruno Token <info@brunotoken.com>',
            to: [userEmail],
            subject: `⚔️ Challenge Created: ${challengeTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #EF4444;">⚔️ Challenge On!</h1>
                    <p>Hello ${userName},</p>
                    <p>Your challenge has been created:</p>
                    <div style="background: #FEE2E2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
                        <p><strong>Challenge:</strong> ${challengeTitle}</p>
                        <p><strong>Stake:</strong> ${stake} BRT</p>
                        <p><strong>Participants:</strong> ${participants.length}/2</p>
                    </div>
                    <p>${participants.length === 1 ? 'Waiting for opponent...' : 'Challenge is live! Good luck! 🔥'}</p>
                </div>
            `
        });
        
        if (error) {
            console.error('❌ Resend error:', error);
            return { success: false, error: error.message };
        }
        
        console.log(`✅ Challenge created email delivered! ID: ${data.id}`);
        return { success: true, emailId: data.id };
        
    } catch (error) {
        console.error('❌ Send challenge email error:', error);
        return { success: false, error: error.message };
    }
};

const sendChallengeCompleted = async (userEmail, userName, challengeTitle, result, reward) => {
    try {
        const isWinner = result === 'won';
        const { data, error } = await resend.emails.send({
            from: 'Bruno Token <info@brunotoken.com>',
            to: [userEmail],
            subject: isWinner ? `🏆 You Won: ${challengeTitle}` : `Challenge Completed: ${challengeTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: ${isWinner ? '#10B981' : '#6B7280'};">${isWinner ? '🏆 Victory!' : '⚔️ Challenge Completed'}</h1>
                    <p>Hello ${userName},</p>
                    <p>The challenge "${challengeTitle}" has ended.</p>
                    <div style="background: ${isWinner ? '#ECFDF5' : '#F3F4F6'}; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Result:</strong> ${result === 'won' ? '✅ Victory' : result === 'lost' ? '❌ Defeat' : '⚖️ Draw'}</p>
                        ${isWinner ? `<p><strong>Reward:</strong> ${reward} BRT</p>` : ''}
                    </div>
                    <p>${isWinner ? 'Congratulations! 🎉' : 'Better luck next time!'}</p>
                </div>
            `
        });
        
        if (error) {
            console.error('❌ Resend error:', error);
            return { success: false, error: error.message };
        }
        
        console.log(`✅ Challenge completed email delivered! ID: ${data.id}`);
        return { success: true, emailId: data.id };
        
    } catch (error) {
        console.error('❌ Send challenge email error:', error);
        return { success: false, error: error.message };
    }
};

const sendChallengeWinEmail = async (userEmail, userName, amount, challengeName) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'BrunoToken <noreply@brunotoken.com>',
      to: [userEmail],
      subject: `🏆 You won the "${challengeName}" challenge!`,
      html: `
        <h1>🏆 Congratulations, ${userName}!</h1>
        <p>You won <strong>${amount} BRT</strong> in the challenge: <strong>${challengeName}</strong>!</p>
        <p>The prize has been credited to your account.</p>
        <p>Check your dashboard: <a href="https://brunotoken.com/dashboard">View Balance</a></p>
        <hr>
        <p style="color: #666; font-size: 12px;">BrunoToken Platform</p>
      `
    });

    if (error) {
      console.error('❌ Challenge email error:', error);
      return { success: false, error };
    }

    console.log('✅ Challenge win email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Email service error:', error);
    return { success: false, error: error.message };
  }
};

const sendChallengeNotification = async (userEmail, userName, challengeName, message, actionUrl) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'BrunoToken <noreply@brunotoken.com>',
      to: [userEmail],
      subject: `Challenge Update: ${challengeName}`,
      html: `
        <h1>Hello, ${userName}!</h1>
        <p>${message}</p>
        <p><a href="${actionUrl}" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Challenge</a></p>
        <hr>
        <p style="color: #666; font-size: 12px;">BrunoToken Platform</p>
      `
    });

    if (error) {
      console.error('❌ Challenge notification error:', error);
      return { success: false, error };
    }

    console.log('✅ Challenge notification sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Email service error:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// ФУНКЦИИ ДЛЯ REFERRAL
// ==========================================

const sendReferralSuccess = async (userEmail, userName, referredName, bonus) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Bruno Token <info@brunotoken.com>',
            to: [userEmail],
            subject: `🎁 New Referral Bonus: ${bonus} BRT`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #8B5CF6;">🎁 Referral Bonus!</h1>
                    <p>Hello ${userName},</p>
                    <p>Great news! Your referral link was used:</p>
                    <div style="background: #F5F3FF; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B5CF6;">
                        <p><strong>New User:</strong> ${referredName}</p>
                        <p><strong>Your Bonus:</strong> ${bonus} BRT</p>
                    </div>
                    <p>Keep sharing to earn more! 💰</p>
                </div>
            `
        });
        
        if (error) {
            console.error('❌ Resend error:', error);
            return { success: false, error: error.message };
        }
        
        console.log(`✅ Referral success email delivered! ID: ${data.id}`);
        return { success: true, emailId: data.id };
        
    } catch (error) {
        console.error('❌ Send referral email error:', error);
        return { success: false, error: error.message };
    }
};

// ==========================================
// ФУНКЦИИ ДЛЯ CLUB AVALANCHE
// ==========================================

const sendClubAvalancheWelcome = async (userEmail, userName, program) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Club Avalanche <info@brunotoken.com>',
            to: [userEmail],
            subject: `🏔️ Welcome to Club Avalanche ${program}!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div style="background: white; padding: 30px; border-radius: 12px;">
                        <h1 style="color: #667eea; text-align: center;">🏔️ Welcome to the Summit!</h1>
                        <p style="font-size: 18px;">Hello ${userName},</p>
                        <p>Congratulations on joining <strong>Club Avalanche ${program}</strong>!</p>
                        <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Your Membership:</strong> ${program}</p>
                            <p><strong>Status:</strong> ✅ Active</p>
                        </div>
                        <p>You now have access to exclusive benefits, premium support, and special opportunities!</p>
                        <p style="text-align: center; margin-top: 30px;">
                            <a href="http://localhost:3000/club-avalanche" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Explore Benefits
                            </a>
                        </p>
                    </div>
                </div>
            `
        });
        
        if (error) {
            console.error('❌ Resend error:', error);
            return { success: false, error: error.message };
        }
        
        console.log(`✅ Club Avalanche welcome email delivered! ID: ${data.id}`);
        return { success: true, emailId: data.id };
        
    } catch (error) {
        console.error('❌ Send Club Avalanche email error:', error);
        return { success: false, error: error.message };
    }
};

// ==========================================
// ФУНКЦИЯ ДЛЯ VECTOR COLOR (еженедельная)
// ==========================================

const sendVectorColorEmail = async (userEmail, userName, colorName, colorHex, week) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Vector of Destiny <destiny@brunotoken.com>',
      to: [userEmail],
      subject: `🌈 Your Color of the Week: ${colorName}`,
      html: `
        <h1>🌈 Hello, ${userName}!</h1>
        <p>Your color for Week ${week} is:</p>
        <div style="background: ${colorHex}; padding: 40px; border-radius: 10px; text-align: center;">
          <h2 style="color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">${colorName}</h2>
        </div>
        <p>Wear this color this week for good luck! ✨</p>
        <p>Check your Vector: <a href="https://brunotoken.com/vector">View Details</a></p>
        <hr>
        <p style="color: #666; font-size: 12px;">Vector of Destiny - BrunoToken</p>
      `
    });

    if (error) {
      console.error('❌ Vector email error:', error);
      return { success: false, error };
    }

    console.log('✅ Vector color email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Email service error:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// ACTIVATION CODE EMAIL
// ==========================================

const sendActivationCodeEmail = async (userEmail, userName, activationCode, amountBRT, amountUSD) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'BrunoToken <noreply@brunotoken.com>',
      to: [userEmail],
      subject: `🎉 Your BRT Activation Code - ${amountBRT} BRT`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">🎉 Payment Successful!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #333;">Hello ${userName},</p>
            
            <p style="font-size: 14px; color: #666;">Thank you for your purchase! Here is your activation code:</p>
            
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #667eea;">
              <p style="font-size: 12px; color: #666; margin: 0 0 10px 0;">ACTIVATION CODE</p>
              <p style="font-size: 24px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 2px; font-family: monospace;">${activationCode}</p>
            </div>
            
            <div style="background: #EEF2FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Amount Paid:</strong> $${amountUSD}</p>
              <p style="margin: 5px 0;"><strong>BRT Tokens:</strong> ${amountBRT} BRT</p>
            </div>
            
            <p style="color: #666;">You can activate this code in your Dashboard → Coupon section.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3000/dashboard" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Activate Now</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">BrunoToken Platform</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('❌ Activation code email error:', error);
      return { success: false, error };
    }

    console.log('✅ Activation code email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Email service error:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// EXPORT ALL FUNCTIONS
// ==========================================

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendPasswordResetEmailResend,
    sendBlockNotification,
    sendUnblockNotification,
    sendForecast,
    sendWelcomeVectorDestiny,
    sendVectorColorEmail,
    sendTransactionSent,
    sendTransactionReceived,
    sendLotteryEntry,
    sendLotteryWin,
    sendLotteryWinEmail,
    sendChallengeCreated,
    sendChallengeCompleted,
    sendChallengeWinEmail,
    sendChallengeNotification,
    sendReferralSuccess,
    sendClubAvalancheWelcome,
    sendActivationCodeEmail
};