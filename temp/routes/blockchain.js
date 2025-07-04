const express = require('express');
const rateLimit = require('express-rate-limit');
const { BLOCKCHAIN_CONFIG, BLOCKCHAIN_UTILS } = require('../config/blockchain');
const walletService = require('../services/walletService');
const gameChipsService = require('../services/gameChipsService');
const gameEngine = require('../services/gameEngine');
const fractalBitcoinService = require('../services/fractalBitcoinService');
const depositMonitorService = require('../services/depositMonitorService');
const withdrawalService = require('../services/withdrawalService');

const router = express.Router();

// Rate limiting middleware
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, error: message },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// General API rate limit
const generalLimit = createRateLimit(
  BLOCKCHAIN_CONFIG.SECURITY.rateLimitWindow,
  BLOCKCHAIN_CONFIG.SECURITY.rateLimitMax,
  'Too many requests'
);

// Strict rate limit for sensitive operations
const strictLimit = createRateLimit(60000, 10, 'Too many attempts');

// Authentication middleware
const authenticateWallet = async (req, res, next) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    const signature = req.headers['x-wallet-signature'];

    if (!walletAddress || !signature) {
      return res.status(401).json({
        success: false,
        error: 'Missing wallet authentication headers'
      });
    }

    const walletStatus = walletService.getWalletStatus(walletAddress);
    if (!walletStatus.connected) {
      return res.status(401).json({
        success: false,
        error: 'Wallet not connected or session expired'
      });
    }

    // Update wallet activity
    walletService.updateWalletActivity(walletAddress);
    req.walletAddress = walletAddress;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// WALLET CONNECTION ENDPOINTS

// Connect wallet
router.post('/wallet/connect', strictLimit, async (req, res) => {
  try {
    const { walletType, address, publicKey, signature, message } = req.body;

    if (!walletType || !address || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required wallet connection data'
      });
    }

    const result = await walletService.connectWallet(walletType, {
      address,
      publicKey,
      signature,
      message
    });

    if (result.success) {
      // Initialize user account
      await gameChipsService.initializeUserAccount(address);
      
      // Start monitoring deposits for this wallet
      await depositMonitorService.startMonitoring(address);
      
      res.json({
        success: true,
        wallet: result.wallet,
        supportedFeatures: result.supportedFeatures,
        depositMonitoring: true
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Wallet connection failed'
    });
  }
});

// Disconnect wallet
router.post('/wallet/disconnect', authenticateWallet, async (req, res) => {
  try {
    // Stop deposit monitoring
    await depositMonitorService.stopMonitoring(req.walletAddress);
    
    const result = walletService.disconnectWallet(req.walletAddress);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Wallet disconnection failed'
    });
  }
});

// Get wallet status
router.get('/wallet/status', authenticateWallet, async (req, res) => {
  try {
    const status = walletService.getWalletStatus(req.walletAddress);
    res.json({
      success: true,
      status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get wallet status'
    });
  }
});

// Get MOONYETIS balance
router.get('/wallet/balance', generalLimit, authenticateWallet, async (req, res) => {
  try {
    const balance = await walletService.getMoonYetisBalance(req.walletAddress);
    res.json(balance);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance'
    });
  }
});

// ACCOUNT MANAGEMENT ENDPOINTS

// Get account info
router.get('/account/info', generalLimit, authenticateWallet, async (req, res) => {
  try {
    const accountInfo = await gameChipsService.getAccountInfo(req.walletAddress);
    res.json(accountInfo);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get account info'
    });
  }
});

// Get transaction history
router.get('/account/transactions', generalLimit, authenticateWallet, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await gameChipsService.getTransactionHistory(req.walletAddress, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction history'
    });
  }
});

// DEPOSIT ENDPOINTS

// Process deposit
router.post('/deposit', strictLimit, authenticateWallet, async (req, res) => {
  try {
    const { tokenAmount, txHash } = req.body;

    if (!tokenAmount || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing token amount or transaction hash'
      });
    }

    if (tokenAmount < BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.minDeposit) {
      return res.status(400).json({
        success: false,
        error: `Minimum deposit is ${BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.minDeposit} MOONYETIS`
      });
    }

    if (tokenAmount > BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.maxDeposit) {
      return res.status(400).json({
        success: false,
        error: `Maximum deposit is ${BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.maxDeposit} MOONYETIS`
      });
    }

    const result = await gameChipsService.processDeposit(req.walletAddress, tokenAmount, txHash);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Deposit processing failed'
    });
  }
});

// WITHDRAWAL ENDPOINTS

// Process withdrawal
router.post('/withdraw', strictLimit, authenticateWallet, async (req, res) => {
  try {
    const { chipAmount, toAddress } = req.body;

    if (!chipAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing chip amount'
      });
    }

    if (chipAmount < BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minWithdrawal) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal is ${BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minWithdrawal} chips`
      });
    }

    // Use new withdrawal service
    const result = await withdrawalService.requestWithdrawal(req.walletAddress, chipAmount, toAddress);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Withdrawal processing failed'
    });
  }
});

// Get withdrawal status
router.get('/withdraw/status/:withdrawalId', generalLimit, authenticateWallet, async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const result = await withdrawalService.getWithdrawalStatus(withdrawalId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get withdrawal status'
    });
  }
});

// Get withdrawal service status
router.get('/withdraw/service-status', generalLimit, authenticateWallet, async (req, res) => {
  try {
    const status = withdrawalService.getServiceStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get withdrawal service status'
    });
  }
});

// GAME ENDPOINTS

// Initialize game session
router.post('/game/session/init', generalLimit, authenticateWallet, async (req, res) => {
  try {
    const { clientSeed } = req.body;
    const result = await gameEngine.initializeGameSession(req.walletAddress, clientSeed);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to initialize game session'
    });
  }
});

// Play slot round - Ultra-Accessible Validation
router.post('/game/play', generalLimit, authenticateWallet, async (req, res) => {
  try {
    const { betAmount, activeLines = 1, clientSeed } = req.body;

    // Validate bet amount using ultra-accessible limits
    if (!betAmount || betAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bet amount'
      });
    }

    // Validate using ultra-accessible limits
    if (!BLOCKCHAIN_UTILS.isValidBet(betAmount, activeLines)) {
      const { minBet, maxBet, maxTotalBet } = BLOCKCHAIN_CONFIG.GAME_ECONOMICS;
      const totalBet = betAmount * activeLines;
      
      if (betAmount < minBet) {
        return res.status(400).json({
          success: false,
          error: `Minimum bet is ${BLOCKCHAIN_UTILS.formatTokenAmount(minBet)} ${BLOCKCHAIN_UTILS.formatUSDEquivalent(minBet)}`
        });
      }
      
      if (betAmount > maxBet) {
        return res.status(400).json({
          success: false,
          error: `Maximum bet is ${BLOCKCHAIN_UTILS.formatTokenAmount(maxBet)} ${BLOCKCHAIN_UTILS.formatUSDEquivalent(maxBet)}`
        });
      }
      
      if (totalBet > maxTotalBet) {
        return res.status(400).json({
          success: false,
          error: `Maximum total bet is ${BLOCKCHAIN_UTILS.formatTokenAmount(maxTotalBet)} ${BLOCKCHAIN_UTILS.formatUSDEquivalent(maxTotalBet)}`
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'Bet amount violates ultra-accessible limits'
      });
    }

    // Check if user has sufficient chips
    const accountInfo = await gameChipsService.getAccountInfo(req.walletAddress);
    if (!accountInfo.success || accountInfo.account.gameChips < betAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient game chips'
      });
    }

    // Place bet (deduct chips)
    const betResult = await gameChipsService.placeBet(req.walletAddress, betAmount);
    if (!betResult.success) {
      return res.status(400).json(betResult);
    }

    // Play game round
    const gameResult = await gameEngine.playSlotRound(req.walletAddress, betAmount, clientSeed);
    if (!gameResult.success) {
      // Refund bet if game failed
      await gameChipsService.creditWinnings(req.walletAddress, betAmount);
      return res.status(500).json(gameResult);
    }

    // Credit winnings if any
    if (gameResult.gameRound.winAmount > 0) {
      await gameChipsService.creditWinnings(req.walletAddress, gameResult.gameRound.winAmount);
    }

    res.json(gameResult);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Game round failed'
    });
  }
});

// End game session
router.post('/game/session/end', generalLimit, authenticateWallet, async (req, res) => {
  try {
    const result = await gameEngine.endGameSession(req.walletAddress);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to end game session'
    });
  }
});

// Get player statistics
router.get('/game/stats', generalLimit, authenticateWallet, async (req, res) => {
  try {
    const result = await gameEngine.getPlayerStats(req.walletAddress);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get player stats'
    });
  }
});

// PROVABLY FAIR ENDPOINTS

// Verify game round
router.get('/provably-fair/verify/:roundId', generalLimit, async (req, res) => {
  try {
    const { roundId } = req.params;
    const result = await gameEngine.verifyGameRound(roundId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to verify game round'
    });
  }
});

// Get provably fair configuration
router.get('/provably-fair/config', generalLimit, async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        serverSeedLength: BLOCKCHAIN_CONFIG.PROVABLY_FAIR.serverSeedLength,
        clientSeedLength: BLOCKCHAIN_CONFIG.PROVABLY_FAIR.clientSeedLength,
        hashAlgorithm: BLOCKCHAIN_CONFIG.PROVABLY_FAIR.hashAlgorithm,
        nonceStart: BLOCKCHAIN_CONFIG.PROVABLY_FAIR.nonceStart
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get provably fair config'
    });
  }
});

// SYSTEM INFO ENDPOINTS

// Get system configuration
router.get('/config', generalLimit, async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        network: BLOCKCHAIN_CONFIG.FRACTAL_NETWORK.name,
        token: {
          ticker: BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.ticker,
          minDeposit: BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.minDeposit,
          maxDeposit: BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.maxDeposit
        },
        game: {
          rtp: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.rtp,
          houseEdge: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.houseEdge,
          minBet: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet,
          maxBet: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxBet,
          maxTotalBet: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxTotalBet,
          defaultBet: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.defaultBet,
          maxWin: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxWin,
          popularBets: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.popularBets,
          chipToTokenRatio: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.chipToTokenRatio
        },
        ultraAccessible: {
          minBetUSD: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate,
          maxBetUSD: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate,
          defaultBetUSD: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.defaultBet * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate,
          usdRate: BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate,
          popularBetsFormatted: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.popularBets.map(bet => ({
            amount: bet,
            formatted: BLOCKCHAIN_UTILS.formatTokenAmount(bet),
            usd: BLOCKCHAIN_UTILS.formatUSDEquivalent(bet)
          }))
        },
        fees: {
          depositFee: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.depositFee,
          withdrawalFee: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.withdrawalFee,
          minWithdrawal: BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minWithdrawal
        },
        deposit: {
          houseWallet: process.env.HOUSE_WALLET_ADDRESS || "bc1pnhnqmuhx9xtqd8naa9wa60ur2n5fv9emjpcethzdwn8kzkx4gv4sf7xkr5",
          qrCode: "/assets/deposits/house-wallet-qr.png"
        },
        supportedWallets: BLOCKCHAIN_CONFIG.SUPPORTED_WALLETS
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system config'
    });
  }
});

// Get transaction fees
router.get('/fees/estimate', generalLimit, async (req, res) => {
  try {
    const { amount, priority } = req.query;
    const result = await walletService.estimateTransactionFee(
      parseFloat(amount) || 100,
      priority || 'normal'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to estimate fees'
    });
  }
});

// FRACTAL BITCOIN MAINNET ENDPOINTS

// Validate MOONYETIS token
router.get('/token/validate', generalLimit, async (req, res) => {
  try {
    const validation = await fractalBitcoinService.validateMoonYetisToken();
    res.json(validation);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate token'
    });
  }
});

// Get network status and fees
router.get('/network/status', generalLimit, async (req, res) => {
  try {
    const [networkInfo, fees] = await Promise.all([
      fractalBitcoinService.getNetworkInfo(),
      fractalBitcoinService.getNetworkFees()
    ]);

    res.json({
      success: true,
      network: networkInfo,
      fees: fees,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get network status'
    });
  }
});

// Get deposit monitoring status
router.get('/deposits/monitoring', authenticateWallet, async (req, res) => {
  try {
    const status = depositMonitorService.getMonitoringStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get monitoring status'
    });
  }
});

// Manual deposit verification (for troubleshooting)
router.post('/deposits/verify/:txid', strictLimit, authenticateWallet, async (req, res) => {
  try {
    const { txid } = req.params;
    
    if (!txid || txid.length !== 64) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID'
      });
    }

    const verification = await fractalBitcoinService.verifyTransaction(txid, {
      toAddress: req.walletAddress
    });

    res.json(verification);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to verify transaction'
    });
  }
});

// Get BRC-20 transfer history
router.get('/transfers/history', generalLimit, authenticateWallet, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const transfers = await fractalBitcoinService.getBRC20Transfers(req.walletAddress, 'MOONYETIS', limit);
    res.json(transfers);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get transfer history'
    });
  }
});

// Fractal Bitcoin service health check
router.get('/fractal/health', generalLimit, async (req, res) => {
  try {
    const health = await fractalBitcoinService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check Fractal Bitcoin service health'
    });
  }
});

// ADMIN ENDPOINTS (would require admin authentication in production)

// Get system statistics
router.get('/admin/stats', strictLimit, async (req, res) => {
  try {
    // In production, add admin authentication middleware
    const gameStats = await gameEngine.getSystemStats();
    const chipsStats = await gameChipsService.getSystemStats();
    const fractalHealth = await fractalBitcoinService.healthCheck();
    const depositStatus = depositMonitorService.getMonitoringStatus();
    
    res.json({
      success: true,
      stats: {
        game: gameStats,
        chips: chipsStats,
        fractal: fractalHealth,
        deposits: depositStatus,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system stats'
    });
  }
});

// Get house wallet balance (admin only)
router.get('/admin/house-wallet', strictLimit, async (req, res) => {
  try {
    // In production, add admin authentication
    const balance = await fractalBitcoinService.getHouseWalletBalance();
    res.json({
      success: true,
      houseWallet: balance,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get house wallet balance'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Blockchain API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

module.exports = router;