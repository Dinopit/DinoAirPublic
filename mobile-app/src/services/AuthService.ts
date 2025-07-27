import AsyncStorage from '@react-native-async-storage/async-storage';
import {User} from '../types';

export class AuthService {
  private static isInitialized = false;
  private static currentUser: User | null = null;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load stored user data
      const userData = await AsyncStorage.getItem('current_user');
      if (userData) {
        this.currentUser = JSON.parse(userData);
      }

      this.isInitialized = true;
      console.log('AuthService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AuthService:', error);
    }
  }

  static async login(email: string, password: string): Promise<User> {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email, password}),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      this.currentUser = data.user;
      
      // Store user data and token
      await AsyncStorage.setItem('current_user', JSON.stringify(this.currentUser));
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('dinoair_api_key', data.apiKey || data.token);

      return this.currentUser;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      // Clear stored data
      await AsyncStorage.multiRemove([
        'current_user',
        'auth_token',
        'dinoair_api_key',
        'fcm_token',
      ]);

      this.currentUser = null;
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  static getCurrentUser(): User | null {
    return this.currentUser;
  }

  static isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  static async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('auth_token');
  }
}