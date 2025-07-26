import { renderHook, act } from '@testing-library/react';
import { useConversations } from '../useConversations';
import { createMockMessage } from '../../tests/utils/mock-utils';

describe('useConversations', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Mock window.confirm
    global.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with empty conversations', () => {
    const { result } = renderHook(() => useConversations());

    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
  });

  it('should load conversations from localStorage', () => {
    const mockConversations = [
      {
        id: '1',
        name: 'Conversation 1',
        messages: [],
        model: 'test-model',
        systemPrompt: 'You are helpful',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    localStorage.setItem('dinoair-conversations', JSON.stringify(mockConversations));
    
    const { result } = renderHook(() => useConversations());

    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0]!.name).toBe('Conversation 1');
  });

  it('should save a new conversation', () => {
    const { result } = renderHook(() => useConversations());
    
    const messages = [
      createMockMessage({ role: 'user', content: 'Hello' }),
      createMockMessage({ role: 'assistant', content: 'Hi there!' }),
    ];

    act(() => {
      result.current.saveCurrentConversation(messages, 'test-model', 'You are helpful', 'Test Conversation');
    });

    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.activeConversationId).toBe(result.current.conversations[0]!.id);
    expect(result.current.conversations[0]!.name).toBe('Test Conversation');
    expect(result.current.conversations[0]!.messages).toEqual(messages);
    expect(result.current.conversations[0]!.model).toBe('test-model');
    expect(result.current.conversations[0]!.systemPrompt).toBe('You are helpful');
  });

  it('should update an existing conversation', () => {
    const { result } = renderHook(() => useConversations());
    
    // Create initial conversation
    const initialMessages = [createMockMessage({ content: 'Initial message' })];
    act(() => {
      result.current.saveCurrentConversation(initialMessages, 'model1', 'prompt1', 'Conv 1');
    });

    const newMessages = [
      ...initialMessages,
      createMockMessage({ content: 'New message' }),
    ];

    act(() => {
      result.current.saveCurrentConversation(newMessages, 'model1', 'prompt1', 'Conv 1 Updated');
    });

    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0]!.messages).toEqual(newMessages);
    expect(result.current.conversations[0]!.name).toBe('Conv 1 Updated');
    expect(result.current.conversations[0]!.updatedAt).toBeInstanceOf(Date);
  });

  it('should delete a conversation', () => {
    const { result } = renderHook(() => useConversations());
    
    // Create two conversations
    act(() => {
      result.current.saveCurrentConversation([createMockMessage()], 'model1', 'prompt1', 'Conv 1');
      result.current.startNewConversation();
      result.current.saveCurrentConversation([createMockMessage()], 'model2', 'prompt2', 'Conv 2');
    });

    expect(result.current.conversations).toHaveLength(2);
    const firstConvId = result.current.conversations[0]!.id;

    act(() => {
      result.current.deleteConversation(firstConvId);
    });

    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations.find(c => c.id === firstConvId)).toBeUndefined();
    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this conversation?');
  });

  it('should clear active conversation when deleted', () => {
    const { result } = renderHook(() => useConversations());
    
    act(() => {
      result.current.saveCurrentConversation([createMockMessage()], 'model1', 'prompt1', 'Conv 1');
    });

    const conversationId = result.current.activeConversationId;
    expect(conversationId).toBeTruthy();

    let wasDeleted: boolean = false;
    act(() => {
      wasDeleted = result.current.deleteConversation(conversationId!);
    });

    expect(wasDeleted).toBe(true);
    expect(result.current.activeConversationId).toBeNull();
  });

  it('should not delete if user cancels', () => {
    (global.confirm as jest.Mock).mockReturnValueOnce(false);
    const { result } = renderHook(() => useConversations());
    
    act(() => {
      result.current.saveCurrentConversation([createMockMessage()], 'model1', 'prompt1', 'Conv 1');
    });

    const conversationId = result.current.activeConversationId;
    
    act(() => {
      result.current.deleteConversation(conversationId!);
    });

    expect(result.current.conversations).toHaveLength(1);
  });

  it('should load a specific conversation', () => {
    const { result } = renderHook(() => useConversations());
    
    // Create two conversations
    act(() => {
      result.current.saveCurrentConversation([createMockMessage({ content: 'Conv 1' })], 'model1', 'prompt1', 'Conv 1');
      result.current.startNewConversation();
      result.current.saveCurrentConversation([createMockMessage({ content: 'Conv 2' })], 'model2', 'prompt2', 'Conv 2');
    });

    const firstConvId = result.current.conversations[0]!.id;

    let loadedConv;
    act(() => {
      loadedConv = result.current.loadConversation(firstConvId);
    });

    expect(result.current.activeConversationId).toBe(firstConvId);
    expect(loadedConv).toBeTruthy();
    expect(loadedConv!.messages[0].content).toBe('Conv 1');
  });

  it('should return null when loading non-existent conversation', () => {
    const { result } = renderHook(() => useConversations());
    
    let loadedConv;
    act(() => {
      loadedConv = result.current.loadConversation('non-existent');
    });

    expect(loadedConv).toBeNull();
  });

  it('should start a new conversation', () => {
    const { result } = renderHook(() => useConversations());
    
    act(() => {
      result.current.saveCurrentConversation([createMockMessage()], 'model1', 'prompt1', 'Conv 1');
    });

    expect(result.current.activeConversationId).toBeTruthy();

    act(() => {
      result.current.startNewConversation();
    });

    expect(result.current.activeConversationId).toBeNull();
  });

  it('should persist conversations to localStorage', () => {
    const { result } = renderHook(() => useConversations());
    
    act(() => {
      result.current.saveCurrentConversation([createMockMessage()], 'model1', 'prompt1', 'Conv 1');
    });

    const savedData = localStorage.getItem('dinoair-conversations');
    expect(savedData).toBeTruthy();
    
    const parsed = JSON.parse(savedData!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].model).toBe('model1');
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorage.setItem('dinoair-conversations', 'invalid json');
    
    const { result } = renderHook(() => useConversations());
    
    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversationId).toBeNull();
  });

  it('should use default name if not provided', () => {
    const { result } = renderHook(() => useConversations());
    
    act(() => {
      result.current.saveCurrentConversation([createMockMessage()], 'model', 'prompt');
    });

    expect(result.current.conversations[0]!.name).toContain('Conversation');
    expect(result.current.conversations[0]!.name).toMatch(/\d/); // Should contain numbers from date
  });
});
