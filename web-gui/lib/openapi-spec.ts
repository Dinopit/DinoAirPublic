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
        email: 'support@dinoair.ai'
      }
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'DinoAir API Server'
      }
    ],
    tags: [
      {
        name: 'Models',
        description: 'Operations related to AI models'
      },
      {
        name: 'Personalities',
        description: 'Operations related to AI personalities'
      },
      {
        name: 'Artifacts',
        description: 'Operations related to code artifacts and file management'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication. Use the X-API-Key header.'
        }
      },
      schemas: {
        Model: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the model',
              example: 'llama2:latest'
            },
            name: {
              type: 'string',
              description: 'Display name of the model',
              example: 'llama2:latest'
            },
            size: {
              type: 'integer',
              description: 'Model size in bytes',
              example: 3826793472
            },
            modifiedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last modification timestamp',
              example: '2024-01-15T10:30:00Z'
            },
            digest: {
              type: 'string',
              description: 'Model digest hash',
              example: 'sha256:8edb4f2f7f83'
            },
            parameterSize: {
              type: 'string',
              description: 'Size of model parameters',
              example: '7B',
              nullable: true
            },
            quantization: {
              type: 'string',
              description: 'Quantization level',
              example: 'Q4_0',
              nullable: true
            },
            family: {
              type: 'string',
              description: 'Model family',
              example: 'llama',
              nullable: true
            }
          },
          required: ['id', 'name', 'size', 'modifiedAt', 'digest']
        },
        ModelsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                models: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Model'
                  }
                },
                total: {
                  type: 'integer',
                  description: 'Total number of models',
                  example: 3
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
              example: 'req_123456'
            }
          }
        },
        Personality: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the personality',
              example: 'assistant'
            },
            name: {
              type: 'string',
              description: 'Display name of the personality',
              example: 'Assistant'
            },
            description: {
              type: 'string',
              description: 'Description of the personality',
              example: 'A helpful AI assistant'
            },
            systemPrompt: {
              type: 'string',
              description: 'System prompt that defines the personality behavior',
              example: 'You are a helpful AI assistant.'
            },
            temperature: {
              type: 'number',
              format: 'float',
              description: 'Temperature setting for response generation (0-1)',
              example: 0.7,
              minimum: 0,
              maximum: 1,
              nullable: true
            },
            topP: {
              type: 'number',
              format: 'float',
              description: 'Top-p sampling parameter',
              example: 0.9,
              minimum: 0,
              maximum: 1,
              nullable: true
            },
            topK: {
              type: 'integer',
              description: 'Top-k sampling parameter',
              example: 40,
              minimum: 1,
              nullable: true
            }
          },
          required: ['id', 'name', 'description', 'systemPrompt']
        },
        PersonalitiesResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                personalities: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Personality'
                  }
                },
                total: {
                  type: 'integer',
                  description: 'Total number of personalities',
                  example: 4
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
              example: 'req_123456'
            }
          }
        },
        Artifact: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the artifact',
              example: 'artifact_1642234567890_abc123def'
            },
            name: {
              type: 'string',
              description: 'Name of the artifact',
              example: 'my-component.tsx'
            },
            type: {
              type: 'string',
              enum: ['javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'python', 'html', 'css', 'json', 'markdown', 'text'],
              description: 'Type/language of the artifact',
              example: 'typescriptreact'
            },
            content: {
              type: 'string',
              description: 'Content of the artifact',
              example: 'import React from "react";\n\nconst MyComponent = () => {\n  return <div>Hello World</div>;\n};\n\nexport default MyComponent;'
            },
            size: {
              type: 'integer',
              description: 'Size of the artifact in bytes',
              example: 1024
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Tags associated with the artifact',
              example: ['react', 'component', 'typescript']
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
              example: '2024-01-15T10:30:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              example: '2024-01-15T10:30:00Z'
            },
            userId: {
              type: 'string',
              description: 'ID of the user who owns the artifact',
              example: 'user_123456',
              nullable: true
            }
          },
          required: ['id', 'name', 'type', 'content', 'createdAt']
        },
        ArtifactResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            artifact: {
              $ref: '#/components/schemas/Artifact'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
              example: 'req_123456'
            }
          }
        },
        ArtifactsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            artifacts: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Artifact'
              }
            },
            total: {
              type: 'integer',
              description: 'Total number of artifacts',
              example: 25
            },
            page: {
              type: 'integer',
              description: 'Current page number',
              example: 1
            },
            pageSize: {
              type: 'integer',
              description: 'Number of items per page',
              example: 10
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
              example: 'req_123456'
            }
          }
        },
        ArtifactStatsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            stats: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  description: 'Total number of artifacts',
                  example: 25
                },
                byType: {
                  type: 'object',
                  additionalProperties: {
                    type: 'integer'
                  },
                  description: 'Count of artifacts by type',
                  example: {
                    typescript: 10,
                    javascript: 8,
                    python: 5,
                    markdown: 2
                  }
                },
                totalSize: {
                  type: 'integer',
                  description: 'Total size of all artifacts in bytes',
                  example: 1048576
                },
                averageSize: {
                  type: 'integer',
                  description: 'Average size of artifacts in bytes',
                  example: 41943
                },
                recentCount: {
                  type: 'integer',
                  description: 'Number of artifacts created in the last week',
                  example: 5
                },
                storage: {
                  type: 'object',
                  properties: {
                    limits: {
                      type: 'object',
                      properties: {
                        maxArtifacts: {
                          type: 'integer',
                          example: 1000
                        },
                        maxTotalSize: {
                          type: 'integer',
                          example: 104857600
                        },
                        maxTotalSizeMB: {
                          type: 'integer',
                          example: 100
                        }
                      }
                    },
                    current: {
                      type: 'object',
                      properties: {
                        artifacts: {
                          type: 'integer',
                          example: 25
                        },
                        totalSize: {
                          type: 'integer',
                          example: 1048576
                        },
                        totalSizeMB: {
                          type: 'integer',
                          example: 1
                        }
                      }
                    },
                    utilization: {
                      type: 'object',
                      properties: {
                        count: {
                          type: 'integer',
                          description: 'Percentage of artifact count limit used',
                          example: 3
                        },
                        size: {
                          type: 'integer',
                          description: 'Percentage of storage size limit used',
                          example: 1
                        }
                      }
                    },
                    status: {
                      type: 'string',
                      enum: ['healthy', 'warning', 'critical'],
                      description: 'Storage status based on utilization',
                      example: 'healthy'
                    }
                  }
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
              example: 'req_123456'
            }
          }
        },
        CreateArtifactRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the artifact',
              example: 'my-component.tsx'
            },
            type: {
              type: 'string',
              enum: ['javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'python', 'html', 'css', 'json', 'markdown', 'text'],
              description: 'Type/language of the artifact',
              example: 'typescriptreact'
            },
            content: {
              type: 'string',
              description: 'Content of the artifact',
              example: 'import React from "react";\n\nconst MyComponent = () => {\n  return <div>Hello World</div>;\n};\n\nexport default MyComponent;'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Tags to associate with the artifact',
              example: ['react', 'component', 'typescript']
            }
          },
          required: ['name', 'type', 'content']
        },
        UpdateArtifactRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the artifact',
              example: 'my-updated-component.tsx'
            },
            type: {
              type: 'string',
              enum: ['javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'python', 'html', 'css', 'json', 'markdown', 'text'],
              description: 'Type/language of the artifact',
              example: 'typescriptreact'
            },
            content: {
              type: 'string',
              description: 'Updated content of the artifact',
              example: 'import React from "react";\n\nconst MyUpdatedComponent = () => {\n  return <div>Hello Updated World</div>;\n};\n\nexport default MyUpdatedComponent;'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Updated tags for the artifact',
              example: ['react', 'component', 'typescript', 'updated']
            }
          }
        },
        BulkExportRequest: {
          type: 'object',
          properties: {
            artifactIds: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of artifact IDs to export',
              example: ['artifact_1642234567890_abc123def', 'artifact_1642234567891_def456ghi']
            },
            includeManifest: {
              type: 'boolean',
              description: 'Whether to include a manifest.json file in the export',
              example: true,
              default: true
            }
          },
          required: ['artifactIds']
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid API key'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
              example: 'req_123456'
            }
          }
        },
        RateLimitError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Rate limit exceeded'
            },
            retryAfter: {
              type: 'integer',
              description: 'Seconds until rate limit resets',
              example: 60
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
              example: 'req_123456'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'API key is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'Invalid API key',
                timestamp: '2024-01-15T10:30:00Z',
                requestId: 'req_123456'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RateLimitError'
              },
              example: {
                success: false,
                error: 'Rate limit exceeded',
                retryAfter: 60,
                timestamp: '2024-01-15T10:30:00Z',
                requestId: 'req_123456'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'Internal server error',
                timestamp: '2024-01-15T10:30:00Z',
                requestId: 'req_123456'
              }
            }
          }
        }
      }
    },
    security: [
      {
        ApiKeyAuth: []
      }
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
              ApiKeyAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ModelsResponse'
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
                          family: 'llama'
                        },
                        {
                          id: 'mistral:latest',
                          name: 'mistral:latest',
                          size: 4113038848,
                          modifiedAt: '2024-01-10T08:20:00Z',
                          digest: 'sha256:61e88e880bdc',
                          parameterSize: '7B',
                          quantization: 'Q4_0',
                          family: 'mistral'
                        }
                      ],
                      total: 2
                    },
                    timestamp: '2024-01-15T10:30:00Z',
                    requestId: 'req_123456'
                  }
                }
              }
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError'
            },
            '429': {
              $ref: '#/components/responses/RateLimitError'
            },
            '500': {
              $ref: '#/components/responses/InternalServerError'
            }
          }
        },
        options: {
          tags: ['Models'],
          summary: 'CORS preflight request',
          description: 'Handles CORS preflight requests for the models endpoint',
          responses: {
            '200': {
              description: 'CORS headers returned'
            }
          }
        }
      },
      '/api/v1/personalities': {
        get: {
          tags: ['Personalities'],
          summary: 'List available AI personalities',
          description: 'Returns a list of all available AI personalities. Personalities define the behavior and response style of the AI. Results are cached for 30 minutes.',
          operationId: 'listPersonalities',
          security: [
            {
              ApiKeyAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/PersonalitiesResponse'
                  },
                  example: {
                    success: true,
                    data: {
                      personalities: [
                        {
                          id: 'assistant',
                          name: 'Assistant',
                          description: 'A helpful AI assistant',
                          systemPrompt: 'You are a helpful AI assistant.'
                        },
                        {
                          id: 'creative',
                          name: 'Creative',
                          description: 'A creative and imaginative AI',
                          systemPrompt: 'You are a creative and imaginative AI assistant.',
                          temperature: 0.9
                        },
                        {
                          id: 'technical',
                          name: 'Technical',
                          description: 'A technical and precise AI',
                          systemPrompt: 'You are a technical and precise AI assistant focused on accuracy.',
                          temperature: 0.3
                        },
                        {
                          id: 'witty',
                          name: 'Witty',
                          description: 'A witty and humorous AI',
                          systemPrompt: 'You are a witty and humorous AI assistant.',
                          temperature: 0.8
                        }
                      ],
                      total: 4
                    },
                    timestamp: '2024-01-15T10:30:00Z',
                    requestId: 'req_123456'
                  }
                }
              }
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError'
            },
            '429': {
              $ref: '#/components/responses/RateLimitError'
            },
            '500': {
              $ref: '#/components/responses/InternalServerError'
            }
          }
        },
        options: {
          tags: ['Personalities'],
          summary: 'CORS preflight request',
          description: 'Handles CORS preflight requests for the personalities endpoint',
          responses: {
            '200': {
              description: 'CORS headers returned'
            }
          }
        }
      }
    }
  }
});

export default getApiSpec;
