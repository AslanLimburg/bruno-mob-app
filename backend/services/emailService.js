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
// ФУНКЦИИ ДЛЯ SUPER ADMIN
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

// ==========================================
// ФУНКЦИИ ДЛЯ VECTOR OF DESTINY (Resend)
// ==========================================

// Отправить прогноз пользователю
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
            return {
                success: false,
                error: error.message
            };
        }
        
        console.log(`✅ Email sent successfully! ID: ${data.id}`);
        
        return {
            success: true,
            emailId: data.id
        };
        
    } catch (error) {
        console.error('❌ Send email error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Отправить приветственное письмо при подписке
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

// Уведомление об отправке криптовалюты
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

// Уведомление о получении криптовалюты
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

// Уведомление об участии в лотерее
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

// Уведомление о выигрыше в лотерее
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

// ==========================================
// ФУНКЦИИ ДЛЯ CHALLENGE
// ==========================================

// Уведомление о новом челлендже
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

// Уведомление о завершении челленджа
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

// ==========================================
// ФУНКЦИИ ДЛЯ REFERRAL
// ==========================================

// Уведомление о новом реферале
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

// Приветственное письмо при вступлении
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

module.exports = {
    // Старые функции
    sendEmail,
    sendBlockNotification,
    sendUnblockNotification,
    // Новые функции для Vector of Destiny
    sendForecast,
    sendWelcomeVectorDestiny
};
module.exports = {
    // Старые функции
    sendEmail,
    sendBlockNotification,
    sendUnblockNotification,
    // Vector of Destiny
    sendForecast,
    sendWelcomeVectorDestiny,
    // Transactions
    sendTransactionSent,
    sendTransactionReceived,
    // Lottery
    sendLotteryEntry,
    sendLotteryWin,
    // Challenge
    sendChallengeCreated,
    sendChallengeCompleted,
    // Referral
    sendReferralSuccess,
    // Club Avalanche
    sendClubAvalancheWelcome
};