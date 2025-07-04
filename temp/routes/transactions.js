const express = require('express');
const router = express.Router();
const transactionMonitor = require('../services/transactionMonitor');
const gameTransactionHandler = require('../services/gameTransactionHandler');
const realWalletService = require('../services/realWalletService');
const depositMonitorService = require('../services/depositMonitorService');
const fractalBitcoinService = require('../services/fractalBitcoinService');
const rateLimit = require('express-rate-limit');

// Rate limiting para APIs de transacciones
const transactionLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 20, // máximo 20 requests por minuto
  message: { 
    error: 'Demasiadas consultas de transacciones. Intenta de nuevo en 1 minuto.' 
  }
});

// Middleware para verificar wallet conectada
const requireWalletConnection = (req, res, next) => {
  if (!req.session.walletConnected || !req.session.walletAddress) {
    return res.status(401).json({
      success: false,
      error: 'Wallet no conectada. Conecta tu wallet primero.'
    });
  }
  next();
};

// Registrar wallet para monitoreo de depósitos
router.post('/monitor/register', requireWalletConnection, async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress;
    
    console.log(`📝 Registering wallet for monitoring: ${walletAddress}`);
    
    // Registrar con callback para notificaciones en tiempo real
    const result = await gameTransactionHandler.registerPlayerForDeposits(
      walletAddress,
      async (eventType, data) => {
        // Aquí se podría enviar via WebSocket si está disponible
        console.log(`📢 Real-time notification for ${walletAddress}: ${eventType}`, data);
      }
    );
    
    if (result.success) {
      // Iniciar monitoreo si no está activo
      if (!transactionMonitor.isMonitoring) {
        transactionMonitor.startMonitoring();
      }
      
      res.json({
        success: true,
        message: 'Wallet registrada para monitoreo de depósitos',
        address: walletAddress,
        monitoringActive: transactionMonitor.isMonitoring
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error registering wallet for monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno registrando wallet para monitoreo'
    });
  }
});

// Desregistrar wallet del monitoreo
router.post('/monitor/unregister', requireWalletConnection, async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress;
    
    console.log(`📝 Unregistering wallet from monitoring: ${walletAddress}`);
    
    const result = gameTransactionHandler.unregisterPlayer(walletAddress);
    
    res.json({
      success: true,
      message: 'Wallet desregistrada del monitoreo',
      address: walletAddress
    });
    
  } catch (error) {
    console.error('❌ Error unregistering wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno desregistrando wallet'
    });
  }
});

// Obtener depósitos pendientes
router.get('/deposits/pending', requireWalletConnection, transactionLimit, async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress;
    
    const pendingDeposits = gameTransactionHandler.getPendingDeposits(walletAddress);
    
    res.json({
      success: true,
      address: walletAddress,
      pendingDeposits,
      count: pendingDeposits.length
    });
    
  } catch (error) {
    console.error('❌ Error getting pending deposits:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo depósitos pendientes'
    });
  }
});

// Forzar verificación de depósitos
router.post('/deposits/check', requireWalletConnection, transactionLimit, async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress;
    
    console.log(`🔍 Force checking deposits for: ${walletAddress}`);
    
    const result = await gameTransactionHandler.forceCheckDeposits(walletAddress);
    
    if (result.success) {
      // Obtener depósitos actualizados
      const pendingDeposits = gameTransactionHandler.getPendingDeposits(walletAddress);
      
      res.json({
        success: true,
        message: 'Verificación de depósitos completada',
        address: walletAddress,
        pendingDeposits,
        checkedAt: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error force checking deposits:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando depósitos'
    });
  }
});

// Obtener historial de transacciones con filtros avanzados
router.get('/history', requireWalletConnection, transactionLimit, async (req, res) => {
  try {
    const { 
      limit = 20, 
      type = 'all',      // 'all', 'deposit', 'withdrawal', 'bet', 'win'
      dateFrom,          // YYYY-MM-DD
      dateTo,            // YYYY-MM-DD  
      minAmount,         // Mínimo en sats
      maxAmount,         // Máximo en sats
      status = 'all'     // 'all', 'confirmed', 'pending', 'failed'
    } = req.query;
    
    const limitNum = Math.min(parseInt(limit), 100); // Máximo 100
    const walletAddress = req.session.walletAddress;
    
    // Obtener historial base
    let history = transactionMonitor.getTransactionHistory(limitNum);
    
    // Filtrar por dirección del usuario
    history = history.filter(tx => 
      tx.address === walletAddress || 
      tx.fromAddress === walletAddress || 
      tx.toAddress === walletAddress
    );
    
    // Aplicar filtros
    if (type !== 'all') {
      history = history.filter(tx => tx.type === type);
    }
    
    if (status !== 'all') {
      history = history.filter(tx => tx.status === status);
    }
    
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      history = history.filter(tx => new Date(tx.timestamp) >= fromDate);
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Fin del día
      history = history.filter(tx => new Date(tx.timestamp) <= toDate);
    }
    
    if (minAmount) {
      const min = parseInt(minAmount);
      history = history.filter(tx => tx.amount >= min);
    }
    
    if (maxAmount) {
      const max = parseInt(maxAmount);
      history = history.filter(tx => tx.amount <= max);
    }
    
    // Generar datos simulados para demo si el historial está vacío
    if (history.length === 0) {
      history = generateDemoTransactionHistory(walletAddress, limitNum);
    }
    
    res.json({
      success: true,
      history,
      count: history.length,
      limit: limitNum,
      filters: {
        type,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        status
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting transaction history:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo historial de transacciones'
    });
  }
});

// Función auxiliar para generar historial demo
function generateDemoTransactionHistory(address, limit) {
  const transactions = [];
  const types = ['deposit', 'withdrawal', 'bet', 'win'];
  const statuses = ['confirmed', 'pending'];
  
  for (let i = 0; i < Math.min(limit, 10); i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const amount = Math.floor(Math.random() * 1000000) + 10000; // 10K - 1M sats
    const timestamp = new Date(Date.now() - (i * 24 * 60 * 60 * 1000)); // Últimos días
    
    transactions.push({
      id: `demo_tx_${i}`,
      txid: `demo_${Math.random().toString(36).substring(2, 15)}`,
      type,
      amount,
      address,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp: timestamp.toISOString(),
      confirmations: type === 'deposit' ? Math.floor(Math.random() * 6) + 1 : null,
      fee: type === 'withdrawal' ? Math.floor(amount * 0.001) : null,
      description: `Demo ${type} transaction`
    });
  }
  
  return transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Obtener estadísticas de monitoreo
router.get('/monitor/stats', requireWalletConnection, async (req, res) => {
  try {
    const stats = gameTransactionHandler.getStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        currentTime: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting monitoring stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas de monitoreo'
    });
  }
});

// Verificar estado de una transacción específica
router.get('/status/:txid', transactionLimit, async (req, res) => {
  try {
    const { txid } = req.params;
    
    // Validar formato de TXID
    if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de TXID inválido'
      });
    }
    
    console.log(`🔍 Checking transaction status: ${txid}`);
    
    // Verificar transacción con el servicio real
    const txInfo = await realWalletService.verifyTransaction(txid);
    
    res.json({
      success: true,
      txid,
      transaction: txInfo,
      checkedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error checking transaction status:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando estado de transacción'
    });
  }
});

// Obtener balance actualizado y verificar depósitos
router.get('/balance/refresh', requireWalletConnection, transactionLimit, async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress;
    
    console.log(`💰 Refreshing balance for: ${walletAddress}`);
    
    // Obtener balance actualizado (sin cache)
    const balance = await realWalletService.getRealBalance(walletAddress, false);
    
    // Forzar verificación de depósitos
    await gameTransactionHandler.forceCheckDeposits(walletAddress);
    
    // Obtener depósitos pendientes
    const pendingDeposits = gameTransactionHandler.getPendingDeposits(walletAddress);
    
    res.json({
      success: true,
      address: walletAddress,
      balance,
      pendingDeposits,
      refreshedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error refreshing balance:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando balance'
    });
  }
});

// Control de monitoreo (admin functions)
router.post('/monitor/start', async (req, res) => {
  try {
    // TODO: Verificar permisos de admin
    
    if (transactionMonitor.isMonitoring) {
      return res.json({
        success: true,
        message: 'Monitoreo ya está activo',
        status: 'already_running'
      });
    }
    
    transactionMonitor.startMonitoring();
    
    res.json({
      success: true,
      message: 'Monitoreo de transacciones iniciado',
      status: 'started'
    });
    
  } catch (error) {
    console.error('❌ Error starting monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Error iniciando monitoreo'
    });
  }
});

router.post('/monitor/stop', async (req, res) => {
  try {
    // TODO: Verificar permisos de admin
    
    if (!transactionMonitor.isMonitoring) {
      return res.json({
        success: true,
        message: 'Monitoreo ya está detenido',
        status: 'already_stopped'
      });
    }
    
    transactionMonitor.stopMonitoring();
    
    res.json({
      success: true,
      message: 'Monitoreo de transacciones detenido',
      status: 'stopped'
    });
    
  } catch (error) {
    console.error('❌ Error stopping monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Error deteniendo monitoreo'
    });
  }
});

// === NUEVOS ENDPOINTS PARA ADVANCED WALLET PANEL ===

// === DEPOSIT MONITORING SYSTEM ===

// Iniciar monitoreo automático de depósitos para una wallet
router.post('/deposits/start-monitoring', requireWalletConnection, async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress;
    
    console.log(`🔍 Starting automatic deposit monitoring for: ${walletAddress}`);
    
    // Iniciar monitoreo con DepositMonitorService
    const result = await depositMonitorService.startMonitoring(walletAddress);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Monitoreo automático de depósitos iniciado',
        address: walletAddress,
        monitoringActive: true
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error starting deposit monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Error iniciando monitoreo automático de depósitos'
    });
  }
});

// Detener monitoreo automático de depósitos
router.post('/deposits/stop-monitoring', requireWalletConnection, async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress;
    
    console.log(`⏹️ Stopping deposit monitoring for: ${walletAddress}`);
    
    const result = await depositMonitorService.stopMonitoring(walletAddress);
    
    res.json({
      success: true,
      message: 'Monitoreo automático de depósitos detenido',
      address: walletAddress,
      monitoringActive: false
    });
    
  } catch (error) {
    console.error('❌ Error stopping deposit monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Error deteniendo monitoreo automático'
    });
  }
});

// Obtener estado del monitoreo automático
router.get('/deposits/monitoring-status', requireWalletConnection, async (req, res) => {
  try {
    const monitoringStatus = depositMonitorService.getMonitoringStatus();
    
    res.json({
      success: true,
      monitoring: monitoringStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting monitoring status:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado del monitoreo'
    });
  }
});

// Verificar balance BRC-20 en blockchain
router.get('/deposits/check-balance', requireWalletConnection, async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress;
    
    console.log(`💰 Checking BRC-20 balance for: ${walletAddress}`);
    
    // Verificar balance directamente en blockchain
    const balance = await fractalBitcoinService.getBRC20Balance(walletAddress, 'MOONYETIS');
    
    res.json({
      success: true,
      address: walletAddress,
      balance,
      checkedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error checking BRC-20 balance:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando balance en blockchain'
    });
  }
});

// Obtener historial de transferencias BRC-20
router.get('/deposits/brc20-history', requireWalletConnection, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const walletAddress = req.session.walletAddress;
    
    console.log(`📜 Getting BRC-20 transfer history for: ${walletAddress}`);
    
    // Obtener historial de transferencias BRC-20
    const transfers = await fractalBitcoinService.getBRC20Transfers(
      walletAddress, 
      'MOONYETIS', 
      Math.min(parseInt(limit), 50)
    );
    
    res.json({
      success: true,
      address: walletAddress,
      transfers,
      checkedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting BRC-20 history:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo historial de BRC-20'
    });
  }
});

// === PROGRESSIVE CONFIRMATIONS SYSTEM ===

// Obtener depósitos pendientes con estado de confirmaciones
router.get('/deposits/pending-confirmations', requireWalletConnection, async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress;
    
    console.log(`📊 Getting pending deposits with confirmations for: ${walletAddress}`);
    
    // Obtener depósitos pendientes con información de confirmaciones
    const pendingDeposits = depositMonitorService.getPendingDepositsWithConfirmations(walletAddress);
    
    res.json({
      success: true,
      address: walletAddress,
      pendingDeposits,
      count: pendingDeposits.length,
      checkedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting pending confirmations:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado de confirmaciones'
    });
  }
});

// Verificar estado de confirmaciones de una transacción específica
router.get('/deposits/confirmation-status/:txid', requireWalletConnection, async (req, res) => {
  try {
    const { txid } = req.params;
    
    // Validar formato de TXID
    if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de TXID inválido'
      });
    }
    
    console.log(`🔍 Checking confirmation status for transaction: ${txid}`);
    
    // Obtener estado de confirmaciones
    const confirmationStatus = await depositMonitorService.getTransactionConfirmationStatus(txid);
    
    res.json({
      success: true,
      ...confirmationStatus,
      checkedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error checking confirmation status:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando estado de confirmaciones'
    });
  }
});

// Endpoint para simular progreso de confirmaciones (solo para testing)
router.post('/deposits/simulate-confirmation/:txid', requireWalletConnection, async (req, res) => {
  try {
    const { txid } = req.params;
    const { confirmations = 1 } = req.body;
    
    console.log(`🧪 Simulating confirmation progress for ${txid}: +${confirmations} confirmations`);
    
    // Este endpoint solo funciona en modo demo/test
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Endpoint de simulación no disponible en producción'
      });
    }
    
    // Buscar el depósito en la cola
    const deposit = depositMonitorService.depositQueue.find(d => d.txid === txid);
    
    if (!deposit) {
      return res.status(404).json({
        success: false,
        error: 'Depósito no encontrado en cola de procesamiento'
      });
    }
    
    // Simular incremento de confirmaciones
    const previousConfirmations = deposit.confirmations || 0;
    const newConfirmations = previousConfirmations + parseInt(confirmations);
    const requiredConfirmations = depositMonitorService.getRequiredConfirmations(deposit.amount);
    
    // Actualizar confirmaciones y enviar notificación
    deposit.confirmations = newConfirmations;
    deposit.lastUpdated = new Date();
    
    await depositMonitorService.handleConfirmationProgress(
      deposit, 
      previousConfirmations, 
      newConfirmations, 
      requiredConfirmations
    );
    
    res.json({
      success: true,
      message: 'Confirmaciones simuladas exitosamente',
      txid,
      confirmations: {
        previous: previousConfirmations,
        current: newConfirmations,
        required: requiredConfirmations,
        percentage: Math.min((newConfirmations / requiredConfirmations) * 100, 100)
      },
      status: depositMonitorService.getConfirmationStatus(newConfirmations, requiredConfirmations)
    });
    
  } catch (error) {
    console.error('❌ Error simulating confirmations:', error);
    res.status(500).json({
      success: false,
      error: 'Error simulando confirmaciones'
    });
  }
});

// Generar dirección de depósito con monitoreo automático
router.post('/deposits/generate-address', requireWalletConnection, async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress;
    
    console.log(`🏦 Generating deposit address for: ${walletAddress}`);
    
    // En un sistema real, aquí generarías una dirección única por depósito
    // Por ahora usamos la dirección del wallet del usuario
    const depositAddress = walletAddress;
    
    // Generar QR code data para BRC-20 MOONYETIS
    const qrData = `bitcoin:${depositAddress}?label=MOONYETIS%20Deposit`;
    
    // Iniciar monitoreo automático para esta dirección
    const monitoringResult = await depositMonitorService.startMonitoring(depositAddress);
    
    if (monitoringResult.success) {
      console.log(`✅ Automatic monitoring started for ${depositAddress}`);
    } else {
      console.warn(`⚠️ Could not start monitoring for ${depositAddress}: ${monitoringResult.error}`);
    }
    
    res.json({
      success: true,
      depositAddress,
      qrData,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      network: 'fractal-mainnet',
      ticker: 'MOONYETIS',
      monitoringActive: monitoringResult.success,
      message: 'Envía tokens MOONYETIS (BRC-20) a esta dirección. Se detectarán automáticamente.'
    });
    
  } catch (error) {
    console.error('❌ Error generating deposit address:', error);
    res.status(500).json({
      success: false,
      error: 'Error generando dirección de depósito'
    });
  }
});

// Procesar retiro
router.post('/withdrawals/submit', requireWalletConnection, async (req, res) => {
  try {
    const { toAddress, amount, fee } = req.body;
    const walletAddress = req.session.walletAddress;
    
    // Validaciones
    if (!toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino y cantidad son requeridas'
      });
    }
    
    if (!realWalletService.isValidAddress(toAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de dirección de destino inválido'
      });
    }
    
    const amountSats = parseInt(amount);
    const feeSats = parseInt(fee) || 1000; // Fee mínimo 1000 sats
    const totalAmount = amountSats + feeSats;
    
    if (amountSats < 10000) { // Mínimo 10K sats
      return res.status(400).json({
        success: false,
        error: 'Cantidad mínima de retiro: 10,000 sats'
      });
    }
    
    // Verificar balance suficiente
    const balance = await realWalletService.getRealBalance(walletAddress);
    if (balance.total < totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Balance insuficiente para el retiro + fee'
      });
    }
    
    // En un sistema real, aquí procesarías el retiro real
    // Por ahora simulamos la transacción
    const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Simular procesamiento
    console.log(`💸 Processing withdrawal: ${amountSats} sats to ${toAddress}`);
    
    // En producción, aquí llamarías al sistema de retiros real
    const withdrawalResult = {
      id: withdrawalId,
      status: 'pending',
      txid: null, // Se asignará cuando se procese
      fromAddress: walletAddress,
      toAddress,
      amount: amountSats,
      fee: feeSats,
      total: totalAmount,
      createdAt: new Date().toISOString(),
      estimatedConfirmation: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min
    };
    
    res.json({
      success: true,
      withdrawal: withdrawalResult,
      message: 'Retiro iniciado. Se procesará en los próximos minutos.'
    });
    
  } catch (error) {
    console.error('❌ Error processing withdrawal:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando retiro'
    });
  }
});

// Calcular fee de retiro
router.post('/withdrawals/calculate-fee', requireWalletConnection, async (req, res) => {
  try {
    const { amount, priority = 'normal' } = req.body;
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad requerida para calcular fee'
      });
    }
    
    const amountSats = parseInt(amount);
    
    // Simular cálculo de fees basado en prioridad
    const feeRates = {
      low: 1,      // 1 sat/vB - ~30-60 min
      normal: 5,   // 5 sat/vB - ~10-30 min  
      high: 15     // 15 sat/vB - ~1-10 min
    };
    
    const baseTxSize = 250; // Tamaño promedio de transacción en vBytes
    const calculatedFee = feeRates[priority] * baseTxSize;
    
    // Fee mínimo 1000 sats
    const recommendedFee = Math.max(calculatedFee, 1000);
    
    res.json({
      success: true,
      amount: amountSats,
      fee: {
        recommended: recommendedFee,
        priority,
        estimatedTime: priority === 'low' ? '30-60 min' : 
                      priority === 'normal' ? '10-30 min' : '1-10 min'
      },
      total: amountSats + recommendedFee,
      alternatives: {
        low: { fee: Math.max(feeRates.low * baseTxSize, 1000), time: '30-60 min' },
        normal: { fee: Math.max(feeRates.normal * baseTxSize, 1000), time: '10-30 min' },
        high: { fee: Math.max(feeRates.high * baseTxSize, 1000), time: '1-10 min' }
      }
    });
    
  } catch (error) {
    console.error('❌ Error calculating withdrawal fee:', error);
    res.status(500).json({
      success: false,
      error: 'Error calculando fee de retiro'
    });
  }
});

// Obtener historial de retiros
router.get('/withdrawals/history', requireWalletConnection, transactionLimit, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const walletAddress = req.session.walletAddress;
    const limitNum = Math.min(parseInt(limit), 50);
    
    // En un sistema real, consultarías la base de datos de retiros
    // Por ahora simulamos algunos retiros demo
    const demoWithdrawals = [
      {
        id: 'wd_demo_1',
        txid: 'demo_withdrawal_txid_1',
        status: 'confirmed',
        fromAddress: walletAddress,
        toAddress: 'bc1qdemotestaddress123456789',
        amount: 50000,
        fee: 1500,
        total: 51500,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        confirmedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
        confirmations: 6
      },
      {
        id: 'wd_demo_2', 
        txid: null,
        status: 'pending',
        fromAddress: walletAddress,
        toAddress: 'bc1qdemotestaddress987654321',
        amount: 25000,
        fee: 1000,
        total: 26000,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        estimatedConfirmation: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      }
    ];
    
    res.json({
      success: true,
      withdrawals: demoWithdrawals.slice(0, limitNum),
      count: demoWithdrawals.length,
      address: walletAddress
    });
    
  } catch (error) {
    console.error('❌ Error getting withdrawal history:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo historial de retiros'
    });
  }
});

// Exportar historial de transacciones (CSV)
router.get('/history/export', requireWalletConnection, transactionLimit, async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const walletAddress = req.session.walletAddress;
    
    // Obtener historial completo
    let history = transactionMonitor.getTransactionHistory(100);
    
    // Filtrar por dirección del usuario
    history = history.filter(tx => 
      tx.address === walletAddress || 
      tx.fromAddress === walletAddress || 
      tx.toAddress === walletAddress
    );
    
    // Generar datos demo si está vacío
    if (history.length === 0) {
      history = generateDemoTransactionHistory(walletAddress, 20);
    }
    
    if (format === 'csv') {
      // Generar CSV
      const csvHeader = 'Date,Type,Amount,Status,TXID,Address,Fee,Confirmations\n';
      const csvRows = history.map(tx => {
        const date = new Date(tx.timestamp).toLocaleDateString();
        const amount = tx.amount || 0;
        const fee = tx.fee || '';
        const confirmations = tx.confirmations || '';
        const txid = tx.txid || '';
        const address = tx.toAddress || tx.address || '';
        
        return `${date},${tx.type},${amount},${tx.status},${txid},${address},${fee},${confirmations}`;
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="moonyetis-transactions-${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      // Formato JSON por defecto
      res.json({
        success: true,
        history,
        count: history.length,
        exportedAt: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Error exporting transaction history:', error);
    res.status(500).json({
      success: false,
      error: 'Error exportando historial de transacciones'
    });
  }
});

module.exports = router;