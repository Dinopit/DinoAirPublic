import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    // Call Ollama API to get available models
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract model names from the response
    const models = data.models?.map((model: any) => ({
      name: model.name,
      size: model.size,
      digest: model.digest,
      modified: model.modified_at,
    })) || [];

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    
    // Check if Ollama is not running
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'Ollama service is not running. Please start Ollama first.', models: [] },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch available models', models: [] },
      { status: 500 }
    );
  }
}
