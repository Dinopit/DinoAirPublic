# DinoAir Mobile App

Native mobile application for DinoAir with offline capabilities, push notifications, and mobile-optimized features.

## Features

### 🚀 Core Functionality
- **Native Performance**: Built with React Native for iOS and Android
- **Offline Mode**: Continue conversations without internet connection
- **Real-time Sync**: Seamless synchronization with DinoAir server
- **Push Notifications**: Stay updated with real-time alerts

### 🎯 Mobile-Optimized Features
- **Voice Integration**: Speech-to-text and text-to-speech capabilities
- **Camera Integration**: Document scanning, OCR, and image analysis
- **Gesture Controls**: Shake to clear, swipe actions, and intuitive navigation
- **Mobile Widgets**: Quick access from home screen (planned)

### 🔒 Privacy & Security
- **Local Storage**: SQLite database for offline data
- **End-to-end Sync**: Secure communication with DinoAir server
- **Biometric Auth**: Fingerprint/Face ID support (planned)

## Prerequisites

### Development Environment
- **Node.js** 18+
- **React Native CLI** or **Expo CLI**
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)

### Device Requirements
- **iOS**: 12.0 or later
- **Android**: API level 21 (Android 5.0) or later

## Installation

### 1. Clone and Setup
```bash
cd mobile-app
npm install
```

### 2. iOS Setup
```bash
cd ios
pod install
cd ..
```

### 3. Android Setup
- Open `android/` folder in Android Studio
- Sync Gradle files
- Ensure Android SDK is properly configured

## Development

### Start Metro Server
```bash
npm start
```

### Run on iOS
```bash
npm run ios
# or
npx react-native run-ios
```

### Run on Android
```bash
npm run android
# or
npx react-native run-android
```

### Development Tools
```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Testing
npm test
npm run test:watch
```

## Building for Production

### Android
```bash
npm run build:android
# APK will be in android/app/build/outputs/apk/release/
```

### iOS
```bash
npm run build:ios
# Follow Xcode archive process for App Store submission
```

## Configuration

### Server Connection
1. Open the app and go to Settings
2. Configure your DinoAir server URL (default: `http://localhost:3000`)
3. Add API key if required
4. Test connection and sync

### Firebase Setup (for Push Notifications)
1. Create a Firebase project
2. Add your iOS/Android apps to the project
3. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
4. Place configuration files in appropriate directories:
   - Android: `android/app/google-services.json`
   - iOS: `ios/DinoAirMobile/GoogleService-Info.plist`

## Project Structure

```
src/
├── components/          # Reusable UI components
├── navigation/          # Navigation configuration
├── screens/            # Screen components
│   ├── LoginScreen.tsx
│   ├── ChatScreen.tsx
│   ├── ConversationsScreen.tsx
│   ├── CameraScreen.tsx
│   ├── VoiceScreen.tsx
│   └── SettingsScreen.tsx
├── services/           # API and offline services
│   ├── DinoAirAPIService.ts
│   ├── OfflineService.ts
│   ├── NotificationService.ts
│   └── AuthService.ts
├── store/              # State management
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Key Services

### OfflineService
- SQLite database management
- Local message/conversation storage
- Sync queue management
- Conflict resolution

### DinoAirAPIService
- REST API communication
- WebSocket connections
- Background sync
- Error handling

### NotificationService
- Firebase Cloud Messaging
- Local notifications
- Cross-device sync alerts
- Notification routing

## Features Implementation Status

- [x] **Basic App Structure** - Navigation, screens, components
- [x] **Authentication** - Login/logout with DinoAir server
- [x] **Chat Interface** - Mobile-optimized messaging
- [x] **Offline Storage** - SQLite with conversation caching
- [x] **Voice Features** - Speech-to-text and text-to-speech
- [x] **Camera Integration** - Photo capture and document scanning
- [x] **Push Notifications** - Firebase messaging setup
- [x] **Settings** - Server configuration and preferences
- [ ] **Background Sync** - Automatic data synchronization
- [ ] **Widgets** - Home screen and control center widgets
- [ ] **Advanced Gestures** - Custom gesture recognition
- [ ] **Biometric Auth** - Fingerprint/Face ID
- [ ] **App Store Deployment** - Production builds and distribution

## API Integration

The mobile app integrates with the existing DinoAir backend APIs:

- **Chat API**: `/api/chat/send` for message exchange
- **Conversations API**: `/api/conversations` for conversation management
- **Artifacts API**: `/api/artifacts` for file/image storage
- **Health API**: `/api/health` for connection testing
- **WebSocket**: Real-time message delivery

## Testing

```bash
# Unit tests
npm test

# Test coverage
npm test -- --coverage

# Integration tests (when implemented)
npm run test:integration
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npm start -- --reset-cache
   ```

2. **Android build failures**
   ```bash
   cd android && ./gradlew clean && cd ..
   npm run android
   ```

3. **iOS build issues**
   ```bash
   cd ios && rm -rf Pods && pod install && cd ..
   npm run ios
   ```

4. **Voice features not working**
   - Check microphone permissions
   - Verify device speech services are enabled

5. **Camera not working**
   - Check camera permissions
   - Ensure camera hardware is available

### Performance Optimization

- Use React Native Flipper for debugging
- Monitor bundle size with Metro
- Implement lazy loading for screens
- Optimize images and assets

## Contributing

1. Follow React Native best practices
2. Use TypeScript for type safety
3. Write tests for new features
4. Update documentation
5. Test on both iOS and Android

## License

MIT License - see LICENSE file for details

## Support

For technical support and questions:
- GitHub Issues: [DinoAir GitHub Repository](https://github.com/Dinopit/DinoAirPublic)
- Email: Admin@dinopitstudios-llc.com
- Discord: [DinoAir Community](https://discord.gg/GVd4jSh3)