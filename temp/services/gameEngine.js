const { BLOCKCHAIN_CONFIG, BLOCKCHAIN_UTILS } = require('../config/blockchain');
const crypto = require('crypto');

class GameEngine {
  constructor() {
    this.activeGames = new Map();
    this.gameHistory = new Map();
    this.serverSeeds = new Map();
    this.provablyFairStats = new Map();
  }

  // Initialize new game session
  async initializeGameSession(walletAddress, clientSeed = null) {
    try {
      if (!BLOCKCHAIN_UTILS.isValidFractalAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      // Generate server seed
      const serverSeed = BLOCKCHAIN_CONFIG.PROVABLY_FAIR.generateServerSeed();
      const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
      
      // Use provided client seed or generate one
      const finalClientSeed = clientSeed || crypto.randomBytes(16).toString('hex');
      
      const gameSession = {
        walletAddress,
        serverSeed,
        serverSeedHash,
        clientSeed: finalClientSeed,
        nonce: BLOCKCHAIN_CONFIG.PROVABLY_FAIR.nonceStart,
        sessionId: crypto.randomBytes(16).toString('hex'),
        createdAt: new Date(),
        isActive: true,
        roundsPlayed: 0,
        totalWagered: 0,
        totalWon: 0
      };

      this.activeGames.set(walletAddress, gameSession);
      this.serverSeeds.set(gameSession.sessionId, serverSeed);

      return {
        success: true,
        session: {
          sessionId: gameSession.sessionId,
          serverSeedHash,
          clientSeed: finalClientSeed,
          nonce: gameSession.nonce
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Play a single slot round
  async playSlotRound(walletAddress, betAmount, clientSeed = null) {
    try {
      // Validate bet amount
      if (!BLOCKCHAIN_UTILS.isValidBet(betAmount)) {
        throw new Error(`Invalid bet amount. Min: ${BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet}, Max: ${BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxBet}`);
      }

      // Get or create game session
      let gameSession = this.activeGames.get(walletAddress);
      if (!gameSession) {
        const sessionResult = await this.initializeGameSession(walletAddress, clientSeed);
        if (!sessionResult.success) {
          throw new Error(sessionResult.error);
        }
        gameSession = this.activeGames.get(walletAddress);
      }

      // Update client seed if provided
      if (clientSeed && clientSeed !== gameSession.clientSeed) {
        gameSession.clientSeed = clientSeed;
      }

      // Generate provably fair result
      const gameHash = BLOCKCHAIN_CONFIG.PROVABLY_FAIR.generateGameHash(
        gameSession.serverSeed,
        gameSession.clientSeed,
        gameSession.nonce
      );

      // Convert hash to slot results (3x5 grid = 15 symbols)
      const slotResults = BLOCKCHAIN_CONFIG.PROVABLY_FAIR.hashToSlotResults(gameHash);
      
      // Calculate payout using blockchain utils
      const basePayout = BLOCKCHAIN_UTILS.calculatePayout(betAmount, slotResults);
      
      // Apply house edge and RTP
      const finalPayout = this.applyHouseEdge(basePayout, betAmount);
      
      // Apply security limits
      const secureRound = await this.applySecurityLimits(walletAddress, betAmount, finalPayout);
      if (!secureRound.allowed) {
        throw new Error(secureRound.reason);
      }

      // Create game round record
      const gameRound = {
        roundId: crypto.randomBytes(16).toString('hex'),
        walletAddress,
        sessionId: gameSession.sessionId,
        betAmount,
        winAmount: finalPayout,
        slotResults,
        gameHash,
        serverSeed: gameSession.serverSeed,
        clientSeed: gameSession.clientSeed,
        nonce: gameSession.nonce,
        timestamp: new Date(),
        rtp: finalPayout > 0 ? (finalPayout / betAmount) : 0,
        isWin: finalPayout > betAmount,
        multiplier: finalPayout > 0 ? (finalPayout / betAmount) : 0
      };

      // Update game session
      gameSession.nonce += 1;
      gameSession.roundsPlayed += 1;
      gameSession.totalWagered += betAmount;
      gameSession.totalWon += finalPayout;

      // Store game round
      this.gameHistory.set(gameRound.roundId, gameRound);
      this.activeGames.set(walletAddress, gameSession);

      // Update provably fair stats
      this.updateProvablyFairStats(walletAddress, gameRound);

      return {
        success: true,
        gameRound: {
          roundId: gameRound.roundId,
          betAmount,
          winAmount: finalPayout,
          slotResults: this.formatSlotResults(slotResults),
          multiplier: gameRound.multiplier,
          isWin: gameRound.isWin,
          gameHash,
          nonce: gameRound.nonce,
          timestamp: gameRound.timestamp
        },
        provablyFair: {
          serverSeedHash: crypto.createHash('sha256').update(gameSession.serverSeed).digest('hex'),
          clientSeed: gameSession.clientSeed,
          nonce: gameRound.nonce,
          gameHash
        },
        session: {
          roundsPlayed: gameSession.roundsPlayed,
          totalWagered: gameSession.totalWagered,
          totalWon: gameSession.totalWon
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Apply house edge while maintaining RTP
  applyHouseEdge(basePayout, betAmount) {
    if (basePayout === 0) return 0;

    // Apply RTP percentage
    const rtpAdjustedPayout = Math.floor(basePayout * BLOCKCHAIN_CONFIG.GAME_ECONOMICS.rtp);
    
    // Ensure minimum win for small payouts
    if (rtpAdjustedPayout > 0 && rtpAdjustedPayout < betAmount * 0.5) {
      return Math.floor(betAmount * 0.5);
    }

    // Cap maximum win
    return Math.min(rtpAdjustedPayout, BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxWin);
  }

  // Apply security limits and fraud detection
  async applySecurityLimits(walletAddress, betAmount, payout) {
    try {
      const stats = this.provablyFairStats.get(walletAddress) || {
        totalRounds: 0,
        totalWon: 0,
        totalWagered: 0,
        consecutiveWins: 0,
        winRate: 0,
        lastWins: []
      };

      // Check suspicious win rate
      const newWinRate = stats.totalRounds > 0 ? (stats.totalWon + payout) / (stats.totalWagered + betAmount) : 0;
      if (newWinRate > BLOCKCHAIN_CONFIG.SECURITY.suspiciousWinRate && stats.totalRounds > 100) {
        return {
          allowed: false,
          reason: 'Suspicious win rate detected'
        };
      }

      // Check consecutive wins
      const isWin = payout > betAmount;
      const consecutiveWins = isWin ? stats.consecutiveWins + 1 : 0;
      if (consecutiveWins > BLOCKCHAIN_CONFIG.SECURITY.maxConsecutiveWins) {
        return {
          allowed: false,
          reason: 'Maximum consecutive wins reached'
        };
      }

      // Check suspicious play patterns
      const recentWins = stats.lastWins || [];
      if (recentWins.length >= 10) {
        const identicalBets = recentWins.filter(w => w.betAmount === betAmount).length;
        if (identicalBets >= BLOCKCHAIN_CONFIG.SECURITY.suspiciousPlayPattern / 100) {
          return {
            allowed: false,
            reason: 'Suspicious play pattern detected'
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: 'Security check failed'
      };
    }
  }

  // Update provably fair statistics
  updateProvablyFairStats(walletAddress, gameRound) {
    let stats = this.provablyFairStats.get(walletAddress) || {
      totalRounds: 0,
      totalWon: 0,
      totalWagered: 0,
      consecutiveWins: 0,
      winRate: 0,
      lastWins: []
    };

    stats.totalRounds += 1;
    stats.totalWon += gameRound.winAmount;
    stats.totalWagered += gameRound.betAmount;
    stats.winRate = stats.totalWagered > 0 ? stats.totalWon / stats.totalWagered : 0;

    // Update consecutive wins
    if (gameRound.isWin) {
      stats.consecutiveWins += 1;
    } else {
      stats.consecutiveWins = 0;
    }

    // Track last wins for pattern detection
    stats.lastWins = stats.lastWins || [];
    stats.lastWins.push({
      betAmount: gameRound.betAmount,
      winAmount: gameRound.winAmount,
      isWin: gameRound.isWin,
      timestamp: gameRound.timestamp
    });

    // Keep only last 100 rounds
    if (stats.lastWins.length > 100) {
      stats.lastWins = stats.lastWins.slice(-100);
    }

    this.provablyFairStats.set(walletAddress, stats);
  }

  // Format slot results for display (3x5 grid)
  formatSlotResults(flatResults) {
    const symbols = ['🍒', '🍋', '🍎', '🍇', '🍉', '🔔', '⭐', '7️⃣', '💎'];
    const grid = [];
    
    for (let row = 0; row < 3; row++) {
      grid[row] = [];
      for (let col = 0; col < 5; col++) {
        const index = row * 5 + col;
        const symbolIndex = flatResults[index];
        grid[row][col] = {
          symbol: symbols[symbolIndex],
          value: symbolIndex,
          position: { row, col }
        };
      }
    }
    
    return {
      grid,
      flat: flatResults,
      display: grid.map(row => row.map(cell => cell.symbol).join(' ')).join('\n')
    };
  }

  // Verify game round (provably fair verification)
  async verifyGameRound(roundId) {
    try {
      const gameRound = this.gameHistory.get(roundId);
      if (!gameRound) {
        throw new Error('Game round not found');
      }

      // Regenerate game hash
      const verificationHash = BLOCKCHAIN_CONFIG.PROVABLY_FAIR.generateGameHash(
        gameRound.serverSeed,
        gameRound.clientSeed,
        gameRound.nonce
      );

      // Verify hash matches
      const isValid = verificationHash === gameRound.gameHash;

      // Regenerate slot results
      const verificationResults = BLOCKCHAIN_CONFIG.PROVABLY_FAIR.hashToSlotResults(verificationHash);
      const resultsMatch = JSON.stringify(verificationResults) === JSON.stringify(gameRound.slotResults);

      return {
        success: true,
        verification: {
          roundId,
          isValid: isValid && resultsMatch,
          gameHash: verificationHash,
          originalHash: gameRound.gameHash,
          serverSeed: gameRound.serverSeed,
          clientSeed: gameRound.clientSeed,
          nonce: gameRound.nonce,
          slotResults: verificationResults,
          originalResults: gameRound.slotResults,
          hashMatches: isValid,
          resultsMatch
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get game statistics for a player
  async getPlayerStats(walletAddress) {
    try {
      const gameSession = this.activeGames.get(walletAddress);
      const stats = this.provablyFairStats.get(walletAddress) || {
        totalRounds: 0,
        totalWon: 0,
        totalWagered: 0,
        winRate: 0
      };

      const recentRounds = Array.from(this.gameHistory.values())
        .filter(round => round.walletAddress === walletAddress)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      return {
        success: true,
        stats: {
          currentSession: gameSession ? {
            sessionId: gameSession.sessionId,
            roundsPlayed: gameSession.roundsPlayed,
            totalWagered: gameSession.totalWagered,
            totalWon: gameSession.totalWon,
            sessionRTP: gameSession.totalWagered > 0 ? gameSession.totalWon / gameSession.totalWagered : 0
          } : null,
          lifetime: {
            totalRounds: stats.totalRounds,
            totalWagered: stats.totalWagered,
            totalWon: stats.totalWon,
            winRate: stats.winRate,
            rtp: stats.winRate,
            profitLoss: stats.totalWon - stats.totalWagered
          },
          recentRounds: recentRounds.map(round => ({
            roundId: round.roundId,
            betAmount: round.betAmount,
            winAmount: round.winAmount,
            multiplier: round.multiplier,
            isWin: round.isWin,
            timestamp: round.timestamp
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // End game session and reveal server seed
  async endGameSession(walletAddress) {
    try {
      const gameSession = this.activeGames.get(walletAddress);
      if (!gameSession) {
        throw new Error('No active game session');
      }

      gameSession.isActive = false;
      gameSession.endedAt = new Date();

      // Remove from active games
      this.activeGames.delete(walletAddress);

      return {
        success: true,
        session: {
          sessionId: gameSession.sessionId,
          serverSeed: gameSession.serverSeed,
          roundsPlayed: gameSession.roundsPlayed,
          totalWagered: gameSession.totalWagered,
          totalWon: gameSession.totalWon,
          sessionRTP: gameSession.totalWagered > 0 ? gameSession.totalWon / gameSession.totalWagered : 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get system statistics (admin function)
  async getSystemStats() {
    const activeSessions = this.activeGames.size;
    const totalRounds = this.gameHistory.size;
    
    const allRounds = Array.from(this.gameHistory.values());
    const totalWagered = allRounds.reduce((sum, round) => sum + round.betAmount, 0);
    const totalWon = allRounds.reduce((sum, round) => sum + round.winAmount, 0);
    const houseProfit = totalWagered - totalWon;
    const actualRTP = totalWagered > 0 ? totalWon / totalWagered : 0;

    return {
      activeSessions,
      totalRounds,
      totalWagered,
      totalWon,
      houseProfit,
      actualRTP,
      targetRTP: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.rtp,
      houseEdge: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.houseEdge
    };
  }
}

// Export singleton instance
module.exports = new GameEngine();