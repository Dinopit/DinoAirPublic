import React, {useEffect} from 'react';
import {StatusBar, Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import MainNavigator from './navigation/MainNavigator';
import {NotificationService} from './services/NotificationService';
import {OfflineService} from './services/OfflineService';
import {DinoAirAPIService} from './services/DinoAirAPIService';
import {AuthService} from './services/AuthService';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize services
    NotificationService.initialize();
    OfflineService.initialize();
    DinoAirAPIService.initialize();
    AuthService.initialize();
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
          backgroundColor="#1a1a1a"
        />
        <NavigationContainer>
          <MainNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;