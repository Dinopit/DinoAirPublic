import messaging, {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NotificationPayload} from '../types';

export class NotificationService {
  private static isInitialized = false;
  private static fcmToken: string | null = null;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permission
      await this.requestPermission();
      
      // Get FCM token
      this.fcmToken = await messaging().getToken();
      await AsyncStorage.setItem('fcm_token', this.fcmToken);
      
      // Set up message handlers
      this.setupMessageHandlers();
      
      // Set up background message handler
      messaging().setBackgroundMessageHandler(this.backgroundMessageHandler);
      
      this.isInitialized = true;
      console.log('NotificationService initialized successfully');
      console.log('FCM Token:', this.fcmToken);
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      // Don't throw - notifications are optional
    }
  }

  private static async requestPermission(): Promise<void> {
    if (Platform.OS === 'android') {
      // Android 13+ requires explicit permission
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('Notification permission denied');
          return;
        }
      }
    } else {
      // iOS
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('Notification permission denied');
        return;
      }
    }
  }

  private static setupMessageHandlers(): void {
    // Foreground messages
    messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('Foreground message received:', remoteMessage);
      await this.handleMessage(remoteMessage);
    });

    // Background/quit state messages (when app is opened via notification)
    messaging().onNotificationOpenedApp((remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
      this.handleNotificationOpen(remoteMessage);
    });

    // Check if app was opened by notification (when app was completely quit)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('App opened by notification:', remoteMessage);
          this.handleNotificationOpen(remoteMessage);
        }
      });

    // Token refresh
    messaging().onTokenRefresh((token) => {
      console.log('FCM token refreshed:', token);
      this.fcmToken = token;
      AsyncStorage.setItem('fcm_token', token);
      // TODO: Send new token to server
    });
  }

  private static async backgroundMessageHandler(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    console.log('Background message received:', remoteMessage);
    await this.handleMessage(remoteMessage);
  }

  private static async handleMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    const notification = this.parseNotification(remoteMessage);
    
    // Store notification for later processing
    await this.storeNotification(notification);

    // Show local notification if app is in foreground
    if (remoteMessage.notification) {
      Alert.alert(
        notification.title,
        notification.body,
        [
          {text: 'OK', onPress: () => this.handleNotificationOpen(remoteMessage)},
        ]
      );
    }
  }

  private static handleNotificationOpen(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): void {
    const notification = this.parseNotification(remoteMessage);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'message':
        // Navigate to chat screen
        this.navigateToChat(notification.data?.conversationId);
        break;
      case 'sync':
        // Navigate to sync status
        this.navigateToSyncStatus();
        break;
      case 'system':
        // Navigate to settings
        this.navigateToSettings();
        break;
      default:
        // Default action
        break;
    }
  }

  private static parseNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): NotificationPayload {
    return {
      type: (remoteMessage.data?.type as any) || 'system',
      title: remoteMessage.notification?.title || 'DinoAir',
      body: remoteMessage.notification?.body || 'New notification',
      data: remoteMessage.data || {},
    };
  }

  private static async storeNotification(notification: NotificationPayload): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('stored_notifications');
      const notifications = stored ? JSON.parse(stored) : [];
      
      notifications.unshift({
        ...notification,
        timestamp: new Date().toISOString(),
        read: false,
      });

      // Keep only last 50 notifications
      if (notifications.length > 50) {
        notifications.splice(50);
      }

      await AsyncStorage.setItem('stored_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  // Navigation helpers (these would be connected to navigation service)
  private static navigateToChat(conversationId?: string): void {
    // TODO: Implement navigation to chat screen
    console.log('Navigate to chat:', conversationId);
  }

  private static navigateToSyncStatus(): void {
    // TODO: Implement navigation to sync status
    console.log('Navigate to sync status');
  }

  private static navigateToSettings(): void {
    // TODO: Implement navigation to settings
    console.log('Navigate to settings');
  }

  // Public methods
  static getFCMToken(): string | null {
    return this.fcmToken;
  }

  static async getStoredNotifications(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('stored_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored notifications:', error);
      return [];
    }
  }

  static async markNotificationAsRead(index: number): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('stored_notifications');
      const notifications = stored ? JSON.parse(stored) : [];
      
      if (notifications[index]) {
        notifications[index].read = true;
        await AsyncStorage.setItem('stored_notifications', JSON.stringify(notifications));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  static async clearAllNotifications(): Promise<void> {
    try {
      await AsyncStorage.removeItem('stored_notifications');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  // Send notification to server (for cross-device sync)
  static async registerDevice(userId: string): Promise<void> {
    if (!this.fcmToken) {
      console.warn('FCM token not available');
      return;
    }

    try {
      // This would send the FCM token to your DinoAir server
      // so it can send push notifications to this device
      const response = await fetch('http://localhost:3000/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers as needed
        },
        body: JSON.stringify({
          userId,
          fcmToken: this.fcmToken,
          platform: Platform.OS,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register device');
      }

      console.log('Device registered for notifications');
    } catch (error) {
      console.error('Failed to register device for notifications:', error);
    }
  }

  static async unregisterDevice(userId: string): Promise<void> {
    if (!this.fcmToken) return;

    try {
      await fetch('http://localhost:3000/api/notifications/unregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          fcmToken: this.fcmToken,
        }),
      });

      console.log('Device unregistered from notifications');
    } catch (error) {
      console.error('Failed to unregister device:', error);
    }
  }
}