/**
 * Player Analytics Module
 * Player statistics and game history analysis
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

class PlayerAnalytics {
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

  async getPlayerStats(playerId, includeHistory = false) {
    try {
      // Get basic player info
      const playerQuery = `
        SELECT 
          wallet_address,
          created_at,
          last_active,
          current_balance,
          total_deposited,
          total_withdrawn
        FROM players 
        WHERE wallet_address = $1 OR id::text = $1
      `;

      const playerResult = await this.pool.query(playerQuery, [playerId]);
      
      if (playerResult.rows.length === 0) {
        throw new Error('Player not found');
      }

      const player = playerResult.rows[0];

      // Get gaming statistics
      const gameStatsQuery = `
        SELECT 
          COUNT(*) as total_games,
          SUM(bet_amount) as total_wagered,
          SUM(payout_amount) as total_won,
          AVG(bet_amount) as avg_bet,
          MAX(payout_amount) as biggest_win,
          COUNT(CASE WHEN payout_amount > 0 THEN 1 END) as wins,
          AVG(CASE WHEN payout_amount > 0 THEN payout_amount END) as avg_win,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as games_this_week
        FROM games 
        WHERE player_id = (SELECT id FROM players WHERE wallet_address = $1 OR id::text = $1)
      `;

      const gameStatsResult = await this.pool.query(gameStatsQuery, [playerId]);
      const gameStats = gameStatsResult.rows[0];

      // Calculate derived metrics
      const totalWagered = parseFloat(gameStats.total_wagered || 0);
      const totalWon = parseFloat(gameStats.total_won || 0);
      const netPnL = totalWon - totalWagered;
      const winRate = gameStats.total_games > 0 ? 
        (parseInt(gameStats.wins) / parseInt(gameStats.total_games) * 100).toFixed(1) : 0;

      // Get session statistics
      const sessionStatsQuery = `
        SELECT 
          COUNT(DISTINCT DATE(created_at)) as sessions_this_week,
          AVG(session_length) as avg_session_length
        FROM (
          SELECT 
            DATE(created_at) as session_date,
            EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))/60 as session_length
          FROM games 
          WHERE player_id = (SELECT id FROM players WHERE wallet_address = $1 OR id::text = $1)
          AND created_at >= NOW() - INTERVAL '7 days'
          GROUP BY DATE(created_at)
        ) sessions
      `;

      const sessionStatsResult = await this.pool.query(sessionStatsQuery, [playerId]);
      const sessionStats = sessionStatsResult.rows[0];

      // Get favorite bet size
      const favoriteBetQuery = `
        SELECT bet_amount, COUNT(*) as frequency
        FROM games 
        WHERE player_id = (SELECT id FROM players WHERE wallet_address = $1 OR id::text = $1)
        GROUP BY bet_amount
        ORDER BY frequency DESC
        LIMIT 1
      `;

      const favoriteBetResult = await this.pool.query(favoriteBetQuery, [playerId]);
      const favoriteBetSize = favoriteBetResult.rows[0]?.bet_amount || gameStats.avg_bet;

      let recentGames = [];
      if (includeHistory) {
        const recentGamesQuery = `
          SELECT 
            id,
            bet_amount as bet,
            payout_amount as payout,
            CASE WHEN payout_amount > 0 THEN 'win' ELSE 'loss' END as result,
            created_at as timestamp
          FROM games 
          WHERE player_id = (SELECT id FROM players WHERE wallet_address = $1 OR id::text = $1)
          ORDER BY created_at DESC
          LIMIT 10
        `;

        const recentGamesResult = await this.pool.query(recentGamesQuery, [playerId]);
        recentGames = recentGamesResult.rows.map(game => ({
          id: game.id,
          bet: parseFloat(game.bet).toFixed(6),
          payout: parseFloat(game.payout).toFixed(6),
          result: game.result,
          timestamp: new Date(game.timestamp).toLocaleString()
        }));
      }

      return {
        playerId: player.wallet_address,
        memberSince: new Date(player.created_at).toLocaleDateString(),
        lastActive: new Date(player.last_active).toLocaleString(),
        totalGames: parseInt(gameStats.total_games) || 0,
        totalWagered: totalWagered.toFixed(6),
        totalWon: totalWon.toFixed(6),
        netPnL: netPnL.toFixed(6),
        winRate: parseFloat(winRate),
        biggestWin: parseFloat(gameStats.biggest_win || 0).toFixed(6),
        currentBalance: parseFloat(player.current_balance || 0).toFixed(6),
        totalDeposited: parseFloat(player.total_deposited || 0).toFixed(6),
        totalwithdrawn: parseFloat(player.total_withdrawn || 0).toFixed(6),
        sessionsThisWeek: parseInt(sessionStats.sessions_this_week) || 0,
        avgSessionLength: parseFloat(sessionStats.avg_session_length || 0).toFixed(1) + ' minutes',
        favoriteBetSize: parseFloat(favoriteBetSize || 0).toFixed(6),
        recentGames: recentGames
      };

    } catch (error) {
      console.error('Error getting player stats:', error);
      throw new Error(`Failed to retrieve player statistics: ${error.message}`);
    }
  }

  async getGameHistory(playerId = null, limit = 50, timeframe = '24h') {
    try {
      const hoursBack = this.parseTimeframe(timeframe);
      const timeCondition = `created_at >= NOW() - INTERVAL '${hoursBack} hours'`;

      let whereClause = `WHERE ${timeCondition}`;
      let queryParams = [limit];

      if (playerId) {
        whereClause += ` AND player_id = (SELECT id FROM players WHERE wallet_address = $2 OR id::text = $2)`;
        queryParams.push(playerId);
      }

      const query = `
        SELECT 
          g.id,
          p.wallet_address as player,
          g.bet_amount as bet,
          g.bet_lines as lines,
          g.symbols,
          g.payout_amount as payout,
          g.created_at as timestamp
        FROM games g
        JOIN players p ON g.player_id = p.id
        ${whereClause}
        ORDER BY g.created_at DESC
        LIMIT $1
      `;

      const result = await this.pool.query(query, queryParams);

      // Get summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_games,
          SUM(bet_amount) as total_wagered,
          SUM(payout_amount) as total_won,
          COUNT(CASE WHEN payout_amount > 0 THEN 1 END) * 100.0 / COUNT(*) as win_rate
        FROM games g
        ${playerId ? 'JOIN players p ON g.player_id = p.id' : ''}
        ${whereClause.replace('$1', '$' + (queryParams.length + 1))}
      `;

      queryParams.push(1000); // Large limit for summary
      const summaryResult = await this.pool.query(summaryQuery, queryParams);
      const summary = summaryResult.rows[0];

      return {
        totalGames: parseInt(summary.total_games) || 0,
        totalWagered: parseFloat(summary.total_wagered || 0).toFixed(6),
        totalWon: parseFloat(summary.total_won || 0).toFixed(6),
        winRate: parseFloat(summary.win_rate || 0).toFixed(1),
        games: result.rows.map(game => ({
          id: game.id,
          player: game.player,
          bet: parseFloat(game.bet).toFixed(6),
          lines: game.lines,
          symbols: JSON.parse(game.symbols || '[]'),
          payout: parseFloat(game.payout).toFixed(6),
          timestamp: new Date(game.timestamp).toLocaleString()
        }))
      };

    } catch (error) {
      console.error('Error getting game history:', error);
      throw new Error(`Failed to retrieve game history: ${error.message}`);
    }
  }

  async getLeaderboard(metric = 'biggest_win', limit = 10) {
    try {
      let orderBy;
      let selectField;

      switch (metric) {
        case 'biggest_win':
          selectField = 'MAX(g.payout_amount)';
          orderBy = 'MAX(g.payout_amount) DESC';
          break;
        case 'total_wagered':
          selectField = 'SUM(g.bet_amount)';
          orderBy = 'SUM(g.bet_amount) DESC';
          break;
        case 'total_won':
          selectField = 'SUM(g.payout_amount)';
          orderBy = 'SUM(g.payout_amount) DESC';
          break;
        case 'games_played':
          selectField = 'COUNT(g.id)';
          orderBy = 'COUNT(g.id) DESC';
          break;
        default:
          selectField = 'MAX(g.payout_amount)';
          orderBy = 'MAX(g.payout_amount) DESC';
      }

      const query = `
        SELECT 
          p.wallet_address as name,
          ${selectField} as value,
          COUNT(g.id) as games,
          COUNT(CASE WHEN g.payout_amount > 0 THEN 1 END) * 100.0 / COUNT(g.id) as win_rate
        FROM players p
        JOIN games g ON p.id = g.player_id
        WHERE g.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY p.wallet_address, p.id
        HAVING COUNT(g.id) >= 10
        ORDER BY ${orderBy}
        LIMIT $1
      `;

      const result = await this.pool.query(query, [limit]);

      return result.rows.map(player => ({
        name: player.name.substring(0, 6) + '...' + player.name.substring(player.name.length - 6),
        value: parseFloat(player.value).toFixed(6),
        games: parseInt(player.games),
        winRate: parseFloat(player.win_rate).toFixed(1)
      }));

    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw new Error(`Failed to retrieve leaderboard: ${error.message}`);
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

export const playerAnalytics = new PlayerAnalytics();