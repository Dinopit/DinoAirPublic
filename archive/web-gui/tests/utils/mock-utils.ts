// Mock utilities for testing

export const mockFetch = (response: any, options: { ok?: boolean; status?: number } = {}) => {
  const { ok = true, status = 200 } = options;
  
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
    body: response.body || null,
    statusText: ok ? 'OK' : 'Error',
  });
};

export const mockStreamResponse = (chunks: string[]) => {
  let index = 0;
  
  const reader = {
    read: jest.fn().mockImplementation(async () => {
      if (index < chunks.length) {
        const chunk = chunks[index];
        index++;
        const encoder = new TextEncoder();
        return { value: encoder.encode(chunk), done: false };
      }
      return { done: true };
    }),
  };
  
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => reader,
    },
  };
};

export const createMockModel = (overrides = {}): any => ({
  name: 'test-model',
  size: 1000000,
  digest: 'abc123',
  modified: new Date().toISOString(),
  ...overrides,
});

export const createMockPersonality = (overrides = {}): any => ({
  id: 'test-personality',
  name: 'Test Personality',
  prompt: 'You are a test assistant',
  modelOverride: null,
  voiceId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockMessage = (overrides = {}): any => ({
  id: '1',
  role: 'user',
  content: 'Test message',
  timestamp: new Date(),
  ...overrides,
});

export const createMockConversation = (overrides = {}): any => ({
  id: '1',
  title: 'Test Conversation',
  lastMessage: 'Last message',
  timestamp: new Date(),
  messages: [],
  model: 'test-model',
  personality: 'test-personality',
  ...overrides,
});

export const waitForAsync = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
};