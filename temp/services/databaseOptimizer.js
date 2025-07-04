const { Pool } = require('pg');
const cacheService = require('./cacheService');

class DatabaseOptimizer {
    constructor() {
        this.pool = null;
        this.queryStats = {
            totalQueries: 0,
            slowQueries: 0,
            cachedQueries: 0,
            avgExecutionTime: 0,
            totalExecutionTime: 0
        };
        
        this.slowQueryThreshold = 1000; // 1 second
        this.cacheableTables = ['leaderboard', 'game_results', 'user_stats'];
    }

    async initialize(pool) {
        this.pool = pool;
        await this.createIndexes();
        await this.analyzeTables();
        console.log('🚀 Database optimizer initialized');
    }

    // Execute optimized query with caching
    async query(sql, params = [], options = {}) {
        const startTime = Date.now();
        const shouldCache = options.cache !== false;
        const cacheTTL = options.cacheTTL || 300;
        
        try {
            // Check cache first for SELECT queries
            if (shouldCache && sql.trim().toLowerCase().startsWith('select')) {
                const cachedResult = await cacheService.getQueryResult(sql, params);
                if (cachedResult) {
                    this.queryStats.cachedQueries++;
                    return cachedResult;
                }
            }
            
            // Execute query
            const result = await this.pool.query(sql, params);
            
            // Track execution time
            const executionTime = Date.now() - startTime;
            this.updateQueryStats(executionTime);
            
            // Log slow queries
            if (executionTime > this.slowQueryThreshold) {
                console.warn(`🐌 Slow query (${executionTime}ms): ${sql.substring(0, 100)}...`);
                this.queryStats.slowQueries++;
                
                // Suggest optimization for slow queries
                await this.suggestOptimization(sql, executionTime);
            }
            
            // Cache SELECT results
            if (shouldCache && sql.trim().toLowerCase().startsWith('select') && result.rows.length > 0) {
                await cacheService.cacheQuery(sql, params, result, cacheTTL);
            }
            
            return result;
            
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    // Create performance indexes
    async createIndexes() {
        const indexes = [
            // User transactions
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)',
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_timestamp ON transactions(created_at DESC)',
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_status ON transactions(status)',
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type ON transactions(transaction_type)',
            
            // Game results
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_results_user_id ON game_results(user_id)',
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_results_timestamp ON game_results(created_at DESC)',
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_results_amount ON game_results(win_amount DESC)',
            
            // Leaderboard
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_score ON leaderboard(total_winnings DESC)',
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_games ON leaderboard(games_played DESC)',
            
            // Deposits and withdrawals
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deposits_address ON deposits(wallet_address)',
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deposits_status ON deposits(status)',
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawals_address ON withdrawals(wallet_address)',
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawals_status ON withdrawals(status)',
            
            // Composite indexes for common queries
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_status ON transactions(user_id, status)',
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_results_user_date ON game_results(user_id, created_at DESC)',
            
            // Partial indexes for active records
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_active ON transactions(id) WHERE status = \'confirmed\'',
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deposits_pending ON deposits(id) WHERE status = \'pending\''
        ];
        
        console.log('📊 Creating database indexes...');
        
        for (const indexSQL of indexes) {
            try {
                await this.pool.query(indexSQL);
                console.log(`  ✅ Created index: ${indexSQL.split(' ')[5]}`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log(`  ⚠️ Index already exists: ${indexSQL.split(' ')[5]}`);
                } else {
                    console.error(`  ❌ Failed to create index: ${error.message}`);
                }
            }
        }
    }

    // Analyze table statistics
    async analyzeTables() {
        console.log('📈 Analyzing table statistics...');
        
        const tables = [
            'transactions',
            'game_results',
            'leaderboard',
            'deposits',
            'withdrawals',
            'users'
        ];
        
        for (const table of tables) {
            try {
                await this.pool.query(`ANALYZE ${table}`);
                console.log(`  ✅ Analyzed table: ${table}`);
            } catch (error) {
                console.warn(`  ⚠️ Could not analyze table ${table}: ${error.message}`);
            }
        }
    }

    // Optimized leaderboard query
    async getLeaderboard(limit = 10, offset = 0) {
        const cacheKey = `leaderboard_${limit}_${offset}`;
        
        return await this.query(`
            SELECT 
                l.user_id,
                l.username,
                l.total_winnings,
                l.games_played,
                l.biggest_win,
                l.win_rate,
                RANK() OVER (ORDER BY l.total_winnings DESC) as rank
            FROM leaderboard l
            WHERE l.total_winnings > 0
            ORDER BY l.total_winnings DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset], { cacheTTL: 300 });
    }

    // Optimized user transaction history
    async getUserTransactions(userId, limit = 50, offset = 0) {
        return await this.query(`
            SELECT 
                t.id,
                t.transaction_type,
                t.amount,
                t.status,
                t.created_at,
                t.blockchain_tx_id
            FROM transactions t
            WHERE t.user_id = $1
            ORDER BY t.created_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset], { cacheTTL: 60 });
    }

    // Optimized game results query
    async getUserGameResults(userId, limit = 100) {
        return await this.query(`
            SELECT 
                gr.id,
                gr.bet_amount,
                gr.win_amount,
                gr.game_data,
                gr.created_at,
                (gr.win_amount - gr.bet_amount) as profit
            FROM game_results gr
            WHERE gr.user_id = $1
            ORDER BY gr.created_at DESC
            LIMIT $2
        `, [userId, limit], { cacheTTL: 180 });
    }

    // Optimized deposit monitoring
    async getPendingDeposits() {
        return await this.query(`
            SELECT 
                d.id,
                d.wallet_address,
                d.expected_amount,
                d.blockchain_tx_id,
                d.created_at,
                EXTRACT(EPOCH FROM NOW() - d.created_at) as age_seconds
            FROM deposits d
            WHERE d.status = 'pending'
            AND d.created_at > NOW() - INTERVAL '24 hours'
            ORDER BY d.created_at ASC
        `, [], { cache: false }); // Don't cache pending data
    }

    // Optimized withdrawal processing
    async getPendingWithdrawals() {
        return await this.query(`
            SELECT 
                w.id,
                w.user_id,
                w.wallet_address,
                w.amount,
                w.created_at,
                EXTRACT(EPOCH FROM NOW() - w.created_at) as age_seconds
            FROM withdrawals w
            WHERE w.status = 'pending'
            ORDER BY w.created_at ASC
        `, [], { cache: false });
    }

    // Batch operations for better performance
    async batchInsertGameResults(gameResults) {
        if (gameResults.length === 0) return;
        
        const values = gameResults.map((result, index) => {
            const baseIndex = index * 6;
            return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
        }).join(', ');
        
        const params = gameResults.flatMap(result => [
            result.userId,
            result.betAmount,
            result.winAmount,
            JSON.stringify(result.gameData),
            result.createdAt || new Date(),
            result.sessionId
        ]);
        
        const sql = `
            INSERT INTO game_results (user_id, bet_amount, win_amount, game_data, created_at, session_id)
            VALUES ${values}
            RETURNING id
        `;
        
        return await this.query(sql, params, { cache: false });
    }

    // Update leaderboard efficiently
    async updateLeaderboard(userId) {
        return await this.query(`
            INSERT INTO leaderboard (user_id, username, total_winnings, games_played, biggest_win, win_rate)
            SELECT 
                $1 as user_id,
                u.username,
                COALESCE(SUM(gr.win_amount), 0) as total_winnings,
                COUNT(gr.id) as games_played,
                COALESCE(MAX(gr.win_amount), 0) as biggest_win,
                CASE 
                    WHEN COUNT(gr.id) > 0 THEN 
                        ROUND((COUNT(CASE WHEN gr.win_amount > gr.bet_amount THEN 1 END)::decimal / COUNT(gr.id)) * 100, 2)
                    ELSE 0 
                END as win_rate
            FROM users u
            LEFT JOIN game_results gr ON gr.user_id = u.id
            WHERE u.id = $1
            GROUP BY u.id, u.username
            ON CONFLICT (user_id) DO UPDATE SET
                total_winnings = EXCLUDED.total_winnings,
                games_played = EXCLUDED.games_played,
                biggest_win = EXCLUDED.biggest_win,
                win_rate = EXCLUDED.win_rate,
                updated_at = NOW()
        `, [userId], { cache: false });
    }

    // Database statistics and health
    async getDatabaseStats() {
        const stats = await this.query(`
            SELECT 
                schemaname,
                tablename,
                n_live_tup as row_count,
                n_dead_tup as dead_rows,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze
            FROM pg_stat_user_tables
            ORDER BY n_live_tup DESC
        `, [], { cacheTTL: 600 });
        
        const indexStats = await this.query(`
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan,
                idx_tup_read,
                idx_tup_fetch
            FROM pg_stat_user_indexes
            ORDER BY idx_scan DESC
        `, [], { cacheTTL: 600 });
        
        return {
            tables: stats.rows,
            indexes: indexStats.rows,
            queryStats: this.queryStats
        };
    }

    // Suggest query optimization
    async suggestOptimization(sql, executionTime) {
        const suggestions = [];
        
        // Check for missing WHERE clauses on large tables
        if (sql.includes('FROM transactions') && !sql.includes('WHERE')) {
            suggestions.push('Consider adding WHERE clause to limit results on transactions table');
        }
        
        // Check for ORDER BY without LIMIT
        if (sql.includes('ORDER BY') && !sql.includes('LIMIT')) {
            suggestions.push('Consider adding LIMIT to ordered queries for better performance');
        }
        
        // Check for SELECT *
        if (sql.includes('SELECT *')) {
            suggestions.push('Consider selecting only needed columns instead of SELECT *');
        }
        
        // Check for subqueries that could be JOINs
        if (sql.includes('IN (SELECT')) {
            suggestions.push('Consider replacing IN (SELECT...) with JOIN for better performance');
        }
        
        if (suggestions.length > 0) {
            console.log(`💡 Query optimization suggestions for ${executionTime}ms query:`);
            suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
        }
    }

    // Update query statistics
    updateQueryStats(executionTime) {
        this.queryStats.totalQueries++;
        this.queryStats.totalExecutionTime += executionTime;
        this.queryStats.avgExecutionTime = this.queryStats.totalExecutionTime / this.queryStats.totalQueries;
    }

    // Vacuum and maintenance
    async performMaintenance() {
        console.log('🧹 Performing database maintenance...');
        
        const maintenanceTasks = [
            'VACUUM ANALYZE transactions',
            'VACUUM ANALYZE game_results',
            'VACUUM ANALYZE leaderboard',
            'REINDEX INDEX CONCURRENTLY idx_transactions_user_id',
            'REINDEX INDEX CONCURRENTLY idx_game_results_timestamp'
        ];
        
        for (const task of maintenanceTasks) {
            try {
                await this.pool.query(task);
                console.log(`  ✅ ${task}`);
            } catch (error) {
                console.warn(`  ⚠️ Maintenance task failed: ${task} - ${error.message}`);
            }
        }
    }

    // Connection pool management
    async optimizePool() {
        if (!this.pool) return;
        
        console.log('🔧 Optimizing connection pool...');
        
        // Get pool stats
        const stats = {
            totalConnections: this.pool.totalCount,
            idleConnections: this.pool.idleCount,
            waitingClients: this.pool.waitingCount
        };
        
        console.log(`  Pool stats: ${JSON.stringify(stats)}`);
        
        // Suggestions based on pool usage
        if (stats.waitingClients > 0) {
            console.log('  💡 Consider increasing pool size - clients are waiting');
        }
        
        if (stats.idleConnections > stats.totalConnections * 0.8) {
            console.log('  💡 Consider reducing pool size - many idle connections');
        }
        
        return stats;
    }

    // Get performance metrics
    getPerformanceMetrics() {
        return {
            queryStats: this.queryStats,
            slowQueryThreshold: this.slowQueryThreshold,
            cacheHitRate: cacheService.getStats().hitRate,
            timestamp: new Date()
        };
    }

    // Reset statistics
    resetStats() {
        this.queryStats = {
            totalQueries: 0,
            slowQueries: 0,
            cachedQueries: 0,
            avgExecutionTime: 0,
            totalExecutionTime: 0
        };
        
        console.log('📊 Query statistics reset');
    }
}

module.exports = new DatabaseOptimizer();