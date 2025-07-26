import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../useChat';
import { mockStreamResponse } from '../../tests/utils/mock-utils';

// Mock the CodeBlockDetector
jest.mock('@/lib/utils/code-block-detector', () => ({
  CodeBlockDetector: {
    detectCodeBlocks: jest.fn().mockReturnValue([]),
    codeBlocksToArtifacts: jest.fn().mockReturnValue([]),
  },
}));

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with welcome message', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('assistant');
    expect(result.current.messages[0].content).toContain('Welcome to DinoAir');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isStreaming).toBe(false);
  });

  it('should reset messages to initial state', () => {
    const { result } = renderHook(() => useChat());

    // Add a message first
    act(() => {
      result.current.setMessages([
        ...result.current.messages,
        { id: '2', role: 'user', content: 'Test', timestamp: new Date() },
      ]);
    });

    expect(result.current.messages).toHaveLength(2);

    // Reset messages
    act(() => {
      result.current.resetMessages();
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toContain('Welcome to DinoAir');
  });

  it('should send a message successfully with streaming', async () => {
    const { result } = renderHook(() => useChat());
    
    const mockResponse = mockStreamResponse(['Hello', ' from', ' AI']);
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    let response;
    await act(async () => {
      response = await result.current.sendMessage('Test message', 'test-model', 'You are helpful');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: expect.any(Array),
        model: 'test-model',
        systemPrompt: 'You are helpful',
      }),
      signal: expect.any(AbortSignal),
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3); // Welcome + user + assistant
      expect(result.current.messages[1].role).toBe('user');
      expect(result.current.messages[1].content).toBe('Test message');
      expect(result.current.messages[2].role).toBe('assistant');
      expect(result.current.messages[2].content).toBe('Hello from AI');
    });

    expect(response).toEqual({
      content: 'Hello from AI',
      artifacts: undefined,
    });
  });

  it('should handle API errors', async () => {
    const { result } = renderHook(() => useChat());
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'Server error occurred' }),
    });

    await expect(
      act(async () => {
        await result.current.sendMessage('Test message', 'test-model', 'System prompt');
      })
    ).rejects.toThrow('Server error occurred');

    expect(result.current.messages[result.current.messages.length - 1].content).toContain('Error: Server error occurred');
  });

  it('should handle network errors', async () => {
    const { result } = renderHook(() => useChat());
    
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(
      act(async () => {
        await result.current.sendMessage('Test message', 'test-model', 'System prompt');
      })
    ).rejects.toThrow('Network error');

    expect(result.current.messages[result.current.messages.length - 1].content).toContain('Error: Network error');
  });

  it('should not send empty messages', async () => {
    const { result } = renderHook(() => useChat());

    await expect(
      act(async () => {
        await result.current.sendMessage('  ', 'test-model', 'System prompt');
      })
    ).rejects.toThrow('Invalid message or already loading');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should prevent sending while loading', async () => {
    const { result } = renderHook(() => useChat());
    
    // Set loading state manually
    act(() => {
      result.current.setMessages([]);
    });
    
    const mockResponse = mockStreamResponse(['Response']);
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    // Start first request
    const promise1 = act(async () => {
      await result.current.sendMessage('First message', 'test-model', 'System prompt');
    });

    // Try to send second message while first is loading
    await expect(
      act(async () => {
        await result.current.sendMessage('Second message', 'test-model', 'System prompt');
      })
    ).rejects.toThrow('Invalid message or already loading');

    await promise1;
  });

  it('should cancel streaming', async () => {
    const { result } = renderHook(() => useChat());
    
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    
    (global.fetch as jest.Mock).mockRejectedValue(abortError);

    // Start sending message
    const sendPromise = act(async () => {
      await result.current.sendMessage('Test message', 'test-model', 'System prompt').catch(() => {});
    });

    // Cancel streaming
    act(() => {
      result.current.cancelStreaming();
    });

    await sendPromise;

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isStreaming).toBe(false);
  });

  it('should detect code blocks and create artifacts', async () => {
    const { result } = renderHook(() => useChat());
    
    const mockCodeBlocks = [
      { language: 'javascript', code: 'console.log("test");' }
    ];
    
    const mockArtifacts = [
      { name: 'code-1', type: 'javascript', content: 'console.log("test");' }
    ];
    
    const { CodeBlockDetector } = require('@/lib/utils/code-block-detector');
    CodeBlockDetector.detectCodeBlocks.mockReturnValue(mockCodeBlocks);
    CodeBlockDetector.codeBlocksToArtifacts.mockReturnValue(mockArtifacts);
    
    const mockResponse = mockStreamResponse(['```javascript\nconsole.log("test");\n```']);
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    let response;
    await act(async () => {
      response = await result.current.sendMessage('Show me code', 'test-model', 'System prompt');
    });

    expect(CodeBlockDetector.detectCodeBlocks).toHaveBeenCalledWith('```javascript\nconsole.log("test");\n```');
    expect(CodeBlockDetector.codeBlocksToArtifacts).toHaveBeenCalledWith(mockCodeBlocks);
    expect(response).toEqual({
      content: '```javascript\nconsole.log("test");\n```',
      artifacts: mockArtifacts,
    });
  });
});
