#!/bin/bash

echo "🚀 Creating Bruno Token Backend Files..."

# ============================================
# PACKAGE.JSON
# ============================================
cat > backend/package.json << 'EOF'
{
  "name": "bruno-token-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "node scripts/migrate.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.7",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
EOF

# ============================================
# .ENV
# ============================================
cat > backend/.env << 'EOF'
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=brunotoken
DB_USER=user
DB_PASSWORD=

JWT_SECRET=bruno-token-super-secret-key-2025

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@brunotoken.com
SMTP_PASSWORD=temp
EOF

echo "✅ package.json and .env created"

# ============================================
# CONFIG FILES
# ============================================
cat > backend/config/database.js << 'EOF'
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'brunotoken',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database error:', err);
  process.exit(-1);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(\`Query executed in \${duration}ms\`, { rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, transaction };
EOF

cat > backend/config/constants.js << 'EOF'
module.exports = {
  COMPANY: {
    LEGAL_NAME: 'Bruno Kapital & Investment LLC',
    COPYRIGHT_YEAR: 2022
  },
  
  SYSTEM_ACCOUNTS: {
    REFERRAL_POOL: { USER_ID: 1, EMAIL: 'clubavalanche0@gmail.com' },
    GAS_FEE: { USER_ID: 2, EMAIL: 'alankaboot.uae@gmail.com' },
    EARN_DEPOSITS: { USER_ID: 3, EMAIL: 'brttoken@gmail.com' }
  },
  
  FEES: {
    STANDARD_FEE: 0.02,
    WELCOME_BONUS: 0.02
  },
  
  REFERRAL_TIERS: {
    'GS-I': { depth: 4, commission: 0.88 },
    'GS-II': { depth: 5, commission: 4.98 },
    'GS-III': { depth: 7, commission: 34.98 },
    'GS-IV': { depth: 8, commission: 61.48 }
  },
  
  EXPIRY: {
    EMAIL_VERIFICATION: 10 * 60 * 1000,
    PASSWORD_RESET: 60 * 60 * 1000,
    JWT_ACCESS: '24h'
  },
  
  EMAIL: {
    FROM_EMAIL: 'info@brunotoken.com',
    FROM_NAME: 'Bruno Token'
  }
};
EOF

echo "✅ Config files created"

echo ""
echo "📦 Files created! Next steps:"
echo "1. cd backend"
echo "2. npm install"
echo ""
echo "⚠️  I will create more files (migrations, models, controllers)"
echo "    Run this script first, then I'll give you the next one!"
