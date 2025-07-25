import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/middleware/api-auth';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { ChatController } from '@/lib/controllers/chat.controller';

const chatController = new ChatController();

async function handleChat(request: NextRequest) {
  return chatController.handleChatRequest(request);
}

export const POST = withApiAuth(withErrorHandler(handleChat));