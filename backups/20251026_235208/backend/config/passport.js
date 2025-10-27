const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./database');

module.exports = function(passport) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        
        // Проверяем, существует ли пользователь
        const userResult = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );
        
        if (userResult.rows.length > 0) {
          // Пользователь существует - логиним
          return done(null, userResult.rows[0]);
        } else {
          // Создаем нового пользователя
          const newUserResult = await pool.query(
	'INSERT INTO users (email, name, account_status, email_verified) VALUES ($1, $2, $3, $4) RETURNING *',
	[email, name, 'active', true]	
          );
          
          const newUser = newUserResult.rows[0];
          
          // Создаем баланс для нового пользователя
          await pool.query(
            'INSERT INTO user_balances (user_id, crypto, balance) VALUES ($1, $2, $3)',
            [newUser.id, 'BRT', 0]
          );
          
          return done(null, newUser);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      done(null, result.rows[0]);
    } catch (error) {
      done(error, null);
    }
  });
};
