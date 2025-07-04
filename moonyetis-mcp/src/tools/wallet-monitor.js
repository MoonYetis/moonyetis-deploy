/**
 * Wallet Monitor Module
 * UniSat/OKX wallet activity monitoring
 */

import axios from 'axios';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

class WalletMonitor {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'moonyetis_casino',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.fractalApi = 'https://fractal-api.unisat.io';
    this.apiKey = process.env.UNISAT_API_KEY;
  }

  async getActivity(walletAddress = null, limit = 10) {
    try {
      let whereClause = '';
      let queryParams = [limit];

      if (walletAddress) {
        whereClause = 'WHERE (from_address = $2 OR to_address = $2)';
        queryParams.push(walletAddress);
      }

      const query = `
        SELECT 
          tx_hash as id,
          transaction_type as type,
          amount,
          from_address as "from",
          to_address as "to",
          status,
          created_at as timestamp,
          confirmations
        FROM wallet_transactions 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $1
      `;

      const result = await this.pool.query(query, queryParams);

      return {
        transactions: result.rows.map(tx => ({
          id: tx.id,
          type: tx.type,
          amount: parseFloat(tx.amount).toFixed(6),
          from: tx.from,
          to: tx.to,
          status: tx.status,
          timestamp: new Date(tx.timestamp).toLocaleString(),
          confirmations: tx.confirmations
        }))
      };

    } catch (error) {
      console.error('Error getting wallet activity:', error);
      throw new Error(`Failed to retrieve wallet activity: ${error.message}`);
    }
  }

  async getDeposits(status = 'all', limit = 20) {
    try {
      let whereClause = "WHERE transaction_type = 'deposit'";
      let queryParams = [limit];

      if (status !== 'all') {
        whereClause += ' AND status = $2';
        queryParams.push(status);
      }

      const query = `
        SELECT 
          tx_hash,
          amount,
          player_wallet as player,
          status,
          confirmations,
          created_at as timestamp
        FROM wallet_transactions 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $1
      `;

      const result = await this.pool.query(query, queryParams);

      // Get summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(amount) as total_amount,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed
        FROM wallet_transactions 
        WHERE transaction_type = 'deposit'
        AND created_at >= NOW() - INTERVAL '24 hours'
      `;

      const summaryResult = await this.pool.query(summaryQuery);
      const summary = summaryResult.rows[0];

      return {
        summary: {
          total: parseInt(summary.total),
          amount: parseFloat(summary.total_amount || 0).toFixed(2),
          pending: parseInt(summary.pending),
          confirmed: parseInt(summary.confirmed)
        },
        transactions: result.rows.map(tx => ({
          txHash: tx.tx_hash,
          amount: parseFloat(tx.amount).toFixed(6),
          player: tx.player,
          status: tx.status,
          confirmations: tx.confirmations,
          timestamp: new Date(tx.timestamp).toLocaleString()
        }))
      };

    } catch (error) {
      console.error('Error getting deposits:', error);
      throw new Error(`Failed to retrieve deposits: ${error.message}`);
    }
  }

  async getWithdrawals(status = 'pending', limit = 20) {
    try {
      let whereClause = "WHERE transaction_type = 'withdrawal'";
      let queryParams = [limit];

      if (status !== 'all') {
        whereClause += ' AND status = $2';
        queryParams.push(status);
      }

      const query = `
        SELECT 
          id,
          tx_hash,
          amount,
          player_wallet as player,
          to_address as address,
          status,
          network_fee,
          created_at as timestamp
        FROM wallet_transactions 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $1
      `;

      const result = await this.pool.query(query, queryParams);

      // Get summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(amount) as total_amount,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM wallet_transactions 
        WHERE transaction_type = 'withdrawal'
        AND created_at >= NOW() - INTERVAL '24 hours'
      `;

      const summaryResult = await this.pool.query(summaryQuery);
      const summary = summaryResult.rows[0];

      return {
        summary: {
          total: parseInt(summary.total),
          amount: parseFloat(summary.total_amount || 0).toFixed(2),
          pending: parseInt(summary.pending),
          processing: parseInt(summary.processing),
          completed: parseInt(summary.completed)
        },
        transactions: result.rows.map(tx => ({
          id: tx.id,
          txHash: tx.tx_hash,
          amount: parseFloat(tx.amount).toFixed(6),
          player: tx.player,
          address: tx.address,
          status: tx.status,
          networkFee: parseFloat(tx.network_fee || 0).toFixed(6),
          timestamp: new Date(tx.timestamp).toLocaleString()
        }))
      };

    } catch (error) {
      console.error('Error getting withdrawals:', error);
      throw new Error(`Failed to retrieve withdrawals: ${error.message}`);
    }
  }

  async monitorNewTransactions() {
    try {
      // Get casino wallet addresses
      const walletsQuery = 'SELECT address FROM casino_wallets WHERE is_active = true';
      const walletsResult = await this.pool.query(walletsQuery);
      
      for (const wallet of walletsResult.rows) {
        await this.checkWalletTransactions(wallet.address);
      }

    } catch (error) {
      console.error('Error monitoring transactions:', error);
    }
  }

  async checkWalletTransactions(address) {
    try {
      const response = await axios.get(`${this.fractalApi}/v1/address/${address}/transactions`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        params: {
          limit: 50
        }
      });

      const transactions = response.data.data;

      for (const tx of transactions) {
        await this.processTransaction(tx, address);
      }

    } catch (error) {
      console.error(`Error checking wallet ${address}:`, error.message);
    }
  }

  async processTransaction(tx, walletAddress) {
    try {
      // Check if transaction already exists
      const existsQuery = 'SELECT id FROM wallet_transactions WHERE tx_hash = $1';
      const existsResult = await this.pool.query(existsQuery, [tx.txid]);

      if (existsResult.rows.length > 0) {
        return; // Transaction already processed
      }

      // Determine transaction type and amount
      const isIncoming = tx.vout.some(output => 
        output.scriptPubKey.addresses?.includes(walletAddress)
      );

      const amount = tx.vout
        .filter(output => output.scriptPubKey.addresses?.includes(walletAddress))
        .reduce((sum, output) => sum + output.value, 0);

      const transactionType = isIncoming ? 'deposit' : 'withdrawal';

      // Insert new transaction
      const insertQuery = `
        INSERT INTO wallet_transactions (
          tx_hash, transaction_type, amount, from_address, to_address,
          status, confirmations, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;

      await this.pool.query(insertQuery, [
        tx.txid,
        transactionType,
        amount,
        tx.vin[0]?.prevout?.scriptPubKey?.address || 'unknown',
        tx.vout[0]?.scriptPubKey?.addresses?.[0] || 'unknown',
        tx.confirmations > 3 ? 'confirmed' : 'pending',
        tx.confirmations
      ]);

      console.log(`New ${transactionType} detected: ${tx.txid}`);

    } catch (error) {
      console.error('Error processing transaction:', error);
    }
  }

  async close() {
    await this.pool.end();
  }
}

export const walletMonitor = new WalletMonitor();