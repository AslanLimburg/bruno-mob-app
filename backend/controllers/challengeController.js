const { pool } = require('../config/database');

class ChallengeController {
  
  // CREATE CHALLENGE
  async createChallenge(req, res) {
    const client = await pool.connect();
    try {
      const {
        title, description, options, payoutMode, creatorPrize,
        minStake, maxStake, allowCreatorParticipation,
        openAcceptingAt, closeAcceptingAt, visibility
      } = req.body;
      const creatorId = req.userId;
      
      if (!title || !options || options.length < 2) {
        return res.status(400).json({ success: false, message: 'Title and at least 2 options required' });
      }
      if (!['pool_based', 'fixed_creator_prize'].includes(payoutMode)) {
        return res.status(400).json({ success: false, message: 'Invalid payout mode' });
      }
      
      await client.query('BEGIN');
      
      if (payoutMode === 'fixed_creator_prize') {
        if (!creatorPrize || creatorPrize <= 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Creator prize required for fixed mode' });
        }
        
        const balanceResult = await client.query(
          'SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = $2',
          [creatorId, 'BRT']
        );
        
        if (balanceResult.rows.length === 0 || balanceResult.rows[0].balance < creatorPrize) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Insufficient balance for creator prize' });
        }
        
        const balanceBefore = parseFloat(balanceResult.rows[0].balance);
        const balanceAfter = balanceBefore - parseFloat(creatorPrize);
        
        await client.query(
          'UPDATE user_balances SET balance = $1, updated_at = NOW() WHERE user_id = $2 AND crypto = $3',
          [balanceAfter, creatorId, 'BRT']
        );
      }
      
      const challengeResult = await client.query(
        `INSERT INTO challenges (
          creator_id, title, description, payout_mode, creator_prize_reserved,
          min_stake, max_stake, allow_creator_participation,
          open_accepting_at, close_accepting_at, visibility, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [creatorId, title, description, payoutMode, creatorPrize || 0, minStake || 1, maxStake,
         allowCreatorParticipation || false, openAcceptingAt || new Date(), closeAcceptingAt,
         visibility || 'public', 'draft']
      );
      
      const challenge = challengeResult.rows[0];
      const optionPromises = options.map((optionText, index) => {
        return client.query(
          'INSERT INTO challenge_options (challenge_id, option_text, option_order) VALUES ($1, $2, $3) RETURNING *',
          [challenge.id, optionText, index + 1]
        );
      });
      const optionResults = await Promise.all(optionPromises);
      const createdOptions = optionResults.map(r => r.rows[0]);
      
      await client.query('COMMIT');
      res.json({ success: true, message: 'Challenge created successfully', data: { challenge, options: createdOptions } });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create challenge error:', error);
      res.status(500).json({ success: false, message: 'Failed to create challenge' });
    } finally {
      client.release();
    }
  }
  
  // GET CHALLENGES
  async getChallenges(req, res) {
    try {
      const { status, search, limit = 20, offset = 0 } = req.query;
      let query = `
        SELECT c.*, u.name as creator_name, COUNT(DISTINCT b.id) as total_bets,
               COALESCE(SUM(b.amount), 0) as total_pool
        FROM challenges c
        LEFT JOIN users u ON c.creator_id = u.id
        LEFT JOIN bets b ON c.id = b.challenge_id
        WHERE c.visibility = 'public'
      `;
      const params = [];
      let paramIndex = 1;
      if (status) {
        query += ` AND c.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      if (search) {
        query += ` AND (c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      query += ` GROUP BY c.id, u.name ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Get challenges error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch challenges' });
    }
  }
  
  // GET CHALLENGE DETAILS
  async getChallengeDetails(req, res) {
    try {
      const { challengeId } = req.params;
      const challengeResult = await pool.query(
        'SELECT c.*, u.name as creator_name FROM challenges c LEFT JOIN users u ON c.creator_id = u.id WHERE c.id = $1',
        [challengeId]
      );
      if (challengeResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Challenge not found' });
      }
      const challenge = challengeResult.rows[0];
      const optionsResult = await pool.query(
        `SELECT co.*, COUNT(b.id) as bet_count, COALESCE(SUM(b.amount), 0) as total_amount
         FROM challenge_options co LEFT JOIN bets b ON co.id = b.option_id
         WHERE co.challenge_id = $1 GROUP BY co.id ORDER BY co.option_order`,
        [challengeId]
      );
      challenge.options = optionsResult.rows;
      const poolResult = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) as total_pool FROM bets WHERE challenge_id = $1',
        [challengeId]
      );
      challenge.total_pool = poolResult.rows[0].total_pool;
      res.json({ success: true, data: challenge });
    } catch (error) {
      console.error('Get challenge details error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch challenge details' });
    }
  }
  
  // OPEN CHALLENGE
  async openChallenge(req, res) {
    const client = await pool.connect();
    try {
      const { challengeId } = req.params;
      const userId = req.userId;
      await client.query('BEGIN');
      const challengeResult = await client.query('SELECT * FROM challenges WHERE id = $1 FOR UPDATE', [challengeId]);
      if (challengeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Challenge not found' });
      }
      const challenge = challengeResult.rows[0];
      if (challenge.creator_id !== userId) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, message: 'Only creator can open challenge' });
      }
      if (challenge.status !== 'draft') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Challenge already opened or finished' });
      }
      await client.query('UPDATE challenges SET status = $1, updated_at = NOW() WHERE id = $2', ['open', challengeId]);
      await client.query('COMMIT');
      res.json({ success: true, message: 'Challenge opened for betting' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Open challenge error:', error);
      res.status(500).json({ success: false, message: 'Failed to open challenge' });
    } finally {
      client.release();
    }
  }
  
  // CLOSE CHALLENGE
  async closeChallenge(req, res) {
    const client = await pool.connect();
    try {
      const { challengeId } = req.params;
      const userId = req.userId;
      await client.query('BEGIN');
      const challengeResult = await client.query('SELECT * FROM challenges WHERE id = $1 FOR UPDATE', [challengeId]);
      if (challengeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Challenge not found' });
      }
      const challenge = challengeResult.rows[0];
      if (challenge.creator_id !== userId) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, message: 'Only creator can close challenge' });
      }
      if (challenge.status !== 'open') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Challenge not open' });
      }
      await client.query('UPDATE challenges SET status = $1, updated_at = NOW() WHERE id = $2', ['closed_for_bets', challengeId]);
      await client.query('COMMIT');
      res.json({ success: true, message: 'Challenge closed for betting' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Close challenge error:', error);
      res.status(500).json({ success: false, message: 'Failed to close challenge' });
    } finally {
      client.release();
    }
  }
  
  // PLACE BET
  async placeBet(req, res) {
    const client = await pool.connect();
    try {
      const { challengeId } = req.params;
      const { optionId, amount } = req.body;
      const userId = req.userId;
      const idempotencyKey = req.headers['idempotency-key'];
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid bet amount' });
      }
      if (idempotencyKey) {
        const existingBet = await client.query('SELECT * FROM bets WHERE idempotency_key = $1', [idempotencyKey]);
        if (existingBet.rows.length > 0) {
          return res.json({ success: true, message: 'Bet already placed', data: existingBet.rows[0] });
        }
      }
      
      await client.query('BEGIN');
      const challengeResult = await client.query('SELECT * FROM challenges WHERE id = $1 FOR UPDATE', [challengeId]);
      if (challengeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Challenge not found' });
      }
      const challenge = challengeResult.rows[0];
      if (challenge.status !== 'open') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Challenge not accepting bets' });
      }
      if (challenge.creator_id === userId && !challenge.allow_creator_participation) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, message: 'Creator cannot participate in this challenge' });
      }
      if (amount < parseFloat(challenge.min_stake)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Minimum stake is ${challenge.min_stake} BRT` });
      }
      if (challenge.max_stake && amount > parseFloat(challenge.max_stake)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Maximum stake is ${challenge.max_stake} BRT` });
      }
      
      const optionResult = await client.query('SELECT * FROM challenge_options WHERE id = $1 AND challenge_id = $2', [optionId, challengeId]);
      if (optionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Invalid option' });
      }
      
      const balanceResult = await client.query('SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = $2', [userId, 'BRT']);
      if (balanceResult.rows.length === 0 || parseFloat(balanceResult.rows[0].balance) < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Insufficient balance' });
      }
      
      const balanceBefore = parseFloat(balanceResult.rows[0].balance);
      const balanceAfter = balanceBefore - amount;
      await client.query('UPDATE user_balances SET balance = $1, updated_at = NOW() WHERE user_id = $2 AND crypto = $3', [balanceAfter, userId, 'BRT']);
      
      const betResult = await client.query(
        'INSERT INTO bets (challenge_id, user_id, option_id, amount, idempotency_key) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [challengeId, userId, optionId, amount, idempotencyKey]
      );
      const bet = betResult.rows[0];
      
      await client.query(
        `INSERT INTO challenge_ledger (challenge_id, bet_id, user_id, transaction_type, amount, balance_before, balance_after, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [challengeId, bet.id, userId, 'stake_locked', amount, balanceBefore, balanceAfter, `Bet placed on challenge: ${challenge.title}`]
      );
      
      await client.query('COMMIT');
      res.json({ success: true, message: 'Bet placed successfully', data: bet });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Place bet error:', error);
      res.status(500).json({ success: false, message: 'Failed to place bet' });
    } finally {
      client.release();
    }
  }
  
  // RESOLVE CHALLENGE
  async resolveChallenge(req, res) {
    const client = await pool.connect();
    try {
      const { challengeId } = req.params;
      const { winningOptionId } = req.body;
      const userId = req.userId;
      
      await client.query('BEGIN');
      const challengeResult = await client.query('SELECT * FROM challenges WHERE id = $1 FOR UPDATE', [challengeId]);
      if (challengeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Challenge not found' });
      }
      const challenge = challengeResult.rows[0];
      if (challenge.creator_id !== userId) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, message: 'Only creator can resolve challenge' });
      }
      if (challenge.status !== 'closed_for_bets') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Challenge must be closed for bets first' });
      }
      
      const optionResult = await client.query('SELECT * FROM challenge_options WHERE id = $1 AND challenge_id = $2', [winningOptionId, challengeId]);
      if (optionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Invalid winning option' });
      }
      
      await client.query(
        'UPDATE challenges SET status = $1, winning_option_id = $2, resolved_at = NOW(), resolved_by = $3, updated_at = NOW() WHERE id = $4',
        ['resolved', winningOptionId, userId, challengeId]
      );
      
      await client.query(
        'INSERT INTO payout_jobs (challenge_id, status, idempotency_key) VALUES ($1, $2, $3)',
        [challengeId, 'pending', `resolve-${challengeId}-${Date.now()}`]
      );
      
      await client.query('COMMIT');
      res.json({ success: true, message: 'Challenge resolved. Payouts will be processed shortly.' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Resolve challenge error:', error);
      res.status(500).json({ success: false, message: 'Failed to resolve challenge' });
    } finally {
      client.release();
    }
  }
  
  // GET MY BETS
  async getMyBets(req, res) {
    try {
      const userId = req.userId;
      const { status, limit = 20, offset = 0 } = req.query;
      let query = `
        SELECT b.*, c.title as challenge_title, c.status as challenge_status,
               co.option_text, u.name as user_name
        FROM bets b
        LEFT JOIN challenges c ON b.challenge_id = c.id
        LEFT JOIN challenge_options co ON b.option_id = co.id
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;
      if (status) {
        query += ` AND b.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Get my bets error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch bets' });
    }
  }
      /**
   * Ручная обработка выплат для челленджа
   * POST /api/challenge/:challengeId/process-payouts
   */
  async processPayouts(req, res) {
    try {
      const { challengeId } = req.params;

      // Проверить, что челлендж существует и в статусе 'resolved'
      const challengeQuery = `
        SELECT * FROM challenges
        WHERE id = $1
      `;
      const challengeResult = await pool.query(challengeQuery, [challengeId]);

      if (challengeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      const challenge = challengeResult.rows[0];

      if (challenge.status !== 'resolved') {
        return res.status(400).json({ 
          error: 'Challenge must be in resolved status to process payouts',
          currentStatus: challenge.status
        });
      }

      // Запустить ручную обработку
      const payoutScheduler = require('../services/payoutScheduler');
      const result = await payoutScheduler.triggerManualPayout(challengeId);

      if (result.success) {
        res.json({
          message: 'Payouts processed successfully',
          data: result.data
        });
      } else {
        res.status(500).json({
          error: 'Failed to process payouts',
          message: result.message
        });
      }

    } catch (error) {
      console.error('Error processing payouts:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Получить список выплат по челленджу
   * GET /api/challenge/:challengeId/payouts
   */
  async getChallengePayouts(req, res) {
    try {
      const { challengeId } = req.params;

      // Получить все ставки с выплатами
      const query = `
        SELECT 
          b.id as bet_id,
          b.user_id,
          u.email as user_email,
          b.option_id,
          co.option_text,
          b.amount as bet_amount,
          b.status as bet_status,
          b.payout,
          b.created_at as bet_created_at
        FROM bets b
        JOIN users u ON b.user_id = u.id
        JOIN challenge_options co ON b.option_id = co.id
        WHERE b.challenge_id = $1
        ORDER BY 
          CASE 
            WHEN b.status = 'won' THEN 1
            WHEN b.status = 'lost' THEN 2
            ELSE 3
          END,
          b.payout DESC NULLS LAST
      `;

      const result = await pool.query(query, [challengeId]);

      // Вычислить статистику
      const stats = {
        totalBets: result.rows.length,
        wonBets: result.rows.filter(b => b.bet_status === 'won').length,
        lostBets: result.rows.filter(b => b.bet_status === 'lost').length,
        activeBets: result.rows.filter(b => b.bet_status === 'active').length,
        totalBetAmount: result.rows.reduce((sum, b) => sum + parseFloat(b.bet_amount), 0),
        totalPayouts: result.rows
          .filter(b => b.payout)
          .reduce((sum, b) => sum + parseFloat(b.payout), 0)
      };

      res.json({
        stats,
        bets: result.rows
      });

    } catch (error) {
      console.error('Error getting challenge payouts:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // CREATE DISPUTE
  async createDispute(req, res) {
    const client = await pool.connect();
    try {
      const { challengeId } = req.params;
      const { reason, evidence } = req.body;
      const userId = req.userId;

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ 
          success: false, 
          message: 'Dispute reason must be at least 10 characters' 
        });
      }

      await client.query('BEGIN');

      const challengeResult = await client.query(
        'SELECT id, status, winning_option_id FROM challenges WHERE id = $1',
        [challengeId]
      );

      if (challengeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Challenge not found' });
      }

      const challenge = challengeResult.rows[0];

      if (challenge.status !== 'resolved') {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          message: 'Can only dispute resolved challenges' 
        });
      }

      const betResult = await client.query(
        'SELECT id FROM bets WHERE challenge_id = $1 AND user_id = $2',
        [challengeId, userId]
      );

      if (betResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          success: false, 
          message: 'Only participants can create disputes' 
        });
      }

      const existingDispute = await client.query(
        'SELECT id FROM disputes WHERE challenge_id = $1 AND status IN ($2, $3)',
        [challengeId, 'open', 'under_review']
      );

      if (existingDispute.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          message: 'There is already an active dispute for this challenge' 
        });
      }

      const disputeResult = await client.query(
        "INSERT INTO disputes (challenge_id, user_id, reason, evidence, status, deadline) VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '72 hours') RETURNING id, created_at, deadline",
        [challengeId, userId, reason, evidence || null, 'open']
      );

      await client.query(
        'UPDATE challenges SET status = $1, updated_at = NOW() WHERE id = $2',
        ['disputed', challengeId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Dispute created successfully',
        dispute: disputeResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating dispute:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  async getChallengeDisputes(req, res) {
    try {
      const { challengeId } = req.params;
      const userId = req.userId;

      const userResult = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const userRole = userResult.rows[0].role;

      const challengeResult = await pool.query(
        'SELECT creator_id FROM challenges WHERE id = $1',
        [challengeId]
      );

      if (challengeResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Challenge not found' });
      }

      const isCreator = challengeResult.rows[0].creator_id === userId;
      const isModerator = ['moderator', 'admin'].includes(userRole);

      if (!isCreator && !isModerator) {
        return res.status(403).json({ 
          success: false, 
          message: 'Only challenge creator or moderators can view disputes' 
        });
      }

      const disputes = await pool.query(
        'SELECT d.id, d.challenge_id, d.user_id, u.email as user_email, d.reason, d.evidence, d.status, d.deadline, d.created_at, dr.decision, dr.notes as resolution_notes, dr.created_at as resolution_created_at, m.email as moderator_email FROM disputes d JOIN users u ON d.user_id = u.id LEFT JOIN dispute_resolutions dr ON d.id = dr.dispute_id LEFT JOIN users m ON dr.moderator_id = m.id WHERE d.challenge_id = $1 ORDER BY d.created_at DESC',
        [challengeId]
      );

      res.json({
        success: true,
        disputes: disputes.rows
      });

    } catch (error) {
      console.error('Error getting challenge disputes:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async resolveDispute(req, res) {
    const client = await pool.connect();
    try {
      const { disputeId } = req.params;
      const { decision, notes, newWinningOptionId } = req.body;
      const moderatorId = req.userId;

      const validDecisions = ['confirm_result', 'reverse_result', 'refund_all', 'partial_adjustment'];
      if (!validDecisions.includes(decision)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid decision type' 
        });
      }

      if (decision === 'reverse_result' && !newWinningOptionId) {
        return res.status(400).json({ 
          success: false, 
          message: 'New winning option ID required for reverse_result' 
        });
      }

      await client.query('BEGIN');

      const disputeResult = await client.query(
        'SELECT id, challenge_id, status FROM disputes WHERE id = $1',
        [disputeId]
      );

      if (disputeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Dispute not found' });
      }

      const dispute = disputeResult.rows[0];

      if (dispute.status === 'resolved') {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          message: 'Dispute already resolved' 
        });
      }

      const challengeId = dispute.challenge_id;

      if (decision === 'confirm_result') {
        await client.query(
          'UPDATE challenges SET status = $1, updated_at = NOW() WHERE id = $2',
          ['resolved', challengeId]
        );

      } else if (decision === 'reverse_result') {
        const optionCheck = await client.query(
          'SELECT id FROM challenge_options WHERE id = $1 AND challenge_id = $2',
          [newWinningOptionId, challengeId]
        );

        if (optionCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid winning option ID' 
          });
        }

        const previousPayouts = await client.query(
          'SELECT id, user_id, amount, payout, status FROM bets WHERE challenge_id = $1 AND status IN ($2, $3)',
          [challengeId, 'won', 'lost']
        );

        for (const bet of previousPayouts.rows) {
          if (bet.status === 'won' && bet.payout) {
            await client.query(
              'UPDATE user_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 AND crypto = $3',
              [bet.payout, bet.user_id, 'BRT']
            );
          }
          await client.query(
            'UPDATE bets SET status = $1, payout = NULL WHERE id = $2',
            ['active', bet.id]
          );
        }

        await client.query(
          'UPDATE challenges SET winning_option_id = $1, status = $2, resolved_at = NOW(), updated_at = NOW() WHERE id = $3',
          [newWinningOptionId, 'resolved', challengeId]
        );

        await client.query(
          'INSERT INTO payout_jobs (challenge_id, status, idempotency_key) VALUES ($1, $2, $3)',
          [challengeId, 'pending', 'dispute-resolution-' + disputeId + '-' + Date.now()]
        );

      } else if (decision === 'refund_all') {
        const allBets = await client.query(
          'SELECT id, user_id, amount FROM bets WHERE challenge_id = $1',
          [challengeId]
        );

        for (const bet of allBets.rows) {
          const balanceResult = await client.query(
            'SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = $2',
            [bet.user_id, 'BRT']
          );

          const balanceBefore = parseFloat(balanceResult.rows[0].balance);
          const balanceAfter = balanceBefore + parseFloat(bet.amount);

          await client.query(
            'UPDATE user_balances SET balance = $1, updated_at = NOW() WHERE user_id = $2 AND crypto = $3',
            [balanceAfter, bet.user_id, 'BRT']
          );

          await client.query(
            'UPDATE bets SET status = $1, payout = NULL WHERE id = $2',
            ['refunded', bet.id]
          );

          await client.query(
            'INSERT INTO challenge_ledger (challenge_id, bet_id, user_id, transaction_type, amount, balance_before, balance_after) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [challengeId, bet.id, bet.user_id, 'refund', bet.amount, balanceBefore, balanceAfter]
          );
        }

        await client.query(
          'UPDATE challenges SET status = $1, updated_at = NOW() WHERE id = $2',
          ['cancelled', challengeId]
        );
      }

      await client.query(
        'INSERT INTO dispute_resolutions (dispute_id, moderator_id, decision, notes, new_winning_option_id) VALUES ($1, $2, $3, $4, $5)',
        [disputeId, moderatorId, decision, notes, newWinningOptionId]
      );

      await client.query(
        'UPDATE disputes SET status = $1 WHERE id = $2',
        ['resolved', disputeId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Dispute resolved successfully',
        decision
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error resolving dispute:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }
}

module.exports = new ChallengeController();
