const realWalletService = require('./realWalletService');
const EventEmitter = require('events');

class TransactionMonitor extends EventEmitter {
  constructor() {
    super();
    this.monitoredAddresses = new Map(); // address -> { lastChecked, callbacks }
    this.monitoringInterval = null;
    this.isMonitoring = false;
    this.checkInterval = 30000; // 30 segundos
    this.transactionHistory = new Map(); // txid -> transaction data
    this.maxHistorySize = 1000;
    
    console.log('📊 TransactionMonitor initialized');
  }

  // Iniciar monitoreo automático
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ Transaction monitoring already running');
      return;
    }

    console.log(`🔍 Starting transaction monitoring (${this.checkInterval/1000}s interval)`);
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      await this.checkAllAddresses();
    }, this.checkInterval);

    // Verificar inmediatamente
    this.checkAllAddresses();
  }

  // Detener monitoreo
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 Stopping transaction monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Agregar dirección para monitorear
  addAddress(address, callback = null) {
    if (!realWalletService.isValidAddress(address)) {
      throw new Error(`Invalid address format: ${address}`);
    }

    const existing = this.monitoredAddresses.get(address);
    
    if (existing) {
      // Agregar callback adicional si se proporciona
      if (callback && !existing.callbacks.includes(callback)) {
        existing.callbacks.push(callback);
      }
      console.log(`📝 Updated monitoring for address: ${address}`);
    } else {
      this.monitoredAddresses.set(address, {
        lastChecked: 0,
        callbacks: callback ? [callback] : [],
        transactionCount: 0,
        lastTransaction: null
      });
      console.log(`➕ Added address to monitoring: ${address}`);
    }

    // Si ya estamos monitoreando, verificar inmediatamente
    if (this.isMonitoring) {
      this.checkAddress(address);
    }
  }

  // Remover dirección del monitoreo
  removeAddress(address) {
    if (this.monitoredAddresses.delete(address)) {
      console.log(`➖ Removed address from monitoring: ${address}`);
      return true;
    }
    return false;
  }

  // Verificar todas las direcciones monitoreadas
  async checkAllAddresses() {
    const addresses = Array.from(this.monitoredAddresses.keys());
    
    if (addresses.length === 0) {
      return;
    }

    console.log(`🔍 Checking ${addresses.length} monitored addresses...`);

    // Procesar en lotes para no sobrecargar la API
    const batchSize = 3;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      // Procesar lote en paralelo
      const promises = batch.map(address => this.checkAddress(address));
      await Promise.allSettled(promises);
      
      // Pequeña pausa entre lotes
      if (i + batchSize < addresses.length) {
        await this.sleep(1000);
      }
    }
  }

  // Verificar una dirección específica
  async checkAddress(address) {
    try {
      const monitorData = this.monitoredAddresses.get(address);
      if (!monitorData) {
        return;
      }

      const now = Date.now();
      
      // Obtener transacciones recientes
      const deposits = await realWalletService.monitorDeposits(address, 10);
      
      // Filtrar transacciones nuevas (después de la última verificación)
      const newTransactions = deposits.filter(tx => 
        tx.timestamp * 1000 > monitorData.lastChecked
      );

      if (newTransactions.length > 0) {
        console.log(`🆕 Found ${newTransactions.length} new transactions for ${address}`);
        
        // Procesar cada transacción nueva
        for (const tx of newTransactions) {
          await this.processNewTransaction(address, tx);
        }
        
        // Actualizar estadísticas
        monitorData.transactionCount += newTransactions.length;
        monitorData.lastTransaction = newTransactions[0]; // La más reciente
      }

      // Actualizar timestamp de última verificación
      monitorData.lastChecked = now;

    } catch (error) {
      console.error(`❌ Error checking address ${address}:`, error.message);
      
      // Emitir evento de error
      this.emit('error', {
        type: 'address_check_failed',
        address,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  // Procesar nueva transacción detectada
  async processNewTransaction(address, transaction) {
    try {
      console.log(`💰 New transaction detected: ${transaction.txid} (${transaction.amount} sats)`);
      
      // Agregar al historial
      this.addToHistory(transaction);
      
      // Obtener detalles adicionales de la transacción
      const txDetails = await realWalletService.verifyTransaction(transaction.txid);
      
      const enrichedTransaction = {
        ...transaction,
        details: txDetails,
        detectedAt: new Date(),
        confirmations: txDetails.confirmations || 0,
        confirmed: txDetails.confirmed || false
      };

      // Ejecutar callbacks específicos de la dirección
      const monitorData = this.monitoredAddresses.get(address);
      if (monitorData && monitorData.callbacks.length > 0) {
        for (const callback of monitorData.callbacks) {
          try {
            await callback(enrichedTransaction);
          } catch (callbackError) {
            console.error(`❌ Error in transaction callback:`, callbackError.message);
          }
        }
      }

      // Emitir evento global
      this.emit('transaction', {
        type: 'new_transaction',
        address,
        transaction: enrichedTransaction,
        timestamp: new Date()
      });

      // Si es una transacción grande, emitir evento especial
      if (transaction.amount > 100000) { // > 0.001 BTC
        this.emit('large_transaction', {
          type: 'large_transaction',
          address,
          transaction: enrichedTransaction,
          amount: transaction.amount,
          timestamp: new Date()
        });
      }

      // Si no está confirmada, programar verificación de confirmación
      if (!enrichedTransaction.confirmed) {
        this.scheduleConfirmationCheck(transaction.txid);
      }

    } catch (error) {
      console.error(`❌ Error processing transaction ${transaction.txid}:`, error.message);
    }
  }

  // Programar verificación de confirmación
  scheduleConfirmationCheck(txid) {
    // Verificar confirmación en 10 minutos
    setTimeout(async () => {
      try {
        const txDetails = await realWalletService.verifyTransaction(txid);
        
        if (txDetails.confirmed && !this.transactionHistory.get(txid)?.notifiedConfirmed) {
          console.log(`✅ Transaction confirmed: ${txid}`);
          
          // Marcar como notificada
          const historyEntry = this.transactionHistory.get(txid);
          if (historyEntry) {
            historyEntry.notifiedConfirmed = true;
          }
          
          // Emitir evento de confirmación
          this.emit('confirmation', {
            type: 'transaction_confirmed',
            txid,
            transaction: txDetails,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error(`❌ Error checking confirmation for ${txid}:`, error.message);
      }
    }, 10 * 60 * 1000); // 10 minutos
  }

  // Agregar transacción al historial
  addToHistory(transaction) {
    this.transactionHistory.set(transaction.txid, {
      ...transaction,
      addedAt: new Date(),
      notifiedConfirmed: false
    });

    // Limpiar historial si excede el tamaño máximo
    if (this.transactionHistory.size > this.maxHistorySize) {
      const oldestKey = this.transactionHistory.keys().next().value;
      this.transactionHistory.delete(oldestKey);
    }
  }

  // Obtener estadísticas de monitoreo
  getMonitoringStats() {
    const addressStats = Array.from(this.monitoredAddresses.entries()).map(([address, data]) => ({
      address: address,
      lastChecked: new Date(data.lastChecked),
      transactionCount: data.transactionCount,
      lastTransaction: data.lastTransaction ? {
        txid: data.lastTransaction.txid,
        amount: data.lastTransaction.amount,
        timestamp: new Date(data.lastTransaction.timestamp * 1000)
      } : null,
      callbackCount: data.callbacks.length
    }));

    return {
      isMonitoring: this.isMonitoring,
      checkInterval: this.checkInterval,
      monitoredAddressCount: this.monitoredAddresses.size,
      transactionHistorySize: this.transactionHistory.size,
      addresses: addressStats,
      uptime: this.isMonitoring ? Date.now() - this.startTime : 0
    };
  }

  // Obtener historial de transacciones
  getTransactionHistory(limit = 50) {
    const transactions = Array.from(this.transactionHistory.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return transactions.map(tx => ({
      txid: tx.txid,
      amount: tx.amount,
      timestamp: new Date(tx.timestamp * 1000),
      confirmed: tx.confirmed,
      confirmations: tx.confirmations,
      detectedAt: tx.addedAt
    }));
  }

  // Forzar verificación de una dirección
  async forceCheck(address) {
    if (!this.monitoredAddresses.has(address)) {
      throw new Error(`Address not being monitored: ${address}`);
    }

    console.log(`🔍 Force checking address: ${address}`);
    await this.checkAddress(address);
  }

  // Configurar intervalo de verificación
  setCheckInterval(intervalMs) {
    if (intervalMs < 10000) { // Mínimo 10 segundos
      throw new Error('Check interval must be at least 10 seconds');
    }

    this.checkInterval = intervalMs;
    console.log(`⏱️ Check interval updated to ${intervalMs/1000}s`);

    // Reiniciar monitoreo si está activo
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  // Utilidad para pausas
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Limpiar recursos
  cleanup() {
    this.stopMonitoring();
    this.monitoredAddresses.clear();
    this.transactionHistory.clear();
    this.removeAllListeners();
    console.log('🧹 TransactionMonitor cleaned up');
  }
}

// Instancia singleton
const transactionMonitor = new TransactionMonitor();

// Manejo de señales para limpieza
process.on('SIGTERM', () => {
  transactionMonitor.cleanup();
});

process.on('SIGINT', () => {
  transactionMonitor.cleanup();
});

module.exports = transactionMonitor;