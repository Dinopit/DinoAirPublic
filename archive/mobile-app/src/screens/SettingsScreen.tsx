import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuthStore} from '../store/authStore';
import {DinoAirAPIService} from '../services/DinoAirAPIService';
import {OfflineService} from '../services/OfflineService';
import {NotificationService} from '../services/NotificationService';

const SettingsScreen: React.FC = () => {
  const {user, logout} = useAuthStore();
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');
  const [apiKey, setApiKey] = useState('');
  const [pushNotifications, setPushNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  useEffect(() => {
    loadSettings();
    checkSyncStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const storedUrl = await AsyncStorage.getItem('dinoair_base_url');
      if (storedUrl) setServerUrl(storedUrl);

      const storedApiKey = await AsyncStorage.getItem('dinoair_api_key');
      if (storedApiKey) setApiKey(storedApiKey);

      const notifications = await AsyncStorage.getItem('push_notifications');
      if (notifications) setPushNotifications(JSON.parse(notifications));

      const offline = await AsyncStorage.getItem('offline_mode');
      if (offline) setOfflineMode(JSON.parse(offline));

      const voice = await AsyncStorage.getItem('voice_enabled');
      if (voice) setVoiceEnabled(JSON.parse(voice));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const status = await OfflineService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to check sync status:', error);
    }
  };

  const saveServerConfig = async () => {
    try {
      await DinoAirAPIService.setConfiguration(serverUrl, apiKey);
      Alert.alert('Success', 'Server configuration saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save server configuration');
    }
  };

  const syncNow = async () => {
    try {
      await DinoAirAPIService.syncPendingData();
      await checkSyncStatus();
      Alert.alert('Success', 'Data synchronized successfully');
    } catch (error) {
      Alert.alert('Sync Failed', 'Unable to sync data. Check your connection.');
    }
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and you may lose unsynchronized messages. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const togglePushNotifications = async (value: boolean) => {
    setPushNotifications(value);
    await AsyncStorage.setItem('push_notifications', JSON.stringify(value));
    
    if (value && user) {
      await NotificationService.registerDevice(user.id);
    } else if (user) {
      await NotificationService.unregisterDevice(user.id);
    }
  };

  const toggleOfflineMode = async (value: boolean) => {
    setOfflineMode(value);
    await AsyncStorage.setItem('offline_mode', JSON.stringify(value));
  };

  const toggleVoiceEnabled = async (value: boolean) => {
    setVoiceEnabled(value);
    await AsyncStorage.setItem('voice_enabled', JSON.stringify(value));
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    rightComponent?: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <Icon name={icon} size={24} color="#007AFF" />
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* User Profile */}
      {user && (
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.username}>{user.username}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Server Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Configuration</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Server URL</Text>
          <TextInput
            style={styles.textInput}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://localhost:3000"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>API Key (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Enter API key"
            placeholderTextColor="#666"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveServerConfig}>
          <Text style={styles.saveButtonText}>Save Configuration</Text>
        </TouchableOpacity>
      </View>

      {/* Sync Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync Status</Text>
        
        {syncStatus && (
          <View style={styles.syncStatusContainer}>
            <View style={styles.syncStatusItem}>
              <Text style={styles.syncStatusLabel}>Connection</Text>
              <View style={[styles.statusIndicator, syncStatus.isOnline ? styles.online : styles.offline]} />
              <Text style={styles.syncStatusValue}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            
            <View style={styles.syncStatusItem}>
              <Text style={styles.syncStatusLabel}>Pending Messages</Text>
              <Text style={styles.syncStatusValue}>{syncStatus.pendingMessages}</Text>
            </View>
            
            <View style={styles.syncStatusItem}>
              <Text style={styles.syncStatusLabel}>Last Sync</Text>
              <Text style={styles.syncStatusValue}>
                {syncStatus.lastSync 
                  ? new Date(syncStatus.lastSync).toLocaleString()
                  : 'Never'
                }
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.syncButton} onPress={syncNow}>
          <Icon name="sync" size={20} color="#fff" />
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      </View>

      {/* App Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        {renderSettingItem(
          'notifications',
          'Push Notifications',
          'Receive alerts for new messages',
          <Switch
            value={pushNotifications}
            onValueChange={togglePushNotifications}
            trackColor={{false: '#333', true: '#007AFF'}}
            thumbColor="#fff"
          />
        )}

        {renderSettingItem(
          'cloud-off',
          'Offline Mode',
          'Continue working without internet',
          <Switch
            value={offlineMode}
            onValueChange={toggleOfflineMode}
            trackColor={{false: '#333', true: '#007AFF'}}
            thumbColor="#fff"
          />
        )}

        {renderSettingItem(
          'mic',
          'Voice Features',
          'Enable voice recording and speech',
          <Switch
            value={voiceEnabled}
            onValueChange={toggleVoiceEnabled}
            trackColor={{false: '#333', true: '#007AFF'}}
            thumbColor="#fff"
          />
        )}

        {renderSettingItem(
          'palette',
          'Dark Mode',
          'Currently enabled',
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{false: '#333', true: '#007AFF'}}
            thumbColor="#fff"
          />
        )}
      </View>

      {/* Advanced Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advanced</Text>
        
        {renderSettingItem(
          'storage',
          'Clear Cache',
          'Free up storage space',
          <Icon name="chevron-right" size={24} color="#666" />,
          clearCache
        )}

        {renderSettingItem(
          'info',
          'About',
          'Version 1.0.0',
          <Icon name="chevron-right" size={24} color="#666" />,
          () => Alert.alert('About', 'DinoAir Mobile v1.0.0\nBuilt with React Native')
        )}

        {renderSettingItem(
          'help',
          'Help & Support',
          'Get help and report issues',
          <Icon name="chevron-right" size={24} color="#666" />,
          () => Alert.alert('Help', 'Visit dinopitstudios-llc.com for support')
        )}
      </View>

      {/* Sign Out */}
      {user && (
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#ff3b30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          DinoAir Mobile • Your AI companion that respects your privacy
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  profileSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  syncStatusContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  syncStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncStatusLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  syncStatusValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  online: {
    backgroundColor: '#34c759',
  },
  offline: {
    backgroundColor: '#ff3b30',
  },
  syncButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    margin: 20,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  signOutText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default SettingsScreen;