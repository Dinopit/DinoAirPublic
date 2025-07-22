import { NextRequest, NextResponse } from 'next/server';

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

async function listModels(request: NextRequest) {
  try {
    // Call Ollama API to get models
    const response = await fetch('http://localhost:11434/api/tags');
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform the response to a more API-friendly format
    const models = data.models.map((model: OllamaModel) => ({
      id: model.name,
      name: model.name,
      size: model.size,
      modifiedAt: model.modified_at,
      digest: model.digest,
      parameterSize: model.details?.parameter_size,
      quantization: model.details?.quantization_level,
      family: model.details?.family,
    }));

    return NextResponse.json({
      models,
      total: models.length,
    });
  } catch (error) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

export const GET = listModels;