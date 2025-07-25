/**
 * Consumer Contract Tests for Models API
 * Tests the frontend's expectations for the models API
 */

const { Pact } = require('@pact-foundation/pact');
const { 
  createPactMockServer, 
  Matchers, 
  ResponseTemplates, 
  Endpoints 
} = require('../config/setup');

describe('Models API Contract Tests', () => {
  const provider = createPactMockServer();

  beforeAll(() => provider.setup());
  afterEach(() => provider.verify());
  afterAll(() => provider.finalize());

  describe('GET /api/v1/models', () => {
    it('should return a list of model configurations', async () => {
      const modelTemplate = {
        id: Matchers.string('1'),
        name: Matchers.string('qwen:7b-chat-v1.5-q4_K_M'),
        displayName: Matchers.string('Qwen 7B Chat'),
        description: Matchers.string('Qwen 7B model optimized for chat conversations'),
        type: Matchers.string('chat'),
        size: Matchers.string('4.1GB'),
        parameters: Matchers.string('7B'),
        quantization: Matchers.string('Q4_K_M'),
        capabilities: Matchers.eachLike('text-generation'),
        tags: Matchers.eachLike('chat'),
        isDefault: Matchers.boolean(true),
        isInstalled: Matchers.boolean(true),
        config: Matchers.like({
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.1,
          context_length: 4096,
          max_tokens: 2048,
        }),
        metadata: Matchers.like({
          author: 'Alibaba Cloud',
          license: 'Apache 2.0',
          addedAt: Matchers.isoDateTime(),
          lastUsed: Matchers.isoDateTime(),
          usageCount: 45,
        }),
      };

      await provider.addInteraction({
        state: 'models exist',
        uponReceiving: 'a request for models list',
        withRequest: {
          method: 'GET',
          path: Endpoints.models.list,
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            models: Matchers.eachLike(modelTemplate),
            ollamaModels: Matchers.eachLike({}),
            total: Matchers.integer(3),
            filters: {
              installed: null,
              type: null,
              search: null,
              sortBy: Matchers.string('displayName'),
              sortOrder: Matchers.string('asc'),
            },
          },
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.models.list}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.models)).toBe(true);
      expect(data.total).toBeGreaterThan(0);
    });

    it('should return filtered models by installation status', async () => {
      await provider.addInteraction({
        state: 'installed models exist',
        uponReceiving: 'a request for installed models only',
        withRequest: {
          method: 'GET',
          path: Endpoints.models.list,
          query: {
            installed: 'true',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            models: Matchers.eachLike({
              id: Matchers.string('1'),
              isInstalled: Matchers.boolean(true),
            }),
            ollamaModels: Matchers.eachLike({}),
            total: Matchers.integer(2),
            filters: {
              installed: Matchers.string('true'),
              type: null,
              search: null,
              sortBy: Matchers.string('displayName'),
              sortOrder: Matchers.string('asc'),
            },
          },
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.models.list}?installed=true`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.filters.installed).toBe('true');
    });
  });

  describe('GET /api/v1/models/:id', () => {
    it('should return a specific model by ID', async () => {
      const modelId = '1';
      
      await provider.addInteraction({
        state: `model with ID ${modelId} exists`,
        uponReceiving: 'a request for a specific model',
        withRequest: {
          method: 'GET',
          path: Endpoints.models.byId(modelId),
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            model: {
              id: Matchers.string(modelId),
              name: Matchers.string('qwen:7b-chat-v1.5-q4_K_M'),
              displayName: Matchers.string('Qwen 7B Chat'),
              description: Matchers.string('Qwen 7B model optimized for chat conversations'),
              type: Matchers.string('chat'),
              size: Matchers.string('4.1GB'),
              parameters: Matchers.string('7B'),
              quantization: Matchers.string('Q4_K_M'),
              capabilities: Matchers.eachLike('text-generation'),
              tags: Matchers.eachLike('chat'),
              isDefault: Matchers.boolean(true),
              isInstalled: Matchers.boolean(true),
              config: Matchers.like({
                temperature: 0.7,
                top_p: 0.9,
                top_k: 40,
                repeat_penalty: 1.1,
                context_length: 4096,
                max_tokens: 2048,
              }),
              metadata: Matchers.like({
                author: 'Alibaba Cloud',
                license: 'Apache 2.0',
                addedAt: Matchers.isoDateTime(),
                lastUsed: Matchers.isoDateTime(),
                usageCount: 45,
              }),
            },
          },
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.models.byId(modelId)}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.model.id).toBe(modelId);
    });

    it('should return 404 for non-existent model', async () => {
      const modelId = '999';
      
      await provider.addInteraction({
        state: 'model does not exist',
        uponReceiving: 'a request for a non-existent model',
        withRequest: {
          method: 'GET',
          path: Endpoints.models.byId(modelId),
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: ResponseTemplates.error('Model not found'),
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.models.byId(modelId)}`
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
  });

  describe('POST /api/v1/models', () => {
    it('should create a new model configuration', async () => {
      const newModel = {
        name: 'new-model:7b',
        displayName: 'New Model 7B',
        description: 'A new model for testing',
        type: 'chat',
        size: '3.5GB',
        parameters: '7B',
        capabilities: ['text-generation'],
        tags: ['test'],
      };

      await provider.addInteraction({
        state: 'ready to create model',
        uponReceiving: 'a request to create a new model configuration',
        withRequest: {
          method: 'POST',
          path: Endpoints.models.list,
          headers: {
            'Content-Type': 'application/json',
          },
          body: newModel,
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            model: {
              id: Matchers.string('4'),
              name: Matchers.string(newModel.name),
              displayName: Matchers.string(newModel.displayName),
              description: Matchers.string(newModel.description),
              type: Matchers.string(newModel.type),
              size: Matchers.string(newModel.size),
              parameters: Matchers.string(newModel.parameters),
              quantization: Matchers.string('Unknown'),
              capabilities: Matchers.eachLike('text-generation'),
              tags: Matchers.eachLike('test'),
              isDefault: Matchers.boolean(false),
              isInstalled: Matchers.boolean(false),
              config: Matchers.like({
                temperature: 0.7,
                top_p: 0.9,
                top_k: 40,
                repeat_penalty: 1.1,
                context_length: 4096,
                max_tokens: 2048,
              }),
              metadata: Matchers.like({
                author: 'Unknown',
                license: 'Unknown',
                addedAt: Matchers.isoDateTime(),
                lastUsed: null,
                usageCount: 0,
              }),
            },
          },
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.models.list}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newModel),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.model.name).toBe(newModel.name);
    });

    it('should return 409 for duplicate model name', async () => {
      const duplicateModel = {
        name: 'qwen:7b-chat-v1.5-q4_K_M', // Existing model name
        displayName: 'Duplicate Model',
      };

      await provider.addInteraction({
        state: 'model with same name exists',
        uponReceiving: 'a request to create a model with existing name',
        withRequest: {
          method: 'POST',
          path: Endpoints.models.list,
          headers: {
            'Content-Type': 'application/json',
          },
          body: duplicateModel,
        },
        willRespondWith: {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
          },
          body: ResponseTemplates.error('Model with this name already exists'),
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.models.list}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(duplicateModel),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
    });
  });

  describe('POST /api/v1/models/:id/use', () => {
    it('should record model usage', async () => {
      const modelId = '1';
      
      await provider.addInteraction({
        state: `model with ID ${modelId} exists`,
        uponReceiving: 'a request to record model usage',
        withRequest: {
          method: 'POST',
          path: Endpoints.models.byId(modelId) + '/use',
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            message: Matchers.string('Model usage recorded'),
            usageCount: Matchers.integer(46),
          },
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.models.byId(modelId)}/use`,
        {
          method: 'POST',
        }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('usage recorded');
      expect(typeof data.usageCount).toBe('number');
    });
  });
});