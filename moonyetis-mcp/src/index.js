#!/usr/bin/env node

/**
 * MoonYetis Casino MCP Server
 * Fractal Bitcoin Integration for MoonYetis (MY) BRC-20 Tokens
 * 
 * Features:
 * - Real-time casino statistics
 * - Wallet monitoring (UniSat/OKX)
 * - Fractal Bitcoin network integration
 * - Token balance tracking
 * - Player analytics
 * - Security monitoring
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import dotenv from 'dotenv';
import winston from 'winston';
import { casinoStats } from './tools/casino-stats.js';
import { walletMonitor } from './tools/wallet-monitor.js';
import { fractalNetwork } from './tools/fractal-network.js';
import { playerAnalytics } from './tools/player-analytics.js';
import { systemHealth } from './tools/system-health.js';
import { securityMonitor } from './tools/security-monitor.js';

// Load environment variables
dotenv.config();

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'moonyetis-mcp' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class MoonYetisMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'moonyetis-casino',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          logging: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandlers();
    
    logger.info('🎰 MoonYetis Casino MCP Server initialized');
  }

  setupToolHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_casino_stats',
            description: 'Get real-time casino statistics including total players, revenue, and game metrics',
            inputSchema: {
              type: 'object',
              properties: {
                timeframe: {
                  type: 'string',
                  enum: ['1h', '24h', '7d', '30d'],
                  description: 'Time frame for statistics',
                  default: '24h'
                }
              }
            }
          },
          {
            name: 'monitor_wallet_activity',
            description: 'Monitor UniSat/OKX wallet activity and transactions',
            inputSchema: {
              type: 'object',
              properties: {
                wallet_address: {
                  type: 'string',
                  description: 'Wallet address to monitor (optional for all wallets)'
                },
                limit: {
                  type: 'number',
                  description: 'Number of recent transactions to return',
                  default: 10
                }
              }
            }
          },
          {
            name: 'check_fractal_network',
            description: 'Check Fractal Bitcoin network status and health',
            inputSchema: {
              type: 'object',
              properties: {
                include_mempool: {
                  type: 'boolean',
                  description: 'Include mempool information',
                  default: true
                }
              }
            }
          },
          {
            name: 'get_token_balance',
            description: 'Get MoonYetis (MY) BRC-20 token balances',
            inputSchema: {
              type: 'object',
              properties: {
                address: {
                  type: 'string',
                  description: 'Fractal Bitcoin address to check'
                },
                token: {
                  type: 'string',
                  description: 'Token symbol (default: MY)',
                  default: 'MY'
                }
              },
              required: ['address']
            }
          },
          {
            name: 'get_player_stats',
            description: 'Get detailed player statistics and analytics',
            inputSchema: {
              type: 'object',
              properties: {
                player_id: {
                  type: 'string',
                  description: 'Player ID or wallet address'
                },
                include_history: {
                  type: 'boolean',
                  description: 'Include game history',
                  default: false
                }
              },
              required: ['player_id']
            }
          },
          {
            name: 'get_game_history',
            description: 'Get slot machine game history and results',
            inputSchema: {
              type: 'object',
              properties: {
                player_id: {
                  type: 'string',
                  description: 'Filter by player ID (optional)'
                },
                limit: {
                  type: 'number',
                  description: 'Number of games to return',
                  default: 50
                },
                timeframe: {
                  type: 'string',
                  enum: ['1h', '24h', '7d', '30d'],
                  description: 'Time frame for history',
                  default: '24h'
                }
              }
            }
          },
          {
            name: 'monitor_deposits',
            description: 'Monitor and track deposit transactions',
            inputSchema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['pending', 'confirmed', 'failed', 'all'],
                  description: 'Filter by deposit status',
                  default: 'all'
                },
                limit: {
                  type: 'number',
                  description: 'Number of deposits to return',
                  default: 20
                }
              }
            }
          },
          {
            name: 'check_withdrawals',
            description: 'Check withdrawal requests and status',
            inputSchema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['pending', 'processing', 'completed', 'failed', 'all'],
                  description: 'Filter by withdrawal status',
                  default: 'pending'
                },
                limit: {
                  type: 'number',
                  description: 'Number of withdrawals to return',
                  default: 20
                }
              }
            }
          },
          {
            name: 'get_leaderboard',
            description: 'Get casino leaderboard data',
            inputSchema: {
              type: 'object',
              properties: {
                metric: {
                  type: 'string',
                  enum: ['biggest_win', 'total_wagered', 'total_won', 'games_played'],
                  description: 'Leaderboard metric',
                  default: 'biggest_win'
                },
                limit: {
                  type: 'number',
                  description: 'Number of top players to return',
                  default: 10
                }
              }
            }
          },
          {
            name: 'system_health',
            description: 'Check overall system health and performance metrics',
            inputSchema: {
              type: 'object',
              properties: {
                detailed: {
                  type: 'boolean',
                  description: 'Include detailed metrics',
                  default: false
                }
              }
            }
          },
          {
            name: 'security_alerts',
            description: 'Check security alerts and suspicious activity',
            inputSchema: {
              type: 'object',
              properties: {
                severity: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical', 'all'],
                  description: 'Filter by alert severity',
                  default: 'all'
                },
                limit: {
                  type: 'number',
                  description: 'Number of alerts to return',
                  default: 50
                }
              }
            }
          }
        ]
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_casino_stats':
            return await this.handleCasinoStats(args);
          
          case 'monitor_wallet_activity':
            return await this.handleWalletActivity(args);
          
          case 'check_fractal_network':
            return await this.handleFractalNetwork(args);
          
          case 'get_token_balance':
            return await this.handleTokenBalance(args);
          
          case 'get_player_stats':
            return await this.handlePlayerStats(args);
          
          case 'get_game_history':
            return await this.handleGameHistory(args);
          
          case 'monitor_deposits':
            return await this.handleDeposits(args);
          
          case 'check_withdrawals':
            return await this.handleWithdrawals(args);
          
          case 'get_leaderboard':
            return await this.handleLeaderboard(args);
          
          case 'system_health':
            return await this.handleSystemHealth(args);
          
          case 'security_alerts':
            return await this.handleSecurityAlerts(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to execute ${name}: ${error.message}`
        );
      }
    });
  }

  async handleCasinoStats(args) {
    logger.info('🎰 Getting casino statistics', { timeframe: args.timeframe });
    const stats = await casinoStats.getStats(args.timeframe || '24h');
    
    return {
      content: [
        {
          type: 'text',
          text: `🎰 **MoonYetis Casino Statistics (${args.timeframe || '24h'})**

📊 **Overview:**
• Total Players: ${stats.totalPlayers}
• Active Players: ${stats.activePlayers}
• Total Games Played: ${stats.totalGames}
• Total Revenue: ${stats.totalRevenue} MY

💰 **Financial Metrics:**
• Total Wagered: ${stats.totalWagered} MY
• Total Won: ${stats.totalWon} MY
• House Edge: ${stats.houseEdge}%
• Average Bet: ${stats.averageBet} MY

🎮 **Game Performance:**
• Biggest Win: ${stats.biggestWin} MY
• Win Rate: ${stats.winRate}%
• Average RTP: ${stats.rtp}%
• Popular Bet Size: ${stats.popularBetSize} MY

🔗 **Network Activity:**
• Deposits: ${stats.deposits.count} (${stats.deposits.total} MY)
• Withdrawals: ${stats.withdrawals.count} (${stats.withdrawals.total} MY)
• Pending Transactions: ${stats.pendingTransactions}

📈 **Trends:**
• Player Growth: ${stats.playerGrowth > 0 ? '+' : ''}${stats.playerGrowth}%
• Revenue Growth: ${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%`
        }
      ]
    };
  }

  async handleWalletActivity(args) {
    logger.info('🔗 Monitoring wallet activity', { wallet: args.wallet_address });
    const activity = await walletMonitor.getActivity(args.wallet_address, args.limit || 10);
    
    return {
      content: [
        {
          type: 'text',
          text: `🔗 **Wallet Activity Monitor**

${activity.transactions.map(tx => 
  `📝 **Transaction ${tx.id.substring(0, 8)}...**
  • Type: ${tx.type}
  • Amount: ${tx.amount} MY
  • Status: ${tx.status}
  • Time: ${tx.timestamp}
  • From: ${tx.from}
  • To: ${tx.to}`
).join('\n\n')}`
        }
      ]
    };
  }

  async handleFractalNetwork(args) {
    logger.info('⛓️ Checking Fractal Bitcoin network');
    const networkStatus = await fractalNetwork.getStatus(args.include_mempool);
    
    return {
      content: [
        {
          type: 'text',
          text: `⛓️ **Fractal Bitcoin Network Status**

🌐 **Network Health:**
• Status: ${networkStatus.status}
• Block Height: ${networkStatus.blockHeight}
• Network Hashrate: ${networkStatus.hashrate}
• Difficulty: ${networkStatus.difficulty}

⏱️ **Performance:**
• Average Block Time: ${networkStatus.avgBlockTime}s
• Transactions/Block: ${networkStatus.txPerBlock}
• Network Fee Rate: ${networkStatus.feeRate} sat/vB

${args.include_mempool ? `
🔄 **Mempool Info:**
• Pending Transactions: ${networkStatus.mempool.count}
• Total Size: ${networkStatus.mempool.size} MB
• Fee Range: ${networkStatus.mempool.feeRange}
` : ''}

🪙 **MoonYetis Token (MY):**
• Total Supply: ${networkStatus.tokenInfo.totalSupply} MY
• Circulating Supply: ${networkStatus.tokenInfo.circulatingSupply} MY
• Market Cap: ${networkStatus.tokenInfo.marketCap} MY`
        }
      ]
    };
  }

  async handleTokenBalance(args) {
    logger.info('🪙 Getting token balance', { address: args.address });
    const balance = await fractalNetwork.getTokenBalance(args.address, args.token || 'MY');
    
    return {
      content: [
        {
          type: 'text',
          text: `🪙 **Token Balance Report**

📍 **Address:** ${args.address}
🪙 **Token:** ${args.token || 'MY'}

💰 **Balance Details:**
• Available: ${balance.available} MY
• Locked: ${balance.locked} MY
• Total: ${balance.total} MY

📊 **Transaction History:**
• Incoming: ${balance.incoming} MY (${balance.incomingCount} tx)
• Outgoing: ${balance.outgoing} MY (${balance.outgoingCount} tx)
• Last Activity: ${balance.lastActivity}`
        }
      ]
    };
  }

  async handlePlayerStats(args) {
    logger.info('👤 Getting player statistics', { player: args.player_id });
    const stats = await playerAnalytics.getPlayerStats(args.player_id, args.include_history);
    
    return {
      content: [
        {
          type: 'text',
          text: `👤 **Player Statistics**

🆔 **Player:** ${args.player_id}
📅 **Member Since:** ${stats.memberSince}
🎮 **Last Active:** ${stats.lastActive}

🎰 **Gaming Stats:**
• Total Games: ${stats.totalGames}
• Total Wagered: ${stats.totalWagered} MY
• Total Won: ${stats.totalWon} MY
• Net P&L: ${stats.netPnL > 0 ? '+' : ''}${stats.netPnL} MY
• Win Rate: ${stats.winRate}%
• Biggest Win: ${stats.biggestWin} MY

💰 **Financial:**
• Current Balance: ${stats.currentBalance} MY
• Total Deposited: ${stats.totalDeposited} MY
• Total Withdrawn: ${stats.totalwithdrawn} MY

📈 **Activity:**
• Sessions This Week: ${stats.sessionsThisWeek}
• Average Session: ${stats.avgSessionLength}
• Favorite Bet Size: ${stats.favoriteBetSize} MY

${args.include_history ? `
📝 **Recent Games:**
${stats.recentGames.map(game => 
  `• ${game.timestamp}: Bet ${game.bet} MY → ${game.result === 'win' ? 'Won' : 'Lost'} ${game.payout} MY`
).join('\n')}` : ''}`
        }
      ]
    };
  }

  async handleGameHistory(args) {
    logger.info('🎮 Getting game history');
    const history = await playerAnalytics.getGameHistory(args.player_id, args.limit, args.timeframe);
    
    return {
      content: [
        {
          type: 'text',
          text: `🎮 **Game History (${args.timeframe || '24h'})**

📊 **Summary:**
• Total Games: ${history.totalGames}
• Total Wagered: ${history.totalWagered} MY
• Total Won: ${history.totalWon} MY
• Win Rate: ${history.winRate}%

🎰 **Recent Games:**
${history.games.map((game, i) => 
  `${i + 1}. **Game ${game.id}**
   • Player: ${game.player}
   • Bet: ${game.bet} MY | Lines: ${game.lines}
   • Result: ${game.symbols.join(' | ')}
   • ${game.payout > 0 ? `Won: ${game.payout} MY` : 'No win'}
   • Time: ${game.timestamp}`
).join('\n\n')}`
        }
      ]
    };
  }

  async handleDeposits(args) {
    logger.info('💳 Monitoring deposits');
    const deposits = await walletMonitor.getDeposits(args.status, args.limit);
    
    return {
      content: [
        {
          type: 'text',
          text: `💳 **Deposit Monitor**

📊 **Summary:**
• Total Deposits: ${deposits.summary.total}
• Total Amount: ${deposits.summary.amount} MY
• Pending: ${deposits.summary.pending}
• Confirmed: ${deposits.summary.confirmed}

📝 **Recent Deposits:**
${deposits.transactions.map(dep => 
  `• **${dep.txHash.substring(0, 12)}...**
  Amount: ${dep.amount} MY
  Player: ${dep.player}
  Status: ${dep.status}
  Time: ${dep.timestamp}
  Confirmations: ${dep.confirmations}/3`
).join('\n\n')}`
        }
      ]
    };
  }

  async handleWithdrawals(args) {
    logger.info('💸 Checking withdrawals');
    const withdrawals = await walletMonitor.getWithdrawals(args.status, args.limit);
    
    return {
      content: [
        {
          type: 'text',
          text: `💸 **Withdrawal Monitor**

📊 **Summary:**
• Total Withdrawals: ${withdrawals.summary.total}
• Total Amount: ${withdrawals.summary.amount} MY
• Pending: ${withdrawals.summary.pending}
• Processing: ${withdrawals.summary.processing}
• Completed: ${withdrawals.summary.completed}

📝 **Recent Withdrawals:**
${withdrawals.transactions.map(wd => 
  `• **${wd.id}**
  Amount: ${wd.amount} MY
  Player: ${wd.player}
  Address: ${wd.address}
  Status: ${wd.status}
  Time: ${wd.timestamp}
  Fee: ${wd.networkFee} MY`
).join('\n\n')}`
        }
      ]
    };
  }

  async handleLeaderboard(args) {
    logger.info('🏆 Getting leaderboard');
    const leaderboard = await playerAnalytics.getLeaderboard(args.metric, args.limit);
    
    return {
      content: [
        {
          type: 'text',
          text: `🏆 **MoonYetis Casino Leaderboard**
**Metric:** ${args.metric} | **Top ${args.limit}**

${leaderboard.map((player, i) => {
  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
  return `${medal} **${player.name}**
   ${args.metric}: ${player.value} MY
   Games: ${player.games} | Win Rate: ${player.winRate}%`;
}).join('\n\n')}`
        }
      ]
    };
  }

  async handleSystemHealth(args) {
    logger.info('🔧 Checking system health');
    const health = await systemHealth.getStatus(args.detailed);
    
    return {
      content: [
        {
          type: 'text',
          text: `🔧 **System Health Report**

🌐 **Overall Status:** ${health.status}

🖥️ **Server Performance:**
• CPU Usage: ${health.cpu}%
• Memory Usage: ${health.memory}%
• Disk Usage: ${health.disk}%
• Uptime: ${health.uptime}

🗄️ **Database:**
• Status: ${health.database.status}
• Connections: ${health.database.connections}/${health.database.maxConnections}
• Query Response: ${health.database.responseTime}ms

🔗 **Network:**
• Fractal Network: ${health.network.fractal}
• UniSat API: ${health.network.unisat}
• OKX API: ${health.network.okx}

${args.detailed ? `
📊 **Detailed Metrics:**
• Active Sessions: ${health.detailed.activeSessions}
• Requests/min: ${health.detailed.requestsPerMinute}
• Error Rate: ${health.detailed.errorRate}%
• Cache Hit Rate: ${health.detailed.cacheHitRate}%
` : ''}`
        }
      ]
    };
  }

  async handleSecurityAlerts(args) {
    logger.info('🚨 Checking security alerts');
    const alerts = await securityMonitor.getAlerts(args.severity, args.limit);
    
    return {
      content: [
        {
          type: 'text',
          text: `🚨 **Security Alerts**

📊 **Summary:**
• Total Active Alerts: ${alerts.summary.total}
• Critical: ${alerts.summary.critical}
• High: ${alerts.summary.high}
• Medium: ${alerts.summary.medium}
• Low: ${alerts.summary.low}

🔒 **Recent Alerts:**
${alerts.alerts.map(alert => {
  const icon = alert.severity === 'critical' ? '🔴' : 
               alert.severity === 'high' ? '🟠' : 
               alert.severity === 'medium' ? '🟡' : '🟢';
  return `${icon} **${alert.title}**
  Severity: ${alert.severity}
  Time: ${alert.timestamp}
  Details: ${alert.description}
  Status: ${alert.status}`;
}).join('\n\n')}`
        }
      ]
    };
  }

  setupErrorHandlers() {
    process.on('SIGINT', async () => {
      logger.info('🛑 Shutting down MoonYetis MCP Server...');
      await this.server.close();
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('🚀 MoonYetis Casino MCP Server started successfully!');
    logger.info('🎰 Ready to handle casino operations on Fractal Bitcoin');
  }
}

// Start the server
const server = new MoonYetisMCPServer();
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});