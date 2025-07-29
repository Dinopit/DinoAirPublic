import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { apiMiddleware, createApiResponse, handleOptionsRequest, createErrorResponse } from '@/lib/api-utils';
import { withCache, generateCacheKey } from '@/lib/api-cache';

/**
 * @typedef {Object} Personality
 * @property {string} id - Unique identifier for the personality
 * @property {string} name - Display name of the personality
 * @property {string} description - Description of the personality
 * @property {string} systemPrompt - System prompt that defines the personality behavior
 * @property {number} [temperature] - Temperature setting for response generation (0-1)
 * @property {number} [topP] - Top-p sampling parameter
 * @property {number} [topK] - Top-k sampling parameter
 */
interface Personality {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  temperature?: number;
  topP?: number;
  topK?: number;
}

/**
 * @swagger
 * /api/v1/personalities:
 *   get:
 *     tags:
 *       - Personalities
 *     summary: List available AI personalities
 *     description: Returns a list of all available AI personalities. Personalities define the behavior and response style of the AI. Results are cached for 30 minutes.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Successful response with list of personalities
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PersonalitiesResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function listPersonalities(request: NextRequest) {
  // Apply common API middleware
  const middlewareResult = await apiMiddleware(request);
  if (!middlewareResult.authorized || middlewareResult.rateLimited) {
    return middlewareResult.response!;
  }

  try {
    // Use cache for personalities list (cache for 30 minutes since personalities rarely change)
    const cacheKey = generateCacheKey('personalities');
    
    const result = await withCache(
      cacheKey,
      async () => {
        const personalitiesDir = path.join(process.cwd(), '..', 'personalities');
        const personalities: Personality[] = [];

        try {
          const files = await fs.readdir(personalitiesDir);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(personalitiesDir, file);
              const content = await fs.readFile(filePath, 'utf-8');
              const data = JSON.parse(content);
              
              personalities.push({
                id: file.replace('.json', ''),
                name: data.name || file.replace('.json', ''),
                description: data.description || '',
                systemPrompt: data.system_prompt || data.systemPrompt || '',
                temperature: data.temperature,
                topP: data.top_p || data.topP,
                topK: data.top_k || data.topK,
              });
            }
          }
        } catch (error) {
          // If personalities directory doesn't exist, return default personalities
          personalities.push(
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
            }
          );
        }

        return {
          personalities,
          total: personalities.length,
        };
      },
      30 * 60 * 1000 // 30 minutes TTL
    );

    return createApiResponse(result, request, middlewareResult.clientId!);
  } catch (error) {
    console.error('Personalities API error:', error);
    return createErrorResponse('Failed to fetch personalities', 500);
  }
}

/**
 * @swagger
 * /api/v1/personalities:
 *   options:
 *     tags:
 *       - Personalities
 *     summary: CORS preflight request
 *     description: Handles CORS preflight requests for the personalities endpoint
 *     responses:
 *       200:
 *         description: CORS headers returned
 */
export async function OPTIONS(_request: NextRequest) {
  return handleOptionsRequest();
}

export const GET = listPersonalities;
