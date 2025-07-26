import { NextRequest, NextResponse } from 'next/server';
import { recordChatResponseTime, recordTokenUsage } from '@/app/api/v1/system/stats/route';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let totalTokens = 0;
  
  try {
    const { messages, model, systemPrompt } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array required' },
        { status: 400 }
      );
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Invalid request: last message must be from user' },
        { status: 400 }
      );
    }

    // Format the prompt for Ollama with optional system prompt
    let prompt = lastMessage.content;
    if (systemPrompt) {
      prompt = `System: ${systemPrompt}\n\nUser: ${prompt}`;
    }

    // Use provided model or default
    const selectedModel = model || 'qwen:7b-chat-v1.5-q4_K_M';
    
    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Track API response time (for future metrics)
          // const apiStartTime = Date.now();
          
          // Call Ollama API
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

            // Parse the JSON response from Ollama
            const text = decoder.decode(value);
            const lines = text.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const json = JSON.parse(line);
                if (json.response) {
                  // Send the response chunk to the client
                  controller.enqueue(encoder.encode(json.response));
                  // Estimate tokens (rough approximation)
                  totalTokens += Math.ceil(json.response.length / 4);
                }
                
                // If this is the final response, record metrics
                if (json.done) {
                  const duration = Date.now() - startTime;
                  recordChatResponseTime(duration);
                  
                  // Record token usage
                  const userMessageTokens = Math.ceil(prompt.length / 4);
                  recordTokenUsage(selectedModel, totalTokens + userMessageTokens);
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

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Check if Ollama is not running
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
