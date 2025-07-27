import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { apiClient } from '../api/enhanced-client';

import { useCacheStore, cacheKeys, cacheTTL } from './cache-store';
import { useToastStore } from './toast-store';

export interface Personality {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  system_prompt?: string; // Support both formats from API
  temperature?: number;
  maxTokens?: number;
  max_tokens?: number; // Support both formats from API
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface PersonalityState {
  // State
  personalities: Personality[];
  currentPersonality: Personality | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchPersonalities: (force?: boolean) => Promise<void>;
  setCurrentPersonality: (personality: Personality | null) => void;
  getPersonalityById: (id: string) => Personality | null;
  refreshPersonalities: () => Promise<void>;
  importPersonality: (file: File) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  
  // Cache management
  invalidateCache: () => void;
}

// Singleton instance for preventing duplicate API calls
let fetchPromise: Promise<void> | null = null;

export const usePersonalityStore = create<PersonalityState>()(
  persist(
    (set, get) => ({
      // Initial state
      personalities: [],
      currentPersonality: null,
      loading: false,
      error: null,
      lastFetched: null,

      // Fetch personalities with caching
      fetchPersonalities: async (force = false) => {
        const cache = useCacheStore.getState();
        const cacheKey = cacheKeys.personalities();

        // Return existing promise if already fetching
        if (fetchPromise && !force) {
          return fetchPromise;
        }

        // Check cache first if not forcing refresh
        if (!force) {
          const cachedData = cache.get<Personality[]>(cacheKey);
          if (cachedData) {
            set({
              personalities: cachedData,
              lastFetched: Date.now(),
              loading: false,
              error: null
            });
            return;
          }
        }

        // Create new fetch promise
        fetchPromise = (async () => {
          set({ loading: true, error: null });

          try {
            const response = await apiClient.get<Personality[]>('/v1/personalities');
            
            if (response.error) {
              throw new Error(response.error.message);
            }

            const personalities = response.data || [];
            
            // Normalize personality data to ensure consistent format
            const normalizedPersonalities = personalities.map((p: any) => ({
              ...p,
              systemPrompt: p.systemPrompt || p.system_prompt,
              maxTokens: p.maxTokens || p.max_tokens
            }));
            
            // Update cache
            cache.set(cacheKey, normalizedPersonalities, cacheTTL.extended);
            
            // Update store
            set({
              personalities: normalizedPersonalities,
              lastFetched: Date.now(),
              loading: false,
              error: null
            });

            // Set default personality if current is not set
            const currentPersonality = get().currentPersonality;
            if (!currentPersonality && normalizedPersonalities.length > 0) {
              const defaultPersonality = normalizedPersonalities.find((p: Personality) => p.isDefault) || normalizedPersonalities[0];
              get().setCurrentPersonality(defaultPersonality);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch personalities';
            set({
              loading: false,
              error: errorMessage
            });
            
            useToastStore.getState().addToast({
              title: 'Error',
              message: errorMessage,
              type: 'error'
            });
          } finally {
            fetchPromise = null;
          }
        })();

        return fetchPromise;
      },

      // Set current personality with caching
      setCurrentPersonality: (personality) => {
        const cache = useCacheStore.getState();
        const cacheKey = cacheKeys.currentPersonality();
        
        // Update cache
        if (personality) {
          cache.set(cacheKey, personality, cacheTTL.session);
        } else {
          cache.invalidate(cacheKey);
        }
        
        set({ currentPersonality: personality });
      },

      // Get personality by ID from cache or state
      getPersonalityById: (id) => {
        const cache = useCacheStore.getState();
        const cacheKey = cacheKeys.personality(id);
        
        // Check cache first
        const cached = cache.get<Personality>(cacheKey);
        if (cached) {
          return cached;
        }
        
        // Fall back to state
        const personality = get().personalities.find(p => p.id === id) || null;
        
        // Cache if found
        if (personality) {
          cache.set(cacheKey, personality, cacheTTL.standard);
        }
        
        return personality;
      },

      // Force refresh personalities
      refreshPersonalities: async () => {
        const cache = useCacheStore.getState();
        
        // Invalidate all personality caches
        cache.invalidatePattern('^personality:');
        cache.invalidate(cacheKeys.personalities());
        
        // Force fetch
        await get().fetchPersonalities(true);
      },

      // Clear error state
      clearError: () => set({ error: null }),

      // Import personality from file
      importPersonality: async (file: File) => {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await apiClient.post('/v1/personalities/import', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

          if (response.error) {
            return { success: false, error: response.error.message };
          }

          // Refresh personalities after successful import
          await get().refreshPersonalities();

          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to import personality';
          return { success: false, error: errorMessage };
        }
      },

      // Invalidate all personality caches
      invalidateCache: () => {
        const cache = useCacheStore.getState();
        cache.invalidatePattern('^personality:');
        cache.invalidate(cacheKeys.personalities());
        cache.invalidate(cacheKeys.currentPersonality());
        set({ lastFetched: null });
      }
    }),
    {
      name: 'dinoair-personality',
      // Only persist specific fields
      partialize: (state) => ({
        currentPersonality: state.currentPersonality,
        personalities: state.personalities,
        lastFetched: state.lastFetched
      })
    }
  )
);

// Initialize store and load cached current personality on mount
if (typeof window !== 'undefined') {
  const cache = useCacheStore.getState();
  const cachedCurrent = cache.get<Personality>(cacheKeys.currentPersonality());
  
  if (cachedCurrent) {
    usePersonalityStore.getState().setCurrentPersonality(cachedCurrent);
  }
  
  // Auto-fetch personalities on mount if not loaded
  const state = usePersonalityStore.getState();
  if (state.personalities.length === 0) {
    state.fetchPersonalities();
  }
}

// Export hooks for component usage
export const usePersonalities = () => {
  const personalities = usePersonalityStore((state) => state.personalities);
  const loading = usePersonalityStore((state) => state.loading);
  const error = usePersonalityStore((state) => state.error);
  const fetchPersonalities = usePersonalityStore((state) => state.fetchPersonalities);
  const refreshPersonalities = usePersonalityStore((state) => state.refreshPersonalities);
  
  return {
    personalities,
    loading,
    error,
    fetchPersonalities,
    refreshPersonalities
  };
};

export const useCurrentPersonality = () => {
  const currentPersonality = usePersonalityStore((state) => state.currentPersonality);
  const setCurrentPersonality = usePersonalityStore((state) => state.setCurrentPersonality);
  
  return {
    currentPersonality,
    setCurrentPersonality
  };
};

export const usePersonalityById = (id: string) => {
  const getPersonalityById = usePersonalityStore((state) => state.getPersonalityById);
  return getPersonalityById(id);
};

// Helper to get personality for API calls
export const getActivePersonality = (): Personality | null => {
  return usePersonalityStore.getState().currentPersonality;
};

// Helper to ensure personalities are loaded
export const ensurePersonalitiesLoaded = async (): Promise<void> => {
  const state = usePersonalityStore.getState();
  if (state.personalities.length === 0 && !state.loading) {
    await state.fetchPersonalities();
  }
};
