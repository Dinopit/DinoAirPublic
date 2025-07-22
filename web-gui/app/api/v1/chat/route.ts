import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/middleware/api-auth';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  personality?: string;
  stream?: boolean;
}

async function handleChat(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, model = 'llama3.2', personality = 'assistant', stream = false } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Prepare the request for Ollama
    const ollamaRequest = {
      model,
      messages: [
        {
          role: 'system',
          content: personality === 'assistant' 
            ? 'You are a helpful AI assistant.'
            : `You are an AI with a ${personality} personality.`
        },
        ...messages
      ],
      stream
    };

    // Call Ollama API
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ollamaRequest),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    if (stream) {
      // For streaming responses, pass through the stream
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // For non-streaming, parse and return the response
      const data = await response.json();
      return NextResponse.json({
        message: data.message,
        model: data.model,
        created_at: data.created_at,
        done: data.done,
        total_duration: data.total_duration,
        load_duration: data.load_duration,
        prompt_eval_duration: data.prompt_eval_duration,
        eval_duration: data.eval_duration,
        eval_count: data.eval_count,
      });
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

export const POST = withApiAuth(handleChat);