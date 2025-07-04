/**
 * Fractal Network Module
 * Fractal Bitcoin network monitoring and token operations
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class FractalNetwork {
  constructor() {
    this.fractalApi = 'https://fractal-api.unisat.io';
    this.indexerApi = 'https://fractal-indexer.unisat.io';
    this.apiKey = process.env.UNISAT_API_KEY;
    this.network = 'fractal-mainnet';
  }

  async getStatus(includeMempool = true) {
    try {
      // Get basic network info
      const [networkInfo, blockInfo, mempoolInfo] = await Promise.all([
        this.getNetworkInfo(),
        this.getLatestBlock(),
        includeMempool ? this.getMempoolInfo() : Promise.resolve(null)
      ]);

      // Get MoonYetis token info
      const tokenInfo = await this.getTokenInfo('MY');

      return {
        status: networkInfo.status,
        blockHeight: blockInfo.height,
        hashrate: networkInfo.hashrate,
        difficulty: networkInfo.difficulty,
        avgBlockTime: networkInfo.avgBlockTime,
        txPerBlock: blockInfo.txCount,
        feeRate: networkInfo.feeRate,
        mempool: mempoolInfo ? {
          count: mempoolInfo.count,
          size: mempoolInfo.size,
          feeRange: mempoolInfo.feeRange
        } : null,
        tokenInfo: tokenInfo
      };

    } catch (error) {
      console.error('Error getting network status:', error);
      throw new Error(`Failed to get network status: ${error.message}`);
    }
  }

  async getNetworkInfo() {
    try {
      const response = await axios.get(`${this.fractalApi}/v1/network/info`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      const data = response.data.data;
      return {
        status: data.status || 'online',
        hashrate: this.formatHashrate(data.hashrate),
        difficulty: data.difficulty,
        avgBlockTime: data.avgBlockTime || 600,
        feeRate: data.feeRate || 1
      };

    } catch (error) {
      // Fallback data if API is unavailable
      return {
        status: 'online',
        hashrate: 'N/A',
        difficulty: 'N/A',
        avgBlockTime: 600,
        feeRate: 1
      };
    }
  }

  async getLatestBlock() {
    try {
      const response = await axios.get(`${this.fractalApi}/v1/blocks/latest`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      const block = response.data.data;
      return {
        height: block.height,
        hash: block.hash,
        txCount: block.tx?.length || 0,
        timestamp: block.timestamp
      };

    } catch (error) {
      // Fallback - estimate based on time
      const estimatedHeight = Math.floor((Date.now() / 1000 - 1609459200) / 600); // Rough estimate
      return {
        height: estimatedHeight,
        hash: 'unknown',
        txCount: 0,
        timestamp: Math.floor(Date.now() / 1000)
      };
    }
  }

  async getMempoolInfo() {
    try {
      const response = await axios.get(`${this.fractalApi}/v1/mempool/info`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      const mempool = response.data.data;
      return {
        count: mempool.count || 0,
        size: (mempool.bytes / 1024 / 1024).toFixed(2) || '0.00',
        feeRange: `${mempool.minfee || 1}-${mempool.maxfee || 50} sat/vB`
      };

    } catch (error) {
      return {
        count: 0,
        size: '0.00',
        feeRange: '1-10 sat/vB'
      };
    }
  }

  async getTokenInfo(ticker = 'MY') {
    try {
      const response = await axios.get(`${this.indexerApi}/v1/brc20/${ticker}/info`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      const token = response.data.data;
      return {
        totalSupply: this.formatNumber(token.totalSupply),
        circulatingSupply: this.formatNumber(token.circulatingSupply),
        marketCap: this.formatNumber(token.marketCap || token.circulatingSupply),
        holders: token.holders || 'N/A',
        transactions: token.transactions || 'N/A'
      };

    } catch (error) {
      // Fallback MoonYetis token info
      return {
        totalSupply: '21,000,000',
        circulatingSupply: '15,750,000',
        marketCap: '15,750,000',
        holders: 'N/A',
        transactions: 'N/A'
      };
    }
  }

  async getTokenBalance(address, ticker = 'MY') {
    try {
      const response = await axios.get(`${this.indexerApi}/v1/address/${address}/brc20/${ticker}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      const balance = response.data.data;

      // Get transaction history
      const historyResponse = await axios.get(`${this.indexerApi}/v1/address/${address}/brc20/${ticker}/history`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: { limit: 100 }
      });

      const history = historyResponse.data.data || [];
      
      const incoming = history
        .filter(tx => tx.type === 'transfer' && tx.to === address)
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      const outgoing = history
        .filter(tx => tx.type === 'transfer' && tx.from === address)
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      return {
        available: parseFloat(balance.available || 0).toFixed(6),
        locked: parseFloat(balance.locked || 0).toFixed(6),
        total: parseFloat(balance.total || 0).toFixed(6),
        incoming: incoming.toFixed(6),
        outgoing: outgoing.toFixed(6),
        incomingCount: history.filter(tx => tx.type === 'transfer' && tx.to === address).length,
        outgoingCount: history.filter(tx => tx.type === 'transfer' && tx.from === address).length,
        lastActivity: history.length > 0 ? new Date(history[0].timestamp).toLocaleString() : 'No activity'
      };

    } catch (error) {
      console.error(`Error getting token balance for ${address}:`, error.message);
      return {
        available: '0.000000',
        locked: '0.000000',
        total: '0.000000',
        incoming: '0.000000',
        outgoing: '0.000000',
        incomingCount: 0,
        outgoingCount: 0,
        lastActivity: 'Unknown'
      };
    }
  }

  async validateAddress(address) {
    try {
      const response = await axios.get(`${this.fractalApi}/v1/address/${address}/validate`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return response.data.data.isValid;

    } catch (error) {
      // Basic validation fallback
      return address.length >= 26 && address.length <= 62 && 
             (address.startsWith('bc1') || address.startsWith('1') || address.startsWith('3'));
    }
  }

  async estimateFee(priority = 'medium') {
    try {
      const response = await axios.get(`${this.fractalApi}/v1/fees/estimate`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      const fees = response.data.data;
      const feeRates = {
        low: fees.low || 1,
        medium: fees.medium || 5,
        high: fees.high || 10
      };

      return feeRates[priority] || feeRates.medium;

    } catch (error) {
      const defaultRates = { low: 1, medium: 5, high: 10 };
      return defaultRates[priority] || defaultRates.medium;
    }
  }

  formatHashrate(hashrate) {
    if (!hashrate) return 'N/A';
    
    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
    let value = parseFloat(hashrate);
    let unitIndex = 0;

    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  formatNumber(num) {
    if (!num) return '0';
    return parseFloat(num).toLocaleString();
  }

  // WebSocket connection for real-time updates
  async subscribeToUpdates(callback) {
    try {
      const WebSocket = (await import('ws')).default;
      const ws = new WebSocket(`wss://fractal-ws.unisat.io/ws`);

      ws.on('open', () => {
        console.log('Connected to Fractal network WebSocket');
        ws.send(JSON.stringify({
          action: 'subscribe',
          channels: ['blocks', 'mempool', 'brc20_MY']
        }));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          callback(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      return ws;

    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      return null;
    }
  }
}

export const fractalNetwork = new FractalNetwork();