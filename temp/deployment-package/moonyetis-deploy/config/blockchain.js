const crypto = require('crypto');

const BLOCKCHAIN_CONFIG = {
  // Fractal Bitcoin Network Configuration
  FRACTAL_NETWORK: {
    name: 'Fractal Bitcoin',
    chainId: 'fractal-bitcoin',
    rpcUrl: process.env.FRACTAL_RPC_URL || 'https://fractal-rpc.unisat.io',
    apiUrl: process.env.FRACTAL_API_URL || 'https://fractal-api.unisat.io',
    indexerUrl: process.env.FRACTAL_INDEXER_URL || 'https://fractal-indexer.unisat.io',
    explorerUrl: process.env.FRACTAL_EXPLORER_URL || 'https://fractal.unisat.io',
    networkType: process.env.FRACTAL_NETWORK_TYPE || (process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet')
  },

  // MoonYetis BRC-20 Token Configuration
  MOONYETIS_TOKEN: {
    ticker: 'MOONYETIS',
    decimals: 18,
    minDeposit: 10000, // Minimum 10K MOONYETIS tokens (~$0.001 current)
    maxDeposit: 5000000000, // Maximum 5B MOONYETIS tokens (~$518 current)
    contractAddress: process.env.MOONYETIS_CONTRACT || 'bc1p...',
    deployInscription: process.env.MOONYETIS_DEPLOY_INSCRIPTION || '',
    // Current market rate: 1 MOONYETIS = $0.0000001037 USD
    usdRate: 0.0000001037,
    priceUpdateInterval: 300000 // Update USD rates every 5 minutes
  },

  // Game Economics Configuration - Ultra-Accessible Limits
  GAME_ECONOMICS: {
    rtp: 0.96, // Return to Player 96%
    houseEdge: 0.04, // House Edge 4%
    minBet: 10000, // Minimum 10K MOONYETIS (~$0.001 current, $0.10 if 100x)
    maxBet: 50000000, // Maximum 50M MOONYETIS (~$5.18 current, $518 if 100x)
    maxTotalBet: 250000000, // Maximum total bet 250M MOONYETIS (~$25.9 current)
    defaultBet: 100000, // Default bet 100K MOONYETIS (~$0.01 current, $1 if 100x)
    maxWin: 1000000000, // Maximum win 1B MOONYETIS (~$104 current, $10,370 if 100x)
    jackpotThreshold: 5000000000, // Progressive jackpot 5B MOONYETIS
    
    // Popular bet amounts for UI (ultra-scalable range)
    popularBets: [10000, 50000, 100000, 500000, 1000000, 5000000],
    
    // Chip to Token Conversion (1:1 ratio for simplicity)
    chipToTokenRatio: 1,
    
    // Fees (ultra-low to attract users)
    depositFee: 0, // No deposit fee to attract users
    withdrawalFee: 0.01, // 1% withdrawal fee
    minWithdrawal: 10000, // Minimum 10K MOONYETIS withdrawal
    
    // Bonuses
    firstDepositBonus: 0.20, // 20% first deposit bonus
    loyaltyMultiplier: 1.05 // 5% loyalty bonus for regular players
  },

  // Provably Fair Configuration
  PROVABLY_FAIR: {
    serverSeedLength: 64,
    clientSeedLength: 32,
    nonceStart: 1,
    hashAlgorithm: 'sha256',
    
    // Generate new server seed
    generateServerSeed: () => {
      return crypto.randomBytes(32).toString('hex');
    },
    
    // Generate game result hash
    generateGameHash: (serverSeed, clientSeed, nonce) => {
      const combined = `${serverSeed}:${clientSeed}:${nonce}`;
      return crypto.createHash('sha256').update(combined).digest('hex');
    },
    
    // Convert hash to slot results
    hashToSlotResults: (hash) => {
      const results = [];
      for (let i = 0; i < 15; i++) { // 3x5 slot grid
        const hexPair = hash.substr(i * 2, 2);
        const value = parseInt(hexPair, 16) % 9; // 9 different symbols (0-8)
        results.push(value);
      }
      return results;
    }
  },

  // Security Limits (Conservative for Volatility)
  SECURITY: {
    maxSessionTime: 24 * 60 * 60 * 1000, // 24 hours
    maxDailyDeposit: 5000000000, // ~$518 USD current (~$51,850 if 100x)
    maxDailyWithdrawal: 2000000000, // ~$207 USD current (~$20,740 if 100x)
    maxSingleWin: 1000000000, // ~$104 USD current (~$10,370 if 100x)
    maxConcurrentSessions: 3,
    rateLimitWindow: 60 * 1000, // 1 minute
    rateLimitMax: 100, // 100 requests per minute
    
    // Fraud detection thresholds
    suspiciousWinRate: 0.98, // Flag if win rate > 98%
    suspiciousPlayPattern: 1000, // Flag if > 1000 identical bets
    maxConsecutiveWins: 20 // Flag if > 20 consecutive wins
  },

  // House Wallet Configuration (Scalable)
  HOUSE_WALLET: {
    minBalance: 1000000000, // ~$104 USD current (~$10,370 if 100x)
    targetBalance: 20000000000, // ~$2,074 USD current (~$207,400 if 100x)
    lowBalanceAlert: 2500000000, // ~$259 USD current (~$25,925 if 100x)
    criticalAlert: 1500000000 // ~$155 USD current (~$15,555 if 100x)
  },

  // UI Display Configuration
  UI_FORMATTING: {
    displayFormat: 'abbreviated', // Show "5M MY" instead of "5,000,000"
    showUSDEquivalent: true, // Show USD values in parentheses
    tokenSymbol: 'MY', // Abbreviated token symbol
    priceUpdateInterval: 300000, // Update USD rates every 5 minutes
    usdRate: 0.0000001037 // Current USD rate per MOONYETIS
  },

  // Wallet Integration
  SUPPORTED_WALLETS: {
    unisat: {
      name: 'UniSat Wallet',
      provider: 'unisat',
      icon: '/assets/unisat-icon.png',
      downloadUrl: 'https://unisat.io'
    },
    okx: {
      name: 'OKX Wallet',
      provider: 'okx',
      icon: '/assets/okx-icon.png',
      downloadUrl: 'https://okx.com/web3'
    }
  },

  // Database Configuration References
  DATABASE: {
    connectionTimeout: 30000,
    queryTimeout: 15000,
    maxConnections: 20,
    idleTimeout: 300000
  },

  // Transaction Confirmation Requirements
  CONFIRMATIONS: {
    deposit: 3, // Wait for 3 confirmations for deposits
    withdrawal: 1, // 1 confirmation for withdrawals
    timeout: 30 * 60 * 1000 // 30 minutes timeout
  }
};

// Utility Functions
const BLOCKCHAIN_UTILS = {
  // Validate Fractal Bitcoin address
  isValidFractalAddress: (address) => {
    if (!address || typeof address !== 'string') return false;
    
    // Fractal Bitcoin uses similar address format to Bitcoin
    const fractalRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
    return fractalRegex.test(address);
  },

  // Calculate game chips from MOONYETIS tokens (1:1 ratio now)
  tokensToChips: (tokens) => {
    return Math.floor(tokens * BLOCKCHAIN_CONFIG.GAME_ECONOMICS.chipToTokenRatio);
  },

  // Calculate MOONYETIS tokens from game chips (1:1 ratio now)
  chipsToTokens: (chips) => {
    return chips / BLOCKCHAIN_CONFIG.GAME_ECONOMICS.chipToTokenRatio;
  },

  // Format token amount for display (optimized for edge cases)
  formatTokenAmount: (amount) => {
    if (amount >= 1000000000) {
      return (amount / 1000000000).toFixed(1) + 'B MY';
    } else if (amount >= 1000000) {
      // Handle edge case: 999,500,000 should be "999.5M MY" not "1000M MY"
      const millions = amount / 1000000;
      if (millions >= 999.5) {
        return (amount / 1000000000).toFixed(2) + 'B MY';
      }
      return millions.toFixed(1) + 'M MY';
    } else if (amount >= 1000) {
      // Handle edge case: 999,500 should be "999K MY" not "1000K MY"
      const thousands = amount / 1000;
      if (thousands >= 999.5) {
        return (amount / 1000000).toFixed(2) + 'M MY';
      }
      return thousands.toFixed(0) + 'K MY';
    }
    return amount.toLocaleString() + ' MY';
  },

  // Format USD equivalent (optimized for ultra-micro amounts)
  formatUSDEquivalent: (tokenAmount) => {
    const usdValue = tokenAmount * BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.usdRate;
    
    if (usdValue < 0.0001) {
      // Ultra-micro amounts: show as fractions of cents (‰ = per-mille = 1/1000)
      return ` (~${(usdValue * 10000).toFixed(1)}‰)`;
    } else if (usdValue < 0.001) {
      // Very small amounts: show as 10ths of cents
      return ` (~${(usdValue * 1000).toFixed(1)}₁₀¢)`;
    } else if (usdValue < 0.01) {
      // Small amounts: show as cents with 1 decimal
      return ` (~${(usdValue * 100).toFixed(1)}¢)`;
    } else if (usdValue < 1) {
      // Sub-dollar amounts: show as cents
      return ` (~${(usdValue * 100).toFixed(0)}¢)`;
    }
    return ` (~$${usdValue.toFixed(2)})`;
  },

  // Apply deposit bonus
  calculateDepositBonus: (amount, isFirstDeposit = false) => {
    if (isFirstDeposit) {
      return Math.floor(amount * BLOCKCHAIN_CONFIG.GAME_ECONOMICS.firstDepositBonus);
    }
    return 0;
  },

  // Calculate withdrawal fee
  calculateWithdrawalFee: (amount) => {
    return Math.ceil(amount * BLOCKCHAIN_CONFIG.GAME_ECONOMICS.withdrawalFee);
  },

  // Generate transaction ID
  generateTransactionId: () => {
    return 'tx_' + crypto.randomBytes(16).toString('hex');
  },

  // Validate bet amount (ultra-accessible limits)
  isValidBet: (betAmount, activeLines = 1) => {
    const { minBet, maxBet, maxTotalBet } = BLOCKCHAIN_CONFIG.GAME_ECONOMICS;
    const totalBet = betAmount * activeLines;
    return betAmount >= minBet && betAmount <= maxBet && totalBet <= maxTotalBet;
  },

  // Get popular bet amounts for UI
  getPopularBets: () => {
    return BLOCKCHAIN_CONFIG.GAME_ECONOMICS.popularBets;
  },

  // Calculate bet step amounts (for bet increment buttons)
  calculateBetSteps: () => {
    // Fixed steps that scale naturally with price
    return BLOCKCHAIN_CONFIG.GAME_ECONOMICS.popularBets;
  },

  // Calculate potential payout based on slot results
  calculatePayout: (betAmount, slotResults) => {
    // Basic slot payout calculation
    const payoutTable = {
      0: 2,   // Cherry - 2x
      1: 3,   // Lemon - 3x
      2: 5,   // Apple - 5x
      3: 8,   // Grape - 8x
      4: 12,  // Watermelon - 12x
      5: 20,  // Bell - 20x
      6: 50,  // Star - 50x
      7: 100, // Seven - 100x
      8: 500  // Diamond - 500x (Jackpot symbol)
    };

    let totalPayout = 0;
    const grid = [];
    
    // Convert flat array to 3x5 grid
    for (let row = 0; row < 3; row++) {
      grid[row] = slotResults.slice(row * 5, (row + 1) * 5);
    }

    // Check for winning combinations (simplified)
    // Check horizontal lines
    for (let row = 0; row < 3; row++) {
      const line = grid[row];
      if (line[0] === line[1] && line[1] === line[2]) {
        const symbol = line[0];
        const multiplier = payoutTable[symbol] || 1;
        totalPayout += betAmount * multiplier;
        
        // Check for 4 or 5 of a kind
        if (line[3] === symbol) {
          totalPayout += betAmount * multiplier * 0.5;
          if (line[4] === symbol) {
            totalPayout += betAmount * multiplier * 0.5;
          }
        }
      }
    }

    // Apply RTP adjustment
    totalPayout = Math.floor(totalPayout * BLOCKCHAIN_CONFIG.GAME_ECONOMICS.rtp);
    
    // Cap maximum win
    return Math.min(totalPayout, BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxWin);
  }
};

module.exports = {
  BLOCKCHAIN_CONFIG,
  BLOCKCHAIN_UTILS
};