const UnisatAPI = require('./unisat-api');
const EventEmitter = require('events');

class TransactionMonitor extends EventEmitter {
    constructor(apiKey, paymentAddress, hdWalletService = null, database = null) {
        super();
        this.unisat = new UnisatAPI(apiKey);
        this.paymentAddress = paymentAddress; // Main payment address for store
        this.hdWalletService = hdWalletService;
        this.database = database;
        this.monitoringInterval = null;
        this.lastCheckedHeight = 0;
        this.pendingTransactions = new Map();
        this.confirmedTransactions = new Set();
        this.minConfirmations = 1;
        this.monitoredAddresses = new Map(); // userId -> address mapping
    }

    // Start monitoring transactions
    async startMonitoring(interval = 30000) {
        console.log(`🔍 Starting transaction monitoring`);
        console.log(`📍 Main payment address: ${this.paymentAddress}`);
        
        // Load all user deposit addresses if HD wallet service is available
        if (this.hdWalletService) {
            await this.loadUserDepositAddresses();
        }
        
        this.monitoringInterval = setInterval(async () => {
            await this.checkForNewTransactions();
            await this.checkPendingConfirmations();
            await this.checkUserDepositAddresses();
        }, interval);

        // Initial check
        this.checkForNewTransactions();
        this.checkUserDepositAddresses();
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('🛑 Transaction monitoring stopped');
        }
    }

    // Check for new incoming transactions
    async checkForNewTransactions() {
        try {
            const result = await this.unisat.monitorIncomingTransactions(
                this.paymentAddress, 
                this.lastCheckedHeight
            );

            if (result.transactions.length > 0) {
                console.log(`📨 Found ${result.transactions.length} new transactions`);
                
                for (const tx of result.transactions) {
                    if (!this.confirmedTransactions.has(tx.txid)) {
                        await this.processNewTransaction(tx);
                    }
                }
            }

            this.lastCheckedHeight = result.lastHeight;
        } catch (error) {
            console.error('❌ Error checking for new transactions:', error);
        }
    }

    // Process a new transaction
    async processNewTransaction(tx, targetAddress = null) {
        // Find outputs sent to our address(es)
        const relevantOutputs = tx.outputs.filter(out => {
            if (targetAddress) {
                return out.address === targetAddress;
            }
            return out.address === this.paymentAddress || this.monitoredAddresses.has(out.address);
        });
        
        if (relevantOutputs.length === 0) {
            return;
        }

        const totalAmount = relevantOutputs.reduce((sum, out) => sum + out.value, 0);
        const amountInBTC = totalAmount / 100000000; // Convert satoshis to BTC
        const receivingAddress = relevantOutputs[0].address;

        console.log(`💰 New transaction detected: ${tx.txid}`);
        console.log(`   To address: ${receivingAddress}`);
        console.log(`   Amount: ${amountInBTC} BTC`);
        console.log(`   Confirmations: ${tx.confirmations || 0}`);

        // Check if this is a user deposit
        const userData = this.monitoredAddresses.get(receivingAddress);
        if (userData && this.hdWalletService) {
            // This is a deposit to a user's address
            await this.processUserDeposit(tx, userData, amountInBTC);
        } else {
            // This is a store payment
            // Add to pending transactions
            this.pendingTransactions.set(tx.txid, {
                txid: tx.txid,
                amount: totalAmount,
                amountBTC: amountInBTC,
                height: tx.height,
                confirmations: tx.confirmations || 0,
                timestamp: new Date().toISOString(),
                outputs: relevantOutputs,
                type: 'store_payment'
            });

            // Emit event for new transaction
            this.emit('new-transaction', {
                txid: tx.txid,
                amount: amountInBTC,
                confirmations: tx.confirmations || 0
            });
        }

        // Check if already confirmed
        if (tx.confirmations >= this.minConfirmations) {
            await this.confirmTransaction(tx.txid);
        }
    }

    // Check pending transactions for confirmations
    async checkPendingConfirmations() {
        for (const [txid, txData] of this.pendingTransactions) {
            try {
                const confirmation = await this.unisat.isTransactionConfirmed(
                    txid, 
                    this.minConfirmations
                );

                if (confirmation.confirmed) {
                    await this.confirmTransaction(txid);
                } else if (confirmation.confirmations > txData.confirmations) {
                    // Update confirmation count
                    txData.confirmations = confirmation.confirmations;
                    
                    // Emit progress event
                    this.emit('confirmation-update', {
                        txid: txid,
                        confirmations: confirmation.confirmations,
                        required: this.minConfirmations
                    });
                }
            } catch (error) {
                console.error(`❌ Error checking confirmation for ${txid}:`, error);
            }
        }
    }

    // Confirm a transaction
    async confirmTransaction(txid) {
        const txData = this.pendingTransactions.get(txid);
        
        if (!txData) {
            return;
        }

        console.log(`✅ Transaction confirmed: ${txid}`);
        
        // Move to confirmed set
        this.confirmedTransactions.add(txid);
        this.pendingTransactions.delete(txid);

        // Emit confirmation event
        this.emit('transaction-confirmed', {
            txid: txid,
            amount: txData.amountBTC,
            satoshis: txData.amount,
            timestamp: txData.timestamp
        });
    }

    // Get transaction by txid
    async getTransactionDetails(txid) {
        try {
            return await this.unisat.getTransaction(txid);
        } catch (error) {
            console.error(`Failed to get transaction details for ${txid}:`, error);
            return null;
        }
    }

    // Check if a specific transaction belongs to an order
    async verifyOrderTransaction(orderId, txid, expectedAmount) {
        try {
            const tx = await this.getTransactionDetails(txid);
            
            if (!tx) {
                return { valid: false, error: 'Transaction not found' };
            }

            // Check if transaction sends to our address
            const ourOutputs = tx.outputs.filter(out => out.address === this.paymentAddress);
            
            if (ourOutputs.length === 0) {
                return { valid: false, error: 'Transaction does not send to payment address' };
            }

            // Calculate total amount sent to us
            const totalAmount = ourOutputs.reduce((sum, out) => sum + out.value, 0);
            const amountInBTC = totalAmount / 100000000;

            // Check if amount matches (with small tolerance for fees)
            const tolerance = 0.00001; // 0.00001 BTC tolerance
            const expectedBTC = parseFloat(expectedAmount);
            
            if (Math.abs(amountInBTC - expectedBTC) > tolerance) {
                return { 
                    valid: false, 
                    error: 'Amount mismatch',
                    expected: expectedBTC,
                    actual: amountInBTC
                };
            }

            // Check confirmations
            const confirmation = await this.unisat.isTransactionConfirmed(txid, this.minConfirmations);
            
            return {
                valid: true,
                confirmed: confirmation.confirmed,
                confirmations: confirmation.confirmations,
                amount: amountInBTC,
                txid: txid
            };
        } catch (error) {
            console.error('Error verifying order transaction:', error);
            return { valid: false, error: error.message };
        }
    }

    // Get monitoring status
    getStatus() {
        return {
            monitoring: this.monitoringInterval !== null,
            address: this.paymentAddress,
            lastCheckedHeight: this.lastCheckedHeight,
            pendingCount: this.pendingTransactions.size,
            confirmedCount: this.confirmedTransactions.size,
            minConfirmations: this.minConfirmations,
            monitoredUserAddresses: this.monitoredAddresses.size
        };
    }

    // Set minimum confirmations required
    setMinConfirmations(confirmations) {
        this.minConfirmations = confirmations;
        console.log(`⚙️ Minimum confirmations set to ${confirmations}`);
    }
    
    // Load user deposit addresses from database
    async loadUserDepositAddresses() {
        if (!this.hdWalletService) return;
        
        try {
            const addresses = await this.hdWalletService.getAllDepositAddresses();
            this.monitoredAddresses.clear();
            
            for (const addr of addresses) {
                this.monitoredAddresses.set(addr.deposit_address, {
                    userId: addr.user_id,
                    username: addr.username,
                    email: addr.email
                });
            }
            
            console.log(`📋 Loaded ${this.monitoredAddresses.size} user deposit addresses for monitoring`);
        } catch (error) {
            console.error('❌ Error loading user deposit addresses:', error);
        }
    }
    
    // Check user deposit addresses for new transactions
    async checkUserDepositAddresses() {
        if (!this.hdWalletService || this.monitoredAddresses.size === 0) return;
        
        try {
            // Check each user address for new transactions
            for (const [address, userData] of this.monitoredAddresses) {
                const result = await this.unisat.monitorIncomingTransactions(address, 0);
                
                if (result.transactions.length > 0) {
                    for (const tx of result.transactions) {
                        if (!this.confirmedTransactions.has(tx.txid)) {
                            await this.processNewTransaction(tx, address);
                        }
                    }
                }
                
                // Also check for BRC-20 MY transfers
                await this.checkBRC20Transfers(address, userData);
            }
        } catch (error) {
            console.error('❌ Error checking user deposit addresses:', error);
        }
    }
    
    // Check for BRC-20 MY transfers
    async checkBRC20Transfers(address, userData) {
        try {
            const transfers = await this.unisat.getBRC20Transfers(address, 'MY', 0, 10);
            
            for (const transfer of transfers) {
                if (transfer.type === 'receive' && !this.confirmedTransactions.has(transfer.txid)) {
                    await this.processBRC20Deposit(transfer, userData);
                }
            }
        } catch (error) {
            // BRC-20 API might not be available, that's okay
            if (!error.message.includes('404')) {
                console.error('❌ Error checking BRC-20 transfers:', error);
            }
        }
    }
    
    // Process user FB deposit
    async processUserDeposit(tx, userData, amountBTC) {
        try {
            console.log(`💎 Processing FB deposit for user ${userData.username} (${userData.userId})`);
            
            // Record the deposit
            const depositId = await this.hdWalletService.recordDeposit(
                userData.userId,
                tx.outputs[0].address,
                tx.txid,
                amountBTC.toString(),
                'FB',
                tx.confirmations || 0
            );
            
            if (depositId) {
                // Update user balance if confirmed
                if (tx.confirmations >= this.minConfirmations) {
                    await this.hdWalletService.updateUserBalance(userData.userId, amountBTC, 'FB');
                    
                    // Emit event for confirmed user deposit
                    this.emit('user-deposit-confirmed', {
                        userId: userData.userId,
                        username: userData.username,
                        amount: amountBTC,
                        tokenType: 'FB',
                        txid: tx.txid
                    });
                }
                
                // Add to pending if not confirmed
                if (tx.confirmations < this.minConfirmations) {
                    this.pendingTransactions.set(tx.txid, {
                        txid: tx.txid,
                        userId: userData.userId,
                        amount: amountBTC,
                        tokenType: 'FB',
                        confirmations: tx.confirmations || 0,
                        type: 'user_deposit'
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error processing user deposit:', error);
        }
    }
    
    // Process BRC-20 MY deposit
    async processBRC20Deposit(transfer, userData) {
        try {
            console.log(`🪙 Processing MY deposit for user ${userData.username} (${userData.userId})`);
            
            const amount = parseFloat(transfer.amount);
            
            // Record the deposit
            const depositId = await this.hdWalletService.recordDeposit(
                userData.userId,
                transfer.address,
                transfer.txid,
                amount.toString(),
                'MY',
                transfer.confirmations || 0
            );
            
            if (depositId) {
                // Update user balance if confirmed
                if (transfer.confirmations >= this.minConfirmations) {
                    await this.hdWalletService.updateUserBalance(userData.userId, amount, 'MY');
                    
                    // Emit event for confirmed user deposit
                    this.emit('user-deposit-confirmed', {
                        userId: userData.userId,
                        username: userData.username,
                        amount: amount,
                        tokenType: 'MY',
                        txid: transfer.txid
                    });
                }
                
                // Mark as confirmed
                this.confirmedTransactions.add(transfer.txid);
            }
        } catch (error) {
            console.error('❌ Error processing BRC-20 deposit:', error);
        }
    }
}

module.exports = TransactionMonitor;