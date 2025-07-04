-- Migration: Create leaderboard table for MoonYetis Slots
-- Version: 002
-- Description: Global leaderboard using wallet addresses as player identifiers

CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(62) UNIQUE NOT NULL,
    total_wagered DECIMAL(18,8) DEFAULT 0,
    total_won DECIMAL(18,8) DEFAULT 0,
    biggest_win DECIMAL(18,8) DEFAULT 0,
    total_spins INTEGER DEFAULT 0,
    profit_loss DECIMAL(18,8) DEFAULT 0,
    last_active TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_wallet ON leaderboard(wallet_address);
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_wagered ON leaderboard(total_wagered DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_biggest_win ON leaderboard(biggest_win DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_profit_loss ON leaderboard(profit_loss DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_last_active ON leaderboard(last_active DESC);

-- Insert some sample data for testing
INSERT INTO leaderboard (wallet_address, total_wagered, total_won, biggest_win, total_spins, profit_loss) VALUES
('bc1q9x8k2l5m3n4p6r7t8u9v0w1x2y3z4a5b6c7d8e9f0', 1250.50, 890.25, 150.75, 89, -360.25),
('bc1q5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5', 980.00, 1150.80, 200.50, 67, 170.80),
('bc1q1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1', 2100.75, 1800.90, 300.25, 156, -299.85),
('bc1q7u8v9w0x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7', 650.25, 520.15, 75.50, 45, -130.10),
('bc1q3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3', 1800.00, 2250.75, 450.00, 123, 450.75)
ON CONFLICT (wallet_address) DO NOTHING;

COMMENT ON TABLE leaderboard IS 'Global leaderboard for MoonYetis Slots players';
COMMENT ON COLUMN leaderboard.wallet_address IS 'Fractal Bitcoin wallet address (unique player identifier)';
COMMENT ON COLUMN leaderboard.total_wagered IS 'Total amount wagered by player';
COMMENT ON COLUMN leaderboard.total_won IS 'Total amount won by player';
COMMENT ON COLUMN leaderboard.biggest_win IS 'Biggest single win amount';
COMMENT ON COLUMN leaderboard.profit_loss IS 'Net profit/loss (total_won - total_wagered)';