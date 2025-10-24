require('dotenv').config();
const crypto = require('crypto');
const { query } = require('../config/database');

const PROGRAMS = ['GS-I', 'GS-II', 'GS-III', 'GS-IV'];

const generateReferralCode = (program) => {
  const suffix = program.replace('-', '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BRK-${random}-${suffix}`;
};

async function createFounderCodes() {
  try {
    console.log('🔄 Creating founder referral codes for Admin (id=1)...');
    
    for (const program of PROGRAMS) {
      // Проверяем существует ли уже
      const existing = await query(
        'SELECT id FROM gs_memberships WHERE user_id = 1 AND program = $1',
        [program]
      );
      
      if (existing.rows.length > 0) {
        console.log(`⚠️  ${program} already exists for Admin`);
        continue;
      }
      
      // Генерируем уникальный код
      let code;
      let isUnique = false;
      while (!isUnique) {
        code = generateReferralCode(program);
        const check = await query(
          'SELECT id FROM gs_memberships WHERE referral_code = $1',
          [code]
        );
        isUnique = check.rows.length === 0;
      }
      
      // Создаём членство (без оплаты, бесплатно для основателя)
      await query(
        `INSERT INTO gs_memberships (user_id, program, referrer_id, referral_code, amount_paid, status)
         VALUES (1, $1, NULL, $2, 0, 'active')`,
        [program, code]
      );
      
      // Создаём иерархию (все уровни NULL так как первый)
      await query(
        `INSERT INTO gs_hierarchy (user_id, program, level_1_id, level_2_id, level_3_id, level_4_id, level_5_id, level_6_id, level_7_id, level_8_id)
         VALUES (1, $1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
        [program]
      );
      
      console.log(`✅ ${program}: ${code}`);
    }
    
    console.log('\n🎉 All founder codes created!');
    console.log('\n📋 Admin referral codes:');
    
    const codes = await query(
      'SELECT program, referral_code FROM gs_memberships WHERE user_id = 1 ORDER BY program'
    );
    
    codes.rows.forEach(row => {
      console.log(`   ${row.program}: ${row.referral_code}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createFounderCodes();
