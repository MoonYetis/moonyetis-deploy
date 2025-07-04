const fractalBitcoinService = require('./fractalBitcoinService');
const database = require('../config/database');
const { BLOCKCHAIN_CONFIG, BLOCKCHAIN_UTILS } = require('../config/blockchain');

class WithdrawalService {
    constructor() {
        this.pendingWithdrawals = new Map(); // withdrawal_id -> withdrawal_info
        this.processingQueue = [];
        this.isProcessingQueue = false;
        this.dailyLimits = new Map(); // wallet_address -> { amount: number, date: string }
        
        console.log('💰 WithdrawalService initialized');
        
        // Process queue every 30 seconds
        setInterval(() => {
            if (!this.isProcessingQueue && this.processingQueue.length > 0) {
                this.processWithdrawalQueue();
            }
        }, 30000);
    }

    // Request withdrawal
    async requestWithdrawal(walletAddress, chipAmount, toAddress = null) {
        try {
            // Validate inputs
            if (!BLOCKCHAIN_UTILS.isValidFractalAddress(walletAddress)) {
                throw new Error('Invalid wallet address');
            }

            if (!chipAmount || chipAmount <= 0) {
                throw new Error('Invalid withdrawal amount');
            }

            if (chipAmount < BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minWithdrawal) {
                throw new Error(`Minimum withdrawal is ${BLOCKCHAIN_CONFIG.GAME_ECONOMICS.minWithdrawal} chips`);
            }

            // Use connected wallet address if no specific address provided
            const withdrawalAddress = toAddress || walletAddress;
            
            if (!BLOCKCHAIN_UTILS.isValidFractalAddress(withdrawalAddress)) {
                throw new Error('Invalid withdrawal address');
            }

            // Get user account
            const userAccount = await database.getUserAccount(walletAddress);
            if (!userAccount) {
                throw new Error('User account not found');
            }

            // Check if user has sufficient balance
            if (userAccount.game_chips < chipAmount) {
                throw new Error('Insufficient balance');
            }

            // Check daily withdrawal limits
            const dailyLimit = await this.checkDailyLimit(walletAddress, chipAmount);
            if (!dailyLimit.allowed) {
                throw new Error(dailyLimit.reason);
            }

            // Calculate token amount and fees
            const tokenAmount = BLOCKCHAIN_UTILS.chipsToTokens(chipAmount);
            const withdrawalFee = BLOCKCHAIN_UTILS.calculateWithdrawalFee(tokenAmount);
            const netTokenAmount = tokenAmount - withdrawalFee;

            if (netTokenAmount <= 0) {
                throw new Error('Withdrawal amount too small after fees');
            }

            // Generate withdrawal ID
            const withdrawalId = this.generateWithdrawalId();

            // Create withdrawal record
            const withdrawal = {
                id: withdrawalId,
                walletAddress,
                withdrawalAddress,
                chipAmount,
                tokenAmount,
                withdrawalFee,
                netTokenAmount,
                status: 'pending',
                requestedAt: new Date(),
                securityChecks: {
                    addressValidation: true,
                    balanceCheck: true,
                    dailyLimit: true,
                    fraudCheck: await this.performFraudCheck(walletAddress, chipAmount)
                }
            };

            // Additional security checks
            if (!withdrawal.securityChecks.fraudCheck.passed) {
                withdrawal.status = 'flagged';
                withdrawal.flagReason = withdrawal.securityChecks.fraudCheck.reason;
            }

            // Store pending withdrawal
            this.pendingWithdrawals.set(withdrawalId, withdrawal);

            // Deduct chips from user account (hold them)
            await database.updateUserChips(walletAddress, chipAmount, 'subtract');

            // Insert transaction record as pending
            await database.insertTransaction({
                txHash: withdrawalId, // Use withdrawal ID as temporary hash
                walletAddress,
                type: 'withdrawal',
                tokenAmount: netTokenAmount,
                gameChips: chipAmount,
                fee: withdrawalFee,
                status: withdrawal.status
            });

            // Add to processing queue if not flagged
            if (withdrawal.status === 'pending') {
                this.processingQueue.push(withdrawalId);
                
                // Update daily limit tracking
                this.updateDailyLimit(walletAddress, tokenAmount);
            }

            console.log(`📤 Withdrawal requested: ${withdrawalId} (${chipAmount} chips → ${netTokenAmount} MOONYETIS)`);

            return {
                success: true,
                withdrawal: {
                    id: withdrawalId,
                    chipAmount,
                    tokenAmount,
                    withdrawalFee,
                    netTokenAmount,
                    status: withdrawal.status,
                    flagReason: withdrawal.flagReason,
                    estimatedProcessingTime: this.getEstimatedProcessingTime(withdrawal.status)
                }
            };

        } catch (error) {
            console.error('Error requesting withdrawal:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Check daily withdrawal limits
    async checkDailyLimit(walletAddress, chipAmount) {
        const today = new Date().toISOString().split('T')[0];
        const tokenAmount = BLOCKCHAIN_UTILS.chipsToTokens(chipAmount);
        
        // Get today's withdrawal amount from database
        const dailyWithdrawal = await database.getUserDailyWithdrawal(walletAddress);
        
        const newTotal = dailyWithdrawal + tokenAmount;
        const maxDaily = BLOCKCHAIN_CONFIG.SECURITY.maxDailyWithdrawal;

        if (newTotal > maxDaily) {
            return {
                allowed: false,
                reason: `Daily withdrawal limit exceeded. Limit: ${maxDaily} MOONYETIS, Already withdrawn: ${dailyWithdrawal}, Requested: ${tokenAmount}`
            };
        }

        return {
            allowed: true,
            remaining: maxDaily - newTotal
        };
    }

    // Update daily limit tracking
    updateDailyLimit(walletAddress, tokenAmount) {
        const today = new Date().toISOString().split('T')[0];
        const current = this.dailyLimits.get(walletAddress) || { amount: 0, date: today };
        
        if (current.date !== today) {
            current.amount = 0;
            current.date = today;
        }
        
        current.amount += tokenAmount;
        this.dailyLimits.set(walletAddress, current);
    }

    // Perform fraud detection checks
    async performFraudCheck(walletAddress, chipAmount) {
        try {
            const checks = {
                passed: true,
                reason: null,
                checks: []
            };

            // Check for suspicious patterns
            const recentWithdrawals = await database.query(`
                SELECT COUNT(*) as count, SUM(game_chips) as total
                FROM transactions 
                WHERE wallet_address = $1 
                AND type = 'withdrawal' 
                AND created_at > NOW() - INTERVAL '1 hour'
            `, [walletAddress]);

            const hourlyData = recentWithdrawals.rows[0];

            // Flag if too many withdrawals in short time
            if (hourlyData.count > 10) {
                checks.passed = false;
                checks.reason = 'Too many withdrawal attempts in short time';
                checks.checks.push('excessive_frequency');
            }

            // Flag if withdrawal amount is unusually high
            const userAccount = await database.getUserAccount(walletAddress);
            if (userAccount && chipAmount > userAccount.total_wagered * 2) {
                checks.passed = false;
                checks.reason = 'Withdrawal amount exceeds reasonable limits';
                checks.checks.push('excessive_amount');
            }

            return checks;

        } catch (error) {
            console.error('Error in fraud check:', error.message);
            return {
                passed: false,
                reason: 'Fraud check failed',
                checks: ['fraud_check_error']
            };
        }
    }

    // Process withdrawal queue
    async processWithdrawalQueue() {
        if (this.isProcessingQueue) return;
        
        this.isProcessingQueue = true;
        console.log(`🔄 Processing withdrawal queue (${this.processingQueue.length} items)`);

        try {
            while (this.processingQueue.length > 0) {
                const withdrawalId = this.processingQueue.shift();
                await this.processWithdrawal(withdrawalId);
                
                // Small delay between processing
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error('Error processing withdrawal queue:', error.message);
        } finally {
            this.isProcessingQueue = false;
        }
    }

    // Process individual withdrawal
    async processWithdrawal(withdrawalId) {
        try {
            const withdrawal = this.pendingWithdrawals.get(withdrawalId);
            
            if (!withdrawal) {
                console.error(`❌ Withdrawal ${withdrawalId} not found`);
                return;
            }

            console.log(`💳 Processing withdrawal ${withdrawalId}`);

            // Check if withdrawal is flagged
            if (withdrawal.status === 'flagged') {
                console.log(`🚩 Withdrawal ${withdrawalId} is flagged for manual review`);
                return;
            }

            // Check house wallet balance
            const houseBalance = await fractalBitcoinService.getHouseWalletBalance();
            
            if (!houseBalance.success || houseBalance.transferable < withdrawal.netTokenAmount) {
                console.error(`❌ Insufficient house wallet balance for withdrawal ${withdrawalId}`);
                
                // Mark withdrawal as failed and refund user
                await this.failWithdrawal(withdrawalId, 'Insufficient house wallet balance');
                return;
            }

            // In a real implementation, this would:
            // 1. Create BRC-20 transfer inscription
            // 2. Sign transaction with house wallet
            // 3. Broadcast to Fractal Bitcoin network
            // 4. Monitor transaction confirmation

            console.log(`📝 Creating BRC-20 transfer for withdrawal ${withdrawalId}`);
            
            // Simulate BRC-20 transfer creation
            const transferResult = await fractalBitcoinService.createBRC20Transfer(
                process.env.HOUSE_WALLET_ADDRESS,
                withdrawal.withdrawalAddress,
                withdrawal.netTokenAmount,
                'MOONYETIS'
            );

            if (!transferResult.success) {
                console.error(`❌ Failed to create transfer for withdrawal ${withdrawalId}:`, transferResult.error);
                await this.failWithdrawal(withdrawalId, transferResult.error);
                return;
            }

            // For demo purposes, generate a mock transaction ID
            const mockTxId = this.generateMockTransactionId();
            
            // Update withdrawal status
            withdrawal.status = 'processing';
            withdrawal.txId = mockTxId;
            withdrawal.processedAt = new Date();

            // Update transaction record
            await database.updateTransactionStatus(withdrawalId, 'processing', {
                blockHeight: null
            });

            console.log(`✅ Withdrawal ${withdrawalId} submitted to network (txid: ${mockTxId})`);

            // In a real implementation, start monitoring the transaction
            // For now, mark as completed after a delay
            setTimeout(async () => {
                await this.completeWithdrawal(withdrawalId, mockTxId);
            }, 60000); // Complete after 1 minute for demo

        } catch (error) {
            console.error(`❌ Error processing withdrawal ${withdrawalId}:`, error.message);
            await this.failWithdrawal(withdrawalId, error.message);
        }
    }

    // Complete withdrawal
    async completeWithdrawal(withdrawalId, txId) {
        try {
            const withdrawal = this.pendingWithdrawals.get(withdrawalId);
            
            if (!withdrawal) {
                console.error(`❌ Withdrawal ${withdrawalId} not found for completion`);
                return;
            }

            // Update withdrawal status
            withdrawal.status = 'completed';
            withdrawal.completedAt = new Date();

            // Update transaction record with real transaction hash
            await database.query(`
                UPDATE transactions 
                SET tx_hash = $1, status = $2, updated_at = NOW()
                WHERE tx_hash = $3
            `, [txId, 'completed', withdrawalId]);

            // Remove from pending withdrawals
            this.pendingWithdrawals.delete(withdrawalId);

            console.log(`✅ Withdrawal completed: ${withdrawalId} (txid: ${txId})`);

            // Notify user via WebSocket
            this.notifyWithdrawalComplete(withdrawal.walletAddress, {
                withdrawalId,
                txId,
                amount: withdrawal.netTokenAmount,
                status: 'completed'
            });

        } catch (error) {
            console.error(`Error completing withdrawal ${withdrawalId}:`, error.message);
        }
    }

    // Fail withdrawal and refund user
    async failWithdrawal(withdrawalId, reason) {
        try {
            const withdrawal = this.pendingWithdrawals.get(withdrawalId);
            
            if (!withdrawal) {
                console.error(`❌ Withdrawal ${withdrawalId} not found for failure`);
                return;
            }

            // Update withdrawal status
            withdrawal.status = 'failed';
            withdrawal.failReason = reason;
            withdrawal.failedAt = new Date();

            // Refund chips to user account
            await database.updateUserChips(withdrawal.walletAddress, withdrawal.chipAmount, 'add');

            // Update transaction record
            await database.updateTransactionStatus(withdrawalId, 'failed');

            // Remove from pending withdrawals
            this.pendingWithdrawals.delete(withdrawalId);

            console.log(`❌ Withdrawal failed and refunded: ${withdrawalId} - ${reason}`);

            // Notify user
            this.notifyWithdrawalFailed(withdrawal.walletAddress, {
                withdrawalId,
                reason,
                refundedAmount: withdrawal.chipAmount
            });

        } catch (error) {
            console.error(`Error failing withdrawal ${withdrawalId}:`, error.message);
        }
    }

    // Get withdrawal status
    async getWithdrawalStatus(withdrawalId) {
        try {
            const withdrawal = this.pendingWithdrawals.get(withdrawalId);
            
            if (withdrawal) {
                return {
                    success: true,
                    withdrawal: {
                        id: withdrawal.id,
                        status: withdrawal.status,
                        chipAmount: withdrawal.chipAmount,
                        netTokenAmount: withdrawal.netTokenAmount,
                        txId: withdrawal.txId,
                        requestedAt: withdrawal.requestedAt,
                        processedAt: withdrawal.processedAt,
                        completedAt: withdrawal.completedAt,
                        failReason: withdrawal.failReason
                    }
                };
            }

            // Check database for completed/old withdrawals
            const dbTransaction = await database.query(`
                SELECT * FROM transactions 
                WHERE tx_hash = $1 OR tx_hash LIKE $2
                ORDER BY created_at DESC 
                LIMIT 1
            `, [withdrawalId, `${withdrawalId}%`]);

            if (dbTransaction.rows.length > 0) {
                const tx = dbTransaction.rows[0];
                return {
                    success: true,
                    withdrawal: {
                        id: withdrawalId,
                        status: tx.status,
                        chipAmount: tx.game_chips,
                        tokenAmount: tx.token_amount,
                        txId: tx.tx_hash !== withdrawalId ? tx.tx_hash : null,
                        completedAt: tx.updated_at
                    }
                };
            }

            return {
                success: false,
                error: 'Withdrawal not found'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate withdrawal ID
    generateWithdrawalId() {
        return `wd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Generate mock transaction ID for demo
    generateMockTransactionId() {
        return Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }

    // Get estimated processing time
    getEstimatedProcessingTime(status) {
        switch (status) {
            case 'pending':
                return '5-15 minutes';
            case 'processing':
                return '10-30 minutes';
            case 'flagged':
                return '24-48 hours (manual review)';
            default:
                return 'Unknown';
        }
    }

    // Notify withdrawal completion
    notifyWithdrawalComplete(walletAddress, withdrawalInfo) {
        try {
            console.log(`📢 Notifying ${walletAddress} of withdrawal completion:`, withdrawalInfo);
            
            // TODO: Integrate with WebSocket server
            
        } catch (error) {
            console.error('Error sending withdrawal notification:', error.message);
        }
    }

    // Notify withdrawal failure
    notifyWithdrawalFailed(walletAddress, failureInfo) {
        try {
            console.log(`📢 Notifying ${walletAddress} of withdrawal failure:`, failureInfo);
            
            // TODO: Integrate with WebSocket server
            
        } catch (error) {
            console.error('Error sending withdrawal failure notification:', error.message);
        }
    }

    // Get withdrawal service status
    getServiceStatus() {
        return {
            success: true,
            pendingWithdrawals: this.pendingWithdrawals.size,
            queueSize: this.processingQueue.length,
            isProcessingQueue: this.isProcessingQueue,
            dailyLimitsTracked: this.dailyLimits.size
        };
    }

    // Shutdown service
    async shutdown() {
        console.log('🛑 Shutting down WithdrawalService...');
        
        // Process remaining queue items
        if (this.processingQueue.length > 0) {
            console.log(`⏳ Processing remaining ${this.processingQueue.length} withdrawals...`);
            await this.processWithdrawalQueue();
        }
        
        console.log('✅ WithdrawalService shutdown complete');
    }
}

// Export singleton instance
module.exports = new WithdrawalService();