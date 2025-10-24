const axios = require('axios');
const { query } = require('../config/database');

const POWERBALL_API = 'https://www.powerball.com/api/v1/numbers/powerball/recent';

class LotteryAPI {
  async getCurrentDraw() {
    try {
      const result = await query(
        `SELECT * FROM lottery_draws 
         WHERE status = 'pending' 
         ORDER BY draw_date ASC 
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Create next draw (3 days from now)
      const nextDrawDate = new Date();
      nextDrawDate.setDate(nextDrawDate.getDate() + 3);
      nextDrawDate.setHours(22, 0, 0, 0);

      await query(
        `INSERT INTO lottery_draws (draw_date, status) 
         VALUES ($1, 'pending')`,
        [nextDrawDate]
      );

      const newDraw = await query(
        `SELECT * FROM lottery_draws 
         WHERE draw_date = $1`,
        [nextDrawDate]
      );

      return newDraw.rows[0];
    } catch (error) {
      console.error('Error getting current draw:', error);
      throw error;
    }
  }

  async fetchLatestDrawResults() {
    try {
      console.log('📡 Fetching latest Powerball results...');
      
      const response = await axios.get(POWERBALL_API, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      if (!response.data || !response.data[0]) {
        throw new Error('No draw data received from API');
      }

      const latestDraw = response.data[0];
      const drawDate = new Date(latestDraw.field_draw_date);
      
      const numbers = latestDraw.field_winning_numbers.split(' ').map(n => parseInt(n));
      const powerball = parseInt(latestDraw.field_power_ball);

      console.log('✅ Fetched draw:', {
        date: drawDate,
        numbers: numbers,
        powerball: powerball
      });

      return {
        draw_date: drawDate,
        white_ball_1: numbers[0],
        white_ball_2: numbers[1],
        white_ball_3: numbers[2],
        white_ball_4: numbers[3],
        white_ball_5: numbers[4],
        powerball: powerball
      };
    } catch (error) {
      console.error('❌ Error fetching draw results:', error.message);
      throw error;
    }
  }

  async saveDrawResults(drawData) {
    try {
      const existing = await query(
        `SELECT id, status FROM lottery_draws 
         WHERE draw_date = $1`,
        [drawData.draw_date]
      );

      if (existing.rows.length > 0) {
        if (existing.rows[0].status === 'drawn') {
          console.log('⚠️ Draw already recorded');
          return existing.rows[0];
        }

        await query(
          `UPDATE lottery_draws 
           SET white_ball_1 = $1, white_ball_2 = $2, white_ball_3 = $3,
               white_ball_4 = $4, white_ball_5 = $5, powerball = $6,
               status = 'drawn', updated_at = CURRENT_TIMESTAMP
           WHERE draw_date = $7`,
          [
            drawData.white_ball_1, drawData.white_ball_2, drawData.white_ball_3,
            drawData.white_ball_4, drawData.white_ball_5, drawData.powerball,
            drawData.draw_date
          ]
        );

        console.log('✅ Draw results updated');
        return { ...existing.rows[0], ...drawData, status: 'drawn' };
      } else {
        const result = await query(
          `INSERT INTO lottery_draws 
           (draw_date, white_ball_1, white_ball_2, white_ball_3, 
            white_ball_4, white_ball_5, powerball, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'drawn')
           RETURNING *`,
          [
            drawData.draw_date,
            drawData.white_ball_1, drawData.white_ball_2, drawData.white_ball_3,
            drawData.white_ball_4, drawData.white_ball_5, drawData.powerball
          ]
        );

        console.log('✅ New draw results saved');
        return result.rows[0];
      }
    } catch (error) {
      console.error('Error saving draw results:', error);
      throw error;
    }
  }
}

module.exports = new LotteryAPI();