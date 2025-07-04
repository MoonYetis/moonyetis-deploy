/**
 * Módulo de modal para selección de wallets para Fractal Bitcoin ($FB)
 * Maneja la interfaz de usuario para seleccionar wallets UniSat y OKX
 * Compatible con tokens MoonYetis BRC-20 en la red Fractal Bitcoin
 */

const WalletModal = {
  // Referencia al modal actual
  _currentModal: null,
  
  /**
   * Muestra un modal para seleccionar wallet
   * @param {Object} availableWallets - Resultado de Wallets.detectAvailableWallets()
   * @returns {Promise<string|null>} Tipo de wallet seleccionada ('unisat', 'okx') o null si cancela
   */
  async showWalletModal(availableWallets) {
    console.log('🎯 Mostrando modal de selección de wallet para Fractal Bitcoin ($FB)...');
    
    // Limpiar modal anterior si existe
    this._cleanup();
    
    // Validar parámetros
    if (!availableWallets || !availableWallets.success) {
      console.error('❌ Error: datos de wallets inválidos');
      return null;
    }
    
    const wallets = availableWallets.data || [];
    console.log(`📊 Procesando ${wallets.length} wallets detectadas`);
    
    return new Promise((resolve) => {
      // Crear el modal
      const modal = this._createModal(wallets, resolve);
      
      // Agregar al DOM
      document.body.appendChild(modal);
      this._currentModal = modal;
      
      // Mostrar el modal con animación
      requestAnimationFrame(() => {
        modal.classList.add('wallet-modal-show');
        console.log('✅ Modal de wallet mostrado');
      });
      
      // Enfocar el primer botón disponible
      const firstButton = modal.querySelector('.wallet-button:not(:disabled)');
      if (firstButton) {
        firstButton.focus();
      }
    });
  },
  
  /**
   * Crea el elemento del modal
   * @param {Array} wallets - Array de wallets disponibles
   * @param {Function} resolve - Función para resolver la promesa
   * @returns {HTMLElement} Elemento del modal
   */
  _createModal(wallets, resolve) {
    console.log('🏗️ Creando modal de selección de wallet...');
    
    // Contenedor principal del modal
    const modal = document.createElement('div');
    modal.className = 'wallet-modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'wallet-modal-title');
    modal.setAttribute('aria-modal', 'true');
    
    // Contenido del modal
    const content = document.createElement('div');
    content.className = 'wallet-modal-content';
    
    // Título
    const title = document.createElement('h2');
    title.id = 'wallet-modal-title';
    title.className = 'wallet-modal-title';
    title.textContent = 'Seleccionar Wallet para Fractal Bitcoin ($FB)';
    
    // Subtítulo
    const subtitle = document.createElement('p');
    subtitle.className = 'wallet-modal-subtitle';
    subtitle.textContent = 'Elige tu wallet para conectarte a Fractal Bitcoin y usar tokens MoonYetis BRC-20';
    
    // Contenedor de wallets
    const walletsContainer = document.createElement('div');
    walletsContainer.className = 'wallet-modal-wallets';
    
    // Crear botones para cada wallet
    this._createWalletButtons(wallets, walletsContainer, resolve);
    
    // Botón de cancelar
    const cancelButton = document.createElement('button');
    cancelButton.className = 'wallet-modal-cancel';
    cancelButton.textContent = 'Cancelar';
    cancelButton.type = 'button';
    
    // Ensamblar el modal
    content.appendChild(title);
    content.appendChild(subtitle);
    content.appendChild(walletsContainer);
    content.appendChild(cancelButton);
    modal.appendChild(content);
    
    // Event listeners
    this._attachEventListeners(modal, cancelButton, resolve);
    
    return modal;
  },
  
  /**
   * Crea los botones de wallet
   * @param {Array} wallets - Array de wallets disponibles
   * @param {HTMLElement} container - Contenedor donde agregar los botones
   * @param {Function} resolve - Función para resolver la promesa
   */
  _createWalletButtons(wallets, container, resolve) {
    console.log('🔘 Creando botones de wallet...');
    
    // Definir todas las wallets posibles
    const allWallets = [
      {
        id: 'unisat',
        name: 'UniSat',
        description: 'Wallet UniSat para Fractal Bitcoin',
        icon: '🦄',
        installUrl: 'https://unisat.io/'
      },
      {
        id: 'okx',
        name: 'OKX',
        description: 'Wallet OKX para Fractal Bitcoin',
        icon: '🟡',
        installUrl: 'https://www.okx.com/web3'
      }
    ];
    
    allWallets.forEach(walletDef => {
      const availableWallet = wallets.find(w => w.id === walletDef.id);
      const isAvailable = availableWallet && availableWallet.available;
      
      const button = document.createElement('button');
      button.className = `wallet-button ${isAvailable ? 'available' : 'unavailable'}`;
      button.type = 'button';
      
      // Contenido del botón
      const icon = document.createElement('span');
      icon.className = 'wallet-icon';
      icon.textContent = walletDef.icon;
      
      const info = document.createElement('div');
      info.className = 'wallet-info';
      
      const name = document.createElement('div');
      name.className = 'wallet-name';
      name.textContent = walletDef.name;
      
      const desc = document.createElement('div');
      desc.className = 'wallet-description';
      desc.textContent = walletDef.description;
      
      const status = document.createElement('div');
      status.className = 'wallet-status';
      status.textContent = isAvailable ? 'Disponible' : 'No instalada';
      
      info.appendChild(name);
      info.appendChild(desc);
      info.appendChild(status);
      
      button.appendChild(icon);
      button.appendChild(info);
      
      if (isAvailable) {
        // Wallet disponible - conectar
        button.addEventListener('click', () => {
          console.log(`🎯 Usuario seleccionó wallet: ${walletDef.name}`);
          this._resolveAndCleanup(resolve, walletDef.id);
        });
      } else {
        // Wallet no disponible - instalar
        const installText = document.createElement('span');
        installText.className = 'wallet-install-text';
        installText.textContent = 'Instalar';
        button.appendChild(installText);
        
        button.addEventListener('click', () => {
          console.log(`🔗 Usuario solicitó instalar wallet: ${walletDef.name}`);
          window.open(walletDef.installUrl, '_blank');
          console.log(`📱 Abriendo página de instalación para ${walletDef.name}`);
        });
      }
      
      container.appendChild(button);
    });
  },
  
  /**
   * Adjunta los event listeners al modal
   * @param {HTMLElement} modal - Elemento del modal
   * @param {HTMLElement} cancelButton - Botón de cancelar
   * @param {Function} resolve - Función para resolver la promesa
   */
  _attachEventListeners(modal, cancelButton, resolve) {
    console.log('🔧 Configurando event listeners del modal...');
    
    // Cancelar al hacer clic en el botón
    cancelButton.addEventListener('click', () => {
      console.log('❌ Usuario canceló selección de wallet');
      this._resolveAndCleanup(resolve, null);
    });
    
    // Cancelar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('❌ Usuario canceló haciendo clic fuera del modal');
        this._resolveAndCleanup(resolve, null);
      }
    });
    
    // Manejar teclas
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        console.log('❌ Usuario canceló con tecla Escape');
        this._resolveAndCleanup(resolve, null);
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    // Guardar referencia para limpieza
    modal._keydownHandler = handleKeydown;
  },
  
  /**
   * Resuelve la promesa y limpia el modal
   * @param {Function} resolve - Función para resolver la promesa
   * @param {string|null} result - Resultado de la selección
   */
  _resolveAndCleanup(resolve, result) {
    console.log(`🎯 Resolviendo selección de wallet: ${result || 'cancelado'}`);
    
    if (this._currentModal) {
      this._currentModal.classList.remove('wallet-modal-show');
      this._currentModal.classList.add('wallet-modal-hide');
      
      // Esperar a que termine la animación antes de limpiar
      setTimeout(() => {
        this._cleanup();
        resolve(result);
      }, 300);
    } else {
      resolve(result);
    }
  },
  
  /**
   * Limpia el modal actual y sus event listeners
   */
  _cleanup() {
    if (this._currentModal) {
      console.log('🧹 Limpiando modal anterior...');
      
      // Remover event listener de teclado
      if (this._currentModal._keydownHandler) {
        document.removeEventListener('keydown', this._currentModal._keydownHandler);
      }
      
      // Remover del DOM
      if (this._currentModal.parentNode) {
        this._currentModal.parentNode.removeChild(this._currentModal);
      }
      
      this._currentModal = null;
      console.log('✅ Modal limpiado');
    }
  }
};

// Función principal exportada
async function showWalletModal(availableWallets) {
  return WalletModal.showWalletModal(availableWallets);
}

// Exportar el módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showWalletModal };
} else if (typeof window !== 'undefined') {
  window.showWalletModal = showWalletModal;
  window.WalletModal = WalletModal;
}