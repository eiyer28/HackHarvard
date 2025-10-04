# 🧪 WebSocket Implementation Test Guide

## ✅ Dependencies Installed

- ✅ `socket.io-client` installed in mobile app
- ✅ `flask-socketio` added to backend requirements
- ✅ WebSocket service created for mobile app
- ✅ Backend WebSocket handlers implemented
- ✅ POS simulator updated with WebSocket

## 🚀 Quick Test Steps

### 1. Start Backend Server

```bash
cd backend/api
python app.py
```

**Expected Output:**

```
* Running on all addresses (0.0.0.0)
* Running on http://127.0.0.1:5000
* Running on http://[::1]:5000
```

### 2. Start Mobile App

```bash
cd mobileApp
npm start
```

**Expected Output:**

- App opens in browser/mobile device
- WebSocket connection status shows "✅ Connected"
- Device registration works

### 3. Open POS Simulator

Open `frontend/transaction-simulator.html` in browser

**Expected Output:**

- WebSocket connects to server
- Transaction form loads
- Location buttons work

## 🔍 Testing the Real-Time Flow

### Test 1: Auto-Approval (Co-located)

1. **Mobile App**: Register device with card "4532-1234-5678-9012"
2. **POS Simulator**:
   - Select "4532-1234-5678-9012 (Harvard Campus)"
   - Set location to "Harvard Campus" (42.3770, -71.1167)
   - Submit transaction
3. **Expected Result**: ✅ Transaction Approved (distance ≤ 15m)

### Test 2: Manual Confirmation (Different Locations)

1. **Mobile App**: Keep registered
2. **POS Simulator**:
   - Select "4532-1234-5678-9012 (Harvard Campus)"
   - Set location to "MIT Campus" (42.3736, -71.1097)
   - Submit transaction
3. **Expected Result**: ⚠️ Manual Confirmation Required (distance 15m-500m)

### Test 3: Denial (Too Far)

1. **Mobile App**: Keep registered
2. **POS Simulator**:
   - Select "4532-1234-5678-9012 (Harvard Campus)"
   - Set location to "New York City" (40.7128, -74.0060)
   - Submit transaction
3. **Expected Result**: ❌ Transaction Denied (distance > 500m)

## 🐛 Troubleshooting

### Issue: "socket.io-client could not be found"

**Solution**: ✅ Fixed - Package installed successfully

### Issue: WebSocket Connection Failed

**Check:**

1. Backend server running on port 5000
2. No firewall blocking port 5000
3. Browser console shows connection errors

### Issue: Mobile App Not Responding

**Check:**

1. WebSocket connection status in mobile app
2. Device is registered with correct card token
3. Location permissions granted

### Issue: POS Simulator Not Working

**Check:**

1. WebSocket connection in browser console
2. Backend server logs show incoming requests
3. Mobile app receives location proof requests

## 📊 Expected Console Output

### Backend Console:

```
Client connected: <session_id>
Phone registered for card: 4532-1234-5678-9012
Location proof requested for transaction: tx_1234567890_abc123
Location proof processed for transaction: tx_1234567890_abc123
```

### Mobile App Console:

```
🔌 Connected to ProxyPay server
📱 Phone registered: Phone registered for card 4532-1234-5678-9012
📱 Location proof requested: {transaction_id: "tx_1234567890_abc123", ...}
📱 Processing location proof request...
📱 Location proof result: {result: "ACCEPT", distance_meters: 5.2}
📱 Location proof sent to server
```

### POS Simulator Console:

```
Connected to ProxyPay server
Location proof requested for transaction: tx_1234567890_abc123
Transaction result received: {transaction_id: "tx_1234567890_abc123", result: {...}}
```

## 🎯 Success Indicators

- ✅ All three components connect to WebSocket
- ✅ Mobile app automatically responds to location requests
- ✅ Real-time transaction results appear in POS
- ✅ Distance calculations work correctly
- ✅ Security features (signatures, attestation) function
- ✅ Different scenarios (ACCEPT/CONFIRM/DENY) work

## 🚀 Next Steps After Testing

1. **Demo Preparation**: Practice the three scenarios
2. **Performance Testing**: Try multiple concurrent transactions
3. **Error Handling**: Test with disconnected mobile app
4. **Security Demo**: Show cryptographic signatures in action

The WebSocket implementation is now ready for testing! 🎉
