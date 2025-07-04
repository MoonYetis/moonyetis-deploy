const transactionMonitor = require('./transactionMonitor');
const gameChipsService = require('./gameChipsService');
const realWalletService = require('./realWalletService');

class GameTransactionHandler {
  constructor() {
    this.pendingDeposits = new Map(); // txid -> deposit info
    this.depositCallbacks = new Map(); // walletAddress -> callback
    this.withdrawalRequests = new Map(); // requestId -> withdrawal info
    
    // Setup event listeners
    this.setupTransactionListeners();
    
    console.log('🎮 GameTransactionHandler initialized');
  }

  // Configurar listeners de eventos de transacción
  setupTransactionListeners() {
    // Listener para nuevas transacciones
    transactionMonitor.on('transaction', async (event) => {
      await this.handleNewTransaction(event);
    });

    // Listener para confirmaciones
    transactionMonitor.on('confirmation', async (event) => {
      await this.handleTransactionConfirmation(event);
    });

    // Listener para transacciones grandes
    transactionMonitor.on('large_transaction', async (event) => {
      await this.handleLargeTransaction(event);
    });

    // Listener para errores
    transactionMonitor.on('error', (event) => {
      console.error('❌ Transaction monitoring error:', event);
    });
  }

  // Manejar nueva transacción detectada
  async handleNewTransaction(event) {
    try {
      const { address, transaction } = event;
      console.log(`💰 Processing new transaction for ${address}: ${transaction.txid}`);

      // Verificar si es un depósito para un jugador
      const depositInfo = await this.processPlayerDeposit(address, transaction);
      
      if (depositInfo) {
        // Almacenar como depósito pendiente hasta confirmación
        this.pendingDeposits.set(transaction.txid, {
          ...depositInfo,
          transaction,
          detectedAt: new Date(),
          status: 'pending'
        });

        // Notificar al jugador (opcional: antes de confirmación)
        await this.notifyPlayer(address, 'deposit_detected', {
          txid: transaction.txid,
          amount: transaction.amount,
          status: 'pending',
          confirmations: transaction.confirmations || 0
        });
      }

    } catch (error) {
      console.error('❌ Error handling new transaction:', error.message);
    }
  }

  // Manejar confirmación de transacción
  async handleTransactionConfirmation(event) {
    try {
      const { txid, transaction } = event;
      console.log(`✅ Processing confirmation for transaction: ${txid}`);

      const pendingDeposit = this.pendingDeposits.get(txid);
      
      if (pendingDeposit) {
        // Procesar depósito confirmado
        await this.processConfirmedDeposit(pendingDeposit, transaction);
        
        // Remover de pendientes
        this.pendingDeposits.delete(txid);
        
        console.log(`💎 Deposit confirmed and processed: ${txid}`);
      }

    } catch (error) {
      console.error('❌ Error handling transaction confirmation:', error.message);
    }
  }

  // Manejar transacciones grandes
  async handleLargeTransaction(event) {
    try {
      const { address, transaction, amount } = event;
      console.log(`🚨 Large transaction detected: ${transaction.txid} (${amount} sats)`);

      // Log especial para transacciones grandes
      console.log(`📊 Large Transaction Details:`, {
        address,
        txid: transaction.txid,
        amount,
        amountBTC: amount / 100000000,
        timestamp: new Date()
      });

      // Aquí se podría implementar:
      // - Alertas automáticas
      // - Verificación manual requerida
      // - Límites especiales
      // - Notificación a administradores

    } catch (error) {
      console.error('❌ Error handling large transaction:', error.message);
    }
  }

  // Procesar depósito de jugador
  async processPlayerDeposit(address, transaction) {
    try {
      // Verificar si la dirección corresponde a un jugador registrado
      // Por ahora, asumimos que cualquier depósito es válido
      
      return {
        playerAddress: address,
        depositAmount: transaction.amount,
        txid: transaction.txid,
        timestamp: transaction.timestamp
      };
      
    } catch (error) {
      console.error('❌ Error processing player deposit:', error.message);
      return null;
    }
  }

  // Procesar depósito confirmado
  async processConfirmedDeposit(depositInfo, confirmedTransaction) {
    try {
      const { playerAddress, depositAmount, txid } = depositInfo;
      
      // Convertir satoshis a chips del juego (1:1 por ahora)
      const chipsAmount = depositAmount;
      
      // Agregar chips a la cuenta del jugador
      const result = await gameChipsService.addChips(playerAddress, chipsAmount, {
        type: 'deposit',
        txid: txid,
        amount: depositAmount,
        confirmedAt: new Date()
      });

      if (result.success) {
        console.log(`💎 Added ${chipsAmount} chips to ${playerAddress} from deposit ${txid}`);
        
        // Notificar al jugador
        await this.notifyPlayer(playerAddress, 'deposit_confirmed', {
          txid,
          amount: depositAmount,
          chipsAdded: chipsAmount,
          newBalance: result.newBalance
        });

        return {
          success: true,
          chipsAdded: chipsAmount,
          newBalance: result.newBalance
        };
      } else {
        throw new Error(`Failed to add chips: ${result.error}`);
      }

    } catch (error) {
      console.error('❌ Error processing confirmed deposit:', error.message);
      throw error;
    }
  }

  // Notificar al jugador sobre eventos de transacción
  async notifyPlayer(playerAddress, eventType, data) {
    try {
      // Ejecutar callback específico del jugador si existe
      const callback = this.depositCallbacks.get(playerAddress);
      if (callback) {
        await callback(eventType, data);
      }

      // Log de notificación
      console.log(`📢 Player notification: ${playerAddress} - ${eventType}`, data);

      // Aquí se podría integrar con:
      // - WebSocket para notificaciones en tiempo real
      // - Email/SMS para notificaciones importantes
      // - Base de datos para historial de notificaciones

    } catch (error) {
      console.error('❌ Error notifying player:', error.message);
    }
  }

  // Registrar jugador para monitoreo de depósitos
  async registerPlayerForDeposits(walletAddress, callback = null) {
    try {
      if (!realWalletService.isValidAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      console.log(`📝 Registering player for deposit monitoring: ${walletAddress}`);

      // Agregar dirección al monitoreo
      transactionMonitor.addAddress(walletAddress, async (transaction) => {
        console.log(`🔔 Deposit callback for ${walletAddress}: ${transaction.txid}`);
      });

      // Guardar callback del jugador
      if (callback) {
        this.depositCallbacks.set(walletAddress, callback);
      }

      return {
        success: true,
        message: 'Player registered for deposit monitoring',
        address: walletAddress
      };

    } catch (error) {
      console.error('❌ Error registering player:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Desregistrar jugador del monitoreo
  unregisterPlayer(walletAddress) {
    try {
      transactionMonitor.removeAddress(walletAddress);
      this.depositCallbacks.delete(walletAddress);
      
      console.log(`📝 Unregistered player from monitoring: ${walletAddress}`);
      
      return {
        success: true,
        message: 'Player unregistered from monitoring'
      };
      
    } catch (error) {
      console.error('❌ Error unregistering player:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener estado de depósitos pendientes
  getPendingDeposits(walletAddress = null) {
    let deposits = Array.from(this.pendingDeposits.values());
    
    if (walletAddress) {
      deposits = deposits.filter(d => d.playerAddress === walletAddress);
    }
    
    return deposits.map(deposit => ({
      txid: deposit.transaction.txid,
      playerAddress: deposit.playerAddress,
      amount: deposit.depositAmount,
      status: deposit.status,
      confirmations: deposit.transaction.confirmations || 0,
      detectedAt: deposit.detectedAt
    }));
  }

  // Forzar verificación de depósitos para un jugador
  async forceCheckDeposits(walletAddress) {
    try {
      if (!realWalletService.isValidAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      console.log(`🔍 Force checking deposits for: ${walletAddress}`);
      
      await transactionMonitor.forceCheck(walletAddress);
      
      return {
        success: true,
        message: 'Deposit check completed'
      };
      
    } catch (error) {
      console.error('❌ Error force checking deposits:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener estadísticas del handler
  getStats() {
    return {
      pendingDepositsCount: this.pendingDeposits.size,
      registeredPlayersCount: this.depositCallbacks.size,
      monitoringStats: transactionMonitor.getMonitoringStats(),
      pendingDeposits: this.getPendingDeposits()
    };
  }

  // Limpiar recursos
  cleanup() {
    this.pendingDeposits.clear();
    this.depositCallbacks.clear();
    this.withdrawalRequests.clear();
    console.log('🧹 GameTransactionHandler cleaned up');
  }
}

// Export singleton instance
module.exports = new GameTransactionHandler();