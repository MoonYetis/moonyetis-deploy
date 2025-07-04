/**
 * Módulo de flujo de conexión de wallets para Fractal Bitcoin ($FB)
 * Orquesta todo el proceso de detección, selección y conexión de wallets
 * Compatible con tokens MoonYetis BRC-20 en la red Fractal Bitcoin
 * 
 * Este módulo actúa como coordinador entre:
 * - Wallets.js (detección y conexión)
 * - wallet-modal.js (selección de usuario)
 * - Estado global de la aplicación
 * - Sistema de mensajería al usuario
 */

const WalletFlow = {
  // Estado del flujo de conexión
  _isConnecting: false,
  _connectionAttempts: 0,
  _maxRetries: 3,
  
  /**
   * Función principal para manejar la conexión de wallets
   * @param {Object} options - Opciones de configuración
   * @param {boolean} options.autoRetry - Si debe reintentar automáticamente en caso de error
   * @param {Function} options.onProgress - Callback para actualizaciones de progreso
   * @returns {Promise<Object>} Resultado de la conexión
   */
  async handleWalletConnection(options = {}) {
    console.log('🚀 Iniciando flujo de conexión de wallet para Fractal Bitcoin ($FB)...');
    
    // Prevenir múltiples conexiones simultáneas
    if (this._isConnecting) {
      console.warn('⚠️ Ya hay una conexión de wallet en progreso');
      this._showMessage('Ya hay una conexión en progreso...', 'warning');
      return { success: false, error: 'Conexión ya en progreso' };
    }
    
    this._isConnecting = true;
    this._connectionAttempts++;
    
    const {
      autoRetry = true,
      onProgress = null
    } = options;
    
    try {
      // Paso 1: Detectar wallets disponibles
      console.log('🔍 Paso 1: Detectando wallets disponibles...');
      this._updateProgress('Detectando wallets disponibles...', onProgress);
      
      const availableWallets = await this._detectWallets();
      if (!availableWallets.success) {
        throw new Error(`Error detectando wallets: ${availableWallets.error}`);
      }
      
      console.log(`✅ Wallets detectadas: ${availableWallets.data.length}`);
      
      // Paso 2: Mostrar modal de selección
      console.log('🎯 Paso 2: Mostrando modal de selección...');
      this._updateProgress('Selecciona tu wallet preferida...', onProgress);
      
      const selectedWallet = await this._showWalletSelection(availableWallets);
      if (!selectedWallet) {
        console.log('❌ Usuario canceló la selección de wallet');
        this._showMessage('Selección de wallet cancelada', 'info');
        return { success: false, error: 'Usuario canceló la selección' };
      }
      
      console.log(`🎯 Usuario seleccionó: ${selectedWallet}`);
      
      // Paso 3: Conectar con la wallet seleccionada
      console.log('🔗 Paso 3: Conectando con wallet seleccionada...');
      this._updateProgress(`Conectando con ${selectedWallet}...`, onProgress);
      
      const connectionResult = await this._connectToWallet(selectedWallet);
      if (!connectionResult.success) {
        throw new Error(`Error conectando con ${selectedWallet}: ${connectionResult.error}`);
      }
      
      console.log('✅ Conexión exitosa con wallet:', connectionResult.data);
      
      // Paso 4: Actualizar estado global y UI
      console.log('📊 Paso 4: Actualizando estado global y UI...');
      this._updateProgress('Actualizando estado de la aplicación...', onProgress);
      
      await this._updateGlobalState(connectionResult.data);
      
      // Paso 5: Obtener balances iniciales
      console.log('💰 Paso 5: Obteniendo balances iniciales...');
      this._updateProgress('Obteniendo balances de Fractal Bitcoin y MoonYetis...', onProgress);
      
      const balances = await this._getInitialBalances();
      if (balances.success) {
        console.log('💰 Balances obtenidos:', balances.data);
      } else {
        console.warn('⚠️ No se pudieron obtener balances iniciales:', balances.error);
      }
      
      // Mensaje de éxito
      const walletName = connectionResult.data.name;
      const address = connectionResult.data.address;
      const shortAddress = `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
      
      this._showMessage(
        `✅ Conectado exitosamente a ${walletName} (${shortAddress}) en Fractal Bitcoin ($FB)`,
        'success'
      );
      
      console.log('🎉 Flujo de conexión completado exitosamente');
      this._connectionAttempts = 0; // Reset intentos en caso de éxito
      
      return {
        success: true,
        data: {
          wallet: connectionResult.data,
          balances: balances.data,
          network: 'fractal-bitcoin'
        }
      };
      
    } catch (error) {
      console.error('❌ Error en flujo de conexión:', error);
      
      // Determinar si se debe reintentar
      const shouldRetry = autoRetry && 
                         this._connectionAttempts < this._maxRetries &&
                         this._isRetryableError(error);
      
      if (shouldRetry) {
        console.log(`🔄 Reintentando conexión (${this._connectionAttempts}/${this._maxRetries})...`);
        this._showMessage(`Reintentando conexión... (${this._connectionAttempts}/${this._maxRetries})`, 'info');
        
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return this.handleWalletConnection(options);
      } else {
        // Mostrar error al usuario
        const userError = this._formatUserError(error);
        this._showMessage(userError, 'error');
        
        return {
          success: false,
          error: error.message,
          attempts: this._connectionAttempts
        };
      }
      
    } finally {
      this._isConnecting = false;
      this._updateProgress('', onProgress); // Limpiar progreso
    }
  },
  
  /**
   * Detecta wallets disponibles usando el módulo Wallets
   * @returns {Promise<Object>} Resultado de la detección
   */
  async _detectWallets() {
    console.log('🔍 Detectando wallets disponibles...');
    
    try {
      if (typeof Wallets === 'undefined') {
        throw new Error('Módulo Wallets no disponible. Asegúrate de incluir wallets.js');
      }
      
      const result = Wallets.detectAvailableWallets();
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido detectando wallets');
      }
      
      if (!result.data || result.data.length === 0) {
        throw new Error('No se encontraron wallets compatibles con Fractal Bitcoin ($FB)');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error detectando wallets:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Muestra el modal de selección de wallet
   * @param {Object} availableWallets - Wallets disponibles
   * @returns {Promise<string|null>} Wallet seleccionada o null si cancela
   */
  async _showWalletSelection(availableWallets) {
    console.log('🎯 Mostrando modal de selección de wallet...');
    
    try {
      if (typeof showWalletModal === 'undefined') {
        throw new Error('Función showWalletModal no disponible. Asegúrate de incluir wallet-modal.js');
      }
      
      const selectedWallet = await showWalletModal(availableWallets);
      
      if (selectedWallet) {
        console.log(`✅ Usuario seleccionó wallet: ${selectedWallet}`);
      } else {
        console.log('❌ Usuario canceló la selección');
      }
      
      return selectedWallet;
      
    } catch (error) {
      console.error('❌ Error mostrando modal de selección:', error);
      throw new Error(`Error en selección de wallet: ${error.message}`);
    }
  },
  
  /**
   * Conecta con la wallet seleccionada
   * @param {string} walletType - Tipo de wallet ('unisat' o 'okx')
   * @returns {Promise<Object>} Resultado de la conexión
   */
  async _connectToWallet(walletType) {
    console.log(`🔗 Conectando con wallet: ${walletType}...`);
    
    try {
      if (typeof Wallets === 'undefined') {
        throw new Error('Módulo Wallets no disponible');
      }
      
      let result;
      
      switch (walletType) {
        case 'unisat':
          console.log('🦄 Conectando con UniSat...');
          result = await Wallets.connectUniSat();
          break;
          
        case 'okx':
          console.log('🟡 Conectando con OKX...');
          result = await Wallets.connectOKX();
          break;
          
        default:
          throw new Error(`Tipo de wallet no soportado: ${walletType}`);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido conectando wallet');
      }
      
      console.log('✅ Conexión exitosa:', result.data);
      return result;
      
    } catch (error) {
      console.error(`❌ Error conectando con ${walletType}:`, error);
      throw error;
    }
  },
  
  /**
   * Actualiza el estado global de la aplicación
   * @param {Object} walletData - Datos de la wallet conectada
   */
  async _updateGlobalState(walletData) {
    console.log('📊 Actualizando estado global...');
    
    try {
      // Actualizar gameState si está disponible
      if (typeof gameState !== 'undefined') {
        console.log('🎮 Actualizando gameState...');
        gameState.wallet = {
          connected: true,
          type: walletData.id,
          name: walletData.name,
          address: walletData.address,
          publicKey: walletData.publicKey,
          network: walletData.network || 'fractal-bitcoin',
          networkName: walletData.networkName || 'Fractal Bitcoin ($FB)',
          connectedAt: new Date().toISOString()
        };
        
        // Disparar evento de conexión si hay listeners
        if (gameState.onWalletConnected && typeof gameState.onWalletConnected === 'function') {
          gameState.onWalletConnected(gameState.wallet);
        }
      }
      
      // Actualizar slotMachine si está disponible
      if (typeof slotMachine !== 'undefined') {
        console.log('🎰 Actualizando slotMachine...');
        slotMachine.wallet = walletData;
        
        // Habilitar funcionalidades relacionadas con wallet
        if (slotMachine.enableWalletFeatures && typeof slotMachine.enableWalletFeatures === 'function') {
          slotMachine.enableWalletFeatures();
        }
      }
      
      // Actualizar elementos UI específicos
      this._updateWalletUI(walletData);
      
      console.log('✅ Estado global actualizado');
      
    } catch (error) {
      console.error('❌ Error actualizando estado global:', error);
      // No fallar el flujo completo por errores de UI
    }
  },
  
  /**
   * Actualiza elementos de UI relacionados con la wallet
   * @param {Object} walletData - Datos de la wallet conectada
   */
  _updateWalletUI(walletData) {
    console.log('🎨 Actualizando UI de wallet...');
    
    try {
      // Actualizar botón de conexión
      const connectButton = document.getElementById('wallet-connect-button');
      if (connectButton) {
        connectButton.textContent = `${walletData.name} conectada`;
        connectButton.classList.add('connected');
        connectButton.disabled = false;
      }
      
      // Actualizar información de wallet
      const walletInfo = document.getElementById('wallet-info');
      if (walletInfo) {
        const shortAddress = `${walletData.address.substring(0, 8)}...${walletData.address.substring(walletData.address.length - 8)}`;
        walletInfo.innerHTML = `
          <div class="wallet-connected">
            <span class="wallet-name">${walletData.name}</span>
            <span class="wallet-address">${shortAddress}</span>
            <span class="wallet-network">${walletData.networkName || 'Fractal Bitcoin ($FB)'}</span>
          </div>
        `;
        walletInfo.style.display = 'block';
      }
      
      // Actualizar elementos específicos de la aplicación
      const walletElements = document.querySelectorAll('[data-wallet-update]');
      walletElements.forEach(element => {
        const updateType = element.dataset.walletUpdate;
        
        switch (updateType) {
          case 'address':
            element.textContent = walletData.address;
            break;
          case 'name':
            element.textContent = walletData.name;
            break;
          case 'network':
            element.textContent = walletData.networkName || 'Fractal Bitcoin ($FB)';
            break;
          case 'status':
            element.textContent = 'Conectada';
            element.classList.add('connected');
            break;
        }
      });
      
      console.log('✅ UI de wallet actualizada');
      
    } catch (error) {
      console.error('❌ Error actualizando UI de wallet:', error);
    }
  },
  
  /**
   * Obtiene los balances iniciales de la wallet
   * @returns {Promise<Object>} Balances obtenidos
   */
  async _getInitialBalances() {
    console.log('💰 Obteniendo balances iniciales...');
    
    try {
      if (typeof Wallets === 'undefined' || !Wallets.getAllBalances) {
        console.warn('⚠️ Función getAllBalances no disponible');
        return { success: false, error: 'Función de balances no disponible' };
      }
      
      const balances = await Wallets.getAllBalances();
      
      if (balances.success) {
        console.log('💰 Balances obtenidos exitosamente:', balances.data);
        
        // Actualizar UI con balances si hay elementos específicos
        this._updateBalancesUI(balances.data);
        
        return balances;
      } else {
        console.warn('⚠️ No se pudieron obtener balances:', balances.error);
        return balances;
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo balances:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Actualiza la UI con los balances obtenidos
   * @param {Object} balancesData - Datos de los balances
   */
  _updateBalancesUI(balancesData) {
    console.log('💰 Actualizando UI con balances...');
    
    try {
      // Actualizar balance de Fractal Bitcoin
      if (balancesData.fractalBitcoin) {
        const fbBalance = balancesData.fractalBitcoin.balance;
        const fbElements = document.querySelectorAll('[data-balance="fractal-bitcoin"]');
        
        fbElements.forEach(element => {
          const fbAmount = (fbBalance.total / 100000000).toFixed(8); // Convertir satoshis a FB
          element.textContent = `${fbAmount} FB`;
        });
      }
      
      // Actualizar balance de MoonYetis
      if (balancesData.moonYetis) {
        const moonYetisBalance = balancesData.moonYetis.tokenBalance;
        const moonYetisElements = document.querySelectorAll('[data-balance="moonyetis"]');
        
        moonYetisElements.forEach(element => {
          element.textContent = `${moonYetisBalance.balance} MOONYETIS`;
        });
      }
      
      console.log('✅ UI de balances actualizada');
      
    } catch (error) {
      console.error('❌ Error actualizando UI de balances:', error);
    }
  },
  
  /**
   * Determina si un error es recuperable y se debe reintentar
   * @param {Error} error - Error a evaluar
   * @returns {boolean} Si se debe reintentar
   */
  _isRetryableError(error) {
    const retryableErrors = [
      'Network request failed',
      'Timeout',
      'Connection refused',
      'Service unavailable',
      'Rate limit exceeded'
    ];
    
    return retryableErrors.some(retryableError => 
      error.message.toLowerCase().includes(retryableError.toLowerCase())
    );
  },
  
  /**
   * Formatea errores para mostrar al usuario
   * @param {Error} error - Error a formatear
   * @returns {string} Mensaje de error formateado
   */
  _formatUserError(error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
      return 'Conexión cancelada por el usuario';
    }
    
    if (errorMessage.includes('not installed') || errorMessage.includes('not available')) {
      return 'Wallet no instalada o no disponible';
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'Error de conexión. Verifica tu conexión a internet';
    }
    
    if (errorMessage.includes('fractal bitcoin') || errorMessage.includes('fractal')) {
      return 'Error configurando Fractal Bitcoin. Verifica que tu wallet soporte esta red';
    }
    
    // Error genérico
    return 'Error conectando wallet. Por favor, intenta de nuevo';
  },
  
  /**
   * Actualiza el progreso del flujo
   * @param {string} message - Mensaje de progreso
   * @param {Function} onProgress - Callback de progreso
   */
  _updateProgress(message, onProgress) {
    if (onProgress && typeof onProgress === 'function') {
      onProgress(message);
    }
  },
  
  /**
   * Muestra mensajes al usuario usando la función showMessage
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de mensaje ('success', 'error', 'warning', 'info')
   */
  _showMessage(message, type = 'info') {
    console.log(`📢 Mensaje al usuario [${type}]: ${message}`);
    
    try {
      if (typeof showMessage === 'function') {
        showMessage(message, type);
      } else {
        // Fallback si showMessage no está disponible
        console.warn('⚠️ Función showMessage no disponible, usando console');
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    } catch (error) {
      console.error('❌ Error mostrando mensaje:', error);
    }
  },
  
  /**
   * Desconecta la wallet actual
   * @returns {Promise<Object>} Resultado de la desconexión
   */
  async disconnectWallet() {
    console.log('🔌 Desconectando wallet...');
    
    try {
      if (typeof Wallets === 'undefined') {
        throw new Error('Módulo Wallets no disponible');
      }
      
      const result = Wallets.disconnect();
      
      if (result.success) {
        // Limpiar estado global
        if (typeof gameState !== 'undefined') {
          gameState.wallet = null;
        }
        
        if (typeof slotMachine !== 'undefined') {
          slotMachine.wallet = null;
        }
        
        // Limpiar UI
        this._clearWalletUI();
        
        this._showMessage('Wallet desconectada exitosamente', 'success');
        console.log('✅ Wallet desconectada');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error desconectando wallet:', error);
      this._showMessage('Error desconectando wallet', 'error');
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Limpia elementos de UI relacionados con la wallet
   */
  _clearWalletUI() {
    console.log('🧹 Limpiando UI de wallet...');
    
    try {
      const connectButton = document.getElementById('wallet-connect-button');
      if (connectButton) {
        connectButton.textContent = 'Conectar Wallet';
        connectButton.classList.remove('connected');
        connectButton.disabled = false;
      }
      
      const walletInfo = document.getElementById('wallet-info');
      if (walletInfo) {
        walletInfo.style.display = 'none';
        walletInfo.innerHTML = '';
      }
      
      // Limpiar elementos específicos
      const walletElements = document.querySelectorAll('[data-wallet-update]');
      walletElements.forEach(element => {
        element.textContent = '';
        element.classList.remove('connected');
      });
      
      console.log('✅ UI de wallet limpiada');
      
    } catch (error) {
      console.error('❌ Error limpiando UI de wallet:', error);
    }
  }
};

// Función principal exportada
async function handleWalletConnection(options = {}) {
  return WalletFlow.handleWalletConnection(options);
}

// Función adicional para desconectar
async function disconnectWallet() {
  return WalletFlow.disconnectWallet();
}

// Exportar el módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    handleWalletConnection,
    disconnectWallet,
    WalletFlow 
  };
} else if (typeof window !== 'undefined') {
  window.handleWalletConnection = handleWalletConnection;
  window.disconnectWallet = disconnectWallet;
  window.WalletFlow = WalletFlow;
}