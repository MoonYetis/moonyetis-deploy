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
    minDeposit: 100, // Minimum 100 MOONYETIS tokens
    maxDeposit: 1000000, // Maximum 1M MOONYETIS tokens
    contractAddress: process.env.MOONYETIS_CONTRACT || 'bc1p...',
    deployInscription: process.env.MOONYETIS_DEPLOY_INSCRIPTION || ''
  },

  // Game Economics Configuration
  GAME_ECONOMICS: {
    rtp: 0.96, // Return to Player 96%
    houseEdge: 0.04, // House Edge 4%
    minBet: 1, // Minimum 1 chip bet
    maxBet: 1000, // Maximum 1000 chips bet
    maxWin: 50000, // Maximum win per round
    jackpotThreshold: 100000, // Progressive jackpot threshold
    
    // Chip to Token Conversion (1 MOONYETIS = 10 Game Chips)
    chipToTokenRatio: 10,
    
    // Fees
    depositFee: 0.01, // 1% deposit fee
    withdrawalFee: 0.02, // 2% withdrawal fee
    minWithdrawal: 50, // Minimum 50 chips withdrawal
    
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

  // Security Limits
  SECURITY: {
    maxSessionTime: 24 * 60 * 60 * 1000, // 24 hours
    maxDailyDeposit: 10000, // 10k MOONYETIS per day
    maxDailyWithdrawal: 5000, // 5k MOONYETIS per day
    maxConcurrentSessions: 3,
    rateLimitWindow: 60 * 1000, // 1 minute
    rateLimitMax: 100, // 100 requests per minute
    
    // Fraud detection thresholds
    suspiciousWinRate: 0.98, // Flag if win rate > 98%
    suspiciousPlayPattern: 1000, // Flag if > 1000 identical bets
    maxConsecutiveWins: 20 // Flag if > 20 consecutive wins
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

  // Calculate game chips from MOONYETIS tokens
  tokensToChips: (tokens) => {
    return Math.floor(tokens * BLOCKCHAIN_CONFIG.GAME_ECONOMICS.chipToTokenRatio);
  },

  // Calculate MOONYETIS tokens from game chips
  chipsToTokens: (chips) => {
    return chips / BLOCKCHAIN_CONFIG.GAME_ECONOMICS.chipToTokenRatio;
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

  // Validate bet amount
  isValidBet: (betAmount) => {
    const { minBet, maxBet } = BLOCKCHAIN_CONFIG.GAME_ECONOMICS;
    return betAmount >= minBet && betAmount <= maxBet;
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