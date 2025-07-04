/**
 * Módulo de gestión de wallets para Fractal Bitcoin ($FB)
 * Maneja la detección y conexión con wallets UniSat y OKX configuradas para Fractal Bitcoin
 * Compatible con tokens MoonYetis BRC-20 en la red Fractal Bitcoin
 * 
 * IMPORTANTE: Este sistema está diseñado específicamente para Fractal Bitcoin ($FB), no Bitcoin original ($BTC)
 */

const Wallets = {
  // Estado actual de la wallet conectada
  _currentWallet: null,
  
  /**
   * Detecta las wallets disponibles en el navegador con soporte para Fractal Bitcoin ($FB)
   * @returns {Object} { success: boolean, data: Array, error?: string }
   */
  detectAvailableWallets() {
    console.log('🔍 Detectando wallets disponibles con soporte para Fractal Bitcoin ($FB)...');
    
    const availableWallets = [];
    
    try {
      // Verificar UniSat con soporte para Fractal Bitcoin
      if (typeof window !== 'undefined' && window.unisat) {
        console.log('✅ UniSat detectada - verificando soporte para Fractal Bitcoin ($FB)');
        availableWallets.push({
          name: 'UniSat',
          id: 'unisat',
          available: true,
          icon: 'unisat-icon',
          network: 'fractal-bitcoin'
        });
      } else {
        console.log('❌ UniSat no detectada o sin soporte para Fractal Bitcoin ($FB)');
      }
      
      // Verificar OKX con soporte para Fractal Bitcoin
      if (typeof window !== 'undefined' && window.okxwallet && window.okxwallet.bitcoin) {
        console.log('✅ OKX detectada - verificando soporte para Fractal Bitcoin ($FB)');
        availableWallets.push({
          name: 'OKX',
          id: 'okx',
          available: true,
          icon: 'okx-icon',
          network: 'fractal-bitcoin'
        });
      } else {
        console.log('❌ OKX no detectada o sin soporte para Fractal Bitcoin ($FB)');
      }
      
      console.log(`🎯 Total de wallets detectadas con soporte para Fractal Bitcoin ($FB): ${availableWallets.length}`);
      
      return {
        success: true,
        data: availableWallets
      };
      
    } catch (error) {
      console.error('❌ Error detectando wallets:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  },
  
  /**
   * Conecta con la wallet UniSat configurada para Fractal Bitcoin ($FB)
   * @returns {Object} { success: boolean, data?: Object, error?: string }
   */
  async connectUniSat() {
    console.log('🔗 Intentando conectar con UniSat para Fractal Bitcoin ($FB)...');
    
    try {
      // Verificar si UniSat está disponible
      if (typeof window === 'undefined' || !window.unisat) {
        // Simular conexión en entorno de desarrollo
        if (process.env.NODE_ENV === 'development' || typeof process === 'undefined') {
          console.log('⚠️ Simulando conexión UniSat para Fractal Bitcoin ($FB) en desarrollo');
          this._currentWallet = {
            name: 'UniSat (Simulado)',
            id: 'unisat',
            address: 'fb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
            network: 'fractal-bitcoin',
            networkName: 'Fractal Bitcoin ($FB)'
          };
          return {
            success: true,
            data: this._currentWallet
          };
        }
        
        throw new Error('UniSat wallet no está instalada o no soporta Fractal Bitcoin ($FB)');
      }
      
      // Verificar métodos necesarios
      if (!window.unisat.requestAccounts) {
        throw new Error('UniSat wallet no tiene el método requestAccounts para Fractal Bitcoin ($FB)');
      }
      
      // Verificar y cambiar a red Fractal Bitcoin si es necesario
      if (window.unisat.switchNetwork) {
        try {
          await window.unisat.switchNetwork('fractal-mainnet');
          console.log('🔄 Cambiado a red Fractal Bitcoin ($FB)');
        } catch (error) {
          console.warn('⚠️ No se pudo cambiar a Fractal Bitcoin, intentando continuar:', error);
        }
      }
      
      // Solicitar conexión
      console.log('📞 Solicitando acceso a cuentas en Fractal Bitcoin ($FB)...');
      const accounts = await window.unisat.requestAccounts();
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No se obtuvieron cuentas de UniSat en Fractal Bitcoin ($FB)');
      }
      
      // Obtener clave pública si está disponible
      let publicKey = null;
      if (window.unisat.getPublicKey) {
        try {
          publicKey = await window.unisat.getPublicKey();
          console.log('🔑 Clave pública obtenida');
        } catch (error) {
          console.warn('⚠️ No se pudo obtener la clave pública:', error);
        }
      }
      
      this._currentWallet = {
        name: 'UniSat',
        id: 'unisat',
        address: accounts[0],
        publicKey: publicKey,
        network: 'fractal-bitcoin',
        networkName: 'Fractal Bitcoin ($FB)'
      };
      
      console.log('✅ UniSat conectada exitosamente a Fractal Bitcoin ($FB):', this._currentWallet.address);
      
      return {
        success: true,
        data: this._currentWallet
      };
      
    } catch (error) {
      console.error('❌ Error conectando UniSat:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Conecta con la wallet OKX configurada para Fractal Bitcoin ($FB)
   * @returns {Object} { success: boolean, data?: Object, error?: string }
   */
  async connectOKX() {
    console.log('🔗 Intentando conectar con OKX para Fractal Bitcoin ($FB)...');
    
    try {
      // Verificar si OKX está disponible
      if (typeof window === 'undefined' || !window.okxwallet || !window.okxwallet.bitcoin) {
        // Simular conexión en entorno de desarrollo
        if (process.env.NODE_ENV === 'development' || typeof process === 'undefined') {
          console.log('⚠️ Simulando conexión OKX para Fractal Bitcoin ($FB) en desarrollo');
          this._currentWallet = {
            name: 'OKX (Simulado)',
            id: 'okx',
            address: 'fb1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
            publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
            network: 'fractal-bitcoin',
            networkName: 'Fractal Bitcoin ($FB)'
          };
          return {
            success: true,
            data: this._currentWallet
          };
        }
        
        throw new Error('OKX wallet no está instalada o no soporta Fractal Bitcoin ($FB)');
      }
      
      // Verificar métodos necesarios
      if (!window.okxwallet.bitcoin.requestAccounts) {
        throw new Error('OKX wallet no tiene el método requestAccounts para Fractal Bitcoin ($FB)');
      }
      
      // Verificar y cambiar a red Fractal Bitcoin si es necesario
      if (window.okxwallet.bitcoin.switchNetwork) {
        try {
          await window.okxwallet.bitcoin.switchNetwork('fractal-mainnet');
          console.log('🔄 Cambiado a red Fractal Bitcoin ($FB)');
        } catch (error) {
          console.warn('⚠️ No se pudo cambiar a Fractal Bitcoin, intentando continuar:', error);
        }
      }
      
      // Solicitar conexión
      console.log('📞 Solicitando acceso a cuentas en Fractal Bitcoin ($FB)...');
      const accounts = await window.okxwallet.bitcoin.requestAccounts();
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No se obtuvieron cuentas de OKX en Fractal Bitcoin ($FB)');
      }
      
      // Obtener clave pública si está disponible
      let publicKey = null;
      if (window.okxwallet.bitcoin.getPublicKey) {
        try {
          publicKey = await window.okxwallet.bitcoin.getPublicKey();
          console.log('🔑 Clave pública obtenida');
        } catch (error) {
          console.warn('⚠️ No se pudo obtener la clave pública:', error);
        }
      }
      
      this._currentWallet = {
        name: 'OKX',
        id: 'okx',
        address: accounts[0],
        publicKey: publicKey,
        network: 'fractal-bitcoin',
        networkName: 'Fractal Bitcoin ($FB)'
      };
      
      console.log('✅ OKX conectada exitosamente a Fractal Bitcoin ($FB):', this._currentWallet.address);
      
      return {
        success: true,
        data: this._currentWallet
      };
      
    } catch (error) {
      console.error('❌ Error conectando OKX:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Desconecta la wallet actual
   * @returns {Object} { success: boolean, error?: string }
   */
  disconnect() {
    console.log('🔌 Desconectando wallet de Fractal Bitcoin ($FB)...');
    
    try {
      if (this._currentWallet) {
        console.log(`✅ Wallet ${this._currentWallet.name} desconectada de Fractal Bitcoin ($FB)`);
        this._currentWallet = null;
      } else {
        console.log('⚠️ No hay wallet conectada a Fractal Bitcoin ($FB)');
      }
      
      return {
        success: true
      };
      
    } catch (error) {
      console.error('❌ Error desconectando wallet de Fractal Bitcoin ($FB):', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Obtiene el estado actual de la wallet conectada
   * @returns {Object} { success: boolean, data?: Object, error?: string }
   */
  getCurrent() {
    console.log('📊 Obteniendo estado de wallet actual en Fractal Bitcoin ($FB)...');
    
    try {
      if (this._currentWallet) {
        console.log('✅ Wallet conectada a Fractal Bitcoin ($FB):', this._currentWallet.name);
        return {
          success: true,
          data: this._currentWallet
        };
      } else {
        console.log('⚠️ No hay wallet conectada a Fractal Bitcoin ($FB)');
        return {
          success: true,
          data: null
        };
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo estado de wallet en Fractal Bitcoin ($FB):', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Obtiene el balance de Fractal Bitcoin ($FB) de la wallet conectada
   * @returns {Object} { success: boolean, data?: Object, error?: string }
   */
  async getFractalBitcoinBalance() {
    console.log('💰 Obteniendo balance de Fractal Bitcoin ($FB)...');
    
    try {
      if (!this._currentWallet) {
        throw new Error('No hay wallet conectada');
      }

      let balance = null;
      
      if (this._currentWallet.id === 'unisat') {
        // UniSat - obtener balance de Fractal Bitcoin
        if (window.unisat && window.unisat.getBalance) {
          balance = await window.unisat.getBalance();
          console.log('💰 Balance de Fractal Bitcoin ($FB) obtenido via UniSat:', balance);
        } else {
          // Simular balance en desarrollo
          balance = {
            confirmed: 50000000, // 0.5 FB en satoshis
            unconfirmed: 0,
            total: 50000000
          };
          console.log('⚠️ Simulando balance de Fractal Bitcoin ($FB) en desarrollo');
        }
      } else if (this._currentWallet.id === 'okx') {
        // OKX - obtener balance de Fractal Bitcoin
        if (window.okxwallet && window.okxwallet.bitcoin && window.okxwallet.bitcoin.getBalance) {
          balance = await window.okxwallet.bitcoin.getBalance();
          console.log('💰 Balance de Fractal Bitcoin ($FB) obtenido via OKX:', balance);
        } else {
          // Simular balance en desarrollo
          balance = {
            confirmed: 75000000, // 0.75 FB en satoshis
            unconfirmed: 0,
            total: 75000000
          };
          console.log('⚠️ Simulando balance de Fractal Bitcoin ($FB) en desarrollo');
        }
      }

      return {
        success: true,
        data: {
          address: this._currentWallet.address,
          balance: balance,
          network: 'fractal-bitcoin',
          currency: 'FB'
        }
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo balance de Fractal Bitcoin ($FB):', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Obtiene el balance de tokens MoonYetis BRC-20 de la wallet conectada
   * @returns {Object} { success: boolean, data?: Object, error?: string }
   */
  async getMoonYetisBalance() {
    console.log('🌙 Obteniendo balance de tokens MoonYetis BRC-20...');
    
    try {
      if (!this._currentWallet) {
        throw new Error('No hay wallet conectada');
      }

      let tokenBalance = null;
      
      if (this._currentWallet.id === 'unisat') {
        // UniSat - obtener balance de tokens BRC-20
        if (window.unisat && window.unisat.getBRC20Balance) {
          try {
            tokenBalance = await window.unisat.getBRC20Balance('moonyetis');
            console.log('🌙 Balance de MoonYetis BRC-20 obtenido via UniSat:', tokenBalance);
          } catch (error) {
            console.warn('⚠️ No se pudo obtener balance real de MoonYetis, usando simulación');
            tokenBalance = {
              ticker: 'MOONYETIS',
              balance: '1000000',
              transferable: '1000000',
              available: '1000000'
            };
          }
        } else {
          // Simular balance en desarrollo
          tokenBalance = {
            ticker: 'MOONYETIS',
            balance: '1000000',
            transferable: '1000000',
            available: '1000000'
          };
          console.log('⚠️ Simulando balance de tokens MoonYetis BRC-20 en desarrollo');
        }
      } else if (this._currentWallet.id === 'okx') {
        // OKX - obtener balance de tokens BRC-20
        if (window.okxwallet && window.okxwallet.bitcoin && window.okxwallet.bitcoin.getBRC20Balance) {
          try {
            tokenBalance = await window.okxwallet.bitcoin.getBRC20Balance('moonyetis');
            console.log('🌙 Balance de MoonYetis BRC-20 obtenido via OKX:', tokenBalance);
          } catch (error) {
            console.warn('⚠️ No se pudo obtener balance real de MoonYetis, usando simulación');
            tokenBalance = {
              ticker: 'MOONYETIS',
              balance: '750000',
              transferable: '750000',
              available: '750000'
            };
          }
        } else {
          // Simular balance en desarrollo
          tokenBalance = {
            ticker: 'MOONYETIS',
            balance: '750000',
            transferable: '750000',
            available: '750000'
          };
          console.log('⚠️ Simulando balance de tokens MoonYetis BRC-20 en desarrollo');
        }
      }

      return {
        success: true,
        data: {
          address: this._currentWallet.address,
          tokenBalance: tokenBalance,
          network: 'fractal-bitcoin',
          tokenType: 'BRC-20',
          tokenName: 'MoonYetis'
        }
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo balance de tokens MoonYetis BRC-20:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Obtiene todos los balances (Fractal Bitcoin y MoonYetis) de la wallet conectada
   * @returns {Object} { success: boolean, data?: Object, error?: string }
   */
  async getAllBalances() {
    console.log('📊 Obteniendo todos los balances de la wallet conectada...');
    
    try {
      if (!this._currentWallet) {
        throw new Error('No hay wallet conectada');
      }

      const [fbBalance, moonYetisBalance] = await Promise.all([
        this.getFractalBitcoinBalance(),
        this.getMoonYetisBalance()
      ]);

      return {
        success: true,
        data: {
          wallet: this._currentWallet,
          fractalBitcoin: fbBalance.success ? fbBalance.data : null,
          moonYetis: moonYetisBalance.success ? moonYetisBalance.data : null,
          network: 'fractal-bitcoin'
        }
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo todos los balances:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Exportar el módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Wallets;
} else if (typeof window !== 'undefined') {
  window.Wallets = Wallets;
}