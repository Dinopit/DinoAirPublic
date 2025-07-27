import {create} from 'zustand';
import {User} from '../types';
import {AuthService} from '../services/AuthService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({isLoading: true});
    try {
      const user = await AuthService.login(email, password);
      set({user, isAuthenticated: true, isLoading: false});
    } catch (error) {
      set({isLoading: false});
      throw error;
    }
  },

  logout: async () => {
    set({isLoading: true});
    try {
      await AuthService.logout();
      set({user: null, isAuthenticated: false, isLoading: false});
    } catch (error) {
      set({isLoading: false});
      throw error;
    }
  },

  checkAuthStatus: () => {
    const user = AuthService.getCurrentUser();
    const isAuthenticated = AuthService.isAuthenticated();
    set({user, isAuthenticated});
  },
}));