# DinoAir API Documentation

## Overview

The DinoAir API provides programmatic access to AI models and personalities for chat interactions. All endpoints are RESTful and return JSON responses.

## Base URL

```
http://localhost:3000/api/v1
```

## Interactive Documentation

Visit the interactive Swagger UI documentation at:
```
http://localhost:3000/api-docs
```

## Authentication

All API endpoints require authentication using an API key. Include your API key in the `X-API-Key` header with each request.

```
X-API-Key: your-api-key-here
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:
- **Default limit**: 100 requests per 60 seconds per API key
- When rate limit is exceeded, the API returns a `429` status code
- The `Retry-After` header indicates when you can make requests again

## Available Endpoints

### 1. List Models

Get a list of all available AI models.

**Endpoint**: `GET /api/v1/models`

**Response**: Returns an array of available models with their details.

**Caching**: Results are cached for 10 minutes to improve performance.

#### Example Request (curl)

```bash
curl -X GET "http://localhost:3000/api/v1/models" \
  -H "X-API-Key: your-api-key-here" \
  -H "Accept: application/json"
```

#### Example Request (JavaScript)

```javascript
const response = await fetch('http://localhost:3000/api/v1/models', {
  method: 'GET',
  headers: {
    'X-API-Key': 'your-api-key-here',
    'Accept': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "llama2:latest",
        "name": "llama2:latest",
        "size": 3826793472,
        "modifiedAt": "2024-01-15T10:30:00Z",
        "digest": "sha256:8edb4f2f7f83",
        "parameterSize": "7B",
        "quantization": "Q4_0",
        "family": "llama"
      },
      {
        "id": "mistral:latest",
        "name": "mistral:latest",
        "size": 4113038848,
        "modifiedAt": "2024-01-10T08:20:00Z",
        "digest": "sha256:61e88e880bdc",
        "parameterSize": "7B",
        "quantization": "Q4_0",
        "family": "mistral"
      }
    ],
    "total": 2
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456"
}
```

### 2. List Personalities

Get a list of all available AI personalities.

**Endpoint**: `GET /api/v1/personalities`

**Response**: Returns an array of available personalities with their configurations.

**Caching**: Results are cached for 30 minutes since personalities rarely change.

#### Example Request (curl)

```bash
curl -X GET "http://localhost:3000/api/v1/personalities" \
  -H "X-API-Key: your-api-key-here" \
  -H "Accept: application/json"
```

#### Example Request (JavaScript)

```javascript
const response = await fetch('http://localhost:3000/api/v1/personalities', {
  method: 'GET',
  headers: {
    'X-API-Key': 'your-api-key-here',
    'Accept': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "personalities": [
      {
        "id": "assistant",
        "name": "Assistant",
        "description": "A helpful AI assistant",
        "systemPrompt": "You are a helpful AI assistant."
      },
      {
        "id": "creative",
        "name": "Creative",
        "description": "A creative and imaginative AI",
        "systemPrompt": "You are a creative and imaginative AI assistant.",
        "temperature": 0.9
      },
      {
        "id": "technical",
        "name": "Technical",
        "description": "A technical and precise AI",
        "systemPrompt": "You are a technical and precise AI assistant focused on accuracy.",
        "temperature": 0.3
      },
      {
        "id": "witty",
        "name": "Witty",
        "description": "A witty and humorous AI",
        "systemPrompt": "You are a witty and humorous AI assistant.",
        "temperature": 0.8
      }
    ],
    "total": 4
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456"
}
```

## Error Responses

The API uses standard HTTP status codes and returns detailed error messages.

### Common Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid request parameters |
| 401 | Unauthorized - Missing or invalid API key |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456"
}
```

### Rate Limit Error Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 60,
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456"
}
```

## CORS Support

All endpoints support CORS (Cross-Origin Resource Sharing) and handle preflight OPTIONS requests automatically.

## Advanced Usage Examples

### Handling Rate Limits in JavaScript

```javascript
async function makeApiRequest(url, apiKey) {
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(url, {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retries++;
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### Error Handling Example

```javascript
try {
  const response = await fetch('http://localhost:3000/api/v1/models', {
    headers: {
      'X-API-Key': 'your-api-key-here'
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    console.error('API Error:', data.error);
    return;
  }
  
  // Process successful response
  console.log(`Found ${data.data.total} models`);
  data.data.models.forEach(model => {
    console.log(`- ${model.name} (${model.parameterSize})`);
  });
  
} catch (error) {
  console.error('Request failed:', error);
}
```

### Using with Python

```python
import requests
import time

def get_models(api_key, base_url='http://localhost:3000'):
    headers = {
        'X-API-Key': api_key,
        'Accept': 'application/json'
    }
    
    response = requests.get(f'{base_url}/api/v1/models', headers=headers)
    
    if response.status_code == 429:
        retry_after = int(response.headers.get('Retry-After', 60))
        print(f'Rate limited. Waiting {retry_after} seconds...')
        time.sleep(retry_after)
        return get_models(api_key, base_url)  # Retry
    
    response.raise_for_status()
    return response.json()

# Usage
try:
    data = get_models('your-api-key-here')
    print(f"Available models: {data['data']['total']}")
    for model in data['data']['models']:
        print(f"- {model['name']} ({model['parameterSize']})")
except requests.exceptions.RequestException as e:
    print(f"API request failed: {e}")
```

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:
```
GET /api/openapi
```

This can be used to generate client SDKs or import into API testing tools like Postman.

## Best Practices

1. **Always handle rate limits gracefully** - Implement exponential backoff when retrying
2. **Cache responses when appropriate** - The API already caches some responses server-side
3. **Use appropriate error handling** - Check both HTTP status codes and response body
4. **Keep your API key secure** - Never expose it in client-side code
5. **Monitor your usage** - Track your API calls to avoid hitting rate limits

## Support

For API support or to report issues:
- Email: support@dinoair.ai
- GitHub Issues: [DinoAir Repository](https://github.com/dinoair/dinoair)

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Models endpoint with Ollama integration
- Personalities endpoint with customizable AI behaviors
- API key authentication
- Rate limiting (100 requests/60 seconds)
- Comprehensive OpenAPI documentation