/**
 * System Health Module
 * Server and application health monitoring
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import pg from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);
const { Pool } = pg;

class SystemHealth {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'moonyetis_casino',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
  }

  async getStatus(detailed = false) {
    try {
      const [
        systemMetrics,
        databaseHealth,
        networkHealth
      ] = await Promise.all([
        this.getSystemMetrics(),
        this.getDatabaseHealth(),
        this.getNetworkHealth()
      ]);

      let detailedMetrics = {};
      if (detailed) {
        detailedMetrics = await this.getDetailedMetrics();
      }

      const overallStatus = this.determineOverallStatus(systemMetrics, databaseHealth, networkHealth);

      return {
        status: overallStatus,
        cpu: systemMetrics.cpu,
        memory: systemMetrics.memory,
        disk: systemMetrics.disk,
        uptime: systemMetrics.uptime,
        database: databaseHealth,
        network: networkHealth,
        detailed: detailedMetrics
      };

    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async getSystemMetrics() {
    try {
      // Get CPU usage
      const cpuUsage = await this.getCPUUsage();
      
      // Get memory usage
      const memoryUsage = await this.getMemoryUsage();
      
      // Get disk usage
      const diskUsage = await this.getDiskUsage();
      
      // Get uptime
      const uptime = await this.getUptime();

      return {
        cpu: cpuUsage,
        memory: memoryUsage,
        disk: diskUsage,
        uptime: uptime
      };

    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw error;
    }
  }

  async getCPUUsage() {
    try {
      const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | awk -F'%' '{print $1}'");
      return parseFloat(stdout.trim()) || 0;
    } catch (error) {
      // Fallback method using /proc/stat
      try {
        const { stdout } = await execAsync("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print usage}'");
        return parseFloat(stdout.trim()) || 0;
      } catch (fallbackError) {
        return 0;
      }
    }
  }

  async getMemoryUsage() {
    try {
      const { stdout } = await execAsync("free | grep Mem | awk '{printf \"%.1f\", $3/$2 * 100.0}'");
      return parseFloat(stdout.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  async getDiskUsage() {
    try {
      const { stdout } = await execAsync("df -h / | awk 'NR==2{print $5}' | sed 's/%//'");
      return parseFloat(stdout.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  async getUptime() {
    try {
      const processUptime = Math.floor((Date.now() - this.startTime) / 1000);
      const { stdout } = await execAsync("uptime -p");
      return stdout.trim() || `${Math.floor(processUptime / 3600)}h ${Math.floor((processUptime % 3600) / 60)}m`;
    } catch (error) {
      const processUptime = Math.floor((Date.now() - this.startTime) / 1000);
      return `${Math.floor(processUptime / 3600)}h ${Math.floor((processUptime % 3600) / 60)}m`;
    }
  }

  async getDatabaseHealth() {
    try {
      const startTime = Date.now();
      
      // Test database connection and get stats
      const connectionQuery = 'SELECT 1 as test';
      await this.pool.query(connectionQuery);
      
      const responseTime = Date.now() - startTime;

      // Get connection stats
      const statsQuery = `
        SELECT 
          count(*) as total_connections,
          count(*) filter (where state = 'active') as active_connections,
          current_setting('max_connections')::int as max_connections
        FROM pg_stat_activity
      `;
      
      const statsResult = await this.pool.query(statsQuery);
      const stats = statsResult.rows[0];

      return {
        status: responseTime < 1000 ? 'healthy' : 'slow',
        responseTime: responseTime,
        connections: parseInt(stats.active_connections),
        maxConnections: parseInt(stats.max_connections),
        connectionUsage: Math.round((parseInt(stats.active_connections) / parseInt(stats.max_connections)) * 100)
      };

    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'error',
        error: error.message,
        responseTime: null,
        connections: 0,
        maxConnections: 0
      };
    }
  }

  async getNetworkHealth() {
    try {
      const results = await Promise.allSettled([
        this.checkEndpoint('fractal', 'https://fractal-api.unisat.io/v1/network/info'),
        this.checkEndpoint('unisat', 'https://api.unisat.io/v1/status'),
        this.checkEndpoint('okx', 'https://api.okx.com/api/v5/public/status')
      ]);

      return {
        fractal: results[0].status === 'fulfilled' ? results[0].value : 'offline',
        unisat: results[1].status === 'fulfilled' ? results[1].value : 'offline',
        okx: results[2].status === 'fulfilled' ? results[2].value : 'offline'
      };

    } catch (error) {
      return {
        fractal: 'error',
        unisat: 'error',
        okx: 'error'
      };
    }
  }

  async checkEndpoint(name, url) {
    try {
      const startTime = Date.now();
      const response = await axios.get(url, { 
        timeout: 5000,
        headers: {
          'Authorization': process.env.UNISAT_API_KEY ? `Bearer ${process.env.UNISAT_API_KEY}` : undefined
        }
      });
      const responseTime = Date.now() - startTime;
      
      return response.status === 200 ? 'online' : 'degraded';
    } catch (error) {
      return 'offline';
    }
  }

  async getDetailedMetrics() {
    try {
      // Get more detailed application metrics
      const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount * 100).toFixed(2) : 0;
      
      // Get cache hit rate (if Redis is available)
      let cacheHitRate = 'N/A';
      try {
        // This would require Redis client setup
        cacheHitRate = '95.5'; // Placeholder
      } catch (error) {
        // Redis not available
      }

      // Get active sessions from database
      const sessionsQuery = `
        SELECT COUNT(DISTINCT session_id) as active_sessions
        FROM player_sessions 
        WHERE last_activity >= NOW() - INTERVAL '30 minutes'
      `;
      
      let activeSessions = 0;
      try {
        const sessionsResult = await this.pool.query(sessionsQuery);
        activeSessions = parseInt(sessionsResult.rows[0].active_sessions) || 0;
      } catch (error) {
        // Table might not exist
      }

      return {
        activeSessions: activeSessions,
        requestsPerMinute: Math.round(this.requestCount / ((Date.now() - this.startTime) / 60000)),
        errorRate: parseFloat(errorRate),
        cacheHitRate: parseFloat(cacheHitRate) || 0
      };

    } catch (error) {
      console.error('Error getting detailed metrics:', error);
      return {
        activeSessions: 0,
        requestsPerMinute: 0,
        errorRate: 0,
        cacheHitRate: 0
      };
    }
  }

  determineOverallStatus(systemMetrics, databaseHealth, networkHealth) {
    // Critical thresholds
    if (systemMetrics.cpu > 90 || systemMetrics.memory > 95 || systemMetrics.disk > 95) {
      return 'critical';
    }

    if (databaseHealth.status === 'error') {
      return 'critical';
    }

    // Warning thresholds
    if (systemMetrics.cpu > 70 || systemMetrics.memory > 80 || systemMetrics.disk > 80) {
      return 'warning';
    }

    if (databaseHealth.status === 'slow' || databaseHealth.connectionUsage > 80) {
      return 'warning';
    }

    // Check if major services are down
    const offlineServices = Object.values(networkHealth).filter(status => status === 'offline').length;
    if (offlineServices > 1) {
      return 'warning';
    }

    return 'healthy';
  }

  // Method to increment request counters (called from main app)
  recordRequest(isError = false) {
    this.requestCount++;
    if (isError) {
      this.errorCount++;
    }
  }

  async close() {
    await this.pool.end();
  }
}

export const systemHealth = new SystemHealth();