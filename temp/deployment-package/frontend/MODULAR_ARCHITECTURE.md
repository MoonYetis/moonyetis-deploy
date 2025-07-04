# 🎰 MoonYetis Slots - Modular Architecture

## 📁 Estructura Modular

La aplicación ha sido refactorizada para separar concerns y mejorar la mantenibilidad:

```
frontend/
├── js/
│   ├── wallet-manager.js      # 🔗 Core wallet functionality
│   ├── slot-machine.js        # 🎰 Game engine & visuals
│   └── wallet-integration.js  # 🌉 Bridge between modules
├── assets/
│   └── symbols/              # 🖼️ Symbol images
│       ├── yeti-wild.png
│       ├── rocket-high.png
│       ├── moon-scatter.png
│       ├── coin-medium.png
│       ├── star-medium.png
│       ├── planet-low.png
│       ├── alien-bonus.png
│       └── ufo-special.png
├── index.html                # 🏠 Main application
└── test-wallet-modular.html  # 🧪 Testing interface
```

## 🔧 Módulos

### 1. **wallet-manager.js** - Core Wallet Functionality
- Detección de wallets (UniSat, OKX)
- Conexión y autenticación
- Event listeners de wallet
- Estado de conexión

**Funciones principales:**
- `detectAvailableWallets()`
- `connectUniSat()` / `connectOKX()`
- `disconnect()`
- Event handling para cambios de cuenta/red

### 2. **slot-machine.js** - Game Engine & Visuals
- Lógica del slot machine
- Creación y animación de rodillos
- Visualización de imágenes
- Efectos especiales y sonidos
- Formateo de números ultra-accesibles

**Funciones principales:**
- `createReels()` - Crear rodillos con imágenes
- `spin()` - Lógica de giro
- `displayResults()` - Mostrar resultados
- `showMessage()` - Mensajes al usuario

### 3. **wallet-integration.js** - Bridge Module
- Integración entre wallet y game engine
- Funciones de UI compartidas
- Manejo de eventos unificado
- Comunicación con backend

**Funciones principales:**
- `connectWallet()` - Flujo completo de conexión
- `updateWalletUI()` - Actualizar interfaz
- `verifyWalletWithBackend()` - Verificación del servidor

## 🖼️ Sistema de Visualización de Imágenes

### Configuración de Símbolos
```javascript
const SYMBOLS = [
    { id: 'yeti', name: 'Yeti Wild', image: 'assets/symbols/yeti-wild.png', emoji: '🏔️' },
    { id: 'rocket', name: 'Rocket High', image: 'assets/symbols/rocket-high.png', emoji: '🚀' },
    // ... más símbolos
];
```

### Creación de Rodillos
```javascript
// En slot-machine.js
createReels() {
    const container = document.getElementById('reelsContainer');
    // Crear 5 rodillos con 3 símbolos cada uno
    // Cada símbolo tiene:
    // - Imagen principal (.symbol-image)
    // - Fallback emoji (.symbol-emoji)
    // - Error handling para imágenes faltantes
}
```

### CSS para Símbolos
```css
.symbol-image {
    width: 70px;
    height: 70px;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.symbol.winning .symbol-image {
    filter: drop-shadow(0 0 10px #FFE66D);
    transform: scale(1.1);
}
```

## 🔄 Flujo de Conexión de Wallet

1. **Usuario hace clic** → `wallet-integration.js`
2. **Detectar wallets** → `walletManager.detectAvailableWallets()`
3. **Mostrar selector** → `showWalletSelector()`
4. **Conectar wallet** → `walletManager.connectUniSat/OKX()`
5. **Verificar backend** → `verifyWalletWithBackend()`
6. **Actualizar UI** → `updateWalletUI()` + `slotMachine.updateUI()`

## 🎮 Modo Demo

El slot machine puede funcionar independientemente de la conexión de wallet:

```javascript
// Habilitar modo demo
gameState.balance = 1000000; // 1M MY
gameState.connectedWallet = false;
slotMachine.updateUI();
```

## 🧪 Testing

### Test File: `test-wallet-modular.html`
- Interfaz de testing completa
- Logging en tiempo real
- Visualización de estado
- Botones de prueba:
  - 🔗 Connect Wallet
  - 🎲 Test Reels Creation  
  - 🎮 Enable Demo Mode
  - 🎰 Demo Spin

### Comandos de Test
```javascript
// Crear rodillos
testReelsCreation();

// Modo demo
enableDemoMode();

// Test de conexión
connectWallet();
```

## 🔧 Problemas Solucionados

### ✅ Event Listeners Duplicados
- Eliminados 3 listeners duplicados del botón `connectWallet`
- Un solo listener centralizado en `wallet-integration.js`

### ✅ Conflictos de Creación de Rodillos
- Eliminada función `initializeReels()` duplicada del HTML
- Solo se usa `slotMachine.createReels()` para imágenes

### ✅ Contexto (this) Corregido
- Eliminadas referencias problemáticas a `this.showWalletModal()`
- Funciones independientes con contexto claro

### ✅ Independencia de Módulos
- Slot machine funciona sin wallet (modo demo)
- Wallet manager es independiente del game engine
- Bridge maneja la integración limpiamente

## 🚀 Beneficios

1. **Mantenibilidad**: Código organizado en módulos específicos
2. **Testabilidad**: Cada módulo se puede probar independientemente  
3. **Escalabilidad**: Fácil agregar nuevas funcionalidades
4. **Debuggability**: Logs claros y separación de concerns
5. **Reutilización**: Módulos pueden reutilizarse en otros proyectos

## 📋 Orden de Carga

```html
<!-- Orden CRÍTICO de scripts -->
<script src="js/wallet-manager.js"></script>    <!-- 1. Core wallet -->
<script src="js/slot-machine.js"></script>      <!-- 2. Game engine -->  
<script src="js/wallet-integration.js"></script> <!-- 3. Integration -->
```

## 🔍 Debugging

### Console Commands
```javascript
// Verificar módulos cargados
console.log({
    walletManager: typeof walletManager !== 'undefined',
    slotMachine: typeof slotMachine !== 'undefined',
    gameState: typeof gameState !== 'undefined'
});

// Test manual de rodillos
slotMachine.createReels();

// Estado de conexión
walletManager.getCurrentWallet();
```

### Common Issues
- **Imágenes no cargan**: Verificar ruta `assets/symbols/`
- **Botón no funciona**: Verificar orden de carga de scripts
- **Game state undefined**: Esperar a que `slot-machine.js` cargue

---

🎰 **MoonYetis Slots** - Modular, Maintainable, Scalable