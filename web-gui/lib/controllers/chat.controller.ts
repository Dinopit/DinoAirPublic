import { NextRequest, NextResponse } from 'next/server';
import { ChatValidator } from '../validation/chat-validation';

export class ChatController {
  // Easy win: Configurable Ollama URL
  private static readonly OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  private static readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  static async handleChatRequest(request: NextRequest): Promise<NextResponse> {
    let totalTokens = 0;

    try {
      // Easy win: Validate and sanitize input
      const requestBody = await request.json();
      const validation = ChatValidator.validateChatRequest(requestBody);

      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: 'Invalid request',
            details: validation.errors,
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }

      const { messages, model, systemPrompt, stream = true } = validation.data!;

      // Easy win: Build proper prompt from messages
      const lastMessage = messages[messages.length - 1];
      let prompt = lastMessage.content;
      if (systemPrompt) {
        prompt = `System: ${systemPrompt}\n\nUser: ${prompt}`;
      }

      const selectedModel = model;

      const encoder = new TextEncoder();
      const responseStream = new ReadableStream({
        async start(controller) {
          // Easy win: Add timeout handling
          const timeoutId = setTimeout(() => {
            controller.error(new Error('Request timeout'));
          }, this.REQUEST_TIMEOUT);

          try {
            const response = await fetch(`${this.OLLAMA_BASE_URL}/api/generate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: selectedModel,
                prompt: prompt,
                stream: stream,
              }),
            });

            clearTimeout(timeoutId); // Clear timeout on successful response

            if (!response.ok) {
              const errorText = await response.text().catch(() => 'Unknown error');
              throw new Error(`Ollama API error (${response.status}): ${errorText}`);
            }

            if (!response.body) {
              throw new Error('No response body from Ollama');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                controller.close();
                break;
              }

              const text = decoder.decode(value);
              const lines = text.split('\n').filter((line) => line.trim());

              for (const line of lines) {
                try {
                  const json = JSON.parse(line);
                  if (json.response) {
                    controller.enqueue(encoder.encode(json.response));
                    totalTokens += Math.ceil(json.response.length / 4);
                  }
                } catch (e) {
                  console.error('Error parsing Ollama response:', e);
                }
              }
            }
          } catch (error) {
            clearTimeout(timeoutId);
            console.error('Streaming error:', error);
            controller.error(error);
          }
        },
      });

      // Easy win: Add security headers to response
      return new NextResponse(responseStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
      });
    } catch (error) {
      console.error('Chat API error:', error);

      // Easy win: Better error messages for users
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          return NextResponse.json(
            {
              error: 'AI service unavailable',
              message: 'The AI service is not running. Please try again later.',
              code: 'SERVICE_UNAVAILABLE',
              retryable: true,
            },
            { status: 503 }
          );
        }

        if (error.message.includes('timeout')) {
          return NextResponse.json(
            {
              error: 'Request timeout',
              message: 'The request took too long to process. Please try again.',
              code: 'TIMEOUT',
              retryable: true,
            },
            { status: 408 }
          );
        }

        if (error.message.includes('JSON')) {
          return NextResponse.json(
            {
              error: 'Invalid request format',
              message: 'The request format is invalid. Please check your input.',
              code: 'INVALID_FORMAT',
              retryable: false,
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'An unexpected error occurred. Please try again later.',
          code: 'INTERNAL_ERROR',
          retryable: true,
        },
        { status: 500 }
      );
    }
  }
}
