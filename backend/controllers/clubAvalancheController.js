const { query, transaction } = require('../config/database');
const crypto = require('crypto');

// Конфигурация программ
const PROGRAMS = {
  'GS-I': { price: 5, levels: 4, perLevel: 0.90, gasFee: 0.02 },
  'GS-II': { price: 50, levels: 5, perLevel: 5.00, gasFee: 0.02 },
  'GS-III': { price: 500, levels: 7, perLevel: 35.71, gasFee: 0.02 },
  'GS-IV': { price: 1000, levels: 8, perLevel: 62.50, gasFee: 0.02 }
};

// Генерация уникального реферального кода
const generateReferralCode = (program) => {
  const suffix = program.replace('-', '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BRK-${random}-${suffix}`;
};

// Покупка программы
const joinProgram = async (req, res) => {
  try {
    const { program, referralCode } = req.body;
    const userId = req.userId;

    if (!PROGRAMS[program]) {
      return res.status(400).json({ error: 'Invalid program' });
    }

    const config = PROGRAMS[program];

    await transaction(async (client) => {
      // 1. Проверка что не куплена
      const existing = await client.query(
        'SELECT id FROM gs_memberships WHERE user_id = $1 AND program = $2',
        [userId, program]
      );
      
      if (existing.rows.length > 0) {
        throw new Error('Already member of this program');
      }

      // 2. Проверка баланса
      const balance = await client.query(
        'SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = $2',
        [userId, 'BRT']
      );

      if (!balance.rows[0] || parseFloat(balance.rows[0].balance) < config.price) {
        throw new Error('Insufficient BRT balance');
      }

      // 3. Найти реферера
      let referrerId = null;
      if (referralCode) {
        const referrer = await client.query(
          'SELECT user_id FROM gs_memberships WHERE referral_code = $1 AND program = $2',
          [referralCode, program]
        );
        
        if (referrer.rows.length > 0) {
          referrerId = referrer.rows[0].user_id;
        }
      }

      // 4. Генерировать код
      let newCode;
      let isUnique = false;
      while (!isUnique) {
        newCode = generateReferralCode(program);
        const check = await client.query(
          'SELECT id FROM gs_memberships WHERE referral_code = $1',
          [newCode]
        );
        isUnique = check.rows.length === 0;
      }

      // 5. Списать BRT
      await client.query(
        'UPDATE user_balances SET balance = balance - $1 WHERE user_id = $2 AND crypto = $3',
        [config.price, userId, 'BRT']
      );

      // 6. Создать членство
      await client.query(
        'INSERT INTO gs_memberships (user_id, program, referrer_id, referral_code, amount_paid) VALUES ($1, $2, $3, $4, $5)',
        [userId, program, referrerId, newCode, config.price]
      );

	// 7. Построить иерархию
	const hierarchy = [referrerId];
	let currentId = referrerId;

	for (let i = 1; i < config.levels; i++) {
 	 if (!currentId) {
	    hierarchy.push(null);
	    continue;
 	 }
  
	  const parent = await client.query(
 	   'SELECT referrer_id FROM gs_memberships WHERE user_id = $1 AND program = $2',
 	   [currentId, program]
	  );
  
	  currentId = parent.rows[0]?.referrer_id || null;
	  hierarchy.push(currentId);
	}

	// Дополняем до 8 уровней NULL значениями
	while (hierarchy.length < 8) {
	  hierarchy.push(null);
	}
      // 8. Сохранить иерархию
      const hierarchyValues = [userId, program, ...hierarchy];
      const placeholders = hierarchy.map((_, i) => `$${i + 3}`).join(', ');
      
      await client.query(
        `INSERT INTO gs_hierarchy (user_id, program, level_1_id, level_2_id, level_3_id, level_4_id, level_5_id, level_6_id, level_7_id, level_8_id)
         VALUES ($1, $2, ${placeholders})`,
        hierarchyValues
      );

      // 9. Распределить комиссии
      let totalPaid = 0;
      
      for (let i = 0; i < hierarchy.length; i++) {
        const recipientId = hierarchy[i];
        if (!recipientId) continue;

        const commission = config.perLevel - config.gasFee;
        
        // Начислить комиссию
        await client.query(
          'UPDATE user_balances SET balance = balance + $1 WHERE user_id = $2 AND crypto = $3',
          [commission, recipientId, 'BRT']
        );

        await client.query(
          'INSERT INTO gs_transactions (from_user_id, to_user_id, program, amount, type, level) VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, recipientId, program, commission, 'referral_commission', i + 1]
        );

        // Gas fee в фонд
        await client.query(
          'UPDATE user_balances SET balance = balance + $1 WHERE user_id = 2 AND crypto = $2',
          [config.gasFee, 'BRT']
        );

        await client.query(
          'INSERT INTO gs_transactions (from_user_id, to_user_id, program, amount, type, level) VALUES ($1, 2, $2, $3, $4, $5)',
          [userId, program, config.gasFee, 'gas_fee', i + 1]
        );

        totalPaid += config.perLevel;
      }

      // 10. Остаток в резервный фонд
      const reserve = config.price - totalPaid;
      if (reserve > 0) {
        await client.query(
          'UPDATE user_balances SET balance = balance + $1 WHERE user_id = 1 AND crypto = $2',
          [reserve, 'BRT']
        );

        await client.query(
          'INSERT INTO gs_transactions (from_user_id, to_user_id, program, amount, type) VALUES ($1, 1, $2, $3, $4)',
          [userId, program, reserve, 'to_reserve']
        );
      }

      res.json({
        success: true,
        message: 'Successfully joined program',
        data: { program, referralCode: newCode }
      });
    });

  } catch (error) {
    console.error('Join program error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

// Получить мои программы
const getMyPrograms = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await query(
      'SELECT program, referral_code, purchase_date, amount_paid FROM gs_memberships WHERE user_id = $1 ORDER BY purchase_date DESC',
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Получить статистику
const getStats = async (req, res) => {
  try {
    const userId = req.userId;

    // Подсчет рефералов
    const referrals = await query(
      'SELECT COUNT(*) as total FROM gs_memberships WHERE referrer_id = $1',
      [userId]
    );

    // Заработано BRT
    const earnings = await query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM gs_transactions WHERE to_user_id = $1 AND type = $2',
      [userId, 'referral_commission']
    );

    res.json({
      success: true,
      data: {
        totalReferrals: parseInt(referrals.rows[0].total),
        totalEarned: parseFloat(earnings.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Получить древо рефералов
const getReferralTree = async (req, res) => {
  try {
    const userId = req.userId;
    const { program } = req.params;

    if (!PROGRAMS[program]) {
      return res.status(400).json({ error: 'Invalid program' });
    }

    const tree = await query(
      `WITH RECURSIVE referral_tree AS (
        SELECT m.user_id, m.referral_code, u.name, u.email, m.purchase_date, 1 as level
        FROM gs_memberships m
        JOIN users u ON m.user_id = u.id
        WHERE m.referrer_id = $1 AND m.program = $2
        
        UNION ALL
        
        SELECT m.user_id, m.referral_code, u.name, u.email, m.purchase_date, rt.level + 1
        FROM gs_memberships m
        JOIN users u ON m.user_id = u.id
        JOIN referral_tree rt ON m.referrer_id = rt.user_id
        WHERE m.program = $2 AND rt.level < $3
      )
      SELECT * FROM referral_tree ORDER BY level, purchase_date`,
      [userId, program, PROGRAMS[program].levels]
    );

    res.json({ success: true, data: tree.rows });
  } catch (error) {
    console.error('Get tree error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  joinProgram,
  getMyPrograms,
  getStats,
  getReferralTree
};
