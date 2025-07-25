import { GET, OPTIONS } from '../route';
import { createMockRequest, parseApiResponse, createMockMiddlewareResult } from '@/tests/utils/api-test-utils';

// Mock the dependencies
jest.mock('@/lib/api-utils', () => ({
  apiMiddleware: jest.fn(),
  createApiResponse: jest.fn((data, request, clientId) => {
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
  withCache: jest.fn(async (key, fn) => fn()),
  generateCacheKey: jest.fn((key) => `cache-${key}`),
}));

// Mock fetch
global.fetch = jest.fn();

describe('/api/v1/models', () => {
  const { apiMiddleware } = require('@/lib/api-utils');
  const { withCache } = require('@/lib/api-cache');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return models list when authorized', async () => {
      const mockModels = {
        models: [
          {
            name: 'llama2:7b',
            modified_at: '2024-01-01T00:00:00Z',
            size: 3826793472,
            digest: 'sha256:abc123',
            details: {
              format: 'gguf',
              family: 'llama',
              families: ['llama'],
              parameter_size: '7B',
              quantization_level: 'Q4_0',
            },
          },
          {
            name: 'codellama:13b',
            modified_at: '2024-01-02T00:00:00Z',
            size: 7365960704,
            digest: 'sha256:def456',
            details: {
              format: 'gguf',
              family: 'llama',
              families: ['llama'],
              parameter_size: '13B',
              quantization_level: 'Q4_0',
            },
          },
        ],
      };

      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockModels,
      });

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(apiMiddleware).toHaveBeenCalledWith(request);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
      expect(withCache).toHaveBeenCalledWith(
        'cache-models',
        expect.any(Function),
        10 * 60 * 1000
      );

      expect(result.status).toBe(200);
      expect(result.body.models).toHaveLength(2);
      expect(result.body.models[0]).toEqual({
        id: 'llama2:7b',
        name: 'llama2:7b',
        size: 3826793472,
        modifiedAt: '2024-01-01T00:00:00Z',
        digest: 'sha256:abc123',
        parameterSize: '7B',
        quantization: 'Q4_0',
        family: 'llama',
      });
      expect(result.body.total).toBe(2);
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
      expect(global.fetch).not.toHaveBeenCalled();
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
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle Ollama API errors', async () => {
      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Service Unavailable',
      });

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(result.status).toBe(500);
      expect(result.body.error).toBe('Failed to fetch models');
    });

    it('should handle network errors', async () => {
      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(result.status).toBe(500);
      expect(result.body.error).toBe('Failed to fetch models');
    });

    it('should cache the models response', async () => {
      const mockModels = {
        models: [
          {
            name: 'test-model',
            modified_at: '2024-01-01T00:00:00Z',
            size: 1000000,
            digest: 'sha256:test',
            details: {
              format: 'gguf',
              family: 'test',
              families: null,
              parameter_size: '1B',
              quantization_level: 'Q4_0',
            },
          },
        ],
      };

      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockModels,
      });

      const request = createMockRequest();
      await GET(request);

      expect(withCache).toHaveBeenCalledWith(
        'cache-models',
        expect.any(Function),
        600000 // 10 minutes in milliseconds
      );
    });

    it('should handle models with missing details', async () => {
      const mockModels = {
        models: [
          {
            name: 'minimal-model',
            modified_at: '2024-01-01T00:00:00Z',
            size: 1000000,
            digest: 'sha256:minimal',
            // Missing details
          },
        ],
      };

      apiMiddleware.mockResolvedValue(createMockMiddlewareResult());
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockModels,
      });

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(result.status).toBe(200);
      expect(result.body.models[0]).toEqual({
        id: 'minimal-model',
        name: 'minimal-model',
        size: 1000000,
        modifiedAt: '2024-01-01T00:00:00Z',
        digest: 'sha256:minimal',
        parameterSize: undefined,
        quantization: undefined,
        family: undefined,
      });
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