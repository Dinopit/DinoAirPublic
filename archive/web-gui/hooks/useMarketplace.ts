import { useState, useEffect, useCallback } from 'react';
import { ModelMetadata, ModelCategory, ModelInstallProgress } from '@/lib/services/model-registry';

export interface UseMarketplaceOptions {
  category?: ModelCategory;
  tags?: string[];
  installed?: boolean;
  autoFetch?: boolean;
}

export interface MarketplaceFilters {
  category?: ModelCategory;
  tags?: string[];
  installed?: boolean;
  search?: string;
}

export const useMarketplace = (options: UseMarketplaceOptions = {}) => {
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MarketplaceFilters>({
    category: options.category,
    tags: options.tags,
    installed: options.installed
  });
  const [installProgress, setInstallProgress] = useState<Map<string, ModelInstallProgress>>(new Map());

  // Fetch models from marketplace
  const fetchModels = useCallback(async (customFilters?: MarketplaceFilters) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const activeFilters = customFilters || filters;
      const params = new URLSearchParams();
      
      if (activeFilters.category) params.append('category', activeFilters.category);
      if (activeFilters.tags && activeFilters.tags.length > 0) {
        params.append('tags', activeFilters.tags.join(','));
      }
      if (activeFilters.installed !== undefined) {
        params.append('installed', activeFilters.installed.toString());
      }
      if (activeFilters.search) params.append('search', activeFilters.search);

      const response = await fetch(`/api/marketplace/models?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch models');
      }
      
      setModels(data.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.tags, filters.installed, filters.search]);

  // Search external repositories
  const searchExternal = useCallback(async (query: string, source: 'huggingface' = 'huggingface', limit: number = 20) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        q: query,
        source,
        limit: limit.toString()
      });

      const response = await fetch(`/api/marketplace/search?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to search models');
      }
      
      return data.models;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search models');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Install a model
  const installModel = useCallback(async (modelId: string) => {
    try {
      const response = await fetch(`/api/marketplace/models/${modelId}/install`, {
        method: 'POST'
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line.length > 6) {
            try {
              const eventData = JSON.parse(line.slice(6));
              
              if (eventData.type === 'progress') {
                setInstallProgress(prev => new Map(prev.set(modelId, eventData.data)));
              } else if (eventData.type === 'complete') {
                setInstallProgress(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(modelId);
                  return newMap;
                });
                // Refresh models to show updated installation status
                fetchModels();
              } else if (eventData.type === 'error') {
                setInstallProgress(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(modelId);
                  return newMap;
                });
                throw new Error(eventData.data.error || 'Installation failed');
              }
            } catch (parseError) {
              console.error('Failed to parse event data:', parseError);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install model');
      setInstallProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(modelId);
        return newMap;
      });
    }
  }, [fetchModels]);

  // Uninstall a model
  const uninstallModel = useCallback(async (modelId: string) => {
    try {
      const response = await fetch(`/api/marketplace/models/${modelId}/install`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to uninstall model');
      }

      // Refresh models to show updated installation status
      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to uninstall model');
    }
  }, [fetchModels]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<MarketplaceFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    fetchModels(updatedFilters);
  }, [filters, fetchModels]);

  // Get model details
  const getModelDetails = useCallback(async (modelId: string): Promise<ModelMetadata | null> => {
    try {
      const response = await fetch(`/api/marketplace/models/${modelId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch model details');
      }
      
      return data.model;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch model details');
      return null;
    }
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchModels();
    }
  }, [fetchModels, options.autoFetch]);

  return {
    models,
    isLoading,
    error,
    filters,
    installProgress,
    
    // Actions
    fetchModels,
    searchExternal,
    installModel,
    uninstallModel,
    updateFilters,
    getModelDetails,
    
    // Utilities
    clearError: () => setError(null),
    getInstallProgress: (modelId: string) => installProgress.get(modelId),
    isInstalling: (modelId: string) => installProgress.has(modelId)
  };
};