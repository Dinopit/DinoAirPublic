'use client';

import React, { useState } from 'react';
import { generateApiKey } from '@/lib/middleware/api-auth';

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  auth: boolean;
  body?: any;
  response?: any;
}

const apiEndpoints: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/api/v1/chat',
    description: 'Send chat messages to the AI model',
    auth: true,
    body: {
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ],
      model: 'llama3.2',
      personality: 'assistant',
      stream: false
    },
    response: {
      message: { role: 'assistant', content: 'Response content' },
      model: 'llama3.2',
      created_at: '2024-01-01T00:00:00Z',
      done: true,
      total_duration: 1000000000,
      eval_count: 50
    }
  },
  {
    method: 'GET',
    path: '/api/v1/artifacts',
    description: 'List all artifacts',
    auth: true,
    response: {
      artifacts: [],
      total: 0,
      page: 1,
      pageSize: 10
    }
  },
  {
    method: 'POST',
    path: '/api/v1/artifacts',
    description: 'Create a new artifact',
    auth: true,
    body: {
      title: 'My Code',
      description: 'A useful code snippet',
      type: 'code',
      content: 'console.log("Hello, World!");',
      language: 'javascript',
      tags: ['example', 'javascript']
    },
    response: {
      artifact: {
        id: 'artifact_123456789_abcdefghi',
        title: 'My Code',
        description: 'A useful code snippet',
        type: 'code',
        content: 'console.log("Hello, World!");',
        language: 'javascript',
        tags: ['example', 'javascript'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        version: 1
      }
    }
  },
  {
    method: 'GET',
    path: '/api/v1/artifacts/:id',
    description: 'Get a specific artifact',
    auth: true,
    response: {
      artifact: null,
      message: 'Artifacts are stored client-side'
    }
  },
  {
    method: 'PUT',
    path: '/api/v1/artifacts/:id',
    description: 'Update an artifact',
    auth: true,
    body: {
      title: 'Updated Title',
      content: 'Updated content'
    }
  },
  {
    method: 'DELETE',
    path: '/api/v1/artifacts/:id',
    description: 'Delete an artifact',
    auth: true,
    response: {
      success: true,
      message: 'Delete request received'
    }
  },
  {
    method: 'GET',
    path: '/api/v1/models',
    description: 'List available Ollama models',
    auth: true,
    response: {
      models: [
        {
          id: 'llama3.2',
          name: 'llama3.2',
          size: 3825819519,
          modifiedAt: '2024-01-01T00:00:00Z',
          digest: 'abc123...',
          parameterSize: '3B',
          quantization: 'Q4_0',
          family: 'llama'
        }
      ],
      total: 1
    }
  },
  {
    method: 'GET',
    path: '/api/v1/personalities',
    description: 'List available AI personalities',
    auth: true,
    response: {
      personalities: [
        {
          id: 'assistant',
          name: 'Assistant',
          description: 'A helpful AI assistant',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7
        }
      ],
      total: 4
    }
  },
  {
    method: 'GET',
    path: '/api/v1/system/health',
    description: 'Get system health status',
    auth: true,
    response: {
      status: 'healthy',
      timestamp: '2024-01-01T00:00:00Z',
      services: {
        ollama: {
          status: 'healthy',
          lastCheck: '2024-01-01T00:00:00Z',
          responseTime: 50
        },
        comfyui: {
          status: 'healthy',
          lastCheck: '2024-01-01T00:00:00Z',
          responseTime: 100
        },
        webGui: {
          status: 'healthy',
          lastCheck: '2024-01-01T00:00:00Z',
          responseTime: 0
        }
      },
      uptime: 3600
    }
  },
  {
    method: 'GET',
    path: '/api/v1/system/stats',
    description: 'Get performance metrics and statistics',
    auth: true,
    response: {
      timestamp: '2024-01-01T00:00:00Z',
      uptime: 3600,
      performance: {
        chat: {
          responseTimeMs: { avg: 500, min: 100, max: 2000, p50: 450, p95: 1500 },
          totalRequests: 100
        },
        api: {
          responseTimeMs: { avg: 50, min: 10, max: 200, p50: 45, p95: 150 },
          totalRequests: 1000
        },
        tokenUsage: {
          total: 50000,
          byModel: { 'llama3.2': 50000 }
        }
      },
      resources: {
        activeConnections: 5,
        memory: {
          heapUsedMB: 150,
          heapTotalMB: 512,
          externalMB: 20,
          rssMB: 600
        },
        cpu: {
          userMs: 12000,
          systemMs: 3000
        }
      }
    }
  }
];

export default function ApiDocsPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleGenerateKey = () => {
    const newKey = generateApiKey();
    setApiKey(newKey);
    setShowKey(true);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      const keys = JSON.parse(localStorage.getItem('dinoair-api-keys') || '[]');
      keys.push({
        key: newKey,
        name: `API Key ${keys.length + 1}`,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('dinoair-api-keys', JSON.stringify(keys));
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">DinoAir API Documentation</h1>
      
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Authentication</h2>
        <p className="mb-4">
          All API endpoints require authentication using an API key. Include your API key in the request headers:
        </p>
        <pre className="bg-gray-900 text-white p-4 rounded overflow-x-auto">
          <code>{`X-API-Key: your_api_key_here`}</code>
        </pre>
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Generate API Key</h3>
          <button
            onClick={handleGenerateKey}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Generate New API Key
          </button>
          
          {apiKey && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <p className="text-sm font-semibold mb-2">Your API Key:</p>
              <div className="flex items-center gap-2">
                <code className="bg-gray-900 text-white px-3 py-1 rounded flex-1">
                  {showKey ? apiKey : '••••••••••••••••••••••••••••••••'}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(apiKey)}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Copy
                </button>
              </div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                ⚠️ Save this key securely. It won't be shown again.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <h2 className="text-2xl font-semibold">API Endpoints</h2>
        
        {apiEndpoints.map((endpoint, index) => (
          <div key={index} className="border dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
              <span className={`px-3 py-1 rounded text-sm font-semibold ${
                endpoint.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {endpoint.method}
              </span>
              <code className="text-lg font-mono">{endpoint.path}</code>
              {endpoint.auth && (
                <span className="text-sm text-gray-500">🔒 Requires Auth</span>
              )}
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">{endpoint.description}</p>
            
            {endpoint.body && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Request Body:</h4>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto">
                  <code>{JSON.stringify(endpoint.body, null, 2)}</code>
                </pre>
              </div>
            )}
            
            {endpoint.response && (
              <div>
                <h4 className="font-semibold mb-2">Response:</h4>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto">
                  <code>{JSON.stringify(endpoint.response, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Example Usage</h2>
        <pre className="bg-gray-900 text-white p-4 rounded overflow-x-auto">
          <code>{`// Example: Send a chat message
const response = await fetch('http://localhost:3000/api/v1/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key_here'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'What is the weather like?' }
    ],
    model: 'llama3.2',
    stream: false
  })
});

const data = await response.json();
console.log(data.message.content);`}</code>
        </pre>
      </div>
    </div>
  );
}