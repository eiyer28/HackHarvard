# ProxyPay - Location-Based Transaction Security

## 💡 Inspiration

Credit card fraud costs consumers billions annually, with stolen card information being used for unauthorized purchases. Traditional fraud detection relies on reactive measures—analyzing patterns after damage is done. We asked ourselves: **What if we could prevent fraud in real-time by verifying the cardholder is physically present at the transaction location?**

ProxyPay was born from this vision: a seamless, privacy-focused system that uses your phone's location as a second factor of authentication, stopping fraudulent transactions before they occur.

---

## 🎯 What It Does

ProxyPay is a **location-based transaction validation system** that prevents credit card fraud by verifying that your authorized mobile device is physically near the transaction location.

### Key Features:

🛡️ **Real-Time Fraud Prevention**
- Automatically validates that your phone is at the same location as the credit card transaction
- Blocks transactions when your card is used far from your phone's location
- Prevents online fraud and card-not-present attacks

⚡ **Seamless User Experience**
- Zero-click approval when you're physically present (co-located transactions)
- Push notification confirmation for legitimate remote purchases
- Minimal friction for genuine transactions

🔒 **Privacy-First Design**
- Location data used only for validation—never stored permanently
- Data minimization: we only collect what's necessary
- You control which cards are protected

📱 **Smart Validation Flows**
- **Auto-Approve**: Transaction and phone within 15 meters → instant approval
- **Confirm Required**: Phone 15m-500m away → push notification for manual approval
- **Deny**: Phone >500m away or unreachable → transaction blocked

🔐 **Enhanced Security**
- WebSocket real-time communication between POS and mobile app
- Twilio 2FA integration for high-value transactions
- Geospatial distance calculation using Haversine formula

---

## 🛠️ How We Built It

### **Tech Stack:**

**Frontend (Transaction Simulator)**
- React 18 with Vite for lightning-fast development
- Socket.IO for real-time WebSocket communication
- Modern UI with glassmorphism effects and smooth animations
- Responsive design optimized for demo presentations

**Mobile App**
- React Native with Expo for cross-platform development
- Location tracking with high-accuracy GPS
- Real-time WebSocket integration for transaction notifications
- Secure location proof generation

**Backend**
- Python Flask for REST API and WebSocket server
- Socket.IO for real-time bidirectional communication
- Geospatial processing with Haversine distance calculation
- Twilio API integration for SMS 2FA on high-value transactions

**Architecture:**
```
┌─────────────┐         WebSocket          ┌─────────────┐
│   POS/Web   │◄──────────────────────────►│   Backend   │
│  Simulator  │         Socket.IO          │   (Flask)   │
└─────────────┘                            └─────────────┘
                                                   ▲
                                                   │
                                            WebSocket
                                                   │
                                                   ▼
                                           ┌─────────────┐
                                           │  Mobile App │
                                           │ (React Native)│
                                           └─────────────┘
```

### **Key Technical Implementations:**

1. **Geospatial Validation Engine**
   - Haversine formula for accurate distance calculation
   - Configurable distance thresholds (15m, 500m)
   - Multi-tier validation logic

2. **Real-Time Communication**
   - WebSocket rooms for transaction-specific channels
   - Event-driven architecture for instant updates
   - Automatic reconnection handling

3. **Location Proof System**
   - Mobile app continuously tracks location
   - Generates location proofs on transaction requests
   - Backend validates proximity and responds accordingly

4. **Professional UI/UX**
   - Auto-formatting credit card inputs
   - Preset location buttons for demo purposes
   - Live connection status indicators
   - Smooth animations and micro-interactions

---

## 🏆 Accomplishments That We're Proud Of

✨ **Built in 24 hours** - A fully functional fraud prevention system from concept to demo

🎨 **Beautiful, Professional UI** - Polished interface with gradient effects, animations, and thoughtful UX design that rivals production fintech apps

⚡ **Real-Time Architecture** - Implemented WebSocket communication for instant transaction validation across devices

📱 **Cross-Platform Mobile App** - Working React Native app with live location tracking and real-time transaction notifications

🧮 **Accurate Geospatial Processing** - Implemented Haversine formula for precise distance calculations between coordinates

🔐 **Security-First Approach** - Transaction nonces, WebSocket authentication, and privacy-conscious design

🎯 **Complete End-to-End Demo** - From POS transaction initiation to mobile app validation and response

---

## 🎓 What We Learned

### Technical Learnings:

**WebSocket Mastery**
- Implementing Socket.IO across frontend, backend, and mobile
- Managing real-time rooms and event broadcasting
- Handling connection state and error recovery

**Geospatial Computing**
- Understanding coordinate systems and distance calculations
- Implementing the Haversine formula for Earth surface distances
- Defining practical distance thresholds for fraud detection

**React Native + Web Integration**
- Building consistent experiences across web and mobile
- Managing real-time state synchronization
- Location permissions and GPS accuracy considerations

**Professional UI Development**
- Implementing glassmorphism and modern design trends
- Creating smooth animations with CSS and React
- Building responsive interfaces optimized for demos

### Product & Design Insights:

**Balancing Security & UX**
- Too strict = false rejections (frustrated users)
- Too lenient = fraud risk
- Found the sweet spot with multi-tier validation

**Privacy is a Feature**
- Users care about location tracking
- Ephemeral data builds trust
- Data minimization as a selling point

**Demo-Driven Development**
- Clear user flows are crucial for presentations
- Visual feedback makes security tangible
- Preset locations enable reproducible demos

---

## 🚧 Challenges We Faced

### 1. **WebSocket Synchronization Complexity**
**Problem**: Coordinating real-time communication between three systems (web, backend, mobile) with transaction-specific rooms and event handling.

**Solution**: Implemented a room-based architecture where each transaction gets its own channel (`pos_${transactionId}`), enabling isolated communication streams.

### 2. **Geospatial Accuracy vs. Usability**
**Problem**: GPS can be inaccurate, especially indoors. Too strict thresholds cause false rejections.

**Solution**: Created three validation tiers:
- 0-15m: Auto-approve (allows for GPS drift)
- 15m-500m: Manual confirmation (legitimate edge cases)
- >500m: Deny (clear fraud signal)

### 3. **Mobile App State Management**
**Problem**: Managing location updates, WebSocket connections, and transaction state simultaneously in React Native.

**Solution**: Used React hooks and context for centralized state, with automatic cleanup and reconnection logic.

### 4. **Demo Reliability**
**Problem**: Live GPS and network connections can fail during presentations.

**Solution**: Added preset location buttons, mock data support, and clear error handling with status indicators.

### 5. **UI Polish Under Time Constraints**
**Problem**: Building a production-quality UI in hours while implementing core functionality.

**Solution**: Used CSS variables for consistent theming, pre-built animation libraries, and focused on high-impact visual elements (gradients, shadows, smooth transitions).

---

## 🚀 What's Next for ProxyPay

### Short-Term Improvements:

🔐 **Cryptographic Security Layer**
- ECDSA keypair generation on mobile devices
- Digital signatures for location proofs
- Device attestation (Play Integrity API, Apple App Attest)

📊 **Analytics Dashboard**
- Real-time fraud detection metrics
- Success rate visualization
- Privacy compliance reporting

🌍 **Enhanced Location Intelligence**
- Wi-Fi and Bluetooth triangulation for indoor accuracy
- Sensor fusion for spoofing detection
- Predictive models for user movement patterns

### Long-Term Vision:

💳 **Card Network Integration**
- Partner with Visa/Mastercard for production deployment
- Become an additional fraud signal in authorization flow
- Support for all major card issuers

🏪 **Merchant Adoption**
- Point-of-sale terminal integration
- E-commerce checkout plugins (Stripe, Square)
- Fraud reduction guarantees for merchants

🤖 **AI-Powered Risk Scoring**
- Machine learning models for anomaly detection
- Behavioral biometrics (typing patterns, phone usage)
- Adaptive thresholds based on user patterns

🌐 **Global Expansion**
- Multi-currency support
- International compliance (GDPR, CCPA)
- Localization for 20+ languages

🔗 **Ecosystem Integration**
- Digital wallet support (Apple Pay, Google Pay)
- Cryptocurrency transaction validation
- IoT device authentication (smartwatches, fitness trackers)

### Impact Potential:

💰 **Financial Impact**: Preventing even 1% of credit card fraud could save **$800M annually** in the US alone.

🛡️ **Security Impact**: Adding a physical presence factor makes card-not-present fraud nearly impossible.

🌍 **Global Reach**: 2.8B smartphone users worldwide could benefit from location-based fraud prevention.

---

## 🎬 Try It Out

### Live Demo:
1. **Start Backend**: `cd backend/api && python app.py`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Launch Mobile App**: `cd mobileApp && npx expo start`

### Demo Scenarios:

**✅ Legitimate Transaction** (Auto-Approve)
- Set POS location to Harvard Campus
- Mobile app also at Harvard Campus
- Transaction instantly approved (distance < 15m)

**⚠️ Remote Purchase** (Manual Confirmation)
- Set POS location to Harvard Campus
- Mobile app at MIT (2.4 km away)
- Push notification sent → manual approval required

**❌ Fraudulent Transaction** (Denied)
- Set POS location to Harvard Campus
- Mobile app in San Francisco (4,300 km away)
- Transaction automatically denied

---

## 🏅 Built For HackHarvard 2025

**Team Members**: [Your Team Names]

**Technologies**: React, React Native, Flask, Socket.IO, Twilio, Expo, Python, WebSockets

**Category**: Fintech Security, Mobile Development, Real-Time Systems

---

## 📜 License

MIT License - Built with ❤️ for HackHarvard 2025

---

*ProxyPay: Securing transactions through location intelligence. Because your card should only work where you are.* 🛡️📱
