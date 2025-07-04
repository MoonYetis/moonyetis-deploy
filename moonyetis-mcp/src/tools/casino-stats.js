/**
 * Casino Statistics Module
 * Real-time casino metrics and analytics
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

class CasinoStats {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'moonyetis_casino',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async getStats(timeframe = '24h') {
    const hoursBack = this.parseTimeframe(timeframe);
    const timeCondition = `created_at >= NOW() - INTERVAL '${hoursBack} hours'`;

    try {
      // Get player statistics
      const playersQuery = `
        SELECT 
          COUNT(DISTINCT wallet_address) as total_players,
          COUNT(DISTINCT CASE WHEN last_active >= NOW() - INTERVAL '24 hours' THEN wallet_address END) as active_players
        FROM players 
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `;

      // Get game statistics
      const gamesQuery = `
        SELECT 
          COUNT(*) as total_games,
          SUM(bet_amount) as total_wagered,
          SUM(payout_amount) as total_won,
          AVG(bet_amount) as average_bet,
          MAX(payout_amount) as biggest_win,
          COUNT(CASE WHEN payout_amount > 0 THEN 1 END) * 100.0 / COUNT(*) as win_rate
        FROM games 
        WHERE ${timeCondition}
      `;

      // Get deposit/withdrawal statistics
      const transactionsQuery = `
        SELECT 
          COUNT(CASE WHEN type = 'deposit' THEN 1 END) as deposit_count,
          SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
          COUNT(CASE WHEN type = 'withdrawal' THEN 1 END) as withdrawal_count,
          SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions
        FROM transactions 
        WHERE ${timeCondition}
      `;

      const [playersResult, gamesResult, transactionsResult] = await Promise.all([
        this.pool.query(playersQuery),
        this.pool.query(gamesQuery),
        this.pool.query(transactionsQuery)
      ]);

      const players = playersResult.rows[0];
      const games = gamesResult.rows[0];
      const transactions = transactionsResult.rows[0];

      // Calculate derived metrics
      const totalRevenue = parseFloat(games.total_wagered || 0) - parseFloat(games.total_won || 0);
      const houseEdge = games.total_wagered > 0 ? 
        ((parseFloat(games.total_wagered) - parseFloat(games.total_won)) / parseFloat(games.total_wagered) * 100).toFixed(2) : 0;
      const rtp = games.total_wagered > 0 ? 
        (parseFloat(games.total_won) / parseFloat(games.total_wagered) * 100).toFixed(2) : 0;

      // Get growth metrics (compare with previous period)
      const previousPeriodQuery = `
        SELECT 
          COUNT(DISTINCT wallet_address) as prev_players,
          SUM(bet_amount) as prev_wagered
        FROM games g
        JOIN players p ON g.player_id = p.id
        WHERE g.created_at >= NOW() - INTERVAL '${hoursBack * 2} hours' 
        AND g.created_at < NOW() - INTERVAL '${hoursBack} hours'
      `;

      const previousResult = await this.pool.query(previousPeriodQuery);
      const previous = previousResult.rows[0];

      const playerGrowth = previous.prev_players > 0 ? 
        (((parseInt(players.active_players) - parseInt(previous.prev_players)) / parseInt(previous.prev_players)) * 100).toFixed(1) : 0;
      const revenueGrowth = previous.prev_wagered > 0 ? 
        (((totalRevenue - (parseFloat(previous.prev_wagered) * 0.05)) / (parseFloat(previous.prev_wagered) * 0.05)) * 100).toFixed(1) : 0;

      return {
        totalPlayers: parseInt(players.total_players) || 0,
        activePlayers: parseInt(players.active_players) || 0,
        totalGames: parseInt(games.total_games) || 0,
        totalWagered: parseFloat(games.total_wagered || 0).toFixed(2),
        totalWon: parseFloat(games.total_won || 0).toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        averageBet: parseFloat(games.average_bet || 0).toFixed(2),
        biggestWin: parseFloat(games.biggest_win || 0).toFixed(2),
        winRate: parseFloat(games.win_rate || 0).toFixed(1),
        houseEdge: parseFloat(houseEdge),
        rtp: parseFloat(rtp),
        popularBetSize: parseFloat(games.average_bet || 0).toFixed(2),
        deposits: {
          count: parseInt(transactions.deposit_count) || 0,
          total: parseFloat(transactions.total_deposits || 0).toFixed(2)
        },
        withdrawals: {
          count: parseInt(transactions.withdrawal_count) || 0,
          total: parseFloat(transactions.total_withdrawals || 0).toFixed(2)
        },
        pendingTransactions: parseInt(transactions.pending_transactions) || 0,
        playerGrowth: parseFloat(playerGrowth),
        revenueGrowth: parseFloat(revenueGrowth)
      };

    } catch (error) {
      console.error('Error getting casino stats:', error);
      throw new Error(`Failed to retrieve casino statistics: ${error.message}`);
    }
  }

  parseTimeframe(timeframe) {
    const timeframes = {
      '1h': 1,
      '24h': 24,
      '7d': 168,
      '30d': 720
    };
    return timeframes[timeframe] || 24;
  }

  async close() {
    await this.pool.end();
  }
}

export const casinoStats = new CasinoStats();