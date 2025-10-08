CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  email_verified BOOLEAN DEFAULT FALSE,
  club_membership BOOLEAN DEFAULT FALSE,
  membership_tier VARCHAR(20) CHECK (membership_tier IN ('GS-I', 'GS-II', 'GS-III', 'GS-IV')),
  referral_code VARCHAR(50) UNIQUE,
  referred_by INTEGER,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  account_status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);

ALTER TABLE users ADD CONSTRAINT fk_referred_by FOREIGN KEY (referred_by) REFERENCES users(id);

INSERT INTO users (id, email, password_hash, name, email_verified) VALUES
(1, 'clubavalanche0@gmail.com', '$2b$10$dummy', 'Referral Pool', TRUE),
(2, 'alankaboot.uae@gmail.com', '$2b$10$dummy', 'Gas Fee Account', TRUE),
(3, 'brttoken@gmail.com', '$2b$10$dummy', 'Earn Deposits', TRUE)
ON CONFLICT DO NOTHING;
