import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheState {
  cache: Map<string, CacheEntry>;
  get: <T>(key: string) => T | null;
  set: <T>(key: string, data: T, ttl?: number) => void;
  invalidate: (key: string) => void;
  invalidatePattern: (pattern: string) => void;
  clear: () => void;
  isExpired: (entry: CacheEntry) => boolean;
  cleanup: () => void;
}

// Default TTL: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000;

// Maximum cache size to prevent memory issues
const MAX_CACHE_SIZE = 100;

export const useCacheStore = create<CacheState>()(
  persist(
    (set, get) => ({
      cache: new Map(),

      get: <T>(key: string): T | null => {
        const state = get();
        const entry = state.cache.get(key);
        
        if (!entry) return null;
        
        if (state.isExpired(entry)) {
          state.invalidate(key);
          return null;
        }
        
        return entry.data as T;
      },

      set: <T>(key: string, data: T, ttl: number = DEFAULT_TTL) => {
        set((state) => {
          const newCache = new Map(state.cache);
          
          // Implement LRU eviction if cache is too large
          if (newCache.size >= MAX_CACHE_SIZE) {
            const oldestKey = Array.from(newCache.entries())
              .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0]?.[0];
            if (oldestKey) {
              newCache.delete(oldestKey);
            }
          }
          
          newCache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
          });
          
          return { cache: newCache };
        });
      },

      invalidate: (key: string) => {
        set((state) => {
          const newCache = new Map(state.cache);
          newCache.delete(key);
          return { cache: newCache };
        });
      },

      invalidatePattern: (pattern: string) => {
        set((state) => {
          const regex = new RegExp(pattern);
          const newCache = new Map(state.cache);
          
          Array.from(newCache.keys()).forEach(key => {
            if (regex.test(key)) {
              newCache.delete(key);
            }
          });
          
          return { cache: newCache };
        });
      },

      clear: () => {
        set({ cache: new Map() });
      },

      isExpired: (entry: CacheEntry): boolean => {
        return Date.now() - entry.timestamp > entry.ttl;
      },

      cleanup: () => {
        set((state) => {
          const newCache = new Map(state.cache);
          const now = Date.now();
          
          Array.from(newCache.entries()).forEach(([key, entry]) => {
            if (now - entry.timestamp > entry.ttl) {
              newCache.delete(key);
            }
          });
          
          return { cache: newCache };
        });
      }
    }),
    {
      name: 'dinoair-cache',
      // Custom storage to handle Map serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              cache: new Map(state.cache)
            }
          };
        },
        setItem: (name, value) => {
          const serialized = {
            state: {
              ...value.state,
              cache: Array.from(value.state.cache.entries())
            }
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name)
      },
      // Only persist specific data
      partialize: (state) => ({ cache: state.cache })
    }
  )
);

// Cache key generation utilities
export const cacheKeys = {
  // Personality-related keys
  personality: (id: string) => `personality:${id}`,
  personalities: () => 'personalities:all',
  currentPersonality: () => 'personality:current',
  
  // Model-related keys
  models: () => 'models:all',
  model: (id: string) => `model:${id}`,
  
  // Chat-related keys
  chatHistory: (sessionId: string) => `chat:history:${sessionId}`,
  chatSession: (sessionId: string) => `chat:session:${sessionId}`,
  
  // Artifact-related keys
  artifacts: () => 'artifacts:all',
  artifact: (id: string) => `artifact:${id}`,
  
  // System-related keys
  systemHealth: () => 'system:health',
  systemStats: () => 'system:stats',
  
  // Generic key generator
  custom: (namespace: string, ...parts: string[]) => 
    [namespace, ...parts].filter(Boolean).join(':')
};

// TTL presets for different types of data
export const cacheTTL = {
  // Short-lived data (30 seconds)
  realtime: 30 * 1000,
  
  // Medium-lived data (5 minutes)
  standard: 5 * 60 * 1000,
  
  // Long-lived data (30 minutes)
  extended: 30 * 60 * 1000,
  
  // Very long-lived data (2 hours)
  persistent: 2 * 60 * 60 * 1000,
  
  // Session-based (24 hours)
  session: 24 * 60 * 60 * 1000
};

// Cleanup expired entries periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    useCacheStore.getState().cleanup();
  }, 60 * 1000); // Run every minute
}
