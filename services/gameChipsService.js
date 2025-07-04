const { BLOCKCHAIN_CONFIG, BLOCKCHAIN_UTILS } = require('../config/blockchain');
const walletService = require('./walletService');
const fractalBitcoinService = require('./fractalBitcoinService');
const database = require('../config/database');

class GameChipsService {
  constructor() {
    this.pendingDeposits = new Map();
    this.pendingWithdrawals = new Map();
    this.userAccounts = new Map(); // In production, this would be database-backed
    this.transactionHistory = new Map();
  }

  // Initialize or get user account
  async initializeUserAccount(walletAddress) {
    try {
      if (!BLOCKCHAIN_UTILS.isValidFractalAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      let account = this.userAccounts.get(walletAddress);
      
      if (!account) {
        account = {
          walletAddress,
          gameChips: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalWagered: 0,
          totalWon: 0,
          firstDepositBonus: 0,
          isFirstDeposit: true,
          accountCreated: new Date(),
          lastActivity: new Date(),
          accountStatus: 'active',
          loyaltyLevel: 1,
          vipStatus: false
        };
        
        this.userAccounts.set(walletAddress, account);
      }

      return {
        success: true,
        account
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process token deposit to game chips
  async processDeposit(walletAddress, tokenAmount, txHash) {
    try {
      // Validate inputs
      if (!BLOCKCHAIN_UTILS.isValidFractalAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      if (tokenAmount < BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.minDeposit) {
        throw new Error(`Minimum deposit is ${BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.minDeposit} MOONYETIS`);
      }

      if (tokenAmount > BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.maxDeposit) {
        throw new Error(`Maximum deposit is ${BLOCKCHAIN_CONFIG.MOONYETIS_TOKEN.maxDeposit} MOONYETIS`);
      }

      // Verify transaction on blockchain
      const txVerification = await walletService.verifyTransaction(txHash, tokenAmount, walletAddress);
      if (!txVerification.isValid) {
        throw new Error(txVerification.error || 'Transaction verification failed');
      }

      // Check if transaction already processed
      if (this.transactionHistory.has(txHash)) {
        throw new Error('Transaction already processed');
      }

      // Initialize user account
      const accountResult = await this.initializeUserAccount(walletAddress);
      if (!accountResult.success) {
        throw new Error(accountResult.error);
      }

      const account = accountResult.account;

      // Calculate deposit amounts
      const depositFee = Math.ceil(tokenAmount * BLOCKCHAIN_CONFIG.GAME_ECONOMICS.depositFee);
      const netDeposit = tokenAmount - depositFee;
      const gameChips = BLOCKCHAIN_UTILS.tokensToChips(netDeposit);
      
      // Calculate bonuses
      let bonusChips = 0;
      if (account.isFirstDeposit) {
        bonusChips = BLOCKCHAIN_UTILS.calculateDepositBonus(gameChips, true);
        account.isFirstDeposit = false;
        account.firstDepositBonus = bonusChips;
      }

      // Apply loyalty bonus for VIP users
      if (account.vipStatus) {
        bonusChips += Math.floor(gameChips * (BLOCKCHAIN_CONFIG.GAME_ECONOMICS.loyaltyMultiplier - 1));
      }

      // Update account
      account.gameChips += gameChips + bonusChips;
      account.totalDeposited += tokenAmount;
      account.lastActivity = new Date();

      // Record transaction
      const transaction = {
        txHash,
        walletAddress,
        type: 'deposit',
        tokenAmount,
        gameChips: gameChips + bonusChips,
        fee: depositFee,
        bonusChips,
        status: 'completed',
        timestamp: new Date(),
        blockHeight: txVerification.blockHeight
      };

      this.transactionHistory.set(txHash, transaction);
      this.userAccounts.set(walletAddress, account);

      return {
        success: true,
        transaction,
        account: {
          gameChips: account.gameChips,
          totalDeposited: account.totalDeposited,
          bonusReceived: bonusChips
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process chip withdrawal to tokens
  async processWithdrawal(walletAddress, chipAmount, toAddress) {
    try {
      // Validate inputs
      if (!BLOCKCHAIN_UTILS.isValidFractalAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      if (!BLOCKCHAIN_UTILS.isValidFractalAddress(toAddress)) {
        throw new Error('Invalid destination address');
      }

      if (chipAmount < BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minWithdrawal) {
        throw new Error(`Minimum withdrawal is ${BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minWithdrawal} chips`);
      }

      // Get user account
      const account = this.userAccounts.get(walletAddress);
      if (!account) {
        throw new Error('Account not found');
      }

      if (account.gameChips < chipAmount) {
        throw new Error('Insufficient game chips');
      }

      // Calculate withdrawal amounts
      const tokenAmount = BLOCKCHAIN_UTILS.chipsToTokens(chipAmount);
      const withdrawalFee = BLOCKCHAIN_UTILS.calculateWithdrawalFee(tokenAmount);
      const netWithdrawal = tokenAmount - withdrawalFee;

      // Check daily withdrawal limits
      const dailyWithdrawn = await this.getDailyWithdrawalAmount(walletAddress);
      if (dailyWithdrawn + tokenAmount > BLOCKCHAIN_CONFIG.SECURITY.maxDailyWithdrawal) {
        throw new Error('Daily withdrawal limit exceeded');
      }

      // Create withdrawal transaction
      const withdrawalId = BLOCKCHAIN_UTILS.generateTransactionId();
      
      const withdrawal = {
        id: withdrawalId,
        walletAddress,
        toAddress,
        chipAmount,
        tokenAmount: netWithdrawal,
        fee: withdrawalFee,
        status: 'pending',
        requestedAt: new Date(),
        estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };

      // Deduct chips from account (hold in pending)
      account.gameChips -= chipAmount;
      account.lastActivity = new Date();

      // Store pending withdrawal
      this.pendingWithdrawals.set(withdrawalId, withdrawal);
      this.userAccounts.set(walletAddress, account);

      // In production, this would trigger actual BRC-20 transfer
      setTimeout(() => {
        this.completeWithdrawal(withdrawalId);
      }, 5000); // Simulate 5-second processing

      return {
        success: true,
        withdrawal: {
          id: withdrawalId,
          tokenAmount: netWithdrawal,
          fee: withdrawalFee,
          status: 'pending',
          estimatedCompletion: withdrawal.estimatedCompletion
        },
        account: {
          gameChips: account.gameChips
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Complete withdrawal (simulate blockchain transaction)
  async completeWithdrawal(withdrawalId) {
    try {
      const withdrawal = this.pendingWithdrawals.get(withdrawalId);
      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      // Simulate BRC-20 transfer creation
      const transferResult = await walletService.createBRC20Transfer(
        withdrawal.walletAddress,
        withdrawal.tokenAmount,
        withdrawal.toAddress
      );

      if (transferResult.success) {
        withdrawal.status = 'completed';
        withdrawal.completedAt = new Date();
        withdrawal.txHash = 'tx_' + Math.random().toString(36).substr(2, 16);

        // Update account totals
        const account = this.userAccounts.get(withdrawal.walletAddress);
        if (account) {
          account.totalWithdrawn += withdrawal.tokenAmount + withdrawal.fee;
          this.userAccounts.set(withdrawal.walletAddress, account);
        }

        // Record in transaction history
        this.transactionHistory.set(withdrawal.txHash, {
          txHash: withdrawal.txHash,
          walletAddress: withdrawal.walletAddress,
          type: 'withdrawal',
          tokenAmount: withdrawal.tokenAmount,
          gameChips: -withdrawal.chipAmount,
          fee: withdrawal.fee,
          status: 'completed',
          timestamp: withdrawal.completedAt
        });

        this.pendingWithdrawals.set(withdrawalId, withdrawal);
        return { success: true, withdrawal };
      } else {
        // Handle failed withdrawal - return chips to account
        withdrawal.status = 'failed';
        withdrawal.error = transferResult.error;
        
        const account = this.userAccounts.get(withdrawal.walletAddress);
        if (account) {
          account.gameChips += withdrawal.chipAmount; // Return chips
          this.userAccounts.set(withdrawal.walletAddress, account);
        }

        this.pendingWithdrawals.set(withdrawalId, withdrawal);
        return { success: false, error: transferResult.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get account balance and info
  async getAccountInfo(walletAddress) {
    try {
      const account = this.userAccounts.get(walletAddress);
      if (!account) {
        return await this.initializeUserAccount(walletAddress);
      }

      // Get pending transactions
      const pendingDeposits = Array.from(this.pendingDeposits.values())
        .filter(d => d.walletAddress === walletAddress);
      
      const pendingWithdrawals = Array.from(this.pendingWithdrawals.values())
        .filter(w => w.walletAddress === walletAddress && w.status === 'pending');

      // Calculate available balance (excluding pending withdrawals)
      const pendingWithdrawalAmount = pendingWithdrawals.reduce((sum, w) => sum + w.chipAmount, 0);
      const availableChips = account.gameChips;

      return {
        success: true,
        account: {
          walletAddress: account.walletAddress,
          gameChips: account.gameChips,
          availableChips,
          totalDeposited: account.totalDeposited,
          totalWithdrawn: account.totalWithdrawn,
          totalWagered: account.totalWagered,
          totalWon: account.totalWon,
          loyaltyLevel: account.loyaltyLevel,
          vipStatus: account.vipStatus,
          accountCreated: account.accountCreated,
          lastActivity: account.lastActivity
        },
        pending: {
          deposits: pendingDeposits.length,
          withdrawals: pendingWithdrawals.length,
          withdrawalAmount: pendingWithdrawalAmount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Place bet (deduct chips)
  async placeBet(walletAddress, betAmount) {
    try {
      if (!BLOCKCHAIN_UTILS.isValidBet(betAmount)) {
        throw new Error(`Invalid bet amount. Min: ${BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minBet}, Max: ${BLOCKCHAIN_CONFIG.GAME_ECONOMICS.maxBet}`);
      }

      const account = this.userAccounts.get(walletAddress);
      if (!account) {
        throw new Error('Account not found');
      }

      if (account.gameChips < betAmount) {
        throw new Error('Insufficient game chips');
      }

      // Deduct bet amount
      account.gameChips -= betAmount;
      account.totalWagered += betAmount;
      account.lastActivity = new Date();

      this.userAccounts.set(walletAddress, account);

      return {
        success: true,
        remainingChips: account.gameChips,
        totalWagered: account.totalWagered
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Credit winnings (add chips)
  async creditWinnings(walletAddress, winAmount) {
    try {
      const account = this.userAccounts.get(walletAddress);
      if (!account) {
        throw new Error('Account not found');
      }

      account.gameChips += winAmount;
      account.totalWon += winAmount;
      account.lastActivity = new Date();

      // Update loyalty level based on total wagered
      account.loyaltyLevel = Math.floor(account.totalWagered / 1000) + 1;
      account.vipStatus = account.loyaltyLevel >= 10;

      this.userAccounts.set(walletAddress, account);

      return {
        success: true,
        gameChips: account.gameChips,
        totalWon: account.totalWon,
        loyaltyLevel: account.loyaltyLevel
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get transaction history
  async getTransactionHistory(walletAddress, limit = 50) {
    try {
      const transactions = Array.from(this.transactionHistory.values())
        .filter(tx => tx.walletAddress === walletAddress)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      return {
        success: true,
        transactions,
        count: transactions.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get daily withdrawal amount
  async getDailyWithdrawalAmount(walletAddress) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyWithdrawals = Array.from(this.transactionHistory.values())
      .filter(tx => 
        tx.walletAddress === walletAddress &&
        tx.type === 'withdrawal' &&
        tx.timestamp >= today
      );

    return dailyWithdrawals.reduce((sum, tx) => sum + Math.abs(tx.tokenAmount), 0);
  }

  // Get withdrawal status
  async getWithdrawalStatus(withdrawalId) {
    const withdrawal = this.pendingWithdrawals.get(withdrawalId);
    if (!withdrawal) {
      return {
        success: false,
        error: 'Withdrawal not found'
      };
    }

    return {
      success: true,
      withdrawal: {
        id: withdrawal.id,
        status: withdrawal.status,
        tokenAmount: withdrawal.tokenAmount,
        fee: withdrawal.fee,
        requestedAt: withdrawal.requestedAt,
        completedAt: withdrawal.completedAt,
        txHash: withdrawal.txHash,
        error: withdrawal.error
      }
    };
  }

  // Admin functions
  async getSystemStats() {
    const totalAccounts = this.userAccounts.size;
    const totalDeposited = Array.from(this.userAccounts.values())
      .reduce((sum, acc) => sum + acc.totalDeposited, 0);
    const totalWithdrawn = Array.from(this.userAccounts.values())
      .reduce((sum, acc) => sum + acc.totalWithdrawn, 0);
    const totalWagered = Array.from(this.userAccounts.values())
      .reduce((sum, acc) => sum + acc.totalWagered, 0);

    return {
      totalAccounts,
      totalDeposited,
      totalWithdrawn,
      totalWagered,
      netRevenue: totalDeposited - totalWithdrawn,
      pendingWithdrawals: this.pendingWithdrawals.size,
      pendingDeposits: this.pendingDeposits.size
    };
  }
}

// Export singleton instance
module.exports = new GameChipsService();