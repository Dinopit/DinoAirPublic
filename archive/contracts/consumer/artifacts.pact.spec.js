/**
 * Consumer Contract Tests for Artifacts API
 * Tests the frontend's expectations for the artifacts API
 */

const { Pact } = require('@pact-foundation/pact');
const { 
  createPactMockServer, 
  Matchers, 
  ResponseTemplates, 
  Endpoints 
} = require('../config/setup');

describe('Artifacts API Contract Tests', () => {
  const provider = createPactMockServer();

  beforeAll(() => provider.setup());
  afterEach(() => provider.verify());
  afterAll(() => provider.finalize());

  describe('GET /api/v1/artifacts', () => {
    it('should return a list of artifacts with pagination', async () => {
      // Arrange
      const artifactTemplate = {
        id: Matchers.string('1'),
        name: Matchers.string('Sample React Component'),
        type: Matchers.string('javascript'),
        content: Matchers.string('import React from "react";'),
        createdAt: Matchers.isoDateTime(),
        updatedAt: Matchers.isoDateTime(),
        size: Matchers.integer(245),
        tags: Matchers.eachLike('react'),
        metadata: Matchers.like({
          language: 'javascript',
          framework: 'react',
          author: 'DinoAir AI',
        }),
      };

      await provider.addInteraction({
        state: 'artifacts exist',
        uponReceiving: 'a request for artifacts list',
        withRequest: {
          method: 'GET',
          path: Endpoints.artifacts.list,
          query: {
            page: '1',
            limit: '10',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            artifacts: Matchers.eachLike(artifactTemplate),
            pagination: {
              page: Matchers.integer(1),
              limit: Matchers.integer(10),
              total: Matchers.integer(50),
              pages: Matchers.integer(5),
            },
            filters: {
              type: null,
              search: null,
              sortBy: Matchers.string('createdAt'),
              sortOrder: Matchers.string('desc'),
            },
          },
        },
      });

      // Act
      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.artifacts.list}?page=1&limit=10`
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.artifacts)).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.filters).toBeDefined();
    });

    it('should return filtered artifacts by type', async () => {
      await provider.addInteraction({
        state: 'javascript artifacts exist',
        uponReceiving: 'a request for javascript artifacts',
        withRequest: {
          method: 'GET',
          path: Endpoints.artifacts.list,
          query: {
            type: 'javascript',
            page: '1',
            limit: '10',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            artifacts: Matchers.eachLike({
              id: Matchers.string('1'),
              type: Matchers.string('javascript'),
            }),
            pagination: Matchers.like({
              page: 1,
              limit: 10,
              total: 25,
              pages: 3,
            }),
            filters: {
              type: Matchers.string('javascript'),
              search: null,
              sortBy: Matchers.string('createdAt'),
              sortOrder: Matchers.string('desc'),
            },
          },
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.artifacts.list}?type=javascript&page=1&limit=10`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.filters.type).toBe('javascript');
    });
  });

  describe('GET /api/v1/artifacts/:id', () => {
    it('should return a specific artifact by ID', async () => {
      const artifactId = '1';
      
      await provider.addInteraction({
        state: `artifact with ID ${artifactId} exists`,
        uponReceiving: 'a request for a specific artifact',
        withRequest: {
          method: 'GET',
          path: Endpoints.artifacts.byId(artifactId),
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            artifact: {
              id: Matchers.string(artifactId),
              name: Matchers.string('Sample React Component'),
              type: Matchers.string('javascript'),
              content: Matchers.string('import React from "react";'),
              createdAt: Matchers.isoDateTime(),
              updatedAt: Matchers.isoDateTime(),
              size: Matchers.integer(245),
              tags: Matchers.eachLike('react'),
              metadata: Matchers.like({
                language: 'javascript',
                framework: 'react',
                author: 'DinoAir AI',
              }),
            },
          },
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.artifacts.byId(artifactId)}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.artifact.id).toBe(artifactId);
    });

    it('should return 404 for non-existent artifact', async () => {
      const artifactId = '999';
      
      await provider.addInteraction({
        state: 'artifact does not exist',
        uponReceiving: 'a request for a non-existent artifact',
        withRequest: {
          method: 'GET',
          path: Endpoints.artifacts.byId(artifactId),
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: ResponseTemplates.error('Artifact not found'),
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.artifacts.byId(artifactId)}`
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
  });

  describe('POST /api/v1/artifacts', () => {
    it('should create a new artifact', async () => {
      const newArtifact = {
        name: 'New Component',
        type: 'javascript',
        content: 'const NewComponent = () => {};',
        tags: ['react', 'component'],
      };

      await provider.addInteraction({
        state: 'ready to create artifact',
        uponReceiving: 'a request to create a new artifact',
        withRequest: {
          method: 'POST',
          path: Endpoints.artifacts.list,
          headers: {
            'Content-Type': 'application/json',
          },
          body: newArtifact,
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            artifact: {
              id: Matchers.string('3'),
              name: Matchers.string(newArtifact.name),
              type: Matchers.string(newArtifact.type),
              content: Matchers.string(newArtifact.content),
              createdAt: Matchers.isoDateTime(),
              updatedAt: Matchers.isoDateTime(),
              size: Matchers.integer(32),
              tags: Matchers.eachLike('react'),
              metadata: Matchers.like({
                author: 'User',
              }),
            },
            storageStats: Matchers.like({
              count: 3,
              maxCount: 1000,
              totalSize: 1024,
              maxSize: 104857600,
            }),
          },
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.artifacts.list}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newArtifact),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.artifact.name).toBe(newArtifact.name);
    });

    it('should return 400 for invalid artifact data', async () => {
      const invalidArtifact = {
        name: '', // Invalid: empty name
        type: 'javascript',
      };

      await provider.addInteraction({
        state: 'ready to validate artifact',
        uponReceiving: 'a request to create an invalid artifact',
        withRequest: {
          method: 'POST',
          path: Endpoints.artifacts.list,
          headers: {
            'Content-Type': 'application/json',
          },
          body: invalidArtifact,
        },
        willRespondWith: {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: ResponseTemplates.error('Name, type, and content are required'),
        },
      });

      const response = await fetch(
        `${provider.mockService.baseUrl}${Endpoints.artifacts.list}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invalidArtifact),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });
  });
});