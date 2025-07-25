import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/middleware/api-auth';
import fs from 'fs/promises';
import path from 'path';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  personality?: string;
  systemPrompt?: string;
  stream?: boolean;
}

interface PersonalityData {
  name: string;
  system_prompt: string;
  description: string;
}

// Artifact system awareness prompt
const ARTIFACT_SYSTEM_PROMPT = `You are operating within DinoAir Free Tier, a self-hosted AI assistant platform. This system supports 'artifacts' - saved outputs that can include code snippets, documentation, images, or other generated content. When you provide code blocks or structured data, users may save these as artifacts for later reference. Artifacts help users organize and retrieve important information from our conversations.

`;

async function handleChat(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, model = 'llama3.2', personality = 'default', systemPrompt, stream = false } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    let baseSystemPrompt = 'You are a helpful AI assistant.';

    // If a custom system prompt is provided, use it
    if (systemPrompt) {
      baseSystemPrompt = systemPrompt;
    } else if (personality) {
      // Try to load the personality from file
      try {
        const personalitiesDir = path.join(process.cwd(), '..', 'personalities');
        const personalityFile = path.join(personalitiesDir, `${personality}.json`);
        
        const fileContent = await fs.readFile(personalityFile, 'utf-8');
        const personalityData: PersonalityData = JSON.parse(fileContent);
        
        if (personalityData.system_prompt) {
          baseSystemPrompt = personalityData.system_prompt;
        }
      } catch (error) {
        console.warn(`Failed to load personality '${personality}', using default:`, error);
        // Fall back to default system prompt if personality file can't be loaded
      }
    }

    // Combine artifact system prompt with the base system prompt
    const systemPromptContent = ARTIFACT_SYSTEM_PROMPT + baseSystemPrompt;

    // Prepare the request for Ollama
    const ollamaRequest = {
      model,
      messages: [
        {
          role: 'system',
          content: systemPromptContent
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