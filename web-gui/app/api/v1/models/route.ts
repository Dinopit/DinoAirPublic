import type { NextRequest } from 'next/server';

import { ModelsController } from '@/lib/controllers/models.controller';
import { withApiAuth } from '@/lib/middleware/api-auth';
import { withErrorHandler } from '@/lib/services/error-handler';

/**
 * @swagger
 * /api/v1/models:
 *   get:
 *     tags:
 *       - Models
 *     summary: List available AI models
 *     description: Returns a list of all available AI models from the Ollama backend.
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
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailableError'
 *   options:
 *     tags:
 *       - Models
 *     summary: CORS preflight request
 *     description: Handles CORS preflight requests for the models endpoint
 *     responses:
 *       200:
 *         description: CORS headers returned
 */

async function handleGetModels(request: NextRequest) {
  return ModelsController.handleGetModels(request);
}

export const GET = withApiAuth(withErrorHandler(handleGetModels));
