-- MoonYetis Slots Production Database Migration
-- Run this script on the production database

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(50),
    email VARCHAR(255),
    balance DECIMAL(20, 8) DEFAULT 0,
    total_deposited DECIMAL(20, 8) DEFAULT 0,
    total_withdrawn DECIMAL(20, 8) DEFAULT 0,
    total_wagered DECIMAL(20, 8) DEFAULT 0,
    total_won DECIMAL(20, 8) DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    transaction_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'bet', 'win'
    amount DECIMAL(20, 8) NOT NULL,
    token_amount DECIMAL(20, 8),
    txid VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
    confirmations INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    game_type VARCHAR(50) DEFAULT 'slots',
    bet_amount DECIMAL(20, 8) NOT NULL,
    win_amount DECIMAL(20, 8) DEFAULT 0,
    game_result JSONB,
    server_seed VARCHAR(128),
    client_seed VARCHAR(128),
    nonce INTEGER,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    wallet_address VARCHAR(100) NOT NULL,
    username VARCHAR(50),
    total_won DECIMAL(20, 8) DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 4) DEFAULT 0,
    rank_position INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create deposits monitoring table
CREATE TABLE IF NOT EXISTS deposit_monitors (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_games_user ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(rank_position);
CREATE INDEX IF NOT EXISTS idx_deposit_monitors_wallet ON deposit_monitors(wallet_address);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leaderboard_updated_at ON leaderboard;
CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON leaderboard FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
