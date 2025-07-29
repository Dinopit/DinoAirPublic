import { useState, useEffect, useCallback } from 'react';

export interface Model {
  name: string;
  size: number;
  digest: string;
  modified: string;
}

export const useModels = (defaultModel: string = 'qwen:7b-chat-v1.5-q4_K_M') => {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Fetch available models
  const fetchModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const response = await fetch('/api/ollama/models');
      const data = await response.json();
      if (data.models) {
        setModels(data.models);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
    refetchModels: fetchModels
  };
};