const express = require('express');
const router = express.Router();
const webSocketService = require('../services/webSocketService');

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

// Obtener estadísticas de conexiones WebSocket
router.get('/stats', async (req, res) => {
  try {
    const stats = webSocketService.getStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting WebSocket stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas de WebSocket'
    });
  }
});

// Enviar notificación de prueba (solo para desarrollo)
router.post('/test-notification', requireWalletConnection, async (req, res) => {
  try {
    const { type = 'test', message = 'Notificación de prueba' } = req.body;
    const walletAddress = req.session.walletAddress;
    
    // Solo permitir en modo desarrollo
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Endpoint de prueba no disponible en producción'
      });
    }
    
    console.log(`🧪 Sending test notification to ${walletAddress}`);
    
    const testNotification = {
      type: 'test_notification',
      channel: 'general',
      data: {
        message,
        testType: type,
        sentBy: 'test-api',
        timestamp: new Date().toISOString()
      }
    };
    
    const sent = webSocketService.sendToWallet(walletAddress, testNotification);
    
    res.json({
      success: true,
      message: 'Notificación de prueba enviada',
      sent,
      walletAddress: `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`,
      notification: testNotification
    });
    
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Error enviando notificación de prueba'
    });
  }
});

// Simular notificación de progreso de depósito
router.post('/test-deposit-progress', requireWalletConnection, async (req, res) => {
  try {
    const { 
      confirmations = 2, 
      required = 4, 
      amount = 500000,
      txid = 'demo_test_txid_123456789'
    } = req.body;
    
    const walletAddress = req.session.walletAddress;
    
    // Solo permitir en modo desarrollo
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Endpoint de prueba no disponible en producción'
      });
    }
    
    console.log(`🧪 Simulating deposit progress notification for ${walletAddress}`);
    
    const progressData = {
      type: 'confirmation_progress',
      depositId: `dep_test_${Date.now()}`,
      txid,
      address: walletAddress,
      amount: parseInt(amount),
      confirmations: {
        current: parseInt(confirmations),
        required: parseInt(required),
        percentage: Math.min((parseInt(confirmations) / parseInt(required)) * 100, 100)
      },
      status: parseInt(confirmations) >= parseInt(required) ? 'confirmed' : 
              parseInt(confirmations) >= parseInt(required) * 0.75 ? 'nearly_confirmed' :
              parseInt(confirmations) >= parseInt(required) * 0.5 ? 'half_confirmed' :
              parseInt(confirmations) >= 1 ? 'first_confirmation' : 'unconfirmed',
      message: `Progreso de confirmación: ${confirmations}/${required}`,
      estimatedTimeRemaining: parseInt(confirmations) >= parseInt(required) ? 'Confirmado' : `~${(parseInt(required) - parseInt(confirmations)) * 10} minutos`,
      timestamp: new Date().toISOString()
    };
    
    const sent = webSocketService.sendDepositProgress(walletAddress, progressData);
    
    res.json({
      success: true,
      message: 'Notificación de progreso simulada',
      sent,
      walletAddress: `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`,
      progressData
    });
    
  } catch (error) {
    console.error('❌ Error simulating deposit progress:', error);
    res.status(500).json({
      success: false,
      error: 'Error simulando progreso de depósito'
    });
  }
});

// Simular notificación de depósito completado
router.post('/test-deposit-complete', requireWalletConnection, async (req, res) => {
  try {
    const { 
      amount = 500000,
      gameChips = 500000,
      bonusChips = 100000,
      txid = 'demo_complete_txid_123456789'
    } = req.body;
    
    const walletAddress = req.session.walletAddress;
    
    // Solo permitir en modo desarrollo
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Endpoint de prueba no disponible en producción'
      });
    }
    
    console.log(`🧪 Simulating deposit completion notification for ${walletAddress}`);
    
    const depositData = {
      txid,
      amount: parseInt(amount),
      gameChips: parseInt(gameChips),
      bonusChips: parseInt(bonusChips),
      totalChips: parseInt(gameChips) + parseInt(bonusChips),
      timestamp: new Date().toISOString()
    };
    
    const sent = webSocketService.sendDepositComplete(walletAddress, {
      ...depositData,
      type: 'deposit_completed',
      message: `¡Depósito completado! ${depositData.totalChips} chips agregados a tu balance`
    });
    
    // También enviar actualización de balance
    webSocketService.sendBalanceUpdate(walletAddress, {
      newBalance: depositData.totalChips,
      depositAmount: depositData.gameChips,
      bonusAmount: depositData.bonusChips,
      totalDeposited: depositData.amount,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Notificación de depósito completado simulada',
      sent,
      walletAddress: `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`,
      depositData
    });
    
  } catch (error) {
    console.error('❌ Error simulating deposit completion:', error);
    res.status(500).json({
      success: false,
      error: 'Error simulando depósito completado'
    });
  }
});

// Información sobre cómo conectarse al WebSocket
router.get('/connection-info', (req, res) => {
  res.json({
    success: true,
    websocket: {
      url: `ws://${req.get('host')}/ws`,
      path: '/ws',
      protocols: ['notification'],
      authentication: {
        required: true,
        method: 'wallet_signature',
        message_format: {
          type: 'authenticate',
          walletAddress: 'your_wallet_address',
          signature: 'signature_of_timestamp',
          timestamp: 'unix_timestamp'
        }
      },
      subscription: {
        channels: [
          'deposits',
          'withdrawals', 
          'balance',
          'general'
        ],
        message_format: {
          type: 'subscribe',
          channels: ['deposits', 'balance']
        }
      },
      notification_types: [
        'deposit_progress',
        'deposit_complete',
        'balance_update',
        'withdrawal_update',
        'test_notification'
      ]
    },
    examples: {
      connect: 'const ws = new WebSocket("ws://localhost:3000/ws");',
      authenticate: 'ws.send(JSON.stringify({type: "authenticate", walletAddress: "bc1q...", signature: "...", timestamp: Date.now()}));',
      subscribe: 'ws.send(JSON.stringify({type: "subscribe", channels: ["deposits", "balance"]}));'
    }
  });
});

module.exports = router;