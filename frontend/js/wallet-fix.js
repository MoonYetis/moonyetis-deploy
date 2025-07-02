// Función simplificada de conexión
async function connectWalletDirect() {
    console.log('🔍 Direct wallet detection starting...');
    
    if (window.unisat) {
        try {
            console.log('🦊 UniSat wallet detected, attempting connection...');
            const accounts = await window.unisat.requestAccounts();
            console.log('✅ UniSat connected:', accounts);
            return {provider: 'unisat', accounts};
        } catch(e) { 
            console.log('❌ UniSat error:', e); 
        }
    }
    
    if (window.okxwallet) {
        try {
            console.log('🅾️ OKX wallet detected, attempting connection...');
            const accounts = await window.okxwallet.bitcoin.requestAccounts();
            console.log('✅ OKX connected:', accounts);
            return {provider: 'okx', accounts};
        } catch(e) { 
            console.log('❌ OKX error:', e); 
        }
    }
    
    console.log('❌ No wallets found');
    console.log('🔍 Available objects:', {
        unisat: !!window.unisat,
        okxwallet: !!window.okxwallet,
        okxBitcoin: !!window.okxwallet?.bitcoin
    });
    
    return null;
}

// Test function to check wallet availability
function testWalletAvailability() {
    console.log('🧪 Testing wallet availability...');
    console.log('UniSat available:', !!window.unisat);
    console.log('OKX Wallet available:', !!window.okxwallet);
    console.log('OKX Bitcoin available:', !!window.okxwallet?.bitcoin);
    
    // Try to call them directly
    if (window.unisat) {
        console.log('UniSat object:', typeof window.unisat);
        console.log('UniSat methods:', Object.keys(window.unisat));
    }
    
    if (window.okxwallet) {
        console.log('OKX object:', typeof window.okxwallet);
        console.log('OKX bitcoin:', typeof window.okxwallet.bitcoin);
    }
}

// Auto-test on load
window.addEventListener('load', () => {
    setTimeout(testWalletAvailability, 1000);
});