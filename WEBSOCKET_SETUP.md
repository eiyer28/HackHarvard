# 🔌 WebSocket Real-Time Flow Setup

This document explains how to set up and run the WebSocket-based real-time transaction flow for ProxyPay.

## 🚀 Quick Start

### 1. Install Backend Dependencies

```bash
cd backend/api
pip install -r requirements.txt
```

### 2. Start the Backend Server

```bash
cd backend/api
python app.py
```

The server will start on `http://3.17.71.163:5000` with WebSocket support.

### 3. Start the Mobile App

```bash
cd mobileApp
npm install
npm start
```

Then open the app in your browser or mobile device.

### 4. Open the POS Simulator

Open `frontend/transaction-simulator.html` in your browser.

## 🔄 Real-Time Flow

### How It Works

1. **Mobile App Registration**

   - Mobile app connects to WebSocket server
   - Registers device with card token
   - Listens for location proof requests

2. **POS Transaction Creation**

   - POS simulator creates transaction
   - Sends WebSocket request for location proof
   - Waits for real-time response

3. **Real-Time Location Proof**

   - Mobile app receives location proof request
   - Gets current GPS location
   - Creates signed location proof
   - Sends proof back to server

4. **Transaction Decision**
   - Server verifies location proof
   - Calculates distance between POS and phone
   - Makes approval decision
   - Sends result back to POS

## 📱 Mobile App Features

- **WebSocket Connection**: Real-time connection to server
- **Automatic Location Proofs**: Responds to transaction requests
- **Connection Status**: Shows WebSocket connection status
- **Reconnect Button**: Reconnect if connection is lost

## 🖥️ POS Simulator Features

- **Real-Time Communication**: Uses WebSocket instead of HTTP
- **Live Transaction Results**: Receives results in real-time
- **Connection Status**: Shows connection to server
- **Automatic Location Requests**: Requests location from phone

## 🔧 Technical Details

### WebSocket Events

**Server → Mobile App:**

- `location_proof_request`: Request for location proof
- `registered`: Confirmation of phone registration
- `error`: Error messages

**Mobile App → Server:**

- `register_phone`: Register phone with card token
- `location_proof_response`: Send location proof

**Server → POS:**

- `transaction_result`: Transaction approval/denial result

**POS → Server:**

- `request_location_proof`: Request location proof from phone
- `join_room`: Join transaction room

### Security Features

- **Digital Signatures**: All location proofs are cryptographically signed
- **Device Attestation**: Verifies device integrity
- **Timestamp Validation**: Prevents replay attacks
- **Distance Validation**: Ensures location proximity

## 🎯 Demo Scenarios

### Scenario 1: Auto-Approval (Co-located)

1. POS creates transaction at Harvard Campus
2. Mobile app is at same location
3. Distance ≤ 15m → **ACCEPT**

### Scenario 2: Manual Confirmation (Different Locations)

1. POS creates transaction at Harvard Campus
2. Mobile app is 200m away
3. Distance 15m-500m → **CONFIRM_REQUIRED**

### Scenario 3: Denial (Too Far)

1. POS creates transaction at Harvard Campus
2. Mobile app is in NYC (300 miles away)
3. Distance > 500m → **DENY**

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**

   - Check if backend server is running
   - Verify port 5000 is not blocked
   - Check browser console for errors

2. **Mobile App Not Responding**

   - Ensure mobile app is registered
   - Check WebSocket connection status
   - Verify card token matches

3. **Transaction Timeout**
   - Check mobile app location permissions
   - Verify WebSocket connection
   - Check server logs for errors

### Debug Steps

1. **Check Backend Logs**

   ```bash
   cd backend/api
   python app.py
   # Look for WebSocket connection messages
   ```

2. **Check Mobile App Console**

   - Open browser developer tools
   - Look for WebSocket connection messages
   - Check for error messages

3. **Check POS Console**
   - Open browser developer tools
   - Look for WebSocket events
   - Check for transaction results

## 🚀 Next Steps

1. **Test the Flow**: Try creating transactions from POS
2. **Check Mobile App**: Ensure it responds to requests
3. **Verify Results**: Check that decisions are correct
4. **Demo Scenarios**: Test different location scenarios

## 📊 Benefits of WebSocket Flow

- **Real-Time**: Instant communication between components
- **Efficient**: No polling or repeated requests
- **Scalable**: Handles multiple concurrent transactions
- **Secure**: Maintains all cryptographic security features
- **User-Friendly**: Seamless transaction experience

The WebSocket implementation provides a much more realistic and secure transaction flow compared to the previous HTTP-based approach! 🎉
