# ProxyPay - Location-Based Transaction Security

## 🎯 Project Overview

ProxyPay is a location-based transaction validation system that prevents fraudulent credit card transactions by verifying the cardholder's phone location against the transaction location. This hackathon project demonstrates how geospatial validation can enhance payment security while maintaining user privacy.

## 🏗️ Current Architecture Status

### ✅ **Completed Components**

1. **Backend API (Flask/Python)**

   - ✅ Transaction validation endpoint (`/api/transaction/validate`)
   - ✅ Card registration endpoint (`/api/card/register`)
   - ✅ Geospatial distance calculation using Haversine formula
   - ✅ Swagger API documentation
   - ✅ Mock user location database

2. **Frontend POS Simulator (HTML/JS)**

   - ✅ Transaction form with location input
   - ✅ Preset location buttons (Harvard, MIT, NYC, SF)
   - ✅ Real-time geolocation integration
   - ✅ API integration with backend
   - ✅ Responsive UI with modern design

3. **Geospatial Validation Engine**
   - ✅ Distance calculation between phone and transaction locations
   - ✅ Configurable distance thresholds (default: 0.25 miles)
   - ✅ Validation logic with detailed reasoning

### 🚧 **Missing Critical Components**

Based on the detailed app description, you need to implement:

1. **Mobile App (React Native/Expo)** - **HIGH PRIORITY**
2. **Cryptographic Security Layer** - **HIGH PRIORITY**
3. **Real-time Communication System** - **MEDIUM PRIORITY**
4. **Push Notification System** - **MEDIUM PRIORITY**
5. **Metrics Dashboard** - **LOW PRIORITY**

---

## 🗺️ Implementation Roadmap

### **Phase 1: Core Security & Mobile App (Days 1-2)**

#### 🔐 **Cryptographic Security Implementation**

- [ ] **Device Keypair Generation**

  - Implement ECDSA P-256 keypair generation in mobile app
  - Store private key in secure keystore (Android Keystore/iOS Secure Enclave)
  - Export public key to server during registration

- [ ] **Digital Signatures**

  - Implement canonical JSON signing for transaction proofs
  - Include `transaction_nonce` in signed payload to prevent replay attacks
  - Add signature verification in backend API

- [ ] **Device Attestation (Mock for Hackathon)**
  - Create mock attestation system for demo purposes
  - Document that attestation is mocked for hackathon
  - Plan for real attestation (Play Integrity/App Attest) for production

#### 📱 **Mobile App Development**

- [ ] **React Native/Expo Setup**

  - Initialize Expo project with TypeScript
  - Install required dependencies: `react-native-keychain`, `expo-location`, `expo-crypto`
  - Set up navigation and basic UI structure

- [ ] **Core Mobile Features**

  - [ ] GPS location collection with high accuracy
  - [ ] QR code scanning for transaction nonces
  - [ ] Keypair generation and secure storage
  - [ ] Transaction proof generation and signing
  - [ ] API integration with backend

- [ ] **Mobile UI Components**
  - [ ] Card registration screen
  - [ ] Transaction approval interface
  - [ ] Location permission handling
  - [ ] Biometric confirmation for suspicious transactions

### **Phase 2: Real-time Communication (Day 2-3)**

#### 🔄 **WebSocket Integration**

- [ ] **Backend WebSocket Server**

  - Add Socket.IO to Flask backend
  - Implement real-time transaction broadcasting
  - Handle mobile app connections

- [ ] **Frontend WebSocket Client**
  - Update POS simulator to use WebSocket
  - Real-time transaction status updates
  - Automatic mobile app notification

#### 📡 **Transaction Flow Implementation**

- [ ] **POS Transaction Creation**

  - Generate unique transaction nonces
  - Broadcast transaction to connected mobile apps
  - Display QR code with transaction details

- [ ] **Mobile App Response**
  - Auto-detect nearby transactions
  - Generate location proofs with signatures
  - Send proofs to backend for verification

### **Phase 3: Advanced Features (Day 3-4)**

#### 🔔 **Push Notification System**

- [ ] **Backend Push Service**

  - Integrate FCM (Firebase Cloud Messaging) for Android
  - Add APNs support for iOS
  - Implement push notification triggers

- [ ] **Mobile Push Handling**
  - Handle incoming push notifications
  - Display transaction confirmation dialogs
  - Process user approval/denial responses

#### 📊 **Metrics & Analytics Dashboard**

- [ ] **Backend Metrics Collection**

  - Log transaction decisions and timing
  - Track false-accepts avoided
  - Measure time-to-confirm
  - Count UX clicks per flow

- [ ] **Dashboard UI**
  - Create React dashboard for metrics visualization
  - Display privacy metrics and data minimization
  - Show success rates for each flow type

### **Phase 4: Demo Preparation (Day 4)**

#### 🎬 **Demo Script & Data**

- [ ] **Demo Scenarios**

  - Co-located transaction (auto-approve)
  - Different locations (push confirmation)
  - Phone missing (fallback authentication)

- [ ] **Privacy Documentation**
  - Create privacy slide explaining data minimization
  - Document retention policies
  - Show user control options

---

## 🛠️ Technical Implementation Details

### **Backend API Extensions Needed**

```python
# New endpoints to implement:
POST /api/register-device     # Device registration with public key
POST /api/prove-location      # Location proof submission
POST /api/confirm-transaction # Push confirmation handling
GET  /api/metrics            # Metrics dashboard data
```

### **Mobile App Architecture**

```
mobile-app/
├── src/
│   ├── components/
│   │   ├── LocationTracker.tsx
│   │   ├── QRScanner.tsx
│   │   └── TransactionApproval.tsx
│   ├── services/
│   │   ├── CryptoService.ts
│   │   ├── LocationService.ts
│   │   └── APIService.ts
│   ├── screens/
│   │   ├── RegisterScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   └── SettingsScreen.tsx
│   └── utils/
│       ├── KeyManager.ts
│       └── Attestation.ts
```

### **Security Implementation**

```typescript
// Example signature payload structure
interface LocationProof {
  card_token: string;
  transaction_nonce: string;
  transaction_id: string;
  location: { lat: number; lon: number };
  timestamp: string;
  attestation: string;
  signature: string;
}
```

---

## 🎯 Demo Scenarios

### **Scenario 1: Auto-Approval (Co-located)**

1. POS creates transaction at Harvard Campus
2. Mobile app detects nearby transaction
3. Generates location proof with signature
4. Backend verifies distance < 15m → **ACCEPT**
5. Transaction approved instantly

### **Scenario 2: Push Confirmation (Different Locations)**

1. POS creates transaction at Harvard Campus
2. Mobile app is 500m away (different location)
3. Backend returns **CONFIRM_REQUIRED**
4. Push notification sent to mobile app
5. User taps "Approve" → **ACCEPT**

### **Scenario 3: Fallback Authentication (Phone Missing)**

1. POS creates transaction
2. No mobile app response within 30 seconds
3. POS shows **PHONE MISSING**
4. Fallback to manual verification
5. Transaction approved with **FALLBACK_AUTH**

---

## 📊 Success Metrics to Track

1. **False-accepts Avoided**: Compare naive vs secure validation
2. **Time-to-Confirm**: Measure transaction processing time
3. **UX Clicks**: Count user interactions per flow
4. **Privacy Metrics**: Data retention and minimization stats
5. **Success Rates**: ACCEPT/CONFIRM/FLAG/FALLBACK counts

---

## 🚀 Quick Start Commands

```bash
# Backend setup
cd backend/api
pip install -r requirements.txt
python app.py

# Frontend setup
cd frontend
# Open transaction-simulator.html in browser

# Mobile app setup (when ready)
cd mobile-app
npm install
expo start
``` 

---

## 🔒 Security Considerations

- **Replay Attack Prevention**: Include transaction nonces in signatures
- **GPS Spoofing Mitigation**: Use device attestation + sensor fusion
- **Privacy Protection**: Ephemeral location data, minimal data collection
- **Secure Key Storage**: Platform keystore integration

---

## 📝 Next Immediate Steps

1. **Set up React Native/Expo project** for mobile app
2. **Implement cryptographic signing** in mobile app
3. **Add WebSocket support** to backend for real-time communication
4. **Create transaction nonce system** in POS simulator
5. **Build mobile app UI** for transaction approval

---

## 🎯 Hackathon Deliverables

- [ ] Working mobile app with location proof generation
- [ ] Real-time POS simulator with WebSocket integration
- [ ] Secure backend with signature verification
- [ ] Demo scenarios showing all three flows
- [ ] Metrics dashboard with privacy information
- [ ] Demo script and presentation slides

---

**Deadline**: October 5, 2025 at 7:00 AM  
**Current Status**: Basic backend and POS simulator complete, mobile app and security layer needed
