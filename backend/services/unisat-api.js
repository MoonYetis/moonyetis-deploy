const https = require('https');

class UnisatAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'open-api.unisat.io';
        this.network = 'fractal'; // Fractal Bitcoin network
    }

    // Make API request
    async makeRequest(path, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.baseUrl,
                path: path,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsed);
                        } else {
                            reject(new Error(`API Error: ${parsed.msg || 'Unknown error'}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    // Get BRC-20 token info including price
    async getBRC20TokenInfo(ticker) {
        try {
            const path = `/v1/indexer/brc20/${this.network}/ticker/${ticker}/info`;
            const response = await this.makeRequest(path);
            return response.data;
        } catch (error) {
            console.error(`Failed to get BRC-20 token info for ${ticker}:`, error);
            throw error;
        }
    }

    // Get current BTC/USD price
    async getBTCPrice() {
        try {
            // UniSat doesn't provide direct BTC/USD price, so we'll use a different approach
            // For now, return a default value or integrate with another price API
            return 65000; // Default BTC price in USD
        } catch (error) {
            console.error('Failed to get BTC price:', error);
            return 65000; // Fallback price
        }
    }

    // Get Fractal Bitcoin price (estimated based on BTC)
    async getFractalBitcoinPrice() {
        try {
            // Fractal Bitcoin price is typically a fraction of BTC
            // This is a simplified calculation - adjust based on actual market data
            const btcPrice = await this.getBTCPrice();
            return btcPrice * 0.8; // Example: FB is 80% of BTC price
        } catch (error) {
            console.error('Failed to get Fractal Bitcoin price:', error);
            return 52000; // Fallback price
        }
    }

    // Get address balance
    async getAddressBalance(address) {
        try {
            const path = `/v1/indexer/address/${this.network}/${address}/balance`;
            const response = await this.makeRequest(path);
            return response.data;
        } catch (error) {
            console.error(`Failed to get address balance for ${address}:`, error);
            throw error;
        }
    }

    // Get BRC-20 token balance for address
    async getBRC20Balance(address, ticker) {
        try {
            const path = `/v1/indexer/brc20/${this.network}/address/${address}/ticker/${ticker}/info`;
            const response = await this.makeRequest(path);
            return response.data;
        } catch (error) {
            console.error(`Failed to get BRC-20 balance for ${address}:`, error);
            throw error;
        }
    }

    // Get address transactions
    async getAddressTransactions(address, cursor = 0, size = 10) {
        try {
            const path = `/v1/indexer/address/${this.network}/${address}/history?cursor=${cursor}&size=${size}`;
            const response = await this.makeRequest(path);
            return response.data;
        } catch (error) {
            console.error(`Failed to get transactions for ${address}:`, error);
            throw error;
        }
    }

    // Get transaction details
    async getTransaction(txid) {
        try {
            const path = `/v1/indexer/tx/${this.network}/${txid}`;
            const response = await this.makeRequest(path);
            return response.data;
        } catch (error) {
            console.error(`Failed to get transaction ${txid}:`, error);
            throw error;
        }
    }

    // Get BRC-20 transfer events for address
    async getBRC20Transfers(address, ticker, start = 0, limit = 10) {
        try {
            const path = `/v1/indexer/brc20/${this.network}/address/${address}/ticker/${ticker}/history?start=${start}&limit=${limit}`;
            const response = await this.makeRequest(path);
            return response.data;
        } catch (error) {
            console.error(`Failed to get BRC-20 transfers for ${address}:`, error);
            throw error;
        }
    }

    // Monitor incoming transactions to address
    async monitorIncomingTransactions(address, lastCheckedHeight = 0) {
        try {
            const transactions = await this.getAddressTransactions(address, 0, 20);
            const newTransactions = transactions.filter(tx => {
                return tx.height > lastCheckedHeight && 
                       tx.outputs.some(output => output.address === address);
            });
            
            return {
                transactions: newTransactions,
                lastHeight: transactions[0]?.height || lastCheckedHeight
            };
        } catch (error) {
            console.error('Failed to monitor transactions:', error);
            return { transactions: [], lastHeight: lastCheckedHeight };
        }
    }

    // Check if transaction is confirmed
    async isTransactionConfirmed(txid, requiredConfirmations = 1) {
        try {
            const tx = await this.getTransaction(txid);
            if (!tx || !tx.height) {
                return { confirmed: false, confirmations: 0 };
            }

            // Get current block height
            const path = `/v1/indexer/blockchain/${this.network}/info`;
            const blockchainInfo = await this.makeRequest(path);
            const currentHeight = blockchainInfo.data.height;
            
            const confirmations = currentHeight - tx.height + 1;
            
            return {
                confirmed: confirmations >= requiredConfirmations,
                confirmations: confirmations,
                txid: txid,
                amount: tx.outputs.reduce((sum, out) => sum + out.value, 0)
            };
        } catch (error) {
            console.error(`Failed to check transaction confirmation for ${txid}:`, error);
            return { confirmed: false, confirmations: 0, error: error.message };
        }
    }
}

module.exports = UnisatAPI;