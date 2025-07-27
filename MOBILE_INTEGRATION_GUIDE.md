# DinoAir Mobile App Integration Guide

This guide explains how to integrate the DinoAir mobile app with the existing DinoAir backend infrastructure.

## Architecture Overview

The mobile app is designed to work seamlessly with the existing DinoAir backend:

```
DinoAir Mobile App
       ↓
   REST APIs / WebSocket
       ↓
DinoAir Backend (web-gui-node)
       ↓
   Ollama / ComfyUI
```

## Backend Integration Points

### 1. API Endpoints Used

The mobile app integrates with these existing DinoAir endpoints:

- **Chat API**: `POST /api/chat/send` - Message exchange
- **Conversations API**: `GET/POST /api/conversations` - Conversation management
- **Artifacts API**: `GET/POST /api/artifacts` - File and image storage
- **Health Check**: `GET /api/health` - Connection testing
- **Authentication**: `POST /api/auth/login` - User authentication

### 2. WebSocket Integration

Real-time features use WebSocket connections:
- Real-time message delivery
- Sync status updates
- Cross-device notifications

### 3. Required Backend Modifications

To fully support the mobile app, add these endpoints to `web-gui-node`:

#### Push Notification Registration
```javascript
// In web-gui-node/routes/notifications.js
app.post('/api/notifications/register', (req, res) => {
  const { userId, fcmToken, platform } = req.body;
  // Store FCM token for user
  // Return success response
});

app.post('/api/notifications/unregister', (req, res) => {
  const { userId, fcmToken } = req.body;
  // Remove FCM token for user
  // Return success response
});
```

#### Enhanced Authentication
```javascript
// In web-gui-node/routes/auth.js
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  // Validate credentials
  // Generate API key for mobile access
  res.json({
    user: userDetails,
    token: jwtToken,
    apiKey: mobileApiKey
  });
});
```

## Mobile App Configuration

### 1. Server Connection Setup

In the mobile app settings, configure:
- **Server URL**: Point to your DinoAir backend (e.g., `http://your-server:3000`)
- **API Key**: Optional API key for authenticated access

### 2. Firebase Setup for Push Notifications

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Add iOS and Android apps to your project
3. Download configuration files:
   - `google-services.json` for Android → `mobile-app/android/app/`
   - `GoogleService-Info.plist` for iOS → `mobile-app/ios/DinoAirMobile/`

### 3. Environment Configuration

Create `.env` file in `mobile-app/`:
```env
DINOAIR_DEFAULT_SERVER_URL=http://localhost:3000
FIREBASE_PROJECT_ID=your-firebase-project
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_VOICE_FEATURES=true
ENABLE_CAMERA_FEATURES=true
```

## Development Setup

### 1. Backend Preparation

Ensure your DinoAir backend is running:
```bash
cd web-gui-node
npm install
npm start
# Server should be running on http://localhost:3000
```

### 2. Mobile App Setup

```bash
cd mobile-app
npm install

# For iOS (macOS only)
cd ios && pod install && cd ..

# For Android
# Open android/ in Android Studio and sync

# Run the app
npm run ios     # or
npm run android
```

### 3. Testing the Integration

1. **Connection Test**: Open Settings → Test server connection
2. **Authentication**: Login with DinoAir credentials
3. **Chat Test**: Send a message and verify it appears in web UI
4. **Offline Test**: Disable internet, send messages, then reconnect to sync

## Production Deployment

### 1. Backend Considerations

- **CORS Configuration**: Allow mobile app origins
- **Rate Limiting**: Configure appropriate limits for mobile requests
- **SSL/TLS**: Use HTTPS for production
- **Load Balancing**: Consider mobile traffic in scaling

### 2. Mobile App Store Deployment

#### iOS App Store
1. Configure signing certificates in Xcode
2. Update Info.plist with production settings
3. Build release version: `npm run build:ios`
4. Submit through App Store Connect

#### Google Play Store
1. Generate signed APK: `npm run build:android`
2. Create app listing in Google Play Console
3. Upload APK and submit for review

### 3. Push Notification Setup

#### Backend Firebase Admin Setup
```javascript
// In web-gui-node
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Send notification to mobile devices
function sendNotificationToUser(userId, notification) {
  const message = {
    notification: {
      title: notification.title,
      body: notification.body
    },
    data: notification.data,
    token: userFCMToken
  };
  
  return admin.messaging().send(message);
}
```

## Security Considerations

### 1. API Security
- Use JWT tokens for authentication
- Implement rate limiting for mobile endpoints
- Validate all input from mobile clients

### 2. Data Privacy
- All data stays local in offline mode
- Encrypted storage for sensitive data
- Secure sync protocols

### 3. Network Security
- Use HTTPS for all API communication
- Implement certificate pinning for production
- Validate server certificates

## Monitoring and Analytics

### 1. Backend Monitoring
- Track mobile API usage
- Monitor sync performance
- Log mobile-specific errors

### 2. Mobile App Analytics
- Track user engagement
- Monitor offline usage patterns
- Crash reporting and performance metrics

## Troubleshooting

### Common Integration Issues

1. **Connection Refused**
   - Check server URL in mobile app settings
   - Verify backend is running and accessible
   - Check firewall/network settings

2. **Authentication Failures**
   - Verify API key configuration
   - Check JWT token expiration
   - Validate user credentials

3. **Sync Issues**
   - Check network connectivity
   - Verify sync queue processing
   - Look for database conflicts

4. **Push Notifications Not Working**
   - Verify Firebase configuration
   - Check device permissions
   - Validate FCM token registration

### Debug Tools

- **React Native Debugger**: For mobile app debugging
- **Flipper**: Network requests and storage inspection
- **Firebase Console**: Push notification testing
- **Backend Logs**: Server-side request tracking

## Support and Documentation

- **Mobile App README**: `mobile-app/README.md`
- **API Documentation**: DinoAir backend API docs
- **Firebase Docs**: [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- **React Native Docs**: [React Native Documentation](https://reactnative.dev/docs/getting-started)

For technical support, create an issue in the DinoAir repository or contact the development team.