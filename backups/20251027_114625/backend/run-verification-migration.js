// Script to run Verification Documents migration
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'brunotoken',
  user: 'postgres',
  password: '', // Пустой пароль для локального PostgreSQL
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Verification Documents migration...\n');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'migrations', '007_create_verification_documents.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 Migration file loaded');
    console.log('🗄️  Database: brunotoken');
    console.log('📝 Executing SQL...\n');
    
    // Execute migration
    await client.query(sql);
    
    console.log('✅ Verification documents table created!');
    
    // Verify table exists
    const checkResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'verification_documents'
    `);
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      console.log('✅ Table verified: verification_documents exists');
    }
    
    // Check table structure
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'verification_documents'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Table structure:');
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📱 KYC document upload is now ready to use!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

