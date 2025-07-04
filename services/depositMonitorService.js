const fractalBitcoinService = require('./fractalBitcoinService');
const database = require('../config/database');
const { BLOCKCHAIN_CONFIG, BLOCKCHAIN_UTILS } = require('../config/blockchain');

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

    // Process individual deposit
    async processDeposit(deposit) {
        try {
            console.log(`💳 Processing deposit ${deposit.id} for ${deposit.address}`);

            // Verify the transaction on blockchain
            const verification = await fractalBitcoinService.verifyTransaction(deposit.txid);
            
            if (!verification.success) {
                console.error(`❌ Failed to verify deposit transaction ${deposit.txid}:`, verification.error);
                return;
            }

            // Check if we have enough confirmations
            if (verification.confirmations < BLOCKCHAIN_CONFIG.CONFIRMATIONS.deposit) {
                console.log(`⏳ Deposit ${deposit.id} needs more confirmations (${verification.confirmations}/${BLOCKCHAIN_CONFIG.CONFIRMATIONS.deposit})`);
                
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

    // Notify user of deposit completion (WebSocket integration)
    notifyDepositComplete(walletAddress, depositInfo) {
        try {
            // This would integrate with the WebSocket server
            // For now, just log the notification
            console.log(`📢 Notifying ${walletAddress} of deposit completion:`, depositInfo);
            
            // TODO: Integrate with WebSocket server to send real-time notification
            // const wss = require('../server').wss;
            // if (wss) {
            //     wss.clients.forEach(client => {
            //         if (client.walletAddress === walletAddress) {
            //             client.send(JSON.stringify({
            //                 type: 'deposit_completed',
            //                 data: depositInfo
            //             }));
            //         }
            //     });
            // }
            
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