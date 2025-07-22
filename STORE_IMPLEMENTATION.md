# MoonYetis Store Implementation

## Overview
The MoonYetis Store has been implemented to replace the deposit functionality with a MoonCoins store where users can purchase game tokens using FB (Fractal Bitcoin) or MY (MoonYetis BRC-20 tokens).

## Features

### MoonCoin Packs
- **Starter Pack**: 300 MoonCoins ($3 USD)
- **Player Pack**: 600 MoonCoins ($6 USD)
- **Pro Pack**: 1200 MoonCoins ($12 USD)

### Payment Methods
- **Fractal Bitcoin (FB)**: Standard pricing
- **MoonYetis Token (MY)**: 3% bonus on MoonCoins

### Pricing
- Base rate: 100 MoonCoins = $1 USD
- Dynamic pricing based on current FB/MY market rates
- Prices update every 30 seconds in the UI and every minute on the backend

## Architecture

### Frontend Components
1. **Store Modal** (`frontend/js/store-modal.js`)
   - Main UI component for the store
   - Handles pack selection and payment method choice
   - Shows dynamic pricing
   - Manages purchase flow

2. **Store Modal Styles** (`frontend/css/store-modal.css`)
   - Complete styling for the store modal
   - Responsive design
   - Animations and transitions

3. **Wallet Store Integration** (`frontend/js/wallet-store-integration.js`)
   - Replaces deposit tab with store tab
   - Integrates store with wallet panel
   - Manages MoonCoins balance display
   - Shows purchase history

### Backend Components
1. **Store Server** (`backend/store-server.js`)
   - Runs on port 3002
   - API endpoints:
     - `GET /api/store/prices` - Current FB/MY prices
     - `GET /api/store/products` - Available packs
     - `POST /api/store/purchase` - Create purchase order
     - `GET /api/store/order/:orderId` - Check order status
     - `POST /api/store/confirm-payment` - Confirm payment (webhook)
     - `GET /api/store/balance/:userWallet` - User balance
     - `GET /api/store/transactions/:userWallet` - Purchase history

2. **Deployment Scripts**
   - `start-store-production.sh` - Start store server only
   - `start-all-production.sh` - Start both HD wallet and store servers

## How to Deploy

1. **Start the store server only**:
   ```bash
   cd backend
   ./start-store-production.sh
   ```

2. **Start all backend services**:
   ```bash
   cd backend
   ./start-all-production.sh
   ```

## Configuration

### Payment Addresses
Update the payment addresses in `backend/store-server.js`:
```javascript
paymentMethods: {
    fb: {
        address: 'bc1qfractalbitcoinaddress123456789' // Replace with actual FB address
    },
    my: {
        address: 'bc1qmoonyetisaddress123456789' // Replace with actual MY address
    }
}
```

### Price Feed Integration
Currently using simulated prices. To integrate real price feeds:
1. Replace the `updatePrices()` function in `store-server.js`
2. Fetch actual FB/MY prices from an exchange API
3. Update the `currentPrices` object with real values

## Testing

### Manual Testing Steps
1. Connect wallet
2. Open wallet panel
3. Click on "Store" tab
4. Click "Open Store" button
5. Select a pack
6. Select payment method (MY shows 3% bonus)
7. Click purchase button
8. Follow payment instructions

### Webhook Testing
To simulate a payment confirmation:
```bash
curl -X POST http://moonyetis.io:3002/api/store/confirm-payment \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORDER_ID_HERE", "txHash": "TX_HASH_HERE"}'
```

## Security Considerations
1. Add proper authentication for webhook endpoints
2. Implement rate limiting
3. Add transaction verification with blockchain
4. Store sensitive data securely
5. Add HTTPS support

## Future Enhancements
1. Real-time blockchain payment monitoring
2. Automatic payment verification
3. Email notifications
4. Referral bonuses
5. Limited-time promotions
6. Bundle deals