-- MoonYetis Slots Ultra-Accessible Database Schema
-- ================================================

-- Crear base de datos si no existe
-- CREATE DATABASE IF NOT EXISTS moonyetis_production;
-- USE moonyetis_production;

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de usuarios/jugadores
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    total_deposited BIGINT DEFAULT 0,
    total_withdrawn BIGINT DEFAULT 0,
    total_bet BIGINT DEFAULT 0,
    total_won BIGINT DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES players(id),
    kyc_status VARCHAR(20) DEFAULT 'none',
    vip_level INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- Tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id),
    transaction_hash VARCHAR(255),
    transaction_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'bet', 'win'
    amount BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'failed', 'cancelled'
    confirmations INTEGER DEFAULT 0,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    wallet_from VARCHAR(255),
    wallet_to VARCHAR(255),
    fee_amount BIGINT DEFAULT 0,
    exchange_rate DECIMAL(20,10),
    usd_amount DECIMAL(15,4),
    metadata JSONB DEFAULT '{}',
    
    -- Índices para búsquedas rápidas
    INDEX idx_transactions_player_id (player_id),
    INDEX idx_transactions_hash (transaction_hash),
    INDEX idx_transactions_type (transaction_type),
    INDEX idx_transactions_status (status),
    INDEX idx_transactions_created (created_at)
);

-- Tabla de juegos/partidas
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id),
    game_type VARCHAR(50) DEFAULT 'slots',
    bet_amount BIGINT NOT NULL,
    win_amount BIGINT DEFAULT 0,
    active_lines INTEGER DEFAULT 1,
    spin_result JSONB,
    server_seed VARCHAR(128),
    client_seed VARCHAR(128),
    nonce INTEGER,
    game_hash VARCHAR(128),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    
    -- Índices
    INDEX idx_games_player_id (player_id),
    INDEX idx_games_created (created_at),
    INDEX idx_games_bet_amount (bet_amount),
    INDEX idx_games_win_amount (win_amount)
);

-- Tabla de balances de jugadores
CREATE TABLE IF NOT EXISTS player_balances (
    player_id UUID PRIMARY KEY REFERENCES players(id),
    balance BIGINT DEFAULT 0,
    locked_balance BIGINT DEFAULT 0, -- Balance bloqueado en juegos activos
    bonus_balance BIGINT DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1, -- Para control de concurrencia
    
    -- Constraints
    CONSTRAINT positive_balance CHECK (balance >= 0),
    CONSTRAINT positive_locked CHECK (locked_balance >= 0),
    CONSTRAINT positive_bonus CHECK (bonus_balance >= 0)
);

-- Tabla de depósitos pendientes (para monitoreo)
CREATE TABLE IF NOT EXISTS pending_deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id),
    wallet_address VARCHAR(255) NOT NULL,
    expected_amount BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'monitoring', -- 'monitoring', 'detected', 'confirmed', 'expired'
    transaction_hash VARCHAR(255),
    confirmed_amount BIGINT,
    metadata JSONB DEFAULT '{}',
    
    INDEX idx_pending_deposits_wallet (wallet_address),
    INDEX idx_pending_deposits_status (status),
    INDEX idx_pending_deposits_expires (expires_at)
);

-- Tabla de retiros
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id),
    amount BIGINT NOT NULL,
    fee_amount BIGINT NOT NULL,
    destination_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'confirmed', 'failed'
    transaction_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    admin_approved_by VARCHAR(255),
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    
    INDEX idx_withdrawals_player_id (player_id),
    INDEX idx_withdrawals_status (status),
    INDEX idx_withdrawals_created (created_at)
);

-- Tabla de bonificaciones
CREATE TABLE IF NOT EXISTS bonuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id),
    bonus_type VARCHAR(50) NOT NULL, -- 'welcome', 'deposit', 'loyalty', 'referral'
    amount BIGINT NOT NULL,
    wagering_requirement INTEGER DEFAULT 0,
    wagered_amount BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'expired', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    INDEX idx_bonuses_player_id (player_id),
    INDEX idx_bonuses_type (bonus_type),
    INDEX idx_bonuses_status (status)
);

-- Tabla de leaderboard
CREATE TABLE IF NOT EXISTS leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id),
    period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
    metric VARCHAR(50) NOT NULL, -- 'total_won', 'total_bet', 'games_played', 'biggest_win'
    value BIGINT NOT NULL,
    rank INTEGER,
    period_start DATE,
    period_end DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(player_id, period, metric, period_start),
    INDEX idx_leaderboard_period_metric (period, metric),
    INDEX idx_leaderboard_rank (rank),
    INDEX idx_leaderboard_value (value DESC)
);

-- Tabla de auditoría/logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_audit_logs_player_id (player_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_created (created_at)
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255)
);

-- Insertar configuración inicial
INSERT INTO system_config (key, value, description) VALUES
('moonyetis_token_rate', '0.0000001037', 'Tasa USD actual del token MOONYETIS'),
('min_bet_amount', '10000', 'Apuesta mínima en tokens MOONYETIS'),
('max_bet_amount', '50000000', 'Apuesta máxima en tokens MOONYETIS'),
('min_deposit_amount', '10000', 'Depósito mínimo en tokens'),
('min_withdrawal_amount', '10000', 'Retiro mínimo en tokens'),
('withdrawal_fee_percent', '0.01', 'Porcentaje de comisión en retiros'),
('house_edge', '0.04', 'Ventaja de la casa (4%)'),
('rtp', '0.96', 'Return to Player (96%)'),
('maintenance_mode', 'false', 'Modo mantenimiento del casino'),
('max_concurrent_games', '1000', 'Máximo de juegos concurrentes'),
('ultra_accessible_enabled', 'true', 'Gambling ultra-accesible habilitado')
ON CONFLICT (key) DO NOTHING;

-- Función para actualizar balance de jugador de forma segura
CREATE OR REPLACE FUNCTION update_player_balance(
    p_player_id UUID,
    p_amount_change BIGINT,
    p_transaction_type VARCHAR(20)
) RETURNS BOOLEAN AS $$
DECLARE
    current_balance BIGINT;
    new_balance BIGINT;
BEGIN
    -- Obtener balance actual con bloqueo
    SELECT balance INTO current_balance 
    FROM player_balances 
    WHERE player_id = p_player_id 
    FOR UPDATE;
    
    -- Si no existe el record, crearlo
    IF current_balance IS NULL THEN
        INSERT INTO player_balances (player_id, balance) 
        VALUES (p_player_id, 0);
        current_balance := 0;
    END IF;
    
    -- Calcular nuevo balance
    new_balance := current_balance + p_amount_change;
    
    -- Verificar que el balance no sea negativo
    IF new_balance < 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Actualizar balance
    UPDATE player_balances 
    SET balance = new_balance,
        last_updated = NOW(),
        version = version + 1
    WHERE player_id = p_player_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de jugador
CREATE OR REPLACE FUNCTION get_player_stats(p_player_id UUID)
RETURNS TABLE(
    total_deposited BIGINT,
    total_withdrawn BIGINT,
    total_bet BIGINT,
    total_won BIGINT,
    games_played INTEGER,
    current_balance BIGINT,
    win_rate DECIMAL(5,2),
    biggest_win BIGINT,
    profit_loss BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.total_deposited, 0),
        COALESCE(p.total_withdrawn, 0),
        COALESCE(p.total_bet, 0),
        COALESCE(p.total_won, 0),
        COALESCE(p.games_played, 0),
        COALESCE(pb.balance, 0),
        CASE 
            WHEN p.games_played > 0 THEN 
                ROUND((SELECT COUNT(*) FROM games WHERE player_id = p_player_id AND win_amount > 0) * 100.0 / p.games_played, 2)
            ELSE 0 
        END as win_rate,
        COALESCE((SELECT MAX(win_amount) FROM games WHERE player_id = p_player_id), 0),
        COALESCE(p.total_won - p.total_bet, 0)
    FROM players p
    LEFT JOIN player_balances pb ON p.id = pb.player_id
    WHERE p.id = p_player_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar estadísticas de jugador automáticamente
CREATE OR REPLACE FUNCTION update_player_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Actualizar estadísticas cuando se inserta un nuevo juego
        IF NEW.game_type = 'slots' THEN
            UPDATE players 
            SET total_bet = total_bet + NEW.bet_amount,
                total_won = total_won + NEW.win_amount,
                games_played = games_played + 1,
                experience_points = experience_points + (NEW.bet_amount / 1000)
            WHERE id = NEW.player_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_stats
    AFTER INSERT ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_player_stats_trigger();

-- Crear índices adicionales para optimización
CREATE INDEX IF NOT EXISTS idx_games_created_at_desc ON games (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at_desc ON transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_players_wallet_address ON players (wallet_address);
CREATE INDEX IF NOT EXISTS idx_players_created_at ON players (created_at);

-- Vistas útiles para reportes
CREATE OR REPLACE VIEW ultra_accessible_stats AS
SELECT 
    COUNT(*) as total_ultra_accessible_games,
    COUNT(*) FILTER (WHERE bet_amount <= 10000) as sub_cent_games,
    AVG(bet_amount) as avg_bet_amount,
    MIN(bet_amount) as min_bet_amount,
    MAX(win_amount) as max_win_amount,
    SUM(bet_amount) as total_volume,
    SUM(win_amount) as total_payouts
FROM games 
WHERE bet_amount <= 100000; -- Juegos <= $0.01

-- Vista de top jugadores ultra-accesibles
CREATE OR REPLACE VIEW top_ultra_accessible_players AS
SELECT 
    p.wallet_address,
    p.username,
    COUNT(g.id) as ultra_games_played,
    SUM(g.bet_amount) as total_ultra_bet,
    SUM(g.win_amount) as total_ultra_won,
    AVG(g.bet_amount) as avg_ultra_bet
FROM players p
JOIN games g ON p.id = g.player_id
WHERE g.bet_amount <= 100000
GROUP BY p.id, p.wallet_address, p.username
ORDER BY total_ultra_bet DESC
LIMIT 100;

-- Política de limpieza de datos antiguos (opcional)
-- Se puede ejecutar como cron job
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Limpiar logs de auditoría mayores a 1 año
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Limpiar depósitos pendientes expirados mayores a 1 mes
    DELETE FROM pending_deposits 
    WHERE status = 'expired' AND created_at < NOW() - INTERVAL '1 month';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentarios en las tablas
COMMENT ON TABLE players IS 'Jugadores del casino ultra-accesible MoonYetis';
COMMENT ON TABLE games IS 'Partidas de slots con apuestas desde $0.001';
COMMENT ON TABLE transactions IS 'Transacciones blockchain MOONYETIS';
COMMENT ON TABLE player_balances IS 'Balances en tiempo real de jugadores';
COMMENT ON TABLE pending_deposits IS 'Monitoreo de depósitos en blockchain';
COMMENT ON TABLE withdrawals IS 'Retiros procesados y pendientes';
COMMENT ON TABLE leaderboard IS 'Rankings de jugadores por diferentes métricas';

COMMIT;