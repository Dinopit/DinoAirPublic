import { NextRequest, NextResponse } from 'next/server';
import { modelTrainingService } from '@/lib/services/model-training';

// GET /api/training/jobs - Get all training jobs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') as any,
      createdBy: searchParams.get('createdBy') || undefined
    };

    const jobs = await modelTrainingService.getTrainingJobs(filters);
    
    return NextResponse.json({
      success: true,
      jobs,
      count: jobs.length
    });
  } catch (error) {
    console.error('Failed to fetch training jobs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch training jobs',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/training/jobs - Create a new training job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, config, createdBy } = body;
    
    // Validate required fields
    if (!name || !config || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, config, createdBy' },
        { status: 400 }
      );
    }

    const job = await modelTrainingService.createTrainingJob(name, config, createdBy);
    
    return NextResponse.json({
      success: true,
      job
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create training job:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create training job',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}