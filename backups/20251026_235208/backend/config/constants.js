module.exports = {
  COMPANY: {
    LEGAL_NAME: 'Bruno Kapital & Investment LLC',
    COPYRIGHT_YEAR: 2022
  },
  
  SYSTEM_ACCOUNTS: {
    REFERRAL_POOL: { USER_ID: 1, EMAIL: 'clubavalanche0@gmail.com' },
    GAS_FEE: { USER_ID: 2, EMAIL: 'alankaboot.uae@gmail.com' },
    EARN_DEPOSITS: { USER_ID: 3, EMAIL: 'brttoken@gmail.com' }
  },
  
  FEES: {
    STANDARD_FEE: 0.02,
    WELCOME_BONUS: 0.02
  },
  
  REFERRAL_TIERS: {
    'GS-I': { depth: 4, commission: 0.88 },
    'GS-II': { depth: 5, commission: 4.98 },
    'GS-III': { depth: 7, commission: 34.98 },
    'GS-IV': { depth: 8, commission: 61.48 }
  },
  
  EXPIRY: {
    EMAIL_VERIFICATION: 10 * 60 * 1000,
    PASSWORD_RESET: 60 * 60 * 1000,
    JWT_ACCESS: '24h'
  },
  
  EMAIL: {
    FROM_EMAIL: 'info@brunotoken.com',
    FROM_NAME: 'Bruno Token'
  }
};
