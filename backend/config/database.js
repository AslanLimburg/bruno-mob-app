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

console.log('🔍 DATABASE CONFIG:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database:', process.env.DB_NAME);
});

// Тестовый запрос
pool.query('SELECT current_database()').then(res => {
  console.log('🔍 ACTUAL DATABASE CONNECTED:', res.rows[0].current_database);
}).catch(err => {
  console.error('❌ Test query failed:', err);
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
    console.log(`Query executed in ${duration}ms`, { rows: res.rowCount });
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
