const https = require('https');

class UnisatAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'open-api-fractal.unisat.io'; // Correct host for Fractal Bitcoin
        this.network = 'fractal'; // Fractal Bitcoin network
        console.log('✅ UniSat API initialized for Fractal Bitcoin with host:', this.baseUrl);
    }

    // Make API request with retry logic
    async makeRequest(path, method = 'GET', data = null, retries = 3) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.baseUrl,
                path: path,
                method: method,
                timeout: 10000, // 10 second timeout
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
                        // Log raw response for debugging
                        if (responseData.length < 2000) {
                            console.log(`🔍 UniSat API Response for ${path}:`, responseData.substring(0, 1000));
                        } else {
                            console.log(`🔍 UniSat API Response for ${path}: [Large response ${responseData.length} chars]`, responseData.substring(0, 500));
                        }
                        
                        // Handle empty responses
                        if (!responseData || responseData.trim() === '') {
                            reject(new Error('Empty response from API'));
                            return;
                        }
                        
                        // Handle HTML error pages (common with rate limiting)
                        if (responseData.startsWith('<') || responseData.includes('<!DOCTYPE')) {
                            console.error('❌ Received HTML response instead of JSON (possibly rate limited)');
                            reject(new Error('API returned HTML response - possibly rate limited'));
                            return;
                        }
                        
                        const parsed = JSON.parse(responseData);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsed);
                        } else {
                            reject(new Error(`API Error (${res.statusCode}): ${parsed.msg || 'Unknown error'}`));
                        }
                    } catch (error) {
                        console.error('❌ JSON Parse Error:', {
                            path: path,
                            statusCode: res.statusCode,
                            responseLength: responseData.length,
                            responseStart: responseData.substring(0, 100),
                            error: error.message
                        });
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                console.error(`❌ Request error for ${path}:`, error.message);
                if (retries > 0) {
                    console.log(`🔄 Retrying request (${retries} attempts left)...`);
                    setTimeout(async () => {
                        try {
                            const result = await this.makeRequest(path, method, data, retries - 1);
                            resolve(result);
                        } catch (retryError) {
                            reject(retryError);
                        }
                    }, 2000); // Wait 2 seconds before retry
                } else {
                    reject(new Error(`Request failed after retries: ${error.message}`));
                }
            });
            
            req.on('timeout', () => {
                req.destroy();
                if (retries > 0) {
                    console.log(`⏰ Request timeout for ${path}, retrying...`);
                    setTimeout(async () => {
                        try {
                            const result = await this.makeRequest(path, method, data, retries - 1);
                            resolve(result);
                        } catch (retryError) {
                            reject(retryError);
                        }
                    }, 2000);
                } else {
                    reject(new Error(`Request timeout after retries`));
                }
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
            const path = `/v1/indexer/brc20/ticker/${ticker}/info`;
            console.log(`🔍 Getting BRC-20 token info for: ${ticker}`);
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
            const path = `/v1/indexer/address/${address}/balance`;
            console.log(`🔍 Getting balance for address: ${address}`);
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
            const path = `/v1/indexer/brc20/address/${address}/ticker/${ticker}/info`;
            console.log(`🔍 Getting BRC-20 ${ticker} balance for address: ${address}`);
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
            const path = `/v1/indexer/address/${address}/history?cursor=${cursor}&size=${size}`;
            console.log(`🔍 Getting transactions for address: ${address.substring(0, 20)}...`);
            const response = await this.makeRequest(path);
            // Return the full response so monitorIncomingTransactions can access .data.detail
            return response;
        } catch (error) {
            console.error(`Failed to get transactions for ${address}:`, error);
            throw error;
        }
    }

    // Get transaction details with inputs and outputs
    async getTransaction(txid) {
        try {
            const path = `/v1/indexer/tx/${txid}?withInputs=true&withOutputs=true`;
            console.log(`🔍 Getting transaction details: ${txid.substring(0, 16)}...`);
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
            const path = `/v1/indexer/brc20/address/${address}/ticker/${ticker}/history?start=${start}&limit=${limit}`;
            console.log(`🔍 Getting BRC-20 ${ticker} transfers for address: ${address.substring(0, 20)}...`);
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
            console.log(`🔍 Checking transactions for address: ${address.substring(0, 20)}...`);
            const result = await this.getAddressTransactions(address, 0, 20);
            
            // Handle different response formats from UniSat API
            let transactions;
            if (result && result.data && result.data.detail) {
                // Fractal Bitcoin API format: {"code":0,"msg":"ok","data":{"total":1,"start":0,"detail":[...]}}
                transactions = result.data.detail;
                console.log(`📊 API Response format: Fractal Bitcoin (data.detail array with ${transactions.length} transactions)`);
            } else if (result && result.list) {
                // Standard format: {"list": [...]}
                transactions = result.list;
                console.log(`📊 API Response format: Standard (list array with ${transactions.length} transactions)`);
            } else if (Array.isArray(result)) {
                // Direct array format
                transactions = result;
                console.log(`📊 API Response format: Direct array with ${transactions.length} transactions`);
            } else {
                console.log(`📭 No transactions found for ${address.substring(0, 20)}... (unrecognized format)`);
                console.log(`🔍 Raw result structure:`, Object.keys(result || {}));
                return { transactions: [], lastHeight: lastCheckedHeight };
            }
            
            console.log(`📨 Found ${transactions.length} total transactions for ${address.substring(0, 20)}...`);
            
            // Filter for new incoming transactions (Fractal Bitcoin API approach)
            const newTransactions = [];
            
            // Get current balance once for the address
            let balanceInfo = null;
            try {
                balanceInfo = await this.getAddressBalance(address);
                console.log(`💰 Address ${address.substring(0, 20)}... current balance: ${balanceInfo?.satoshi || 0} sats`);
            } catch (error) {
                console.error(`❌ Failed to get balance for address ${address.substring(0, 20)}...:`, error.message);
            }
            
            for (const tx of transactions) {
                // Skip if already processed or too old
                if (tx.height <= lastCheckedHeight) continue;
                
                // For Fractal Bitcoin API, we assume transactions in the address history are incoming
                // since the API only returns transactions where the address was involved
                if (balanceInfo && balanceInfo.satoshi > 0) {
                    // For HD wallet addresses (unique per user), the current balance IS the amount received
                    // since these addresses only receive, never send
                    const actualReceived = balanceInfo.satoshi;
                    
                    console.log(`💰 Found incoming transaction: ${tx.txid.substring(0, 16)}... (actual received: ${actualReceived} sats)`);
                    console.log(`📊 Transaction details: inSats=${tx.inSatoshi}, outSats=${tx.outSatoshi}, address balance=${actualReceived}`);
                    console.log(`💡 Using address balance as received amount (HD wallet = receive-only)`);
                    
                    newTransactions.push({
                        ...tx,
                        estimatedReceived: actualReceived,
                        addressBalance: balanceInfo.satoshi,
                        receivingAddress: address,
                        balanceBased: true
                    });
                } else {
                    // No balance info available, skip transaction as we can't determine amount accurately
                    console.log(`⚠️ Skipping transaction ${tx.txid.substring(0, 16)}... - no balance info to determine received amount`);
                }
            }
            
            console.log(`✨ Filtered to ${newTransactions.length} new incoming transactions`);
            
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
            const path = `/v1/indexer/blockchain/info`;
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