/**
 * API Documentation Routes
 * OpenAPI/Swagger documentation and testing interface
 */

const express = require('express');
const router = express.Router();

// OpenAPI specification
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'DinoAir Web GUI API',
    version: '1.0.0',
    description: 'Node.js API for DinoAir chat interface and AI model management',
    contact: {
      name: 'DinoAir Team',
      email: 'support@dinoair.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Development server'
    }
  ],
  paths: {
    '/chat': {
      post: {
        summary: 'Send chat message',
        description: 'Send a message to AI model and receive streaming response',
        tags: ['Chat'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['messages'],
                properties: {
                  messages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                        content: { type: 'string' }
                      }
                    }
                  },
                  model: { type: 'string', description: 'AI model to use' },
                  systemPrompt: { type: 'string', description: 'System prompt for AI behavior' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Streaming chat response',
            content: {
              'text/plain': {
                schema: { type: 'string' }
              }
            }
          },
          400: { description: 'Invalid request' },
          503: { description: 'Ollama service unavailable' }
        }
      }
    },
    '/chat/models': {
      get: {
        summary: 'Get available models',
        description: 'Retrieve list of available AI models',
        tags: ['Chat'],
        responses: {
          200: {
            description: 'List of available models',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    models: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          size: { type: 'number' },
                          modified_at: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Get system health status',
        tags: ['System'],
        responses: {
          200: {
            description: 'System health information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                    timestamp: { type: 'string' },
                    uptime: { type: 'number' },
                    services: { type: 'object' },
                    system: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/ollama/models': {
      get: {
        summary: 'Get Ollama models',
        description: 'Retrieve available models from Ollama service',
        tags: ['Ollama'],
        responses: {
          200: {
            description: 'Available Ollama models',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    models: { type: 'array' },
                    count: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/ollama/pull': {
      post: {
        summary: 'Pull Ollama model',
        description: 'Download a model to Ollama with streaming progress',
        tags: ['Ollama'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['model'],
                properties: {
                  model: { type: 'string', description: 'Model name to pull' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Streaming pull progress' },
          400: { description: 'Invalid request' },
          503: { description: 'Ollama service unavailable' }
        }
      }
    },
    '/v1/artifacts': {
      get: {
        summary: 'Get artifacts',
        description: 'Retrieve user artifacts',
        tags: ['Artifacts'],
        responses: {
          200: {
            description: 'List of artifacts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    artifacts: { type: 'array' },
                    total: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          code: { type: 'string' }
        }
      },
      ChatMessage: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['user', 'assistant', 'system'] },
          content: { type: 'string' },
          timestamp: { type: 'string' }
        }
      }
    }
  },
  tags: [
    { name: 'Chat', description: 'Chat and messaging endpoints' },
    { name: 'Ollama', description: 'Ollama service management' },
    { name: 'System', description: 'System health and monitoring' },
    { name: 'Artifacts', description: 'Artifact management' }
  ]
};

// GET /api/docs - API documentation page
router.get('/', (req, res) => {
  res.render('api-docs', {
    title: 'DinoAir API Documentation',
    pageTitle: 'API Documentation',
    description: 'Interactive API documentation and testing interface',
    currentPage: 'docs',
    spec: JSON.stringify(openApiSpec, null, 2)
  });
});

// GET /api/docs/openapi.json - OpenAPI specification
router.get('/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

// GET /api/docs/swagger.json - Swagger specification (alias)
router.get('/swagger.json', (req, res) => {
  res.json(openApiSpec);
});

// GET /api/docs/redoc - ReDoc documentation
router.get('/redoc', (req, res) => {
  const redocHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>DinoAir API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <redoc spec-url="/api/docs/openapi.json"></redoc>
  <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js"></script>
</body>
</html>`;

  res.send(redocHtml);
});

// GET /api/docs/swagger-ui - Swagger UI
router.get('/swagger-ui', (req, res) => {
  const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DinoAir API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;

  res.send(swaggerHtml);
});

// GET /api/docs/postman - Postman collection
router.get('/postman', (req, res) => {
  const postmanCollection = {
    info: {
      name: 'DinoAir API',
      description: 'DinoAir Web GUI API Collection',
      version: '1.0.0',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [
      {
        name: 'Chat',
        item: [
          {
            name: 'Send Message',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  messages: [
                    { role: 'user', content: 'Hello, how are you?' }
                  ],
                  model: 'qwen:7b-chat-v1.5-q4_K_M'
                }, null, 2)
              },
              url: {
                raw: '{{baseUrl}}/api/chat',
                host: ['{{baseUrl}}'],
                path: ['api', 'chat']
              }
            }
          },
          {
            name: 'Get Models',
            request: {
              method: 'GET',
              url: {
                raw: '{{baseUrl}}/api/chat/models',
                host: ['{{baseUrl}}'],
                path: ['api', 'chat', 'models']
              }
            }
          }
        ]
      },
      {
        name: 'System',
        item: [
          {
            name: 'Health Check',
            request: {
              method: 'GET',
              url: {
                raw: '{{baseUrl}}/api/health',
                host: ['{{baseUrl}}'],
                path: ['api', 'health']
              }
            }
          }
        ]
      }
    ],
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000',
        type: 'string'
      }
    ]
  };

  res.json(postmanCollection);
});

// GET /api/docs/stats - API usage statistics
router.get('/stats', (req, res) => {
  // Basic API statistics (would be enhanced with real metrics)
  const stats = {
    endpoints: Object.keys(openApiSpec.paths).length,
    totalRequests: global.requestCount || 0,
    uptime: process.uptime(),
    version: openApiSpec.info.version,
    lastUpdated: new Date().toISOString()
  };

  res.json(stats);
});

module.exports = router;
