import { NextRequest, NextResponse } from 'next/server';
import { modelRegistry } from '@/lib/services/model-registry';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const source = searchParams.get('source') || 'registry'; // 'registry' or 'huggingface'
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    let models = [];

    if (source === 'huggingface') {
      models = await modelRegistry.searchHuggingFaceModels(query, limit);
    } else {
      // Search local registry
      models = await modelRegistry.getModels({ search: query });
      models = models.slice(0, limit);
    }
    
    return NextResponse.json({
      success: true,
      models,
      count: models.length,
      source
    });
  } catch (error) {
    console.error('Failed to search models:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search models',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}