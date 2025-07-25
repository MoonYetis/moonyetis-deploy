// SCRIPT DE EMERGENCIA PARA FORZAR AUTENTICACIÓN Y CARGA DE DIRECCIÓN
// INSTRUCCIONES: Copiar y pegar este código completo en la consola del navegador

console.log('🚨 SCRIPT DE EMERGENCIA: Iniciando...');

// 1. Verificar si los elementos necesarios están disponibles
function verificarElementos() {
    console.log('🔍 Verificando elementos del dashboard...');
    
    if (!window.dashboardModal) {
        console.error('❌ dashboardModal no está disponible');
        return false;
    }
    
    if (!window.walletConnectionModal) {
        console.error('❌ walletConnectionModal no está disponible');
        return false;
    }
    
    console.log('✅ Elementos del dashboard verificados');
    return true;
}

// 2. Forzar carga del token JWT desde localStorage
function forzarTokenJWT() {
    console.log('🔑 Forzando carga del token JWT...');
    
    const authToken = localStorage.getItem('auth_token');
    const authUser = localStorage.getItem('auth_user');
    
    if (!authToken || !authUser) {
        console.error('❌ No hay token JWT o datos de usuario en localStorage');
        console.log('💡 Intenta conectar la wallet primero');
        return false;
    }
    
    // Forzar asignación del token
    if (window.dashboardModal && window.dashboardModal.user) {
        window.dashboardModal.user.token = authToken;
        window.dashboardModal.user.backendData = JSON.parse(authUser);
        console.log('✅ Token JWT asignado manualmente:', authToken.substring(0, 20) + '...');
        console.log('✅ Datos de usuario asignados:', JSON.parse(authUser));
        return true;
    } else {
        console.error('❌ dashboardModal.user no está disponible');
        return false;
    }
}

// 3. Forzar llamada a loadDepositAddress
function forzarCargaDeposito() {
    console.log('🏦 Forzando carga de dirección de depósito...');
    
    if (window.dashboardModal && typeof window.dashboardModal.loadDepositAddress === 'function') {
        try {
            window.dashboardModal.loadDepositAddress();
            console.log('✅ loadDepositAddress() ejecutado manualmente');
            return true;
        } catch (error) {
            console.error('❌ Error al ejecutar loadDepositAddress():', error);
            return false;
        }
    } else {
        console.error('❌ loadDepositAddress() no está disponible');
        return false;
    }
}

// 4. Script principal de emergencia
function solucionDeEmergencia() {
    console.log('🚨 === INICIANDO SOLUCIÓN DE EMERGENCIA ===');
    
    // Paso 1: Verificar elementos
    if (!verificarElementos()) {
        console.error('❌ No se pueden verificar los elementos necesarios');
        return;
    }
    
    // Paso 2: Forzar token JWT
    if (!forzarTokenJWT()) {
        console.error('❌ No se puede cargar el token JWT');
        return;
    }
    
    // Paso 3: Forzar carga de depósito
    setTimeout(() => {
        if (forzarCargaDeposito()) {
            console.log('🎉 === SOLUCIÓN DE EMERGENCIA COMPLETADA ===');
            console.log('💡 Verifica ahora la sección "Receive" en el dashboard');
        } else {
            console.error('❌ La solución de emergencia falló en el último paso');
        }
    }, 1000);
}

// 5. Información de debugging adicional
function mostrarInformacionDebug() {
    console.log('🔍 === INFORMACIÓN DE DEBUG ===');
    console.log('📱 localStorage auth_token:', localStorage.getItem('auth_token') ? 'PRESENTE' : 'AUSENTE');
    console.log('👤 localStorage auth_user:', localStorage.getItem('auth_user') ? 'PRESENTE' : 'AUSENTE');
    console.log('🔗 walletConnectionModal:', window.walletConnectionModal ? 'DISPONIBLE' : 'NO DISPONIBLE');
    console.log('📊 dashboardModal:', window.dashboardModal ? 'DISPONIBLE' : 'NO DISPONIBLE');
    
    if (window.dashboardModal && window.dashboardModal.user) {
        console.log('🔑 dashboardModal.user.token:', window.dashboardModal.user.token ? 'PRESENTE' : 'AUSENTE');
        console.log('📄 dashboardModal.user.backendData:', window.dashboardModal.user.backendData ? 'PRESENTE' : 'AUSENTE');
    }
}

// EJECUTAR AUTOMÁTICAMENTE
console.log('🚀 Ejecutando solución de emergencia automáticamente...');
mostrarInformacionDebug();
solucionDeEmergencia();

// TAMBIÉN EXPONER FUNCIONES GLOBALMENTE PARA USO MANUAL
window.emergencyFix = {
    verificarElementos,
    forzarTokenJWT,
    forzarCargaDeposito,
    solucionDeEmergencia,
    mostrarInformacionDebug
};

console.log('💡 También puedes ejecutar manualmente: window.emergencyFix.solucionDeEmergencia()');