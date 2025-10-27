const pool = require('../config/database');

class LedgerService {
  /**
   * Создать транзакцию в challenge_ledger
   */
  async createLedgerEntry(client, {
    challengeId,
    betId = null,
    userId,
    transactionType,
    amount,
    balanceBefore,
    balanceAfter
  }) {
    const query = `
      INSERT INTO challenge_ledger (
        challenge_id, bet_id, user_id, transaction_type,
        amount, balance_before, balance_after
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      challengeId,
      betId,
      userId,
      transactionType,
      amount,
      balanceBefore,
      balanceAfter
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  }

  /**
   * Заблокировать BRT на балансе пользователя (для ставки)
   */
  async lockBalance(client, userId, amount, challengeId, betId) {
    // Получить текущий баланс
    const balanceQuery = `
      SELECT balance
      FROM user_balances
      WHERE user_id = $1 AND crypto = 'BRT'
      FOR UPDATE
    `;
    const balanceResult = await client.query(balanceQuery, [userId]);

    if (balanceResult.rows.length === 0) {
      throw new Error('User balance not found');
    }

    const currentBalance = parseFloat(balanceResult.rows[0].balance);

    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    const newBalance = currentBalance - amount;

    // Обновить баланс
    const updateQuery = `
      UPDATE user_balances
      SET balance = $1
      WHERE user_id = $2 AND crypto = 'BRT'
    `;
    await client.query(updateQuery, [newBalance, userId]);

    // Создать ledger entry
    await this.createLedgerEntry(client, {
      challengeId,
      betId,
      userId,
      transactionType: 'stake_locked',
      amount: -amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance
    });

    return newBalance;
  }

  /**
   * ✅ НОВАЯ ФУНКЦИЯ: Выплатить приз из admin с вычетом 20% комиссии
   * Admin платит полную сумму, но 20% возвращается admin как комиссия
   */
  async creditPayoutFromAdmin(client, userId, fullPrizeAmount, challengeId, betId) {
    const adminId = 1;
    const adminFee = fullPrizeAmount * 0.20; // 20% комиссия
    const actualPayout = fullPrizeAmount * 0.80; // 80% победителю

    // 1. Вычесть полную сумму из admin
    const adminBalanceQuery = `
      SELECT balance FROM user_balances
      WHERE user_id = $1 AND crypto = 'BRT'
      FOR UPDATE
    `;
    const adminBalanceResult = await client.query(adminBalanceQuery, [adminId]);

    if (adminBalanceResult.rows.length === 0) {
      throw new Error('Admin balance not found');
    }

    const adminBalanceBefore = parseFloat(adminBalanceResult.rows[0].balance);
    
    if (adminBalanceBefore < fullPrizeAmount) {
      throw new Error(`Insufficient admin balance. Need ${fullPrizeAmount} BRT, have ${adminBalanceBefore} BRT`);
    }

    const adminBalanceAfterDeduct = adminBalanceBefore - fullPrizeAmount;

    await client.query(
      `UPDATE user_balances SET balance = $1, updated_at = NOW()
       WHERE user_id = $2 AND crypto = 'BRT'`,
      [adminBalanceAfterDeduct, adminId]
    );

    // 2. Вернуть 20% комиссии admin
    const adminBalanceAfterFee = adminBalanceAfterDeduct + adminFee;

    await client.query(
      `UPDATE user_balances SET balance = $1, updated_at = NOW()
       WHERE user_id = $2 AND crypto = 'BRT'`,
      [adminBalanceAfterFee, adminId]
    );

    // 3. Выплатить 80% победителю
    const userBalanceQuery = `
      SELECT balance FROM user_balances
      WHERE user_id = $1 AND crypto = 'BRT'
      FOR UPDATE
    `;
    const userBalanceResult = await client.query(userBalanceQuery, [userId]);

    if (userBalanceResult.rows.length === 0) {
      throw new Error('User balance not found');
    }

    const userBalanceBefore = parseFloat(userBalanceResult.rows[0].balance);
    const userBalanceAfter = userBalanceBefore + actualPayout;

    await client.query(
      `UPDATE user_balances SET balance = $1, updated_at = NOW()
       WHERE user_id = $2 AND crypto = 'BRT'`,
      [userBalanceAfter, userId]
    );

    // 4. Создать ledger entries
    await this.createLedgerEntry(client, {
      challengeId,
      betId,
      userId,
      transactionType: 'payout',
      amount: actualPayout,
      balanceBefore: userBalanceBefore,
      balanceAfter: userBalanceAfter
    });

    await this.createLedgerEntry(client, {
      challengeId,
      betId: null,
      userId: adminId,
      transactionType: 'commission',
      amount: adminFee,
      balanceBefore: adminBalanceAfterDeduct,
      balanceAfter: adminBalanceAfterFee
    });

    // 5. Создать транзакцию в transactions
    await client.query(
      `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status, metadata)
       VALUES (1, $1, 'BRT', $2, 'challenge_prize', 'completed', $3::jsonb)`,
      [userId, actualPayout, JSON.stringify({
        full_prize: fullPrizeAmount,
        admin_fee: adminFee,
        payout: actualPayout,
        challenge_id: challengeId,
        bet_id: betId
      })]
    );

    console.log(`💰 Prize paid: ${fullPrizeAmount} BRT → User ${userId} received ${actualPayout} BRT, admin kept ${adminFee} BRT`);

    return {
      fullPrize: fullPrizeAmount,
      adminFee: adminFee,
      actualPayout: actualPayout,
      userBalanceAfter: userBalanceAfter
    };
  }

  /**
   * Начислить выигрыш на баланс пользователя (СТАРАЯ ФУНКЦИЯ - НЕ ИСПОЛЬЗОВАТЬ)
   * @deprecated Использовать creditPayoutFromAdmin() вместо этого
   */
  async creditPayout(client, userId, amount, challengeId, betId) {
    console.warn('⚠️ creditPayout() is deprecated. Use creditPayoutFromAdmin() instead');
    
    // Получить текущий баланс
    const balanceQuery = `
      SELECT balance
      FROM user_balances
      WHERE user_id = $1 AND crypto = 'BRT'
      FOR UPDATE
    `;
    const balanceResult = await client.query(balanceQuery, [userId]);

    if (balanceResult.rows.length === 0) {
      throw new Error('User balance not found');
    }

    const currentBalance = parseFloat(balanceResult.rows[0].balance);
    const newBalance = currentBalance + amount;

    // Обновить баланс
    const updateQuery = `
      UPDATE user_balances
      SET balance = $1
      WHERE user_id = $2 AND crypto = 'BRT'
    `;
    await client.query(updateQuery, [newBalance, userId]);

    // Создать ledger entry
    await this.createLedgerEntry(client, {
      challengeId,
      betId,
      userId,
      transactionType: 'payout',
      amount: amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance
    });

    return newBalance;
  }

  /**
   * Начислить комиссию на admin аккаунт (СТАРАЯ ФУНКЦИЯ - НЕ ИСПОЛЬЗОВАТЬ)
   * @deprecated Комиссия теперь начисляется через creditPayoutFromAdmin()
   */
  async creditCommission(client, adminId, amount, challengeId) {
    console.warn('⚠️ creditCommission() is deprecated. Commission is now handled in creditPayoutFromAdmin()');
    
    // Получить текущий баланс admin
    const balanceQuery = `
      SELECT balance
      FROM user_balances
      WHERE user_id = $1 AND crypto = 'BRT'
      FOR UPDATE
    `;
    const balanceResult = await client.query(balanceQuery, [adminId]);

    if (balanceResult.rows.length === 0) {
      throw new Error('Admin balance not found');
    }

    const currentBalance = parseFloat(balanceResult.rows[0].balance);
    const newBalance = currentBalance + amount;

    // Обновить баланс
    const updateQuery = `
      UPDATE user_balances
      SET balance = $1
      WHERE user_id = $2 AND crypto = 'BRT'
    `;
    await client.query(updateQuery, [newBalance, adminId]);

    // Создать ledger entry
    await this.createLedgerEntry(client, {
      challengeId,
      betId: null,
      userId: adminId,
      transactionType: 'commission',
      amount: amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance
    });

    return newBalance;
  }

  /**
   * Возврат ставки пользователю (refund)
   */
  async refundBet(client, userId, amount, challengeId, betId) {
    const adminId = 1;

    // 1. Вычесть из admin (возврат денег которые были получены при ставке)
    await client.query(
      `UPDATE user_balances SET balance = balance - $1, updated_at = NOW()
       WHERE user_id = $2 AND crypto = 'BRT'`,
      [amount, adminId]
    );

    // 2. Вернуть пользователю
    const balanceQuery = `
      SELECT balance FROM user_balances
      WHERE user_id = $1 AND crypto = 'BRT'
      FOR UPDATE
    `;
    const balanceResult = await client.query(balanceQuery, [userId]);

    if (balanceResult.rows.length === 0) {
      throw new Error('User balance not found');
    }

    const currentBalance = parseFloat(balanceResult.rows[0].balance);
    const newBalance = currentBalance + amount;

    await client.query(
      `UPDATE user_balances SET balance = $1, updated_at = NOW()
       WHERE user_id = $2 AND crypto = 'BRT'`,
      [newBalance, userId]
    );

    // 3. Создать ledger entry
    await this.createLedgerEntry(client, {
      challengeId,
      betId,
      userId,
      transactionType: 'refund',
      amount: amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance
    });

    // 4. Создать транзакцию
    await client.query(
      `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status)
       VALUES (1, $1, 'BRT', $2, 'challenge_refund', 'completed')`,
      [userId, amount]
    );

    console.log(`🔄 Refund: ${amount} BRT returned to user ${userId} from admin`);

    return newBalance;
  }

  /**
   * Резервировать creator prize (для fixed_creator_prize mode)
   */
  async reserveCreatorPrize(client, creatorId, amount, challengeId) {
    // Получить текущий баланс
    const balanceQuery = `
      SELECT balance
      FROM user_balances
      WHERE user_id = $1 AND crypto = 'BRT'
      FOR UPDATE
    `;
    const balanceResult = await client.query(balanceQuery, [creatorId]);

    if (balanceResult.rows.length === 0) {
      throw new Error('Creator balance not found');
    }

    const currentBalance = parseFloat(balanceResult.rows[0].balance);

    if (currentBalance < amount) {
      throw new Error('Insufficient balance to reserve creator prize');
    }

    const newBalance = currentBalance - amount;

    // Обновить баланс
    const updateQuery = `
      UPDATE user_balances
      SET balance = $1
      WHERE user_id = $2 AND crypto = 'BRT'
    `;
    await client.query(updateQuery, [newBalance, creatorId]);

    // Создать ledger entry
    await this.createLedgerEntry(client, {
      challengeId,
      betId: null,
      userId: creatorId,
      transactionType: 'creator_prize_reserve',
      amount: -amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance
    });

    return newBalance;
  }
}

module.exports = new LedgerService();