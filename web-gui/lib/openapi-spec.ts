import { createSwaggerSpec } from 'next-swagger-doc';

const getApiSpec = () => createSwaggerSpec({
  apiFolder: 'app/api', // API route folder
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DinoAir API',
      description: 'DinoAir API provides access to AI models and personalities for chat interactions. All endpoints require API key authentication.',
      version: '1.0.0',
      contact: {
        name: 'DinoAir Support',
        email: 'support@dinoair.ai',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'DinoAir API Server',
      },
    ],
    tags: [
      {
        name: 'Models',
        description: 'Operations related to AI models',
      },
      {
        name: 'Personalities',
        description: 'Operations related to AI personalities',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication. Use the X-API-Key header.',
        },
      },
      schemas: {
        Model: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the model',
              example: 'llama2:latest',
            },
            name: {
              type: 'string',
              description: 'Display name of the model',
              example: 'llama2:latest',
            },
            size: {
              type: 'integer',
              description: 'Model size in bytes',
              example: 3826793472,
            },
            modifiedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last modification timestamp',
              example: '2024-01-15T10:30:00Z',
            },
            digest: {
              type: 'string',
              description: 'Model digest hash',
              example: 'sha256:8edb4f2f7f83',
            },
            parameterSize: {
              type: 'string',
              description: 'Size of model parameters',
              example: '7B',
              nullable: true,
            },
            quantization: {
              type: 'string',
              description: 'Quantization level',
              example: 'Q4_0',
              nullable: true,
            },
            family: {
              type: 'string',
              description: 'Model family',
              example: 'llama',
              nullable: true,
            },
          },
          required: ['id', 'name', 'size', 'modifiedAt', 'digest'],
        },
        ModelsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                models: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Model',
                  },
                },
                total: {
                  type: 'integer',
                  description: 'Total number of models',
                  example: 3,
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
              example: 'req_123456',
            },
          },
        },
        Personality: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the personality',
              example: 'assistant',
            },
            name: {
              type: 'string',
              description: 'Display name of the personality',
              example: 'Assistant',
            },
            description: {
              type: 'string',
              description: 'Description of the personality',
              example: 'A helpful AI assistant',
            },
            systemPrompt: {
              type: 'string',
              description: 'System prompt that defines the personality behavior',
              example: 'You are a helpful AI assistant.',
            },
            temperature: {
              type: 'number',
              format: 'float',
              description: 'Temperature setting for response generation (0-1)',
              example: 0.7,
              minimum: 0,
              maximum: 1,
              nullable: true,
            },
            topP: {
              type: 'number',
              format: 'float',
              description: 'Top-p sampling parameter',
              example: 0.9,
              minimum: 0,
              maximum: 1,
              nullable: true,
            },
            topK: {
              type: 'integer',
              description: 'Top-k sampling parameter',
              example: 40,
              minimum: 1,
              nullable: true,
            },
          },
          required: ['id', 'name', 'description', 'systemPrompt'],
        },
        PersonalitiesResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                personalities: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Personality',
                  },
                },
                total: {
                  type: 'integer',
                  description: 'Total number of personalities',
                  example: 4,
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
              example: 'req_123456',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid API key',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
              example: 'req_123456',
            },
          },
        },
        RateLimitError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Rate limit exceeded',
            },
            retryAfter: {
              type: 'integer',
              description: 'Seconds until rate limit resets',
              example: 60,
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
              example: 'req_123456',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'API key is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: 'Invalid API key',
                timestamp: '2024-01-15T10:30:00Z',
                requestId: 'req_123456',
              },
            },
          },
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RateLimitError',
              },
              example: {
                success: false,
                error: 'Rate limit exceeded',
                retryAfter: 60,
                timestamp: '2024-01-15T10:30:00Z',
                requestId: 'req_123456',
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: 'Internal server error',
                timestamp: '2024-01-15T10:30:00Z',
                requestId: 'req_123456',
              },
            },
          },
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
    paths: {
      '/api/v1/models': {
        get: {
          tags: ['Models'],
          summary: 'List available AI models',
          description: 'Returns a list of all available AI models from the Ollama backend. Results are cached for 10 minutes to improve performance.',
          operationId: 'listModels',
          security: [
            {
              ApiKeyAuth: [],
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ModelsResponse',
                  },
                  example: {
                    success: true,
                    data: {
                      models: [
                        {
                          id: 'llama2:latest',
                          name: 'llama2:latest',
                          size: 3826793472,
                          modifiedAt: '2024-01-15T10:30:00Z',
                          digest: 'sha256:8edb4f2f7f83',
                          parameterSize: '7B',
                          quantization: 'Q4_0',
                          family: 'llama',
                        },
                        {
                          id: 'mistral:latest',
                          name: 'mistral:latest',
                          size: 4113038848,
                          modifiedAt: '2024-01-10T08:20:00Z',
                          digest: 'sha256:61e88e880bdc',
                          parameterSize: '7B',
                          quantization: 'Q4_0',
                          family: 'mistral',
                        },
                      ],
                      total: 2,
                    },
                    timestamp: '2024-01-15T10:30:00Z',
                    requestId: 'req_123456',
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '429': {
              $ref: '#/components/responses/RateLimitError',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
        options: {
          tags: ['Models'],
          summary: 'CORS preflight request',
          description: 'Handles CORS preflight requests for the models endpoint',
          responses: {
            '200': {
              description: 'CORS headers returned',
            },
          },
        },
      },
      '/api/v1/personalities': {
        get: {
          tags: ['Personalities'],
          summary: 'List available AI personalities',
          description: 'Returns a list of all available AI personalities. Personalities define the behavior and response style of the AI. Results are cached for 30 minutes.',
          operationId: 'listPersonalities',
          security: [
            {
              ApiKeyAuth: [],
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/PersonalitiesResponse',
                  },
                  example: {
                    success: true,
                    data: {
                      personalities: [
                        {
                          id: 'assistant',
                          name: 'Assistant',
                          description: 'A helpful AI assistant',
                          systemPrompt: 'You are a helpful AI assistant.',
                        },
                        {
                          id: 'creative',
                          name: 'Creative',
                          description: 'A creative and imaginative AI',
                          systemPrompt: 'You are a creative and imaginative AI assistant.',
                          temperature: 0.9,
                        },
                        {
                          id: 'technical',
                          name: 'Technical',
                          description: 'A technical and precise AI',
                          systemPrompt: 'You are a technical and precise AI assistant focused on accuracy.',
                          temperature: 0.3,
                        },
                        {
                          id: 'witty',
                          name: 'Witty',
                          description: 'A witty and humorous AI',
                          systemPrompt: 'You are a witty and humorous AI assistant.',
                          temperature: 0.8,
                        },
                      ],
                      total: 4,
                    },
                    timestamp: '2024-01-15T10:30:00Z',
                    requestId: 'req_123456',
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '429': {
              $ref: '#/components/responses/RateLimitError',
            },
            '500': {
              $ref: '#/components/responses/InternalServerError',
            },
          },
        },
        options: {
          tags: ['Personalities'],
          summary: 'CORS preflight request',
          description: 'Handles CORS preflight requests for the personalities endpoint',
          responses: {
            '200': {
              description: 'CORS headers returned',
            },
          },
        },
      },
    },
  },
});

export default getApiSpec;