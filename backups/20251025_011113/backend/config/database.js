const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'brunotoken',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  max: 20,
  min: 4,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000,
  allowExitOnIdle: false
});

pool.on('error', (err) => {
  console.error('❌ Unexpected pool error', err);
});

pool.on('connect', () => {
  console.log('✅ New client connected to pool');
});

async function queryWithRetry(text, params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`Query executed in ${duration}ms`, { rows: result.rowCount });
      return result;
    } catch (error) {
      console.error(`Query attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

module.exports = { pool, query: queryWithRetry };
