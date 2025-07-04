-- MoonYetis Database Initialization Script
-- Run this script after PostgreSQL authentication is configured

-- Create database (if not exists)
-- This is handled by the bash script

-- Connect to the database
\c moonyetis_slots;

-- Create user_accounts table
CREATE TABLE IF NOT EXISTS user_accounts (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    game_chips DECIMAL(20, 8) DEFAULT 0,
    total_deposited DECIMAL(20, 8) DEFAULT 0,
    total_withdrawn DECIMAL(20, 8) DEFAULT 0,
    total_wagered DECIMAL(20, 8) DEFAULT 0,
    total_won DECIMAL(20, 8) DEFAULT 0,
    first_deposit_bonus DECIMAL(20, 8) DEFAULT 0,
    is_first_deposit BOOLEAN DEFAULT true,
    account_status VARCHAR(50) DEFAULT 'active',
    loyalty_level INTEGER DEFAULT 1,
    vip_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'game_win', 'game_loss'
    token_amount DECIMAL(20, 8) DEFAULT 0,
    game_chips DECIMAL(20, 8) DEFAULT 0,
    fee DECIMAL(20, 8) DEFAULT 0,
    bonus_chips DECIMAL(20, 8) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'archived'
    game_round_id VARCHAR(255),
    block_height BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_rounds table
CREATE TABLE IF NOT EXISTS game_rounds (
    id SERIAL PRIMARY KEY,
    round_id VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    session_id VARCHAR(255),
    bet_amount DECIMAL(20, 8) NOT NULL,
    win_amount DECIMAL(20, 8) DEFAULT 0,
    reel_results TEXT, -- JSON string of reel results
    game_hash VARCHAR(255),
    server_seed VARCHAR(255),
    client_seed VARCHAR(255),
    nonce INTEGER,
    multiplier DECIMAL(10, 4) DEFAULT 0,
    is_win BOOLEAN DEFAULT false,
    rtp DECIMAL(10, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_accounts_wallet ON user_accounts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_game_rounds_wallet ON game_rounds(wallet_address);
CREATE INDEX IF NOT EXISTS idx_game_rounds_created ON game_rounds(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_accounts_updated_at ON user_accounts;
CREATE TRIGGER update_user_accounts_updated_at
    BEFORE UPDATE ON user_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to moonyetis_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO moonyetis_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO moonyetis_user;
GRANT USAGE ON SCHEMA public TO moonyetis_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO moonyetis_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO moonyetis_user;

-- Insert test data (optional)
INSERT INTO user_accounts (wallet_address, game_chips) 
VALUES ('test_wallet_address', 1000.0) 
ON CONFLICT (wallet_address) DO NOTHING;

COMMIT;