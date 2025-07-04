const { Pool } = require('pg');
const { BLOCKCHAIN_CONFIG } = require('./blockchain');
const secureCredentials = require('../services/secureCredentialsManager');
const databaseOptimizer = require('../services/databaseOptimizer');
const cacheService = require('../services/cacheService');

// Async function to get secure database configuration
async function getSecureDatabaseConfig() {
  try {
    // Try to get credentials from secure storage first
    const dbCredentials = await secureCredentials.getDatabaseCredentials();
    
    return {
      user: dbCredentials.user || process.env.POSTGRES_USER || process.env.DB_USER || 'moonyetis',
      host: dbCredentials.host || process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
      database: dbCredentials.database || process.env.POSTGRES_DB || process.env.DB_NAME || 'moonyetis_production',
      password: dbCredentials.password || process.env.POSTGRES_PASSWORD,
      port: parseInt(dbCredentials.port || process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
      
      // Connection pool settings
      max: BLOCKCHAIN_CONFIG.DATABASE.maxConnections,
      idleTimeoutMillis: BLOCKCHAIN_CONFIG.DATABASE.idleTimeout,
      connectionTimeoutMillis: BLOCKCHAIN_CONFIG.DATABASE.connectionTimeout,
      query_timeout: BLOCKCHAIN_CONFIG.DATABASE.queryTimeout,
      
      // FIXED: Disable SSL for local PostgreSQL installation
      ssl: false
    };
  } catch (error) {
    console.warn('⚠️  Falling back to environment variables for database config:', error.message);
    
    // Fallback to environment variables
    return {
      user: process.env.DB_USER || 'moonyetis_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'moonyetis_slots',
      password: process.env.DB_PASSWORD || 'moonyetis_password',
      port: parseInt(process.env.DB_PORT || '5432'),
      
      max: BLOCKCHAIN_CONFIG.DATABASE.maxConnections,
      idleTimeoutMillis: BLOCKCHAIN_CONFIG.DATABASE.idleTimeout,
      connectionTimeoutMillis: BLOCKCHAIN_CONFIG.DATABASE.connectionTimeout,
      query_timeout: BLOCKCHAIN_CONFIG.DATABASE.queryTimeout,
      
      ssl: false // Disable SSL for fallback mode
    };
  }
}

// Database connection wrapper class
class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.initPromise = this.init();
  }

  // Initialize database connection with secure credentials
  async init() {
    try {
      const dbConfig = await getSecureDatabaseConfig();
      this.pool = new Pool(dbConfig);
      
      // Test connection
      const client = await this.pool.connect();
      console.log('✅ PostgreSQL database connected successfully with secure credentials');
      
      // Test query
      const result = await client.query('SELECT NOW()');
      console.log('🕐 Database time:', result.rows[0].now);
      
      client.release();
      this.isConnected = true;
      
      // Initialize Phase 3 optimizations
      await this.initializeOptimizations();
      
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  // Ensure initialization is complete
  async ensureInitialized() {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    return await this.initPromise;
  }

  // Initialize Phase 3 optimizations
  async initializeOptimizations() {
    try {
      console.log('🚀 Initializing Phase 3 database optimizations...');
      
      // Initialize database optimizer
      await databaseOptimizer.initialize(this.pool);
      
      // Test cache service
      const cacheHealth = await cacheService.healthCheck();
      if (cacheHealth.healthy) {
        console.log('✅ Cache service initialized');
      } else {
        console.warn('⚠️ Cache service not fully functional');
      }
      
      console.log('✅ Phase 3 database optimizations complete');
    } catch (error) {
      console.error('❌ Failed to initialize optimizations:', error.message);
    }
  }

  // Execute query with Phase 3 optimizations
  async query(text, params = [], options = {}) {
    await this.ensureInitialized();
    
    // Use database optimizer for improved performance
    return await databaseOptimizer.query(text, params, options);
  }

  // Optimized queries for common operations
  async getLeaderboard(limit = 10, offset = 0) {
    return await databaseOptimizer.getLeaderboard(limit, offset);
  }

  async getUserTransactions(userId, limit = 50, offset = 0) {
    return await databaseOptimizer.getUserTransactions(userId, limit, offset);
  }

  async getUserGameResults(userId, limit = 100) {
    return await databaseOptimizer.getUserGameResults(userId, limit);
  }

  async getPendingDeposits() {
    return await databaseOptimizer.getPendingDeposits();
  }

  async getPendingWithdrawals() {
    return await databaseOptimizer.getPendingWithdrawals();
  }

  async updateLeaderboard(userId) {
    // Invalidate leaderboard cache
    await cacheService.invalidatePattern('leaderboard');
    return await databaseOptimizer.updateLeaderboard(userId);
  }

  // Execute transaction
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // USER ACCOUNTS QUERIES

  // Create or update user account
  async createOrUpdateUserAccount(accountData) {
    const query = `
      INSERT INTO user_accounts (
        wallet_address, game_chips, total_deposited, total_withdrawn,
        total_wagered, total_won, first_deposit_bonus, is_first_deposit,
        account_status, loyalty_level, vip_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      ON CONFLICT (wallet_address) DO UPDATE SET
        game_chips = EXCLUDED.game_chips,
        total_deposited = EXCLUDED.total_deposited,
        total_withdrawn = EXCLUDED.total_withdrawn,
        total_wagered = EXCLUDED.total_wagered,
        total_won = EXCLUDED.total_won,
        first_deposit_bonus = EXCLUDED.first_deposit_bonus,
        is_first_deposit = EXCLUDED.is_first_deposit,
        account_status = EXCLUDED.account_status,
        loyalty_level = EXCLUDED.loyalty_level,
        vip_status = EXCLUDED.vip_status,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      accountData.walletAddress,
      accountData.gameChips || 0,
      accountData.totalDeposited || 0,
      accountData.totalWithdrawn || 0,
      accountData.totalWagered || 0,
      accountData.totalWon || 0,
      accountData.firstDepositBonus || 0,
      accountData.isFirstDeposit !== false,
      accountData.accountStatus || 'active',
      accountData.loyaltyLevel || 1,
      accountData.vipStatus || false
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  // Get user account by wallet address
  async getUserAccount(walletAddress) {
    const query = `
      SELECT * FROM user_accounts
      WHERE wallet_address = $1
    `;
    const result = await this.query(query, [walletAddress]);
    return result.rows[0];
  }

  // Update user account chips
  async updateUserChips(walletAddress, chipAmount, operation = 'add') {
    const query = operation === 'add' ? `
      UPDATE user_accounts 
      SET game_chips = game_chips + $2, updated_at = NOW()
      WHERE wallet_address = $1
      RETURNING *
    ` : `
      UPDATE user_accounts 
      SET game_chips = game_chips - $2, updated_at = NOW()
      WHERE wallet_address = $1 AND game_chips >= $2
      RETURNING *
    `;
    
    const result = await this.query(query, [walletAddress, chipAmount]);
    return result.rows[0];
  }

  // TRANSACTION QUERIES

  // Insert transaction record
  async insertTransaction(transactionData) {
    const query = `
      INSERT INTO transactions (
        tx_hash, wallet_address, type, token_amount, game_chips,
        fee, bonus_chips, status, game_round_id, block_height, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `;

    const values = [
      transactionData.txHash,
      transactionData.walletAddress,
      transactionData.type,
      transactionData.tokenAmount || 0,
      transactionData.gameChips || 0,
      transactionData.fee || 0,
      transactionData.bonusChips || 0,
      transactionData.status || 'pending',
      transactionData.gameRoundId || null,
      transactionData.blockHeight || null
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  // Get transaction by hash
  async getTransaction(txHash) {
    const query = `
      SELECT * FROM transactions
      WHERE tx_hash = $1
    `;
    const result = await this.query(query, [txHash]);
    return result.rows[0];
  }

  // Get user transaction history
  async getUserTransactions(walletAddress, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM transactions
      WHERE wallet_address = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.query(query, [walletAddress, limit, offset]);
    return result.rows;
  }

  // Update transaction status
  async updateTransactionStatus(txHash, status, additionalData = {}) {
    const query = `
      UPDATE transactions 
      SET status = $2, 
          block_height = COALESCE($3, block_height),
          updated_at = NOW()
      WHERE tx_hash = $1
      RETURNING *
    `;
    const result = await this.query(query, [txHash, status, additionalData.blockHeight]);
    return result.rows[0];
  }

  // GAME ROUNDS QUERIES

  // Insert game round
  async insertGameRound(roundData) {
    const query = `
      INSERT INTO game_rounds (
        round_id, wallet_address, session_id, bet_amount, win_amount,
        reel_results, game_hash, server_seed, client_seed, nonce,
        multiplier, is_win, rtp, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *
    `;

    const values = [
      roundData.roundId,
      roundData.walletAddress,
      roundData.sessionId || null,
      roundData.betAmount,
      roundData.winAmount || 0,
      JSON.stringify(roundData.reelResults),
      roundData.gameHash,
      roundData.serverSeed,
      roundData.clientSeed,
      roundData.nonce,
      roundData.multiplier || 0,
      roundData.isWin || false,
      roundData.rtp || 0
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  // Get game round by ID
  async getGameRound(roundId) {
    const query = `
      SELECT * FROM game_rounds
      WHERE round_id = $1
    `;
    const result = await this.query(query, [roundId]);
    const round = result.rows[0];
    if (round && round.reel_results) {
      round.reel_results = JSON.parse(round.reel_results);
    }
    return round;
  }

  // Get user game rounds
  async getUserGameRounds(walletAddress, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM game_rounds
      WHERE wallet_address = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.query(query, [walletAddress, limit, offset]);
    return result.rows.map(round => {
      if (round.reel_results) {
        round.reel_results = JSON.parse(round.reel_results);
      }
      return round;
    });
  }

  // ANALYTICS QUERIES

  // Get daily deposit/withdrawal stats
  async getDailyStats(date = new Date()) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        type,
        COUNT(*) as transaction_count,
        SUM(token_amount) as total_amount,
        SUM(fee) as total_fees
      FROM transactions
      WHERE DATE(created_at) = DATE($1)
        AND status = 'completed'
      GROUP BY DATE(created_at), type
    `;
    const result = await this.query(query, [date]);
    return result.rows;
  }

  // Get system statistics
  async getSystemStats() {
    const queries = [
      // Total accounts
      this.query('SELECT COUNT(*) as total_accounts FROM user_accounts'),
      
      // Total deposits/withdrawals
      this.query(`
        SELECT 
          type,
          COUNT(*) as count,
          SUM(token_amount) as total_amount,
          SUM(fee) as total_fees
        FROM transactions 
        WHERE status = 'completed'
        GROUP BY type
      `),
      
      // Total game rounds
      this.query(`
        SELECT 
          COUNT(*) as total_rounds,
          SUM(bet_amount) as total_wagered,
          SUM(win_amount) as total_won,
          AVG(rtp) as average_rtp
        FROM game_rounds
      `),
      
      // Active users (last 24 hours)
      this.query(`
        SELECT COUNT(DISTINCT wallet_address) as active_users
        FROM user_accounts
        WHERE updated_at > NOW() - INTERVAL '24 hours'
      `)
    ];

    const results = await Promise.all(queries);
    
    return {
      totalAccounts: parseInt(results[0].rows[0].total_accounts),
      transactions: results[1].rows,
      gameStats: results[2].rows[0],
      activeUsers: parseInt(results[3].rows[0].active_users)
    };
  }

  // Get user daily withdrawal amount
  async getUserDailyWithdrawal(walletAddress, date = new Date()) {
    const query = `
      SELECT COALESCE(SUM(ABS(token_amount)), 0) as daily_withdrawal
      FROM transactions
      WHERE wallet_address = $1
        AND type = 'withdrawal'
        AND DATE(created_at) = DATE($2)
        AND status = 'completed'
    `;
    const result = await this.query(query, [walletAddress, date]);
    return parseFloat(result.rows[0].daily_withdrawal);
  }

  // CLEANUP AND MAINTENANCE

  // Clean old session data (older than 30 days)
  async cleanupOldSessions() {
    const query = `
      DELETE FROM game_rounds
      WHERE created_at < NOW() - INTERVAL '30 days'
        AND session_id IS NOT NULL
    `;
    const result = await this.query(query);
    return result.rowCount;
  }

  // Archive completed transactions (older than 90 days)
  async archiveOldTransactions() {
    const query = `
      UPDATE transactions
      SET status = 'archived'
      WHERE created_at < NOW() - INTERVAL '90 days'
        AND status = 'completed'
    `;
    const result = await this.query(query);
    return result.rowCount;
  }

  // Check database health
  async healthCheck() {
    try {
      const queries = [
        this.query('SELECT 1'),
        this.query('SELECT COUNT(*) FROM user_accounts'),
        this.query('SELECT COUNT(*) FROM transactions'),
        this.query('SELECT COUNT(*) FROM game_rounds')
      ];

      const results = await Promise.all(queries);
      
      return {
        status: 'healthy',
        connected: true,
        tables: {
          user_accounts: parseInt(results[1].rows[0].count),
          transactions: parseInt(results[2].rows[0].count),
          game_rounds: parseInt(results[3].rows[0].count)
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // Close database connection
  async close() {
    await this.pool.end();
    console.log('Database connection pool closed');
  }
}

// Create and export database instance
const database = new Database();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Closing database connection...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connection...');
  await database.close();
  process.exit(0);
});

module.exports = database;