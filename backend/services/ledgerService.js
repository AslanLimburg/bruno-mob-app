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
   * Начислить выигрыш на баланс пользователя
   */
  async creditPayout(client, userId, amount, challengeId, betId) {
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
   * Начислить комиссию (10%) на admin аккаунт
   */
  async creditCommission(client, adminId, amount, challengeId) {
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
      transactionType: 'refund',
      amount: amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance
    });

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
