import { GET } from '../route';
import { createMockRequest, parseApiResponse, createMockMiddlewareResult } from '@/tests/utils/api-test-utils';

// Mock fetch
global.fetch = jest.fn();

describe('/api/v1/models', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should handle models service unavailable error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('fetch failed'));

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(result.status).toBe(503);
      expect(result.body.error).toContain('External service unavailable');
    });

    it('should return transformed models list when successful', async () => {
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
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockModels,
      });

      const request = createMockRequest();
      const response = await GET(request);
      const result = await parseApiResponse(response);

      expect(result.status).toBe(200);
      expect(result.body.data.models).toHaveLength(1);
      expect(result.body.data.models[0]).toEqual({
        name: 'llama2:7b',
        displayName: 'llama2',
        size: 3826793472,
        modified: '2024-01-01T00:00:00Z',
        family: 'llama',
        parameterSize: '7B',
      });
      expect(result.body.data.count).toBe(1);
    });
  });
});