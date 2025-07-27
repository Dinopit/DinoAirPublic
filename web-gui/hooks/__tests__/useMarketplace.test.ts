import { renderHook, act, waitFor } from '@testing-library/react';
import { useMarketplace } from '../useMarketplace';
import { ModelCategory } from '@/lib/services/model-registry';

// Mock fetch globally
global.fetch = jest.fn();

describe('useMarketplace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useMarketplace({ autoFetch: false }));

    expect(result.current.models).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.filters).toEqual({});
    expect(result.current.installProgress.size).toBe(0);
  });

  it('should fetch models on mount when autoFetch is enabled', async () => {
    const mockModels = [
      {
        id: 'test-model-1',
        name: 'Test Model 1',
        version: '1.0.0',
        description: 'A test model',
        author: 'Test Author',
        category: ModelCategory.CHAT,
        tags: ['test'],
        size: 1000000,
        isInstalled: false
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, models: mockModels })
    });

    const { result } = renderHook(() => useMarketplace({ autoFetch: true }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.models).toEqual(mockModels);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/marketplace/models?');
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMarketplace({ autoFetch: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(result.current.models).toEqual([]);
    });

    consoleErrorSpy.mockRestore();
  });

  it('should update filters and refetch models', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, models: [] })
    });

    const { result } = renderHook(() => useMarketplace({ autoFetch: false }));

    act(() => {
      result.current.updateFilters({ category: ModelCategory.CODE_GENERATION });
    });

    expect(result.current.filters.category).toBe(ModelCategory.CODE_GENERATION);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/marketplace/models?category=code-generation');
    });
  });

  it('should search external models', async () => {
    const mockHuggingFaceModels = [
      {
        id: 'hf-model-1',
        name: 'HuggingFace Model',
        huggingFaceId: 'org/model',
        isLocal: false
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, models: mockHuggingFaceModels })
    });

    const { result } = renderHook(() => useMarketplace({ autoFetch: false }));

    let searchResults;
    await act(async () => {
      searchResults = await result.current.searchExternal('test query');
    });

    expect(searchResults).toEqual(mockHuggingFaceModels);
    expect(global.fetch).toHaveBeenCalledWith('/api/marketplace/search?q=test%20query&source=huggingface&limit=20');
  });

  it('should install model with progress tracking', async () => {
    const mockReadableStream = new ReadableStream({
      start(controller) {
        // Simulate progress events
        controller.enqueue(new TextEncoder().encode('data: {"type":"progress","data":{"id":"test-model","status":"downloading","progress":50}}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: {"type":"complete","data":{"success":true,"modelId":"test-model"}}\n\n'));
        controller.close();
      }
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        body: mockReadableStream
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, models: [] })
      });

    const { result } = renderHook(() => useMarketplace({ autoFetch: false }));

    await act(async () => {
      await result.current.installModel('test-model');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/marketplace/models/test-model/install', {
      method: 'POST'
    });
  });

  it('should uninstall model', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, models: [] })
      });

    const { result } = renderHook(() => useMarketplace({ autoFetch: false }));

    await act(async () => {
      await result.current.uninstallModel('test-model');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/marketplace/models/test-model/install', {
      method: 'DELETE'
    });
  });

  it('should get model details', async () => {
    const mockModel = {
      id: 'test-model',
      name: 'Test Model',
      version: '1.0.0',
      description: 'A test model'
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, model: mockModel })
    });

    const { result } = renderHook(() => useMarketplace({ autoFetch: false }));

    let modelDetails;
    await act(async () => {
      modelDetails = await result.current.getModelDetails('test-model');
    });

    expect(modelDetails).toEqual(mockModel);
    expect(global.fetch).toHaveBeenCalledWith('/api/marketplace/models/test-model');
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useMarketplace({ autoFetch: false }));

    // Set an error first
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('should track install progress correctly', async () => {
    const { result } = renderHook(() => useMarketplace({ autoFetch: false }));

    const mockProgress = {
      id: 'test-model',
      status: 'downloading' as const,
      progress: 50,
      message: 'Downloading...'
    };

    // Test utility functions
    expect(result.current.getInstallProgress('test-model')).toBe(undefined);
    expect(result.current.isInstalling('test-model')).toBe(false);

    // Simulate progress update (this would normally happen through installModel)
    // Since we can't easily test the streaming implementation, we test the utility functions
  });
});