import { NextRequest, NextResponse } from 'next/server';

export class ModelsController {
  static async handleGetModels(_request: NextRequest): Promise<NextResponse> {
    try {
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
      
      return NextResponse.json({
        models: data.models || [],
        success: true
      });
    } catch (error) {
      console.error('Models API error:', error);
      
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { error: 'Ollama service is not running. Please start Ollama first.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch models' },
        { status: 500 }
      );
    }
  }
}
