const UnisatAPI = require('./unisat-api');
const EventEmitter = require('events');

class TransactionMonitor extends EventEmitter {
    constructor(apiKey, paymentAddress) {
        super();
        this.unisat = new UnisatAPI(apiKey);
        this.paymentAddress = paymentAddress;
        this.monitoringInterval = null;
        this.lastCheckedHeight = 0;
        this.pendingTransactions = new Map();
        this.confirmedTransactions = new Set();
        this.minConfirmations = 1;
    }

    // Start monitoring transactions
    startMonitoring(interval = 30000) {
        console.log(`🔍 Starting transaction monitoring for ${this.paymentAddress}`);
        
        this.monitoringInterval = setInterval(async () => {
            await this.checkForNewTransactions();
            await this.checkPendingConfirmations();
        }, interval);

        // Initial check
        this.checkForNewTransactions();
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
    async processNewTransaction(tx) {
        // Find outputs sent to our address
        const relevantOutputs = tx.outputs.filter(out => out.address === this.paymentAddress);
        
        if (relevantOutputs.length === 0) {
            return;
        }

        const totalAmount = relevantOutputs.reduce((sum, out) => sum + out.value, 0);
        const amountInBTC = totalAmount / 100000000; // Convert satoshis to BTC

        console.log(`💰 New transaction detected: ${tx.txid}`);
        console.log(`   Amount: ${amountInBTC} BTC`);
        console.log(`   Confirmations: ${tx.confirmations || 0}`);

        // Add to pending transactions
        this.pendingTransactions.set(tx.txid, {
            txid: tx.txid,
            amount: totalAmount,
            amountBTC: amountInBTC,
            height: tx.height,
            confirmations: tx.confirmations || 0,
            timestamp: new Date().toISOString(),
            outputs: relevantOutputs
        });

        // Emit event for new transaction
        this.emit('new-transaction', {
            txid: tx.txid,
            amount: amountInBTC,
            confirmations: tx.confirmations || 0
        });

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
            minConfirmations: this.minConfirmations
        };
    }

    // Set minimum confirmations required
    setMinConfirmations(confirmations) {
        this.minConfirmations = confirmations;
        console.log(`⚙️ Minimum confirmations set to ${confirmations}`);
    }
}

module.exports = TransactionMonitor;