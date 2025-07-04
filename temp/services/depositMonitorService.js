const fractalBitcoinService = require('./fractalBitcoinService');
const database = require('../config/database');
const { BLOCKCHAIN_CONFIG, BLOCKCHAIN_UTILS } = require('../config/blockchain');
const webSocketService = require('./webSocketService');

class DepositMonitorService {
    constructor() {
        this.activeMonitors = new Map(); // wallet_address -> monitor_info
        this.depositQueue = [];
        this.isProcessingQueue = false;
        this.monitoringInterval = 30000; // 30 seconds
        
        console.log('🔍 DepositMonitorService initialized');
    }

    // Start monitoring deposits for a wallet address
    async startMonitoring(walletAddress) {
        try {
            if (!BLOCKCHAIN_UTILS.isValidFractalAddress(walletAddress)) {
                throw new Error('Invalid wallet address');
            }

            // Check if already monitoring
            if (this.activeMonitors.has(walletAddress)) {
                return {
                    success: true,
                    message: 'Already monitoring this address',
                    address: walletAddress
                };
            }

            console.log(`🔍 Starting deposit monitoring for ${walletAddress}`);

            // Create monitor using FractalBitcoinService
            const monitor = await fractalBitcoinService.monitorAddressForDeposits(
                walletAddress,
                'MOONYETIS',
                (depositData) => this.handleDepositDetected(depositData)
            );

            // Store monitor info
            this.activeMonitors.set(walletAddress, {
                monitor,
                startedAt: new Date(),
                address: walletAddress,
                depositsDetected: 0
            });

            return {
                success: true,
                message: 'Deposit monitoring started',
                address: walletAddress
            };

        } catch (error) {
            console.error(`Error starting deposit monitoring for ${walletAddress}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Stop monitoring deposits for a wallet address
    async stopMonitoring(walletAddress) {
        try {
            const monitorInfo = this.activeMonitors.get(walletAddress);
            
            if (!monitorInfo) {
                return {
                    success: true,
                    message: 'Address was not being monitored'
                };
            }

            // Stop the monitor
            if (monitorInfo.monitor && monitorInfo.monitor.stop) {
                monitorInfo.monitor.stop();
            }

            // Remove from active monitors
            this.activeMonitors.delete(walletAddress);

            console.log(`⏹️ Stopped deposit monitoring for ${walletAddress}`);

            return {
                success: true,
                message: 'Deposit monitoring stopped',
                address: walletAddress
            };

        } catch (error) {
            console.error(`Error stopping deposit monitoring for ${walletAddress}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Handle detected deposit
    async handleDepositDetected(depositData) {
        try {
            console.log(`💰 Deposit detected:`, depositData);

            // Add to processing queue
            this.depositQueue.push({
                ...depositData,
                detectedAt: new Date(),
                status: 'pending',
                id: this.generateDepositId()
            });

            // Update monitor stats
            const monitorInfo = this.activeMonitors.get(depositData.address);
            if (monitorInfo) {
                monitorInfo.depositsDetected++;
            }

            // Process queue if not already processing
            if (!this.isProcessingQueue) {
                this.processDepositQueue();
            }

        } catch (error) {
            console.error('Error handling detected deposit:', error.message);
        }
    }

    // Process deposit queue
    async processDepositQueue() {
        if (this.isProcessingQueue) return;
        
        this.isProcessingQueue = true;
        console.log(`🔄 Processing deposit queue (${this.depositQueue.length} items)`);

        try {
            while (this.depositQueue.length > 0) {
                const deposit = this.depositQueue.shift();
                await this.processDeposit(deposit);
                
                // Small delay between processing
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Error processing deposit queue:', error.message);
        } finally {
            this.isProcessingQueue = false;
        }
    }

    // Process individual deposit with progressive confirmations
    async processDeposit(deposit) {
        try {
            console.log(`💳 Processing deposit ${deposit.id} for ${deposit.address}`);

            // Verify the transaction on blockchain
            const verification = await fractalBitcoinService.verifyTransaction(deposit.txid);
            
            if (!verification.success) {
                console.error(`❌ Failed to verify deposit transaction ${deposit.txid}:`, verification.error);
                return;
            }

            const currentConfirmations = verification.confirmations;
            const requiredConfirmations = this.getRequiredConfirmations(deposit.amount);
            const previousConfirmations = deposit.confirmations || 0;

            // Update deposit with new confirmation count
            deposit.confirmations = currentConfirmations;
            deposit.lastUpdated = new Date();

            // Check for confirmation progress and send notifications
            await this.handleConfirmationProgress(deposit, previousConfirmations, currentConfirmations, requiredConfirmations);

            // Check if we have enough confirmations for final processing
            if (currentConfirmations < requiredConfirmations) {
                console.log(`⏳ Deposit ${deposit.id} needs more confirmations (${currentConfirmations}/${requiredConfirmations})`);
                
                // Put back in queue for later processing
                setTimeout(() => {
                    this.depositQueue.push({
                        ...deposit,
                        retryCount: (deposit.retryCount || 0) + 1
                    });
                    
                    if (!this.isProcessingQueue) {
                        this.processDepositQueue();
                    }
                }, 60000); // Retry in 1 minute
                
                return;
            }

            // Check if already processed
            const existingTransaction = await database.getTransaction(deposit.txid);
            if (existingTransaction) {
                console.log(`⚠️ Deposit ${deposit.txid} already processed`);
                return;
            }

            // Calculate game chips from token amount
            const gameChips = BLOCKCHAIN_UTILS.tokensToChips(deposit.amount);
            
            // Calculate deposit bonus (if first deposit)
            const userAccount = await database.getUserAccount(deposit.address);
            const isFirstDeposit = !userAccount || userAccount.is_first_deposit;
            const bonusChips = isFirstDeposit ? 
                BLOCKCHAIN_UTILS.calculateDepositBonus(gameChips, true) : 0;

            const totalChips = gameChips + bonusChips;

            // Start database transaction
            await database.transaction(async (client) => {
                // Insert transaction record
                await database.insertTransaction({
                    txHash: deposit.txid,
                    walletAddress: deposit.address,
                    type: 'deposit',
                    tokenAmount: deposit.amount,
                    gameChips: gameChips,
                    bonusChips: bonusChips,
                    status: 'completed',
                    blockHeight: verification.blockHeight
                });

                // Update or create user account
                await database.createOrUpdateUserAccount({
                    walletAddress: deposit.address,
                    gameChips: (userAccount?.game_chips || 0) + totalChips,
                    totalDeposited: (userAccount?.total_deposited || 0) + deposit.amount,
                    isFirstDeposit: false
                });
            });

            console.log(`✅ Deposit processed successfully: ${deposit.amount} MOONYETIS → ${totalChips} chips (${gameChips} + ${bonusChips} bonus)`);

            // Notify user via WebSocket if connected
            this.notifyDepositComplete(deposit.address, {
                txid: deposit.txid,
                amount: deposit.amount,
                gameChips: gameChips,
                bonusChips: bonusChips,
                totalChips: totalChips
            });

        } catch (error) {
            console.error(`❌ Error processing deposit ${deposit.id}:`, error.message);
            
            // Mark transaction as failed in database
            try {
                await database.insertTransaction({
                    txHash: deposit.txid,
                    walletAddress: deposit.address,
                    type: 'deposit',
                    tokenAmount: deposit.amount,
                    gameChips: 0,
                    bonusChips: 0,
                    status: 'failed'
                });
            } catch (dbError) {
                console.error('Error saving failed transaction:', dbError.message);
            }
        }
    }

    // Generate unique deposit ID
    generateDepositId() {
        return `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get required confirmations based on deposit amount (dynamic security)
    getRequiredConfirmations(amount) {
        // Higher amounts require more confirmations for security
        if (amount >= 10000000) { // 10M+ MOONYETIS (~$1,037+ current)
            return 6; // Maximum security
        } else if (amount >= 1000000) { // 1M+ MOONYETIS (~$103.7+ current)
            return 4; // High security
        } else if (amount >= 100000) { // 100K+ MOONYETIS (~$10.37+ current)
            return 3; // Standard security
        } else {
            return 2; // Fast processing for small amounts
        }
    }

    // Handle confirmation progress and notifications
    async handleConfirmationProgress(deposit, previousConfirmations, currentConfirmations, requiredConfirmations) {
        try {
            // Only send notifications for confirmation increases
            if (currentConfirmations <= previousConfirmations) {
                return;
            }

            console.log(`📈 Confirmation progress for ${deposit.id}: ${currentConfirmations}/${requiredConfirmations}`);

            // Calculate confirmation percentage
            const progressPercentage = Math.min((currentConfirmations / requiredConfirmations) * 100, 100);
            
            // Determine confirmation status
            let status = 'pending';
            let message = '';
            
            if (currentConfirmations >= requiredConfirmations) {
                status = 'confirmed';
                message = `¡Depósito confirmado! ${deposit.amount} MOONYETIS agregados a tu balance.`;
            } else if (currentConfirmations >= requiredConfirmations * 0.75) {
                status = 'nearly_confirmed';
                message = `Casi confirmado: ${currentConfirmations}/${requiredConfirmations} confirmaciones.`;
            } else if (currentConfirmations >= requiredConfirmations * 0.5) {
                status = 'half_confirmed';
                message = `Proceso intermedio: ${currentConfirmations}/${requiredConfirmations} confirmaciones.`;
            } else if (currentConfirmations >= 1) {
                status = 'first_confirmation';
                message = `Primera confirmación recibida: ${currentConfirmations}/${requiredConfirmations}.`;
            }

            // Create confirmation notification
            const confirmationUpdate = {
                type: 'confirmation_progress',
                depositId: deposit.id,
                txid: deposit.txid,
                address: deposit.address,
                amount: deposit.amount,
                confirmations: {
                    current: currentConfirmations,
                    required: requiredConfirmations,
                    percentage: progressPercentage
                },
                status,
                message,
                timestamp: new Date().toISOString(),
                estimatedTimeRemaining: this.estimateRemainingTime(currentConfirmations, requiredConfirmations)
            };

            // Send progressive notification
            await this.sendConfirmationNotification(deposit.address, confirmationUpdate);

            // Log important milestones
            if (currentConfirmations === 1) {
                console.log(`🎯 First confirmation for deposit ${deposit.id}`);
            } else if (currentConfirmations === Math.ceil(requiredConfirmations / 2)) {
                console.log(`🎯 Halfway confirmed for deposit ${deposit.id}`);
            } else if (currentConfirmations === requiredConfirmations - 1) {
                console.log(`🎯 Almost confirmed for deposit ${deposit.id}`);
            } else if (currentConfirmations >= requiredConfirmations) {
                console.log(`🎯 Fully confirmed for deposit ${deposit.id}`);
            }

        } catch (error) {
            console.error('Error handling confirmation progress:', error.message);
        }
    }

    // Estimate remaining time for full confirmation
    estimateRemainingTime(currentConfirmations, requiredConfirmations) {
        const remainingConfirmations = requiredConfirmations - currentConfirmations;
        
        if (remainingConfirmations <= 0) {
            return 'Confirmado';
        }

        // Estimate ~10 minutes per block on Fractal Bitcoin
        const estimatedMinutes = remainingConfirmations * 10;
        
        if (estimatedMinutes < 60) {
            return `~${estimatedMinutes} minutos`;
        } else {
            const hours = Math.floor(estimatedMinutes / 60);
            const minutes = estimatedMinutes % 60;
            return `~${hours}h ${minutes}m`;
        }
    }

    // Send confirmation notification via WebSocket
    async sendConfirmationNotification(walletAddress, confirmationUpdate) {
        try {
            console.log(`📢 Confirmation notification for ${walletAddress}:`, {
                status: confirmationUpdate.status,
                progress: `${confirmationUpdate.confirmations.current}/${confirmationUpdate.confirmations.required}`,
                percentage: `${confirmationUpdate.confirmations.percentage.toFixed(0)}%`,
                message: confirmationUpdate.message
            });

            // Send WebSocket notification for real-time updates
            const notificationSent = webSocketService.sendDepositProgress(walletAddress, confirmationUpdate);
            
            if (notificationSent) {
                console.log(`✅ WebSocket confirmation notification sent to ${walletAddress.slice(0, 8)}...`);
            } else {
                console.log(`⚠️ No WebSocket clients connected for ${walletAddress.slice(0, 8)}...`);
            }

        } catch (error) {
            console.error('Error sending confirmation notification:', error.message);
        }
    }

    // Notify user of deposit completion via WebSocket
    notifyDepositComplete(walletAddress, depositInfo) {
        try {
            console.log(`📢 Notifying ${walletAddress} of deposit completion:`, depositInfo);
            
            // Send WebSocket notification for deposit completion
            const notificationSent = webSocketService.sendDepositComplete(walletAddress, {
                ...depositInfo,
                type: 'deposit_completed',
                message: `¡Depósito completado! ${depositInfo.totalChips} chips agregados a tu balance`,
                timestamp: new Date().toISOString()
            });
            
            // Also send balance update notification
            webSocketService.sendBalanceUpdate(walletAddress, {
                newBalance: depositInfo.totalChips, // This would be the updated total balance
                depositAmount: depositInfo.gameChips,
                bonusAmount: depositInfo.bonusChips,
                totalDeposited: depositInfo.amount,
                timestamp: new Date().toISOString()
            });
            
            if (notificationSent) {
                console.log(`✅ WebSocket deposit completion notification sent to ${walletAddress.slice(0, 8)}...`);
            } else {
                console.log(`⚠️ No WebSocket clients connected for ${walletAddress.slice(0, 8)}...`);
            }
            
        } catch (error) {
            console.error('Error sending deposit notification:', error.message);
        }
    }

    // Get monitoring status for all addresses
    getMonitoringStatus() {
        const status = [];
        
        for (const [address, info] of this.activeMonitors.entries()) {
            status.push({
                address: `${address.slice(0, 8)}...${address.slice(-6)}`,
                startedAt: info.startedAt,
                depositsDetected: info.depositsDetected,
                uptime: Date.now() - info.startedAt.getTime()
            });
        }

        return {
            success: true,
            activeMonitors: status.length,
            queueSize: this.depositQueue.length,
            isProcessingQueue: this.isProcessingQueue,
            monitors: status
        };
    }

    // Get confirmation status for pending deposits
    getPendingDepositsWithConfirmations(walletAddress) {
        const pendingDeposits = this.depositQueue.filter(deposit => 
            deposit.address === walletAddress && deposit.status === 'pending'
        );

        return pendingDeposits.map(deposit => {
            const requiredConfirmations = this.getRequiredConfirmations(deposit.amount);
            const currentConfirmations = deposit.confirmations || 0;
            const progressPercentage = Math.min((currentConfirmations / requiredConfirmations) * 100, 100);

            return {
                id: deposit.id,
                txid: deposit.txid,
                amount: deposit.amount,
                confirmations: {
                    current: currentConfirmations,
                    required: requiredConfirmations,
                    percentage: progressPercentage
                },
                status: this.getConfirmationStatus(currentConfirmations, requiredConfirmations),
                estimatedTimeRemaining: this.estimateRemainingTime(currentConfirmations, requiredConfirmations),
                detectedAt: deposit.detectedAt,
                lastUpdated: deposit.lastUpdated || deposit.detectedAt
            };
        });
    }

    // Get confirmation status for a specific transaction
    async getTransactionConfirmationStatus(txid) {
        try {
            // First check if it's in our pending queue
            const pendingDeposit = this.depositQueue.find(deposit => deposit.txid === txid);
            
            if (pendingDeposit) {
                const requiredConfirmations = this.getRequiredConfirmations(pendingDeposit.amount);
                const currentConfirmations = pendingDeposit.confirmations || 0;
                
                return {
                    success: true,
                    txid,
                    status: 'pending',
                    confirmations: {
                        current: currentConfirmations,
                        required: requiredConfirmations,
                        percentage: Math.min((currentConfirmations / requiredConfirmations) * 100, 100)
                    },
                    estimatedTimeRemaining: this.estimateRemainingTime(currentConfirmations, requiredConfirmations),
                    lastUpdated: pendingDeposit.lastUpdated || pendingDeposit.detectedAt
                };
            }

            // If not in pending queue, check blockchain directly
            const verification = await fractalBitcoinService.verifyTransaction(txid);
            
            if (!verification.success) {
                return {
                    success: false,
                    error: 'Transaction not found or verification failed',
                    txid
                };
            }

            return {
                success: true,
                txid,
                status: verification.status,
                confirmations: {
                    current: verification.confirmations,
                    required: 'unknown', // We don't know the amount without more context
                    percentage: 100 // Assume confirmed if not in pending queue
                },
                blockHeight: verification.blockHeight,
                timestamp: verification.timestamp,
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            console.error(`Error getting confirmation status for ${txid}:`, error.message);
            return {
                success: false,
                error: error.message,
                txid
            };
        }
    }

    // Helper method to get confirmation status string
    getConfirmationStatus(currentConfirmations, requiredConfirmations) {
        if (currentConfirmations >= requiredConfirmations) {
            return 'confirmed';
        } else if (currentConfirmations >= requiredConfirmations * 0.75) {
            return 'nearly_confirmed';
        } else if (currentConfirmations >= requiredConfirmations * 0.5) {
            return 'half_confirmed';
        } else if (currentConfirmations >= 1) {
            return 'first_confirmation';
        } else {
            return 'unconfirmed';
        }
    }

    // Clean up inactive monitors
    async cleanupInactiveMonitors() {
        const now = Date.now();
        const maxInactiveTime = 24 * 60 * 60 * 1000; // 24 hours

        for (const [address, info] of this.activeMonitors.entries()) {
            const inactiveTime = now - info.startedAt.getTime();
            
            if (inactiveTime > maxInactiveTime) {
                console.log(`🧹 Cleaning up inactive monitor for ${address}`);
                await this.stopMonitoring(address);
            }
        }
    }

    // Shutdown all monitors
    async shutdown() {
        console.log('🛑 Shutting down DepositMonitorService...');
        
        const addresses = Array.from(this.activeMonitors.keys());
        for (const address of addresses) {
            await this.stopMonitoring(address);
        }
        
        console.log('✅ DepositMonitorService shutdown complete');
    }
}

// Export singleton instance
module.exports = new DepositMonitorService();