import { NextRequest, NextResponse } from 'next/server';
import { modelTrainingService } from '@/lib/services/model-training';

// GET /api/training/datasets - Get all datasets
export async function GET(request: NextRequest) {
  try {
    const datasets = await modelTrainingService.getDatasets();
    
    return NextResponse.json({
      success: true,
      datasets,
      count: datasets.length
    });
  } catch (error) {
    console.error('Failed to fetch datasets:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch datasets',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/training/datasets - Upload a new dataset
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadataStr = formData.get('metadata') as string;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!metadataStr) {
      return NextResponse.json(
        { success: false, error: 'No metadata provided' },
        { status: 400 }
      );
    }

    let metadata;
    try {
      metadata = JSON.parse(metadataStr);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid metadata JSON' },
        { status: 400 }
      );
    }

    // Validate required metadata fields
    const requiredFields = ['name', 'description', 'type', 'format', 'uploadedBy'];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required metadata field: ${field}` },
          { status: 400 }
        );
      }
    }

    const dataset = await modelTrainingService.uploadDataset(file, metadata);
    
    return NextResponse.json({
      success: true,
      dataset
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to upload dataset:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to upload dataset',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}