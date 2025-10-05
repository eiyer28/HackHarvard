# 🔧 ProxyPay Mobile App Troubleshooting Guide

## WebSocket Connection Issues

### Problem: "WebSocket disconnected" or "Registration failed"

This is usually caused by network connectivity issues between your mobile device and the development server.

### Solutions:

#### 1. **Find Your Computer's IP Address**

**Windows:**

```bash
ipconfig
```

Look for "IPv4 Address" under your active network adapter (usually WiFi or Ethernet).

**Mac/Linux:**

```bash
ifconfig
```

Look for "inet" address under your active network interface.

#### 2. **Update the IP Address in the App**

The app currently uses `192.168.1.100` as the default IP. You need to replace this with your computer's actual IP address.

**Files to update:**

- `mobileApp/src/services/WebSocketService.ts` (line 39)
- `mobileApp/app/(tabs)/index.tsx` (line 28)

**Common IP address patterns:**

- `192.168.1.XXX` (most home routers)
- `192.168.0.XXX` (some home routers)
- `10.0.0.XXX` (some corporate networks)
- `172.16.XXX.XXX` (some networks)

#### 3. **Test the Connection**

1. Make sure your backend server is running:

   ```bash
   cd backend/api
   python app.py
   ```

2. Test if the server is reachable:
   - Use the "Test Server Connection" button in the app
   - Or manually visit `http://YOUR_IP:5000/api/health` in a browser

#### 4. **Network Requirements**

- Both your computer and mobile device must be on the same WiFi network
- Your computer's firewall must allow connections on port 5000
- Some corporate networks block device-to-device communication

#### 5. **Firewall Configuration**

**Windows:**

1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Add Python or allow port 5000

**Mac:**

1. System Preferences → Security & Privacy → Firewall
2. Allow Python or add port 5000

#### 6. **Alternative Solutions**

If you can't get the network connection working:

1. **Use ngrok (tunneling service):**

   ```bash
   # Install ngrok
   npm install -g ngrok

   # Create tunnel to your local server
   ngrok http 5000
   ```

   Then use the ngrok URL (e.g., `https://abc123.ngrok.io`) in the app.

2. **Use Expo's tunnel mode:**
   ```bash
   expo start --tunnel
   ```

### Registration Issues

#### Problem: "Device registration failed"

This usually happens when:

1. WebSocket is not connected (see WebSocket troubleshooting above)
2. Backend server is not running
3. Network connectivity issues

#### Solutions:

1. **Check WebSocket connection first** (use "Test Server Connection" button)
2. **Ensure backend is running** on your computer
3. **Check the console logs** for specific error messages
4. **Try the "Reconnect WebSocket" button** if connection is lost

### Storage Issues (iOS)

#### Problem: "SecureStore not working"

This was fixed in the latest update, but if you still have issues:

1. **Use the "Test Storage" button** to verify SecureStore is working
2. **Check console logs** for specific error messages
3. **Try the "Reset Device" button** to clear and regenerate keys

### Debug Information

The app now includes several debug buttons:

- **Test Storage**: Verifies SecureStore is working
- **Test Server Connection**: Tests HTTP connectivity to backend
- **Reconnect WebSocket**: Reconnects WebSocket if disconnected

### Common Error Messages

- **"WebSocket connection failed"**: Network/IP address issue
- **"Device not registered"**: HTTP registration failed, check server connectivity
- **"SecureStore not working"**: iOS storage issue (should be fixed now)
- **"Server not reachable"**: Backend not running or wrong IP address

### Getting Help

If you're still having issues:

1. **Check the console logs** in your development environment
2. **Use the debug buttons** in the app to identify the specific problem
3. **Verify your IP address** is correct and both devices are on the same network
4. **Make sure the backend server is running** and accessible
