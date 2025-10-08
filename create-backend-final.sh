#!/bin/bash

echo "🚀 Creating Controllers, Routes, and Server..."

# ============================================
# CONTROLLERS
# ============================================
cat > backend/controllers/authController.js << 'EOF'
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const { sendEmail } = require('../services/emailService');
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
      const { email, password, referralCode } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be 8+ characters' });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({ email, password, referralCode });

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
        data: { userId: user.id, email: user.email, referralCode: user.referral_code }
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
      const { email, password } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (user.account_status !== 'active') {
        return res.status(403).json({ success: false, message: `Account ${user.account_status}` });
      }

      const isValid = await User.verifyPassword(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (!user.email_verified) {
        return res.status(403).json({ 
          success: false, 
          message: 'Please verify your email',
          requiresVerification: true
        });
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
      const user = await User.findByEmail(email);

      if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + EXPIRY.PASSWORD_RESET);

        await query(
          `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
          [user.id, token, expiresAt]
        );

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        await sendEmail({ to: email, template: 'password_reset', data: { resetUrl, email } });
      }

      res.json({ success: true, message: 'If email exists, reset link sent' });
    } catch (error) {
      console.error('Forgot password error:', error);
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
          balances: balancesObj
        }
      });
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = AuthController;
EOF

echo "✅ Controllers created"

# ============================================
# MIDDLEWARE
# ============================================
cat > backend/middleware/auth.js << 'EOF'
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { authMiddleware };
EOF

echo "✅ Middleware created"

# ============================================
# ROUTES
# ============================================
cat > backend/routes/authRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get('/me', authMiddleware, AuthController.getMe);

module.exports = router;
EOF

echo "✅ Routes created"

# ============================================
# SERVER
# ============================================
cat > backend/server.js << 'EOF'
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║        🚀 Bruno Token API Server          ║
║        Port: ${PORT}                           ║
║        URL: http://localhost:${PORT}           ║
╚════════════════════════════════════════════╝
  `);
});

module.exports = app;
EOF

echo "✅ Server created"

# ============================================
# MIGRATION SCRIPT
# ============================================
cat > backend/scripts/migrate.js << 'EOF'
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');

async function runMigrations() {
  console.log('🔄 Starting migrations...\n');

  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${sqlFiles.length} migration files\n`);

    for (const file of sqlFiles) {
      console.log(`📄 Running: ${file}`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = await fs.readFile(filePath, 'utf8');
      await pool.query(sql);
      console.log(`✅ Completed: ${file}\n`);
    }

    console.log('🎉 All migrations completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigrations();
EOF

echo "✅ Migration script created"

echo ""
echo "🎉 ALL BACKEND FILES CREATED!"
echo ""
echo "Next steps:"
echo "1. cd backend"
echo "2. npm run migrate"
echo "3. npm run dev"
