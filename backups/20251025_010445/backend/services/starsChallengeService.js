// =====================================================
// BRT STARS CHALLENGE - CHALLENGE SERVICE
// backend/services/starsChallengeService.js
// =====================================================

const { pool } = require('../config/database');

class StarsChallengeService {
  
  /**
   * Создать Challenge (только для админов/модераторов)
   */
  static async createChallenge(adminId, data) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { 
        nominationId, 
        title, 
        description, 
        adminWallet, 
        minStake = 1, 
        maxStake = 50, 
        endDate 
      } = data;
      
      // Проверить роль
      const admin = await client.query(
        `SELECT role FROM users WHERE id = $1`,
        [adminId]
      );
      
      if (!admin.rows[0] || !['admin', 'moderator'].includes(admin.rows[0].role)) {
        throw new Error('Only admins can create challenges');
      }
      
      // Создать Challenge
      const result = await client.query(
        `INSERT INTO stars_challenges 
         (nomination_id, title, description, created_by, admin_wallet, min_stake, max_stake, end_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
         RETURNING *`,
        [nominationId, title, description, adminId, adminWallet, minStake, maxStake, endDate]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        challenge: result.rows[0],
        message: 'Challenge created successfully'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create challenge error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Отправить фото в Challenge (стоимость 1 BRT)
   */
  static async submitPhotoToChallenge(userId, photoId, challengeId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Проверить Challenge
      const challenge = await client.query(
        `SELECT * FROM stars_challenges WHERE id = $1 AND status = 'active'`,
        [challengeId]
      );
      
      if (challenge.rows.length === 0) {
        throw new Error('Challenge not found or inactive');
      }
      
      if (new Date(challenge.rows[0].end_date) < new Date()) {
        throw new Error('Challenge has ended');
      }
      
      // Проверить фото
      const photo = await client.query(
        `SELECT * FROM stars_photos 
         WHERE id = $1 AND user_id = $2 AND status = 'active' AND moderation_status = 'approved'`,
        [photoId, userId]
      );
      
      if (photo.rows.length === 0) {
        throw new Error('Photo not found or not approved');
      }
      
      // Проверить: уже участвует?
      const existing = await client.query(
        `SELECT id FROM stars_challenge_participants 
         WHERE challenge_id = $1 AND photo_id = $2`,
        [challengeId, photoId]
      );
      
      if (existing.rows.length > 0) {
        throw new Error('This photo is already participating in this challenge');
      }
      
      // Проверить баланс
      const balance = await client.query(
        `SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = 'BRT'`,
        [userId]
      );
      
      if (!balance.rows[0] || balance.rows[0].balance < 1) {
        throw new Error('Insufficient BRT balance. Need 1 BRT to submit photo to challenge.');
      }
      
      // Списать 1 BRT
      await client.query(
        `UPDATE user_balances 
         SET balance = balance - 1, updated_at = NOW()
         WHERE user_id = $1 AND crypto = 'BRT'`,
        [userId]
      );
      
      // Начислить admin@brunotoken.com
      await client.query(
        `UPDATE user_balances 
         SET balance = balance + 1, updated_at = NOW()
         WHERE user_id = 1 AND crypto = 'BRT'`,
        []
      );
      
      // Записать транзакцию
      await client.query(
        `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status, reference_id)
         VALUES ($1, 1, 'BRT', 1, 'stars_challenge_submission', 'completed', $2)`,
        [userId, challengeId]
      );
      
      // Добавить участника
      await client.query(
        `INSERT INTO stars_challenge_participants (challenge_id, photo_id, user_id)
         VALUES ($1, $2, $3)`,
        [challengeId, photoId, userId]
      );
      
      await client.query('COMMIT');
      
      console.log(`✅ User ${userId} submitted photo to challenge ${challengeId} (1 BRT → admin)`);
      
      return {
        success: true,
        message: 'Photo submitted to challenge successfully (1 BRT charged)'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Submit photo to challenge error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Голосовать в Challenge
   * ✅ 100% голосов идёт на admin
   */
  static async voteInChallenge(fromUserId, challengeId, participantId, starsCount) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Валидация
      if (starsCount < 1 || starsCount > 50) {
        throw new Error('Stars count must be between 1 and 50');
      }
      
      // Проверить Challenge
      const challenge = await client.query(
        `SELECT * FROM stars_challenges WHERE id = $1 AND status = 'active'`,
        [challengeId]
      );
      
      if (challenge.rows.length === 0) {
        throw new Error('Challenge not found or inactive');
      }
      
      if (new Date(challenge.rows[0].end_date) < new Date()) {
        throw new Error('Challenge has ended');
      }
      
      // Проверить min/max stake
      if (starsCount < challenge.rows[0].min_stake || starsCount > challenge.rows[0].max_stake) {
        throw new Error(`Stars count must be between ${challenge.rows[0].min_stake} and ${challenge.rows[0].max_stake}`);
      }
      
      // Получить участника
      const participant = await client.query(
        `SELECT * FROM stars_challenge_participants WHERE id = $1 AND challenge_id = $2`,
        [participantId, challengeId]
      );
      
      if (participant.rows.length === 0) {
        throw new Error('Participant not found');
      }
      
      const ownerId = participant.rows[0].user_id;
      
      // Нельзя голосовать за себя
      if (fromUserId === ownerId) {
        throw new Error('You cannot vote for your own photo');
      }
      
      // Проверить: уже голосовал?
      const existingVote = await client.query(
        `SELECT id FROM stars_challenge_votes 
         WHERE challenge_id = $1 AND participant_id = $2 AND from_user_id = $3`,
        [challengeId, participantId, fromUserId]
      );
      
      if (existingVote.rows.length > 0) {
        throw new Error('You have already voted for this participant');
      }
      
      // Проверить баланс
      const totalBRT = starsCount;
      const balance = await client.query(
        `SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = 'BRT'`,
        [fromUserId]
      );
      
      if (!balance.rows[0] || balance.rows[0].balance < totalBRT) {
        throw new Error(`Insufficient BRT balance. Need ${totalBRT} BRT.`);
      }
      
      // Списать BRT у голосующего
      await client.query(
        `UPDATE user_balances 
         SET balance = balance - $1, updated_at = NOW()
         WHERE user_id = $2 AND crypto = 'BRT'`,
        [totalBRT, fromUserId]
      );
      
      // Начислить 100% на admin (id=1)
      await client.query(
        `UPDATE user_balances 
         SET balance = balance + $1, updated_at = NOW()
         WHERE user_id = 1 AND crypto = 'BRT'`,
        [totalBRT]
      );
      
      // Записать транзакцию
      await client.query(
        `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status, reference_id)
         VALUES ($1, 1, 'BRT', $2, 'stars_challenge_vote', 'completed', $3)`,
        [fromUserId, totalBRT, challengeId]
      );
      
      // Записать голос
      await client.query(
        `INSERT INTO stars_challenge_votes (challenge_id, participant_id, from_user_id, stars_count, brt_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [challengeId, participantId, fromUserId, starsCount, totalBRT]
      );
      
      // Триггер автоматически обновит total_votes и total_pool
      
      await client.query('COMMIT');
      
      console.log(`✅ User ${fromUserId} voted ${starsCount} Stars in challenge ${challengeId} → ${totalBRT} BRT to admin`);
      
      return {
        success: true,
        message: `Successfully voted with ${starsCount} Stars!`,
        details: {
          stars_sent: starsCount,
          brt_spent: totalBRT
        }
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Vote in challenge error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Получить leaderboard Challenge
   */
  static async getChallengeLeaderboard(challengeId, limit = 50) {
    try {
      const result = await pool.query(
        `SELECT 
          p.*,
          sp.photo_url,
          u.name as participant_name,
          u.id as participant_id,
          COUNT(DISTINCT cv.from_user_id) as unique_voters
         FROM stars_challenge_participants p
         JOIN stars_photos sp ON p.photo_id = sp.id
         JOIN users u ON p.user_id = u.id
         LEFT JOIN stars_challenge_votes cv ON p.id = cv.participant_id
         WHERE p.challenge_id = $1
         GROUP BY p.id, sp.photo_url, u.name, u.id
         ORDER BY p.total_votes DESC, p.joined_at ASC
         LIMIT $2`,
        [challengeId, limit]
      );
      
      return {
        success: true,
        leaderboard: result.rows
      };
      
    } catch (error) {
      console.error('Get challenge leaderboard error:', error);
      throw error;
    }
  }
  
  /**
   * Закрыть Challenge и распределить награды
   * ✅ ПРАВИЛЬНАЯ СХЕМА:
   * - 50% → Победитель
   * - 10% → admin@brunotoken.com
   * - 10% → brtstar@brunotoken.com
   * - 30% → Голосовавшие за победителя (пропорционально)
   */
  static async closeChallenge(adminId, challengeId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Проверить права
      const admin = await client.query(
        `SELECT role FROM users WHERE id = $1`,
        [adminId]
      );
      
      if (!admin.rows[0] || !['admin', 'moderator'].includes(admin.rows[0].role)) {
        throw new Error('Only admins can close challenges');
      }
      
      // Получить Challenge
      const challenge = await client.query(
        `SELECT * FROM stars_challenges WHERE id = $1 AND status = 'active'`,
        [challengeId]
      );
      
      if (challenge.rows.length === 0) {
        throw new Error('Challenge not found or already closed');
      }
      
      const challengeData = challenge.rows[0];
      const totalPool = parseFloat(challengeData.total_pool);
      
      if (totalPool === 0) {
        throw new Error('No votes in this challenge, cannot distribute rewards');
      }
      
      console.log(`\n🏆 Closing Stars Challenge ${challengeId}`);
      console.log(`💰 Total pool (on admin): ${totalPool.toFixed(2)} BRT`);
      
      // Найти победителя (max total_votes)
      const winner = await client.query(
        `SELECT * FROM stars_challenge_participants 
         WHERE challenge_id = $1 
         ORDER BY total_votes DESC, joined_at ASC
         LIMIT 1`,
        [challengeId]
      );
      
      if (winner.rows.length === 0) {
        throw new Error('No participants found');
      }
      
      const winnerData = winner.rows[0];
      
      // Обновить ранги всех участников
      await client.query(
        `UPDATE stars_challenge_participants p
         SET rank = sub.row_num
         FROM (
           SELECT id, ROW_NUMBER() OVER (ORDER BY total_votes DESC, joined_at ASC) as row_num
           FROM stars_challenge_participants
           WHERE challenge_id = $1
         ) sub
         WHERE p.id = sub.id`,
        [challengeId]
      );
      
      // Пометить победителя
      await client.query(
        `UPDATE stars_challenge_participants SET is_winner = true WHERE id = $1`,
        [winnerData.id]
      );
      
      // Получить ID brtstar аккаунта
      const brtstarResult = await client.query(
        `SELECT id FROM users WHERE email = 'brtstar@brunotoken.com'`
      );
      
      if (brtstarResult.rows.length === 0) {
        throw new Error('brtstar@brunotoken.com account not found. Please create it first.');
      }
      
      const brtstarId = brtstarResult.rows[0].id;
      
      // ✅ РАСПРЕДЕЛЕНИЕ НАГРАД
      const winnerAmount = totalPool * 0.50; // 50% победителю
      const adminAmount = totalPool * 0.10; // 10% admin остаётся
      const brtstarAmount = totalPool * 0.10; // 10% brtstar
      const votersAmount = totalPool * 0.30; // 30% голосовавшим за победителя
      
      console.log(`📊 Distribution:`);
      console.log(`   50% → Winner: ${winnerAmount.toFixed(2)} BRT`);
      console.log(`   10% → Admin: ${adminAmount.toFixed(2)} BRT`);
      console.log(`   10% → BRT Star: ${brtstarAmount.toFixed(2)} BRT`);
      console.log(`   30% → Voters: ${votersAmount.toFixed(2)} BRT`);
      
      // 1. Вычесть totalPool из admin
      await client.query(
        `UPDATE user_balances 
         SET balance = balance - $1, updated_at = NOW()
         WHERE user_id = 1 AND crypto = 'BRT'`,
        [totalPool]
      );
      
      // 2. Выплатить 50% победителю
      await client.query(
        `UPDATE user_balances 
         SET balance = balance + $1, updated_at = NOW()
         WHERE user_id = $2 AND crypto = 'BRT'`,
        [winnerAmount, winnerData.user_id]
      );
      
      await client.query(
        `INSERT INTO stars_reward_history (challenge_id, recipient_user_id, recipient_type, amount, percentage)
         VALUES ($1, $2, 'winner', $3, 50)`,
        [challengeId, winnerData.user_id, winnerAmount]
      );
      
      await client.query(
        `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status, reference_id)
         VALUES (1, $1, 'BRT', $2, 'stars_challenge_winner', 'completed', $3)`,
        [winnerData.user_id, winnerAmount, challengeId]
      );
      
      console.log(`   ✅ Winner ${winnerData.user_id} received ${winnerAmount.toFixed(2)} BRT`);
      
      // 3. Вернуть 10% admin
      await client.query(
        `UPDATE user_balances 
         SET balance = balance + $1, updated_at = NOW()
         WHERE user_id = 1 AND crypto = 'BRT'`,
        [adminAmount]
      );
      
      await client.query(
        `INSERT INTO stars_reward_history (challenge_id, recipient_user_id, recipient_type, amount, percentage)
         VALUES ($1, 1, 'admin_commission', $2, 10)`,
        [challengeId, adminAmount]
      );
      
      console.log(`   ✅ Admin kept ${adminAmount.toFixed(2)} BRT`);
      
      // 4. Выплатить 10% brtstar
      await client.query(
        `UPDATE user_balances 
         SET balance = balance + $1, updated_at = NOW()
         WHERE user_id = $2 AND crypto = 'BRT'`,
        [brtstarAmount, brtstarId]
      );
      
      await client.query(
        `INSERT INTO stars_reward_history (challenge_id, recipient_user_id, recipient_type, amount, percentage)
         VALUES ($1, $2, 'brtstar_commission', $3, 10)`,
        [challengeId, brtstarId, brtstarAmount]
      );
      
      await client.query(
        `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status, reference_id)
         VALUES (1, $1, 'BRT', $2, 'stars_challenge_brtstar', 'completed', $3)`,
        [brtstarId, brtstarAmount, challengeId]
      );
      
      console.log(`   ✅ BRT Star received ${brtstarAmount.toFixed(2)} BRT`);
      
      // 5. Распределить 30% между голосовавшими за победителя
      const voters = await client.query(
        `SELECT from_user_id, stars_count, brt_amount
         FROM stars_challenge_votes 
         WHERE challenge_id = $1 AND participant_id = $2`,
        [challengeId, winnerData.id]
      );
      
      if (voters.rows.length > 0) {
        const totalVoterBRT = voters.rows.reduce((sum, v) => sum + parseFloat(v.brt_amount), 0);
        
        console.log(`   💰 Distributing ${votersAmount.toFixed(2)} BRT among ${voters.rows.length} voters:`);
        
        for (const voter of voters.rows) {
          const voterBRT = parseFloat(voter.brt_amount);
          const voterShare = (voterBRT / totalVoterBRT) * votersAmount;
          
          await client.query(
            `UPDATE user_balances 
             SET balance = balance + $1, updated_at = NOW()
             WHERE user_id = $2 AND crypto = 'BRT'`,
            [voterShare, voter.from_user_id]
          );
          
          await client.query(
            `INSERT INTO stars_reward_history (challenge_id, recipient_user_id, recipient_type, amount, percentage)
             VALUES ($1, $2, 'voter', $3, $4)`,
            [challengeId, voter.from_user_id, voterShare, (voterBRT / totalVoterBRT) * 30]
          );
          
          await client.query(
            `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status, reference_id)
             VALUES (1, $1, 'BRT', $2, 'stars_challenge_voter_reward', 'completed', $3)`,
            [voter.from_user_id, voterShare, challengeId]
          );
          
          console.log(`      → Voter ${voter.from_user_id}: ${voterShare.toFixed(2)} BRT (voted ${voterBRT} BRT)`);
        }
      } else {
        console.log(`   ⚠️ No voters found for winner - ${votersAmount.toFixed(2)} BRT stays with admin`);
        
        // Если нет голосовавших за победителя, вернуть 30% admin
        await client.query(
          `UPDATE user_balances 
           SET balance = balance + $1, updated_at = NOW()
           WHERE user_id = 1 AND crypto = 'BRT'`,
          [votersAmount]
        );
      }
      
      // 6. Обновить Challenge
      await client.query(
        `UPDATE stars_challenges 
         SET status = 'completed', 
             winner_photo_id = $1,
             winner_user_id = $2,
             winner_total_votes = $3,
             completed_at = NOW()
         WHERE id = $4`,
        [winnerData.photo_id, winnerData.user_id, winnerData.total_votes, challengeId]
      );
      
      await client.query('COMMIT');
      
      console.log(`✅ Challenge ${challengeId} closed successfully\n`);
      
      return {
        success: true,
        message: 'Challenge closed and rewards distributed successfully',
        winner: {
          user_id: winnerData.user_id,
          photo_id: winnerData.photo_id,
          total_votes: winnerData.total_votes,
          reward: winnerAmount
        },
        distribution: {
          winner: winnerAmount,
          admin: adminAmount,
          brtstar: brtstarAmount,
          voters: votersAmount,
          voters_count: voters.rows.length,
          total_pool: totalPool
        }
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Close challenge error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Получить список активных Challenges
   */
  static async getActiveChallenges() {
    try {
      const result = await pool.query(
        `SELECT 
          c.*,
          n.title as nomination_title,
          u.name as created_by_name,
          COUNT(DISTINCT p.id) as participants_count,
          COALESCE(SUM(p.total_votes), 0) as total_votes
         FROM stars_challenges c
         LEFT JOIN stars_gallery_nominations n ON c.nomination_id = n.id
         JOIN users u ON c.created_by = u.id
         LEFT JOIN stars_challenge_participants p ON c.id = p.challenge_id
         WHERE c.status = 'active' AND c.end_date > NOW()
         GROUP BY c.id, n.title, u.name
         ORDER BY c.created_at DESC`
      );
      
      return {
        success: true,
        challenges: result.rows
      };
      
    } catch (error) {
      console.error('Get active challenges error:', error);
      throw error;
    }
  }
}

module.exports = StarsChallengeService;