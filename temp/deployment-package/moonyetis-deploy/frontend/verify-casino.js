// Verificación básica del casino
console.log('🔍 Verificando estado del casino...');

// Verificar que las funciones existen
const requiredFunctions = ['connectWallet', 'updateWalletUI', 'showNotification'];
const missingFunctions = [];

requiredFunctions.forEach(func => {
    if (typeof window[func] === 'undefined') {
        missingFunctions.push(func);
    }
});

if (missingFunctions.length > 0) {
    console.error('❌ Funciones faltantes:', missingFunctions);
} else {
    console.log('✅ Todas las funciones requeridas están definidas');
}

// Verificar elementos del DOM
const requiredElements = ['connectWallet', 'walletModal', 'spinBtn'];
const missingElements = [];

requiredElements.forEach(id => {
    if (!document.getElementById(id)) {
        missingElements.push(id);
    }
});

if (missingElements.length > 0) {
    console.error('❌ Elementos DOM faltantes:', missingElements);
} else {
    console.log('✅ Todos los elementos DOM requeridos están presentes');
}

// Verificar imágenes
const symbolsContainer = document.querySelector('.symbols-container');
if (symbolsContainer) {
    console.log('✅ Contenedor de símbolos encontrado');
} else {
    console.log('❌ Contenedor de símbolos NO encontrado');
}
