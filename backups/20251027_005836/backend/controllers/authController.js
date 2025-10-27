const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const { sendEmail, sendPasswordResetEmailResend } = require('../services/emailService');
const { EXPIRY } = require('../config/constants');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', { expiresIn: EXPIRY.JWT_ACCESS });
};

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

class AuthController {
  static async register(req, res) {
    try {
      const { email, password, name, referralCode } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ success: false, message: 'Email, password and name required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be 8+ characters' });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({ email, password, name, referralCode });

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + EXPIRY.EMAIL_VERIFICATION);

      await query(
        `INSERT INTO email_verifications (user_id, code, expires_at) VALUES ($1, $2, $3)`,
        [user.id, code, expiresAt]
      );

      await sendEmail({ to: email, template: 'email_verification', data: { code, email } });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: { userId: user.id, email: user.email, name: user.name, referralCode: user.referral_code }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  static async verifyEmail(req, res) {
    try {
      const { email, code } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const result = await query(
        `SELECT * FROM email_verifications 
         WHERE user_id = $1 AND code = $2 AND used = false AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [user.id, code]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired code' });
      }

      await query(`UPDATE email_verifications SET used = true WHERE id = $1`, [result.rows[0].id]);
      await User.verifyEmail(user.id);

      const token = generateToken(user.id);

      res.json({ success: true, message: 'Email verified', data: { token } });
    } catch (error) {
      console.error('Verify error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  static async resendVerification(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findByEmail(email);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.email_verified) {
        return res.status(400).json({ success: false, message: 'Email already verified' });
      }

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + EXPIRY.EMAIL_VERIFICATION);

      await query(
        `INSERT INTO email_verifications (user_id, code, expires_at) VALUES ($1, $2, $3)`,
        [user.id, code, expiresAt]
      );

      await sendEmail({ to: email, template: 'email_verification', data: { code, email } });

      res.json({ success: true, message: 'Code sent' });
    } catch (error) {
      console.error('Resend error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  static async login(req, res) {
  try {
    console.log('====== NEW VERSION LOGIN ======');
    console.log('🔍 RAW req.body:', JSON.stringify(req.body));
    const { email, password } = req.body;
    console.log('🔍 After destructure - email:', email, 'type:', typeof email);
    console.log('🔍 After destructure - password:', password ? 'EXISTS' : 'MISSING');
    console.log('============================');
    
    console.log('🔍 Login attempt for:', email);

      const user = await User.findByEmail(email);
      if (!user) {
        console.log('❌ User not found:', email);
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      console.log('✅ User found:', user.email, 'Status:', user.account_status);

      if (user.account_status !== 'active') {
        console.log('❌ Account not active:', user.account_status);
        return res.status(403).json({ success: false, message: `Account ${user.account_status}` });
      }

      console.log('🔍 Verifying password...');
      const isValid = await User.verifyPassword(password, user.password_hash);
      console.log('🔍 Password valid:', isValid);
      
      if (!isValid) {
        console.log('❌ Invalid password for:', email);
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      await User.updateLastLogin(user.id);

      const balances = await User.getBalances(user.id);
      const balancesObj = balances.reduce((acc, b) => {
        acc[b.crypto] = parseFloat(b.balance);
        return acc;
      }, {});

      const token = generateToken(user.id);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            clubMembership: user.club_membership,
            membershipTier: user.membership_tier,
            referralCode: user.referral_code,
            role: user.role,
            balances: balancesObj
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      console.log('🔑 Forgot password request for:', email);
      
      const user = await User.findByEmail(email);

      if (user) {
        console.log('✅ User found:', user.email);
        
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + EXPIRY.PASSWORD_RESET);

        await query(
          `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
          [user.id, token, expiresAt]
        );

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        console.log('📧 Sending reset email to:', email);
        console.log('🔗 Reset URL:', resetUrl);
        
        const emailResult = await sendPasswordResetEmailResend(email, user.name || 'User', resetUrl);
        console.log('📧 Email result:', emailResult);
      } else {
        console.log('❌ User not found:', email);
      }

      res.json({ success: true, message: 'If email exists, reset link sent' });
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be 8+ characters' });
      }

      const result = await query(
        `SELECT * FROM password_resets 
         WHERE token = $1 AND used = false AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired token' });
      }

      const resetRecord = result.rows[0];
      await User.updatePassword(resetRecord.user_id, newPassword);
      await query(`UPDATE password_resets SET used = true WHERE id = $1`, [resetRecord.id]);

      res.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  static async getMe(req, res) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const balances = await User.getBalances(user.id);
      const balancesObj = balances.reduce((acc, b) => {
        acc[b.crypto] = parseFloat(b.balance);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.email_verified,
          clubMembership: user.club_membership,
          membershipTier: user.membership_tier,
          referralCode: user.referral_code,
          role: user.role,
          balances: balancesObj
        }
      });
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Google OAuth Success Handler
  static async googleAuthSuccess(req, res) {
    try {
      const user = req.user;

      const token = generateToken(user.id);

      // Редирект на frontend с токеном
      res.redirect(`http://localhost:3000/auth/google/success?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }))}`);
    } catch (error) {
      console.error('Google auth success error:', error);
      res.redirect('http://localhost:3000/login?error=auth_failed');
    }
  }

  // Google OAuth Failure Handler
  static async googleAuthFailure(req, res) {
    res.redirect('http://localhost:3000/login?error=google_auth_failed');
  }
}

module.exports = AuthController;