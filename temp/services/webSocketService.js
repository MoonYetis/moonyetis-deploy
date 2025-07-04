const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { BLOCKCHAIN_UTILS } = require('../config/blockchain');

class WebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // walletAddress -> Set of clients
        this.connectionStats = {
            totalConnections: 0,
            activeConnections: 0,
            messagessent: 0,
            errorsCount: 0
        };
        
        console.log('🔌 WebSocketService initialized');
    }

    // Initialize WebSocket server
    initialize(server) {
        this.wss = new WebSocket.Server({ 
            server,
            path: '/ws',
            verifyClient: (info) => {
                // Basic verification - we'll do wallet auth after connection
                return true;
            }
        });

        this.wss.on('connection', (ws, request) => {
            this.handleNewConnection(ws, request);
        });

        console.log('🚀 WebSocket server initialized on /ws');
        return this.wss;
    }

    // Handle new WebSocket connection
    handleNewConnection(ws, request) {
        console.log('🔗 New WebSocket connection attempt');
        
        this.connectionStats.totalConnections++;
        this.connectionStats.activeConnections++;
        
        // Set connection metadata
        ws.isAlive = true;
        ws.walletAddress = null;
        ws.authenticated = false;
        ws.connectedAt = new Date();
        ws.lastPing = Date.now();
        
        // Set up ping/pong for connection health
        ws.on('pong', () => {
            ws.isAlive = true;
            ws.lastPing = Date.now();
        });

        // Handle incoming messages
        ws.on('message', (data) => {
            this.handleMessage(ws, data);
        });

        // Handle connection close
        ws.on('close', (code, reason) => {
            this.handleDisconnection(ws, code, reason);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            this.connectionStats.errorsCount++;
        });

        // Send welcome message
        this.sendToClient(ws, {
            type: 'welcome',
            message: 'Connected to MoonYetis notification service',
            timestamp: new Date().toISOString(),
            serverTime: Date.now()
        });
    }

    // Handle incoming messages from clients
    handleMessage(ws, data) {
        try {
            const message = JSON.parse(data.toString());
            
            switch (message.type) {
                case 'authenticate':
                    this.handleAuthentication(ws, message);
                    break;
                    
                case 'subscribe':
                    this.handleSubscription(ws, message);
                    break;
                    
                case 'unsubscribe':
                    this.handleUnsubscription(ws, message);
                    break;
                    
                case 'ping':
                    this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
                    break;
                    
                default:
                    this.sendToClient(ws, {
                        type: 'error',
                        message: 'Unknown message type',
                        receivedType: message.type
                    });
            }
        } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error.message);
            this.sendToClient(ws, {
                type: 'error',
                message: 'Invalid message format'
            });
        }
    }

    // Handle wallet authentication
    handleAuthentication(ws, message) {
        try {
            const { walletAddress, signature, timestamp } = message;
            
            // Validate wallet address format
            if (!BLOCKCHAIN_UTILS.isValidFractalAddress(walletAddress)) {
                this.sendToClient(ws, {
                    type: 'auth_error',
                    message: 'Invalid wallet address format'
                });
                return;
            }

            // For demo purposes, we'll accept any valid wallet address
            // In production, you would verify the signature
            if (!signature || !timestamp) {
                console.log('⚠️ Demo mode: accepting authentication without signature verification');
            }

            // Authenticate the connection
            ws.walletAddress = walletAddress;
            ws.authenticated = true;
            
            // Add to clients map
            if (!this.clients.has(walletAddress)) {
                this.clients.set(walletAddress, new Set());
            }
            this.clients.get(walletAddress).add(ws);

            console.log(`✅ WebSocket authenticated for wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`);

            this.sendToClient(ws, {
                type: 'authenticated',
                message: 'Successfully authenticated',
                walletAddress: `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Authentication error:', error.message);
            this.sendToClient(ws, {
                type: 'auth_error',
                message: 'Authentication failed'
            });
        }
    }

    // Handle subscription to notification types
    handleSubscription(ws, message) {
        if (!ws.authenticated) {
            this.sendToClient(ws, {
                type: 'error',
                message: 'Authentication required before subscribing'
            });
            return;
        }

        const { channels = [] } = message;
        ws.subscribedChannels = new Set(channels);

        console.log(`📡 WebSocket subscribed to channels: ${Array.from(ws.subscribedChannels).join(', ')} for ${ws.walletAddress?.slice(0, 8)}...`);

        this.sendToClient(ws, {
            type: 'subscribed',
            channels: Array.from(ws.subscribedChannels),
            message: 'Successfully subscribed to notification channels'
        });
    }

    // Handle unsubscription
    handleUnsubscription(ws, message) {
        const { channels = [] } = message;
        
        if (ws.subscribedChannels) {
            channels.forEach(channel => ws.subscribedChannels.delete(channel));
        }

        this.sendToClient(ws, {
            type: 'unsubscribed',
            channels,
            message: 'Successfully unsubscribed from channels'
        });
    }

    // Handle client disconnection
    handleDisconnection(ws, code, reason) {
        console.log(`🔌 WebSocket disconnected: ${code} ${reason}`);
        
        this.connectionStats.activeConnections--;
        
        // Remove from clients map
        if (ws.walletAddress && this.clients.has(ws.walletAddress)) {
            this.clients.get(ws.walletAddress).delete(ws);
            
            // Clean up empty sets
            if (this.clients.get(ws.walletAddress).size === 0) {
                this.clients.delete(ws.walletAddress);
            }
        }
    }

    // Send message to specific client
    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({
                    ...message,
                    timestamp: message.timestamp || new Date().toISOString()
                }));
                this.connectionStats.messagesSet++;
            } catch (error) {
                console.error('❌ Error sending WebSocket message:', error.message);
                this.connectionStats.errorsCount++;
            }
        }
    }

    // Send notification to all clients of a specific wallet
    sendToWallet(walletAddress, notification) {
        const clients = this.clients.get(walletAddress);
        
        if (!clients || clients.size === 0) {
            console.log(`📢 No WebSocket clients for wallet ${walletAddress.slice(0, 8)}...`);
            return false;
        }

        let sentCount = 0;
        clients.forEach(ws => {
            // Check if client is subscribed to this notification type
            if (ws.subscribedChannels && notification.channel && !ws.subscribedChannels.has(notification.channel)) {
                return; // Skip if not subscribed to this channel
            }

            this.sendToClient(ws, notification);
            sentCount++;
        });

        console.log(`📢 Sent WebSocket notification to ${sentCount} clients for wallet ${walletAddress.slice(0, 8)}...`);
        return sentCount > 0;
    }

    // Broadcast to all connected clients
    broadcast(notification) {
        let sentCount = 0;
        
        this.wss.clients.forEach(ws => {
            if (ws.authenticated) {
                this.sendToClient(ws, notification);
                sentCount++;
            }
        });

        console.log(`📢 Broadcasted WebSocket notification to ${sentCount} authenticated clients`);
        return sentCount;
    }

    // Send deposit confirmation progress notification
    sendDepositProgress(walletAddress, progressData) {
        const notification = {
            type: 'deposit_progress',
            channel: 'deposits',
            data: progressData,
            timestamp: new Date().toISOString()
        };

        return this.sendToWallet(walletAddress, notification);
    }

    // Send deposit completed notification
    sendDepositComplete(walletAddress, depositData) {
        const notification = {
            type: 'deposit_complete',
            channel: 'deposits',
            data: depositData,
            timestamp: new Date().toISOString()
        };

        return this.sendToWallet(walletAddress, notification);
    }

    // Send balance update notification
    sendBalanceUpdate(walletAddress, balanceData) {
        const notification = {
            type: 'balance_update',
            channel: 'balance',
            data: balanceData,
            timestamp: new Date().toISOString()
        };

        return this.sendToWallet(walletAddress, notification);
    }

    // Send withdrawal status notification
    sendWithdrawalUpdate(walletAddress, withdrawalData) {
        const notification = {
            type: 'withdrawal_update',
            channel: 'withdrawals',
            data: withdrawalData,
            timestamp: new Date().toISOString()
        };

        return this.sendToWallet(walletAddress, notification);
    }

    // Health check and cleanup
    performHealthCheck() {
        let removedConnections = 0;
        
        this.wss.clients.forEach(ws => {
            if (!ws.isAlive) {
                ws.terminate();
                removedConnections++;
                return;
            }
            
            ws.isAlive = false;
            ws.ping();
        });

        if (removedConnections > 0) {
            console.log(`🧹 Removed ${removedConnections} dead WebSocket connections`);
            this.connectionStats.activeConnections = this.wss.clients.size;
        }
    }

    // Get connection statistics
    getStats() {
        return {
            ...this.connectionStats,
            activeConnections: this.wss ? this.wss.clients.size : 0,
            clientsByWallet: Array.from(this.clients.entries()).map(([address, clients]) => ({
                address: `${address.slice(0, 8)}...${address.slice(-6)}`,
                connections: clients.size
            }))
        };
    }

    // Start periodic health checks
    startHealthChecks() {
        setInterval(() => {
            this.performHealthCheck();
        }, 30000); // Every 30 seconds

        console.log('🏥 WebSocket health checks started');
    }

    // Shutdown WebSocket server
    shutdown() {
        if (this.wss) {
            console.log('🛑 Shutting down WebSocket server...');
            
            // Close all connections gracefully
            this.wss.clients.forEach(ws => {
                this.sendToClient(ws, {
                    type: 'server_shutdown',
                    message: 'Server is shutting down'
                });
                ws.close();
            });

            this.wss.close();
            console.log('✅ WebSocket server shut down');
        }
    }
}

// Export singleton instance
module.exports = new WebSocketService();