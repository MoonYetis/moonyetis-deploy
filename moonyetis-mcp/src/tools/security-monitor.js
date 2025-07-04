/**
 * Security Monitor Module
 * Security alerts and suspicious activity detection
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

class SecurityMonitor {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'moonyetis_casino',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.alertThresholds = {
      maxBetAmount: 1000, // MY tokens
      maxBetsPerMinute: 10,
      maxWinRatio: 80, // percent
      suspiciousPatterns: {
        sameSymbolsRepeated: 5,
        identicalBetAmounts: 20,
        rapidSuccessiveWins: 5
      }
    };
  }

  async getAlerts(severity = 'all', limit = 50) {
    try {
      let whereClause = '';
      let queryParams = [limit];

      if (severity !== 'all') {
        whereClause = 'WHERE severity = $2';
        queryParams.push(severity);
      }

      const query = `
        SELECT 
          id,
          title,
          description,
          severity,
          status,
          created_at as timestamp,
          player_id,
          metadata
        FROM security_alerts 
        ${whereClause}
        ORDER BY 
          CASE severity 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END,
          created_at DESC
        LIMIT $1
      `;

      const result = await this.pool.query(query, queryParams);

      // Get summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium,
          COUNT(CASE WHEN severity = 'low' THEN 1 END) as low
        FROM security_alerts 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND status != 'resolved'
      `;

      const summaryResult = await this.pool.query(summaryQuery);
      const summary = summaryResult.rows[0];

      return {
        summary: {
          total: parseInt(summary.total),
          critical: parseInt(summary.critical),
          high: parseInt(summary.high),
          medium: parseInt(summary.medium),
          low: parseInt(summary.low)
        },
        alerts: result.rows.map(alert => ({
          id: alert.id,
          title: alert.title,
          description: alert.description,
          severity: alert.severity,
          status: alert.status,
          timestamp: new Date(alert.timestamp).toLocaleString(),
          playerId: alert.player_id,
          metadata: JSON.parse(alert.metadata || '{}')
        }))
      };

    } catch (error) {
      console.error('Error getting security alerts:', error);
      throw new Error(`Failed to retrieve security alerts: ${error.message}`);
    }
  }

  async monitorPlayerActivity() {
    try {
      console.log('🔒 Running security monitoring checks...');

      await Promise.all([
        this.checkHighValueBets(),
        this.checkRapidBetting(),
        this.checkSuspiciousWinRates(),
        this.checkDuplicateTransactions(),
        this.checkUnusualPatterns()
      ]);

      console.log('✅ Security monitoring completed');

    } catch (error) {
      console.error('Error in security monitoring:', error);
    }
  }

  async checkHighValueBets() {
    try {
      const query = `
        SELECT 
          g.id,
          p.wallet_address,
          g.bet_amount,
          g.payout_amount,
          g.created_at
        FROM games g
        JOIN players p ON g.player_id = p.id
        WHERE g.bet_amount > $1
        AND g.created_at >= NOW() - INTERVAL '1 hour'
      `;

      const result = await this.pool.query(query, [this.alertThresholds.maxBetAmount]);

      for (const bet of result.rows) {
        await this.createAlert({
          title: 'High Value Bet Detected',
          description: `Player ${bet.wallet_address} placed a bet of ${bet.bet_amount} MY`,
          severity: bet.bet_amount > this.alertThresholds.maxBetAmount * 2 ? 'high' : 'medium',
          playerId: bet.wallet_address,
          metadata: {
            gameId: bet.id,
            betAmount: bet.bet_amount,
            payout: bet.payout_amount
          }
        });
      }

    } catch (error) {
      console.error('Error checking high value bets:', error);
    }
  }

  async checkRapidBetting() {
    try {
      const query = `
        SELECT 
          p.wallet_address,
          COUNT(g.id) as bet_count,
          MIN(g.created_at) as first_bet,
          MAX(g.created_at) as last_bet
        FROM games g
        JOIN players p ON g.player_id = p.id
        WHERE g.created_at >= NOW() - INTERVAL '1 minute'
        GROUP BY p.wallet_address, p.id
        HAVING COUNT(g.id) > $1
      `;

      const result = await this.pool.query(query, [this.alertThresholds.maxBetsPerMinute]);

      for (const player of result.rows) {
        await this.createAlert({
          title: 'Rapid Betting Detected',
          description: `Player ${player.wallet_address} placed ${player.bet_count} bets in 1 minute`,
          severity: player.bet_count > this.alertThresholds.maxBetsPerMinute * 2 ? 'high' : 'medium',
          playerId: player.wallet_address,
          metadata: {
            betCount: player.bet_count,
            timeframe: '1 minute'
          }
        });
      }

    } catch (error) {
      console.error('Error checking rapid betting:', error);
    }
  }

  async checkSuspiciousWinRates() {
    try {
      const query = `
        SELECT 
          p.wallet_address,
          COUNT(g.id) as total_games,
          COUNT(CASE WHEN g.payout_amount > 0 THEN 1 END) as wins,
          COUNT(CASE WHEN g.payout_amount > 0 THEN 1 END) * 100.0 / COUNT(g.id) as win_rate,
          SUM(g.bet_amount) as total_wagered,
          SUM(g.payout_amount) as total_won
        FROM games g
        JOIN players p ON g.player_id = p.id
        WHERE g.created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY p.wallet_address, p.id
        HAVING COUNT(g.id) >= 20
        AND COUNT(CASE WHEN g.payout_amount > 0 THEN 1 END) * 100.0 / COUNT(g.id) > $1
      `;

      const result = await this.pool.query(query, [this.alertThresholds.maxWinRatio]);

      for (const player of result.rows) {
        await this.createAlert({
          title: 'Suspicious Win Rate',
          description: `Player ${player.wallet_address} has ${player.win_rate.toFixed(1)}% win rate over ${player.total_games} games`,
          severity: player.win_rate > 90 ? 'critical' : 'high',
          playerId: player.wallet_address,
          metadata: {
            winRate: player.win_rate,
            totalGames: player.total_games,
            totalWagered: player.total_wagered,
            totalWon: player.total_won
          }
        });
      }

    } catch (error) {
      console.error('Error checking win rates:', error);
    }
  }

  async checkDuplicateTransactions() {
    try {
      const query = `
        SELECT 
          tx_hash,
          COUNT(*) as duplicate_count,
          array_agg(DISTINCT player_wallet) as players
        FROM wallet_transactions
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        GROUP BY tx_hash
        HAVING COUNT(*) > 1
      `;

      const result = await this.pool.query(query);

      for (const tx of result.rows) {
        await this.createAlert({
          title: 'Duplicate Transaction Detected',
          description: `Transaction ${tx.tx_hash} appears ${tx.duplicate_count} times`,
          severity: 'high',
          playerId: tx.players[0],
          metadata: {
            txHash: tx.tx_hash,
            duplicateCount: tx.duplicate_count,
            affectedPlayers: tx.players
          }
        });
      }

    } catch (error) {
      console.error('Error checking duplicate transactions:', error);
    }
  }

  async checkUnusualPatterns() {
    try {
      // Check for repeated identical symbol combinations
      const symbolPatternQuery = `
        SELECT 
          p.wallet_address,
          g.symbols,
          COUNT(*) as pattern_count
        FROM games g
        JOIN players p ON g.player_id = p.id
        WHERE g.created_at >= NOW() - INTERVAL '1 hour'
        AND g.payout_amount > 0
        GROUP BY p.wallet_address, g.symbols
        HAVING COUNT(*) >= $1
      `;

      const symbolResult = await this.pool.query(symbolPatternQuery, [this.alertThresholds.suspiciousPatterns.sameSymbolsRepeated]);

      for (const pattern of symbolResult.rows) {
        await this.createAlert({
          title: 'Suspicious Symbol Pattern',
          description: `Player ${pattern.wallet_address} got the same winning symbols ${pattern.pattern_count} times`,
          severity: 'high',
          playerId: pattern.wallet_address,
          metadata: {
            symbols: pattern.symbols,
            occurrences: pattern.pattern_count
          }
        });
      }

      // Check for identical bet amounts
      const betPatternQuery = `
        SELECT 
          p.wallet_address,
          g.bet_amount,
          COUNT(*) as bet_count
        FROM games g
        JOIN players p ON g.player_id = p.id
        WHERE g.created_at >= NOW() - INTERVAL '2 hours'
        GROUP BY p.wallet_address, g.bet_amount
        HAVING COUNT(*) >= $1
      `;

      const betResult = await this.pool.query(betPatternQuery, [this.alertThresholds.suspiciousPatterns.identicalBetAmounts]);

      for (const pattern of betResult.rows) {
        await this.createAlert({
          title: 'Repetitive Bet Pattern',
          description: `Player ${pattern.wallet_address} placed ${pattern.bet_count} identical bets of ${pattern.bet_amount} MY`,
          severity: 'medium',
          playerId: pattern.wallet_address,
          metadata: {
            betAmount: pattern.bet_amount,
            repetitions: pattern.bet_count
          }
        });
      }

    } catch (error) {
      console.error('Error checking unusual patterns:', error);
    }
  }

  async createAlert(alertData) {
    try {
      // Check if similar alert already exists
      const existingQuery = `
        SELECT id FROM security_alerts 
        WHERE title = $1 
        AND player_id = $2 
        AND created_at >= NOW() - INTERVAL '1 hour'
        AND status != 'resolved'
      `;

      const existing = await this.pool.query(existingQuery, [alertData.title, alertData.playerId]);

      if (existing.rows.length > 0) {
        return; // Don't create duplicate alerts
      }

      const insertQuery = `
        INSERT INTO security_alerts (
          title, description, severity, status, player_id, metadata, created_at
        ) VALUES ($1, $2, $3, 'active', $4, $5, NOW())
        RETURNING id
      `;

      const result = await this.pool.query(insertQuery, [
        alertData.title,
        alertData.description,
        alertData.severity,
        alertData.playerId,
        JSON.stringify(alertData.metadata)
      ]);

      console.log(`🚨 Security alert created: ${alertData.title} (ID: ${result.rows[0].id})`);

      // If critical, could trigger immediate notifications here
      if (alertData.severity === 'critical') {
        await this.handleCriticalAlert(result.rows[0].id, alertData);
      }

    } catch (error) {
      console.error('Error creating security alert:', error);
    }
  }

  async handleCriticalAlert(alertId, alertData) {
    console.log(`🔴 CRITICAL ALERT: ${alertData.title}`);
    console.log(`Player: ${alertData.playerId}`);
    console.log(`Description: ${alertData.description}`);
    
    // Here you could:
    // - Send email/SMS notifications
    // - Temporarily suspend player account
    // - Trigger additional monitoring
    // - Log to external security system
  }

  async resolveAlert(alertId, resolution) {
    try {
      const updateQuery = `
        UPDATE security_alerts 
        SET 
          status = 'resolved',
          resolution = $2,
          resolved_at = NOW()
        WHERE id = $1
      `;

      await this.pool.query(updateQuery, [alertId, resolution]);
      console.log(`✅ Security alert ${alertId} resolved`);

    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  async getPlayerRiskScore(playerId) {
    try {
      const query = `
        SELECT 
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) * 10 +
          COUNT(CASE WHEN severity = 'high' THEN 1 END) * 5 +
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) * 2 +
          COUNT(CASE WHEN severity = 'low' THEN 1 END) * 1 as risk_score,
          COUNT(*) as total_alerts
        FROM security_alerts 
        WHERE player_id = $1 
        AND created_at >= NOW() - INTERVAL '30 days'
      `;

      const result = await this.pool.query(query, [playerId]);
      const score = result.rows[0];

      let riskLevel = 'low';
      if (score.risk_score >= 50) riskLevel = 'critical';
      else if (score.risk_score >= 20) riskLevel = 'high';
      else if (score.risk_score >= 10) riskLevel = 'medium';

      return {
        playerId: playerId,
        riskScore: parseInt(score.risk_score) || 0,
        riskLevel: riskLevel,
        totalAlerts: parseInt(score.total_alerts) || 0
      };

    } catch (error) {
      console.error('Error calculating risk score:', error);
      return {
        playerId: playerId,
        riskScore: 0,
        riskLevel: 'unknown',
        totalAlerts: 0
      };
    }
  }

  async close() {
    await this.pool.end();
  }
}

export const securityMonitor = new SecurityMonitor();