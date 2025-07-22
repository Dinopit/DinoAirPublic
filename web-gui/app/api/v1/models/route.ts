import { NextRequest } from 'next/server';
import { apiMiddleware, createApiResponse, handleOptionsRequest, createErrorResponse } from '@/lib/api-utils';
import { withCache, generateCacheKey } from '@/lib/api-cache';

/**
 * @typedef {Object} OllamaModel
 * @property {string} name - Model name/identifier
 * @property {string} modified_at - Last modification timestamp
 * @property {number} size - Model size in bytes
 * @property {string} digest - Model digest hash
 * @property {Object} details - Model details
 * @property {string} details.format - Model format
 * @property {string} details.family - Model family
 * @property {string[]|null} details.families - Model families
 * @property {string} details.parameter_size - Parameter size (e.g., "7B")
 * @property {string} details.quantization_level - Quantization level (e.g., "Q4_0")
 */
interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

/**
 * @swagger
 * /api/v1/models:
 *   get:
 *     tags:
 *       - Models
 *     summary: List available AI models
 *     description: Returns a list of all available AI models from the Ollama backend. Results are cached for 10 minutes to improve performance.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Successful response with list of models
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModelsResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function listModels(request: NextRequest) {
  // Apply common API middleware
  const middlewareResult = await apiMiddleware(request);
  if (!middlewareResult.authorized || middlewareResult.rateLimited) {
    return middlewareResult.response!;
  }

  try {
    // Use cache for models list (cache for 10 minutes)
    const cacheKey = generateCacheKey('models');
    
    const result = await withCache(
      cacheKey,
      async () => {
        // Call Ollama API to get models
        const response = await fetch('http://localhost:11434/api/tags');
        
        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Transform the response to a more API-friendly format
        const models = data.models.map((model: OllamaModel) => ({
          id: model.name,
          name: model.name,
          size: model.size,
          modifiedAt: model.modified_at,
          digest: model.digest,
          parameterSize: model.details?.parameter_size,
          quantization: model.details?.quantization_level,
          family: model.details?.family,
        }));

        return {
          models,
          total: models.length,
        };
      },
      10 * 60 * 1000 // 10 minutes TTL
    );

    return createApiResponse(result, request, middlewareResult.clientId!);
  } catch (error) {
    console.error('Models API error:', error);
    return createErrorResponse('Failed to fetch models', 500);
  }
}

/**
 * @swagger
 * /api/v1/models:
 *   options:
 *     tags:
 *       - Models
 *     summary: CORS preflight request
 *     description: Handles CORS preflight requests for the models endpoint
 *     responses:
 *       200:
 *         description: CORS headers returned
 */
export async function OPTIONS(request: NextRequest) {
  return handleOptionsRequest();
}

export const GET = listModels;