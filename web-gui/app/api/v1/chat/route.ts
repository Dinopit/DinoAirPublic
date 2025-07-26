import type { NextRequest } from 'next/server';

import { ChatController } from '@/lib/controllers/chat.controller';
import { withApiAuth } from '@/lib/middleware/api-auth';
import { withErrorHandler } from '@/lib/services/error-handler';

async function handleChat(request: NextRequest) {
  return ChatController.handleChatRequest(request);
}

export const POST = withApiAuth(withErrorHandler(handleChat));
