import { GET, OPTIONS } from '../route';
import { createMockRequest, parseApiResponse, createMockMiddlewareResult } from '@/tests/utils/api-test-utils';
import fs from 'fs/promises';
import path from 'path';

// Mock the dependencies
jest.mock('@/lib/api-utils', () => ({
  apiMiddleware: jest.fn(),
  createApiResponse: jest.fn((data, _request, clientId) => {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId,
      },
    });
  }),
  handleOptionsRequest: jest.fn(() => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }),
  createErrorResponse: jest.fn((message, status) => {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
}));

jest.mock('@/lib/api-cache', () => ({
  withCache: jest.fn(async (_key, fn) => fn()),
  generateCacheKey: jest.fn((key) => `cache-${key}`),
}));

// Mock fs
jest.mock('fs/promises');
jest.mock('path');

describe('/api/v1/personalities', () => {
  const { apiMiddleware } = require('@/lib/api-utils');
  const { withCache } = require('@/lib/api-cache');
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock path.join to return predictable paths
    mockPath.join.mockImplementation((...args) => args.join('/'));
  });

  describe('GET', () => {
    it('should return personalities from files when authorized', async () => {
      const mockPersonalities = [
        {
          name: 'Assistant',
          description: 'A helpful AI assistant',
          system_prompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
        },
        {
          name: 'Creative',
          description: 'Creative and imaginative',
          systemPrompt: 'You are creative.',
          top_p: 0.9,
        },
      ];

      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      mockFs.readdir.mockResolvedValue(['assistant.json', 'creative.json', 'README.md'] as any);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockPersonalities[0]))
        .mockResolvedValueOnce(JSON.stringify(mockPersonalities[1]));

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(apiMiddleware).toHaveBeenCalledWith(request);
      expect(mockFs.readdir).toHaveBeenCalled();
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
      expect(withCache).toHaveBeenCalledWith(
        'cache-personalities',
        expect.any(Function),
        30 * 60 * 1000
      );

      expect(result.status).toBe(200);
      expect(result.body.personalities).toHaveLength(2);
      expect(result.body.personalities[0]).toEqual({
        id: 'assistant',
        name: 'Assistant',
        description: 'A helpful AI assistant',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        topP: undefined,
        topK: undefined,
      });
      expect(result.body.personalities[1]).toEqual({
        id: 'creative',
        name: 'Creative',
        description: 'Creative and imaginative',
        systemPrompt: 'You are creative.',
        temperature: undefined,
        topP: 0.9,
        topK: undefined,
      });
    });

    it('should return default personalities when directory does not exist', async () => {
      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      mockFs.readdir.mockRejectedValue(new Error('ENOENT'));

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(result.status).toBe(200);
      expect(result.body.personalities).toHaveLength(4);
      expect(result.body.personalities.map((p: any) => p.id)).toEqual([
        'assistant',
        'creative',
        'technical',
        'witty',
      ]);
    });

    it('should handle snake_case and camelCase fields', async () => {
      const mockPersonality = {
        name: 'Test',
        system_prompt: 'System prompt text',
        top_p: 0.8,
        top_k: 40,
      };

      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      mockFs.readdir.mockResolvedValue(['test.json'] as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPersonality));

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(result.body.personalities[0]).toEqual({
        id: 'test',
        name: 'Test',
        description: '',
        systemPrompt: 'System prompt text',
        temperature: undefined,
        topP: 0.8,
        topK: 40,
      });
    });

    it('should skip non-JSON files', async () => {
      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      mockFs.readdir.mockResolvedValue(['personality.json', 'README.md', 'config.yaml'] as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify({ name: 'Test' }));

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
      expect(result.body.personalities).toHaveLength(1);
    });

    it('should handle invalid JSON gracefully', async () => {
      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      mockFs.readdir.mockResolvedValue(['invalid.json'] as any);
      mockFs.readFile.mockResolvedValue('invalid json content');

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      // Should fallback to default personalities
      expect(result.status).toBe(200);
      expect(result.body.personalities).toHaveLength(4);
    });

    it('should return error when not authorized', async () => {
      const unauthorizedResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });

      apiMiddleware.mockResolvedValue({
        authorized: false,
        rateLimited: false,
        response: unauthorizedResponse,
      });

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(result.status).toBe(401);
      expect(result.body.error).toBe('Unauthorized');
      expect(mockFs.readdir).not.toHaveBeenCalled();
    });

    it('should return error when rate limited', async () => {
      const rateLimitResponse = new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
      });

      apiMiddleware.mockResolvedValue({
        authorized: true,
        rateLimited: true,
        response: rateLimitResponse,
      });

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(result.status).toBe(429);
      expect(result.body.error).toBe('Rate limit exceeded');
    });

    it('should cache the personalities response', async () => {
      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      mockFs.readdir.mockResolvedValue(['test.json'] as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify({ name: 'Test' }));

      const request = createMockRequest();
      await GET(request);

      expect(withCache).toHaveBeenCalledWith(
        'cache-personalities',
        expect.any(Function),
        1800000 // 30 minutes in milliseconds
      );
    });

    it('should use filename as personality ID', async () => {
      const mockPersonality = {
        name: 'Different Name',
        description: 'Test description',
      };

      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      mockFs.readdir.mockResolvedValue(['my-personality.json'] as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPersonality));

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(result.body.personalities[0].id).toBe('my-personality');
      expect(result.body.personalities[0].name).toBe('Different Name');
    });

    it('should use filename as name if name field is missing', async () => {
      const mockPersonality = {
        description: 'Test description',
        system_prompt: 'Test prompt',
      };

      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      mockFs.readdir.mockResolvedValue(['unnamed-personality.json'] as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPersonality));

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(result.body.personalities[0].name).toBe('unnamed-personality');
    });
  });

  describe('OPTIONS', () => {
    it('should handle OPTIONS request', async () => {
      const request = createMockRequest({ method: 'OPTIONS' });
      const response = await OPTIONS(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });
});
