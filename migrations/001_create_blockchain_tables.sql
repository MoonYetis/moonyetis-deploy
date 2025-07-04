-- MoonYetis Blockchain Database Schema
-- PostgreSQL Migration File
-- Version: 001
-- Description: Create blockchain tables for MoonYetis slot machine

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_accounts table
CREATE TABLE IF NOT EXISTS user_accounts (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(100) UNIQUE NOT NULL,
    game_chips DECIMAL(20, 8) DEFAULT 0 NOT NULL,
    total_deposited DECIMAL(20, 8) DEFAULT 0 NOT NULL,
    total_withdrawn DECIMAL(20, 8) DEFAULT 0 NOT NULL,
    total_wagered DECIMAL(20, 8) DEFAULT 0 NOT NULL,
    total_won DECIMAL(20, 8) DEFAULT 0 NOT NULL,
    first_deposit_bonus DECIMAL(20, 8) DEFAULT 0 NOT NULL,
    is_first_deposit BOOLEAN DEFAULT TRUE,
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'closed')),
    loyalty_level INTEGER DEFAULT 1,
    vip_status BOOLEAN DEFAULT FALSE,
    kyc_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(100) UNIQUE NOT NULL,
    wallet_address VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bonus', 'fee')),
    token_amount DECIMAL(20, 8) DEFAULT 0,
    game_chips DECIMAL(20, 8) DEFAULT 0,
    fee DECIMAL(20, 8) DEFAULT 0,
    bonus_chips DECIMAL(20, 8) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'failed', 'cancelled', 'archived')),
    game_round_id VARCHAR(100),
    block_height BIGINT,
    confirmations INTEGER DEFAULT 0,
    network_fee DECIMAL(20, 8) DEFAULT 0,
    gas_used BIGINT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_transactions_wallet_address 
        FOREIGN KEY (wallet_address) 
        REFERENCES user_accounts(wallet_address) 
        ON DELETE CASCADE
);

-- Create game_rounds table
CREATE TABLE IF NOT EXISTS game_rounds (
    id SERIAL PRIMARY KEY,
    round_id VARCHAR(100) UNIQUE NOT NULL,
    wallet_address VARCHAR(100) NOT NULL,
    session_id VARCHAR(100),
    bet_amount DECIMAL(20, 8) NOT NULL,
    win_amount DECIMAL(20, 8) DEFAULT 0,
    reel_results JSONB NOT NULL,
    game_hash VARCHAR(100) NOT NULL,
    server_seed VARCHAR(200) NOT NULL,
    client_seed VARCHAR(100) NOT NULL,
    nonce INTEGER NOT NULL,
    multiplier DECIMAL(10, 4) DEFAULT 0,
    is_win BOOLEAN DEFAULT FALSE,
    rtp DECIMAL(6, 4) DEFAULT 0,
    payout_lines JSONB DEFAULT '[]',
    bonus_features JSONB DEFAULT '{}',
    jackpot_contribution DECIMAL(20, 8) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_game_rounds_wallet_address 
        FOREIGN KEY (wallet_address) 
        REFERENCES user_accounts(wallet_address) 
        ON DELETE CASCADE
);

-- Create wallet_sessions table for session management
CREATE TABLE IF NOT EXISTS wallet_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    wallet_address VARCHAR(100) NOT NULL,
    wallet_type VARCHAR(20) NOT NULL,
    public_key TEXT,
    signature TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
    
    -- Foreign key constraint
    CONSTRAINT fk_wallet_sessions_wallet_address 
        FOREIGN KEY (wallet_address) 
        REFERENCES user_accounts(wallet_address) 
        ON DELETE CASCADE
);

-- Create withdrawal_requests table for tracking withdrawal status
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id SERIAL PRIMARY KEY,
    withdrawal_id VARCHAR(100) UNIQUE NOT NULL,
    wallet_address VARCHAR(100) NOT NULL,
    to_address VARCHAR(100) NOT NULL,
    chip_amount DECIMAL(20, 8) NOT NULL,
    token_amount DECIMAL(20, 8) NOT NULL,
    fee DECIMAL(20, 8) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    tx_hash VARCHAR(100),
    error_message TEXT,
    admin_notes TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key constraint
    CONSTRAINT fk_withdrawal_requests_wallet_address 
        FOREIGN KEY (wallet_address) 
        REFERENCES user_accounts(wallet_address) 
        ON DELETE CASCADE
);

-- Create system_stats table for analytics
CREATE TABLE IF NOT EXISTS system_stats (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    total_deposits DECIMAL(20, 8) DEFAULT 0,
    total_withdrawals DECIMAL(20, 8) DEFAULT 0,
    total_wagered DECIMAL(20, 8) DEFAULT 0,
    total_won DECIMAL(20, 8) DEFAULT 0,
    house_profit DECIMAL(20, 8) DEFAULT 0,
    game_rounds INTEGER DEFAULT 0,
    average_bet DECIMAL(20, 8) DEFAULT 0,
    average_rtp DECIMAL(6, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create jackpot_history table for progressive jackpots
CREATE TABLE IF NOT EXISTS jackpot_history (
    id SERIAL PRIMARY KEY,
    jackpot_id VARCHAR(100) UNIQUE NOT NULL,
    winner_address VARCHAR(100),
    jackpot_amount DECIMAL(20, 8) NOT NULL,
    triggering_round_id VARCHAR(100),
    seed_amount DECIMAL(20, 8) DEFAULT 0,
    contributions DECIMAL(20, 8) DEFAULT 0,
    jackpot_type VARCHAR(20) DEFAULT 'progressive',
    won_at TIMESTAMP WITH TIME ZONE,
    reset_amount DECIMAL(20, 8) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance

-- User accounts indexes
CREATE INDEX IF NOT EXISTS idx_user_accounts_wallet_address ON user_accounts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_accounts_status ON user_accounts(account_status);
CREATE INDEX IF NOT EXISTS idx_user_accounts_vip ON user_accounts(vip_status);
CREATE INDEX IF NOT EXISTS idx_user_accounts_created_at ON user_accounts(created_at);
CREATE INDEX IF NOT EXISTS idx_user_accounts_updated_at ON user_accounts(updated_at);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_address ON transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_block_height ON transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_transactions_compound ON transactions(wallet_address, type, status);

-- Game rounds indexes
CREATE INDEX IF NOT EXISTS idx_game_rounds_wallet_address ON game_rounds(wallet_address);
CREATE INDEX IF NOT EXISTS idx_game_rounds_round_id ON game_rounds(round_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_session_id ON game_rounds(session_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_created_at ON game_rounds(created_at);
CREATE INDEX IF NOT EXISTS idx_game_rounds_is_win ON game_rounds(is_win);
CREATE INDEX IF NOT EXISTS idx_game_rounds_bet_amount ON game_rounds(bet_amount);
CREATE INDEX IF NOT EXISTS idx_game_rounds_compound ON game_rounds(wallet_address, created_at);

-- Wallet sessions indexes
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_session_id ON wallet_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_wallet_address ON wallet_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_active ON wallet_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_expires_at ON wallet_sessions(expires_at);

-- Withdrawal requests indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_wallet_address ON withdrawal_requests(wallet_address);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_withdrawal_id ON withdrawal_requests(withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_requested_at ON withdrawal_requests(requested_at);

-- System stats indexes
CREATE INDEX IF NOT EXISTS idx_system_stats_date ON system_stats(date);

-- Jackpot history indexes
CREATE INDEX IF NOT EXISTS idx_jackpot_history_winner_address ON jackpot_history(winner_address);
CREATE INDEX IF NOT EXISTS idx_jackpot_history_won_at ON jackpot_history(won_at);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_accounts_updated_at BEFORE UPDATE ON user_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_stats_updated_at BEFORE UPDATE ON system_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    DELETE FROM wallet_sessions 
    WHERE expires_at < NOW() OR (is_active = FALSE AND created_at < NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate daily stats
CREATE OR REPLACE FUNCTION update_daily_stats(stat_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO system_stats (
        date,
        total_users,
        active_users,
        new_users,
        total_deposits,
        total_withdrawals,
        total_wagered,
        total_won,
        house_profit,
        game_rounds,
        average_bet,
        average_rtp
    )
    SELECT 
        stat_date,
        (SELECT COUNT(*) FROM user_accounts WHERE created_at::DATE <= stat_date),
        (SELECT COUNT(*) FROM user_accounts WHERE updated_at::DATE = stat_date),
        (SELECT COUNT(*) FROM user_accounts WHERE created_at::DATE = stat_date),
        COALESCE((SELECT SUM(token_amount) FROM transactions 
                 WHERE type = 'deposit' AND status = 'completed' AND created_at::DATE = stat_date), 0),
        COALESCE((SELECT SUM(ABS(token_amount)) FROM transactions 
                 WHERE type = 'withdrawal' AND status = 'completed' AND created_at::DATE = stat_date), 0),
        COALESCE((SELECT SUM(bet_amount) FROM game_rounds WHERE created_at::DATE = stat_date), 0),
        COALESCE((SELECT SUM(win_amount) FROM game_rounds WHERE created_at::DATE = stat_date), 0),
        COALESCE((SELECT SUM(bet_amount) - SUM(win_amount) FROM game_rounds WHERE created_at::DATE = stat_date), 0),
        COALESCE((SELECT COUNT(*) FROM game_rounds WHERE created_at::DATE = stat_date), 0),
        COALESCE((SELECT AVG(bet_amount) FROM game_rounds WHERE created_at::DATE = stat_date), 0),
        COALESCE((SELECT AVG(rtp) FROM game_rounds WHERE created_at::DATE = stat_date), 0)
    ON CONFLICT (date) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        active_users = EXCLUDED.active_users,
        new_users = EXCLUDED.new_users,
        total_deposits = EXCLUDED.total_deposits,
        total_withdrawals = EXCLUDED.total_withdrawals,
        total_wagered = EXCLUDED.total_wagered,
        total_won = EXCLUDED.total_won,
        house_profit = EXCLUDED.house_profit,
        game_rounds = EXCLUDED.game_rounds,
        average_bet = EXCLUDED.average_bet,
        average_rtp = EXCLUDED.average_rtp,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create views for common queries
CREATE OR REPLACE VIEW user_account_summary AS
SELECT 
    ua.wallet_address,
    ua.game_chips,
    ua.total_deposited,
    ua.total_withdrawn,
    ua.total_wagered,
    ua.total_won,
    ua.loyalty_level,
    ua.vip_status,
    ua.created_at,
    ua.updated_at,
    COALESCE(pending_deposits.amount, 0) as pending_deposits,
    COALESCE(pending_withdrawals.amount, 0) as pending_withdrawals,
    COALESCE(recent_rounds.count, 0) as recent_rounds_24h
FROM user_accounts ua
LEFT JOIN (
    SELECT wallet_address, SUM(token_amount) as amount
    FROM transactions 
    WHERE type = 'deposit' AND status = 'pending'
    GROUP BY wallet_address
) pending_deposits ON ua.wallet_address = pending_deposits.wallet_address
LEFT JOIN (
    SELECT wallet_address, SUM(ABS(token_amount)) as amount
    FROM withdrawal_requests 
    WHERE status IN ('pending', 'processing')
    GROUP BY wallet_address
) pending_withdrawals ON ua.wallet_address = pending_withdrawals.wallet_address
LEFT JOIN (
    SELECT wallet_address, COUNT(*) as count
    FROM game_rounds 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY wallet_address
) recent_rounds ON ua.wallet_address = recent_rounds.wallet_address;

-- Create view for transaction summary
CREATE OR REPLACE VIEW transaction_summary AS
SELECT 
    DATE(created_at) as transaction_date,
    type,
    status,
    COUNT(*) as transaction_count,
    SUM(token_amount) as total_amount,
    SUM(fee) as total_fees,
    AVG(token_amount) as average_amount
FROM transactions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), type, status
ORDER BY transaction_date DESC, type;

-- Insert initial system configuration
INSERT INTO system_stats (date, total_users, active_users, new_users) 
VALUES (CURRENT_DATE, 0, 0, 0)
ON CONFLICT (date) DO NOTHING;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO moonyetis_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO moonyetis_user;

-- Create notification for completed transactions
CREATE OR REPLACE FUNCTION notify_transaction_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM pg_notify('transaction_completed', 
            json_build_object(
                'tx_hash', NEW.tx_hash,
                'wallet_address', NEW.wallet_address,
                'type', NEW.type,
                'amount', NEW.token_amount
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_completed_notify 
    AFTER UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION notify_transaction_completed();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'MoonYetis blockchain database schema created successfully!';
    RAISE NOTICE 'Tables created: user_accounts, transactions, game_rounds, wallet_sessions, withdrawal_requests, system_stats, jackpot_history';
    RAISE NOTICE 'Indexes, triggers, and views created successfully';
    RAISE NOTICE 'Database is ready for MoonYetis blockchain integration';
END $$;