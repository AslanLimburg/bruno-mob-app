require('dotenv').config();

const { query } = require('../config/database');
const { sendVectorColorEmail } = require('../services/emailService');

async function sendWeeklyColors() {
  console.log('🌈 Starting weekly Vector color notifications...');

  try {
    // Get current week number (1-52)
    const weekQuery = `SELECT EXTRACT(WEEK FROM CURRENT_DATE) as week_number`;
    const weekResult = await query(weekQuery);
    const currentWeek = parseInt(weekResult.rows[0].week_number);

    console.log(`📅 Current week: ${currentWeek}`);

    // Get all active vectors with users
    const vectorQuery = `
      SELECT 
        v.id as vector_id,
        v.user_id,
        v.colors,
        u.email,
        u.name,
        u.email_verified
      FROM vectors v
      JOIN users u ON v.user_id = u.id
      WHERE v.status = 'active'
        AND u.email_verified = true
      ORDER BY u.id
    `;

    const result = await query(vectorQuery);
    const vectors = result.rows;

    console.log(`📧 Found ${vectors.length} active vectors with verified emails`);

    if (vectors.length === 0) {
      console.log('ℹ️ No vectors to process');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const vector of vectors) {
      try {
        // Parse colors if stored as JSON string
        const colors = typeof vector.colors === 'string' 
          ? JSON.parse(vector.colors) 
          : vector.colors;

        if (!Array.isArray(colors) || colors.length === 0) {
          console.log(`⚠️ No colors found for user ${vector.email}`);
          failCount++;
          continue;
        }

        // Get color for current week (0-indexed: week 1 = index 0)
        const weekIndex = (currentWeek - 1) % 52;
        const currentColor = colors[weekIndex];

        if (!currentColor || !currentColor.name || !currentColor.hex) {
          console.log(`⚠️ Invalid color data for user ${vector.email}, week ${currentWeek}`);
          failCount++;
          continue;
        }

        // Send email
        await sendVectorColorEmail(
          vector.email,
          vector.name || 'User',
          currentColor.name,
          currentColor.hex,
          currentWeek
        );

        console.log(`✅ Sent to ${vector.email} - Color: ${currentColor.name}`);
        successCount++;
        
        // Small delay to avoid rate limits (500ms between emails)
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Failed to send to ${vector.email}:`, error.message);
        failCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📧 Total: ${vectors.length}`);
    console.log('🎉 Weekly color notifications complete!');

  } catch (error) {
    console.error('❌ Vector notifier error:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  sendWeeklyColors()
    .then(() => {
      console.log('✅ Vector notifier finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Vector notifier failed:', error);
      process.exit(1);
    });
}

module.exports = { sendWeeklyColors };