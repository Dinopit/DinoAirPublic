/**
 * Consumer Contract Tests for Personalities API
 * Tests the frontend's expectations for the personalities API
 */

const { Pact } = require('@pact-foundation/pact');
const { 
  createPactMockServer, 
  Matchers, 
  ResponseTemplates, 
  Endpoints 
} = require('../config/setup');

describe('Personalities API Contract Tests', () => {
  const provider = createPactMockServer();

  beforeAll(() => provider.setup());
  afterEach(() => provider.verify());
  afterAll(() => provider.finalize());

  describe('GET /api/v1/personalities', () => {
    it('should return a list of personalities', async () => {
      const personalityTemplate = {
        id: Matchers.string('1'),
        name: Matchers.string('Code Assistant'),
        description: Matchers.string('Specialized in coding tasks and programming assistance'),
        avatar: Matchers.string('/avatars/code-assistant.png'),
        systemPrompt: Matchers.string('You are a helpful coding assistant...'),
        tags: Matchers.eachLike('coding'),
        isActive: Matchers.boolean(true),
        isDefault: Matchers.boolean(false),
        createdAt: Matchers.isoDateTime(),
        updatedAt: Matchers.isoDateTime(),
        metadata: Matchers.like({
          category: 'development',
          author: 'DinoAir Team',
          version: '1.0.0',
        }),
      };

      await provider.addInteraction({
        state: 'personalities exist',
        uponReceiving: 'a request for personalities list',
        withRequest: {
          method: 'GET',
          path: Endpoints.personalities.list,
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            personalities: Matchers.eachLike(personalityTemplate),
            total: Matchers.integer(5),
          },
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.personalities.list}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.personalities)).toBe(true);
      expect(data.total).toBeGreaterThan(0);
    });

    it('should return filtered personalities by active status', async () => {
      await provider.addInteraction({
        state: 'active personalities exist',
        uponReceiving: 'a request for active personalities only',
        withRequest: {
          method: 'GET',
          path: Endpoints.personalities.list,
          query: {
            active: 'true',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            personalities: Matchers.eachLike({
              id: Matchers.string('1'),
              isActive: Matchers.boolean(true),
            }),
            total: Matchers.integer(3),
          },
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.personalities.list}?active=true`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.personalities.every(p => p.isActive)).toBe(true);
    });
  });

  describe('GET /api/v1/personalities/:id', () => {
    it('should return a specific personality by ID', async () => {
      const personalityId = '1';
      
      await provider.addInteraction({
        state: `personality with ID ${personalityId} exists`,
        uponReceiving: 'a request for a specific personality',
        withRequest: {
          method: 'GET',
          path: Endpoints.personalities.byId(personalityId),
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            personality: {
              id: Matchers.string(personalityId),
              name: Matchers.string('Code Assistant'),
              description: Matchers.string('Specialized in coding tasks and programming assistance'),
              avatar: Matchers.string('/avatars/code-assistant.png'),
              systemPrompt: Matchers.string('You are a helpful coding assistant...'),
              tags: Matchers.eachLike('coding'),
              isActive: Matchers.boolean(true),
              isDefault: Matchers.boolean(false),
              createdAt: Matchers.isoDateTime(),
              updatedAt: Matchers.isoDateTime(),
              metadata: Matchers.like({
                category: 'development',
                author: 'DinoAir Team',
                version: '1.0.0',
              }),
            },
          },
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.personalities.byId(personalityId)}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.personality.id).toBe(personalityId);
    });

    it('should return 404 for non-existent personality', async () => {
      const personalityId = '999';
      
      await provider.addInteraction({
        state: 'personality does not exist',
        uponReceiving: 'a request for a non-existent personality',
        withRequest: {
          method: 'GET',
          path: Endpoints.personalities.byId(personalityId),
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: ResponseTemplates.error('Personality not found'),
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.personalities.byId(personalityId)}`
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
  });

  describe('POST /api/v1/personalities', () => {
    it('should create a new personality', async () => {
      const newPersonality = {
        name: 'Writing Assistant',
        description: 'Helps with creative writing and content creation',
        avatar: '/avatars/writer.png',
        systemPrompt: 'You are a creative writing assistant...',
        tags: ['writing', 'creative'],
        isActive: true,
      };

      await provider.addInteraction({
        state: 'ready to create personality',
        uponReceiving: 'a request to create a new personality',
        withRequest: {
          method: 'POST',
          path: Endpoints.personalities.list,
          headers: {
            'Content-Type': 'application/json',
          },
          body: newPersonality,
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            personality: {
              id: Matchers.string('6'),
              name: Matchers.string(newPersonality.name),
              description: Matchers.string(newPersonality.description),
              avatar: Matchers.string(newPersonality.avatar),
              systemPrompt: Matchers.string(newPersonality.systemPrompt),
              tags: Matchers.eachLike('writing'),
              isActive: Matchers.boolean(true),
              isDefault: Matchers.boolean(false),
              createdAt: Matchers.isoDateTime(),
              updatedAt: Matchers.isoDateTime(),
              metadata: Matchers.like({
                author: 'User',
                version: '1.0.0',
              }),
            },
          },
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.personalities.list}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newPersonality),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.personality.name).toBe(newPersonality.name);
    });

    it('should return 400 for invalid personality data', async () => {
      const invalidPersonality = {
        name: '', // Invalid: empty name
        description: 'Test personality',
      };

      await provider.addInteraction({
        state: 'ready to validate personality',
        uponReceiving: 'a request to create an invalid personality',
        withRequest: {
          method: 'POST',
          path: Endpoints.personalities.list,
          headers: {
            'Content-Type': 'application/json',
          },
          body: invalidPersonality,
        },
        willRespondWith: {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: ResponseTemplates.error('Name and description are required'),
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.personalities.list}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invalidPersonality),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });
  });
});