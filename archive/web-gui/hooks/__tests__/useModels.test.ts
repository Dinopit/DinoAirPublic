import { renderHook, act, waitFor } from '@testing-library/react';
import { useModels } from '../useModels';
import { createMockModel } from '../../tests/utils/mock-utils';

describe('useModels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useModels());

    expect(result.current.models).toEqual([]);
    expect(result.current.selectedModel).toBe('qwen:7b-chat-v1.5-q4_K_M');
    expect(result.current.isLoadingModels).toBe(false);
  });

  it('should initialize with custom default model', () => {
    const { result } = renderHook(() => useModels('custom-model'));

    expect(result.current.selectedModel).toBe('custom-model');
  });

  it('should fetch models on mount', async () => {
    const mockModels = [
      createMockModel({ name: 'model1', size: 1000 }),
      createMockModel({ name: 'model2', size: 2000 }),
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ models: mockModels }),
    });

    const { result } = renderHook(() => useModels());

    expect(result.current.isLoadingModels).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoadingModels).toBe(false);
      expect(result.current.models).toEqual(mockModels);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/ollama/models');
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.isLoadingModels).toBe(false);
      expect(result.current.models).toEqual([]);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch models:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should handle API error responses', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.isLoadingModels).toBe(false);
      expect(result.current.models).toEqual([]);
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should handle empty models response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    });

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.isLoadingModels).toBe(false);
      expect(result.current.models).toEqual([]);
    });
  });

  it('should handle missing models field in response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.isLoadingModels).toBe(false);
      expect(result.current.models).toEqual([]);
    });
  });

  it('should update selected model', () => {
    const { result } = renderHook(() => useModels());

    act(() => {
      result.current.setSelectedModel('new-model');
    });

    expect(result.current.selectedModel).toBe('new-model');
  });

  it('should refetch models when requested', async () => {
    const mockModels = [createMockModel({ name: 'model1' })];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ models: mockModels }),
    });

    const { result } = renderHook(() => useModels());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.models).toEqual(mockModels);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Refetch models
    act(() => {
      result.current.refetchModels();
    });

    expect(result.current.isLoadingModels).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoadingModels).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should not lose selected model on refetch', async () => {
    const mockModels = [
      createMockModel({ name: 'model1' }),
      createMockModel({ name: 'model2' }),
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ models: mockModels }),
    });

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.models).toEqual(mockModels);
    });

    // Select a different model
    act(() => {
      result.current.setSelectedModel('model2');
    });

    // Refetch
    act(() => {
      result.current.refetchModels();
    });

    await waitFor(() => {
      expect(result.current.isLoadingModels).toBe(false);
    });

    // Selected model should remain the same
    expect(result.current.selectedModel).toBe('model2');
  });
});
