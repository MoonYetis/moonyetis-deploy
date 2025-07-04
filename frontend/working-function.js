        async function connectWalletFunc() {
            console.log('🚀 Connect function called!');
            updateStatus('Connecting...');

            if (window.unisat) {
                try {
                    console.log('🦄 Trying UniSat...');
                    const accounts = await window.unisat.requestAccounts();
                    console.log('✅ Success:', accounts);
                    updateStatus('✅ Connected: ' + accounts[0]);
                    alert('Connected: ' + accounts[0]);
                    return true;
                } catch(e) {
                    console.log('❌ Error:', e);
                }
            }

            updateStatus('❌ No wallet found');
            alert('No wallet found - install UniSat or OKX');
            return false;
        }
