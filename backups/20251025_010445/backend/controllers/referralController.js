const { query } = require('../config/database');

class ReferralController {
  // GET /api/referral/my-code
  static async getMyCode(req, res) {
    try {
      const userId = req.userId;
      
      const result = await query(
        `SELECT referral_code FROM users WHERE id = $1`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      const referralCode = result.rows[0].referral_code;
      const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup?ref=${referralCode}`;
      
      res.json({
        success: true,
        data: {
          referralCode,
          referralLink
        }
      });
    } catch (error) {
      console.error('Get my code error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }
  }
  
  // GET /api/referral/stats
  static async getStats(req, res) {
    try {
      const userId = req.userId;
      
      // Получить всех рефералов
      const referralsResult = await query(
        `SELECT id, email, name, created_at 
         FROM users 
         WHERE referred_by = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      
      const referrals = referralsResult.rows;
      
      // Получить общий заработок с рефералов
      const earningsResult = await query(
        `SELECT COALESCE(SUM(amount), 0) as total_earnings
         FROM transactions
         WHERE to_user_id = $1 AND type = 'referral_payout' AND status = 'completed'`,
        [userId]
      );
      
      const totalEarnings = parseFloat(earningsResult.rows[0].total_earnings);
      
      // Получить детали транзакций
      const transactionsResult = await query(
        `SELECT t.id, t.amount, t.created_at, u.email as referred_email, u.name as referred_name
         FROM transactions t
         LEFT JOIN users u ON u.referred_by = $1
         WHERE t.to_user_id = $1 AND t.type = 'referral_payout' AND t.status = 'completed'
         ORDER BY t.created_at DESC
         LIMIT 20`,
        [userId]
      );
      
      res.json({
        success: true,
        data: {
          totalReferrals: referrals.length,
          totalEarnings,
          referrals: referrals.map(r => ({
            id: r.id,
            email: r.email,
            name: r.name,
            joinedDate: r.created_at
          })),
          recentPayouts: transactionsResult.rows.map(t => ({
            id: t.id,
            amount: parseFloat(t.amount),
            date: t.created_at,
            referredEmail: t.referred_email,
            referredName: t.referred_name
          }))
        }
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }
  }
}

module.exports = ReferralController;
