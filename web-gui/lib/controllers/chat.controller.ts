import { NextRequest, NextResponse } from 'next/server';

export class ChatController {
  static async handleChatRequest(request: NextRequest): Promise<NextResponse> {
    let totalTokens = 0;
    
    try {
      const { messages, model, systemPrompt } = await request.json();
      
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json(
          { error: 'Invalid request: messages array required' },
          { status: 400 }
        );
      }

      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        return NextResponse.json(
          { error: 'Invalid request: last message must be from user' },
          { status: 400 }
        );
      }

      let prompt = lastMessage.content;
      if (systemPrompt) {
        prompt = `System: ${systemPrompt}\n\nUser: ${prompt}`;
      }

      const selectedModel = model || 'qwen:7b-chat-v1.5-q4_K_M';
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const response = await fetch('http://localhost:11434/api/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: selectedModel,
                prompt: prompt,
                stream: true,
              }),
            });

            if (!response.ok) {
              throw new Error(`Ollama API error: ${response.statusText}`);
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
              const lines = text.split('\n').filter(line => line.trim());
              
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
            console.error('Streaming error:', error);
            controller.error(error);
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    } catch (error) {
      console.error('Chat API error:', error);
      
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { error: 'Ollama service is not running. Please start Ollama first.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to process chat request' },
        { status: 500 }
      );
    }
  }
}
