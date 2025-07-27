import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { withApiAuth } from '@/lib/middleware/api-auth';

interface Artifact {
  id: string;
  title: string;
  description: string;
  type: 'code' | 'document' | 'config' | 'other';
  content: string;
  language?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

// GET: List all artifacts
async function listArtifacts(_request: NextRequest) {
  try {
    // Get artifacts from localStorage (in production, this would be from a database)
    
    // Since this is server-side, we'll return a placeholder response
    // In a real implementation, this would fetch from a database
    return NextResponse.json({
      artifacts: [],
      total: 0,
      page: 1,
      pageSize: 10,
      message: 'Artifacts are stored client-side. Use the web interface to access them.'
    });
  } catch (error) {
    console.error('List artifacts error:', error);
    return NextResponse.json(
      { error: 'Failed to list artifacts' },
      { status: 500 }
    );
  }
}

// POST: Create a new artifact
async function createArtifact(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, type, content, language, tags = [] } = body;

    if (!title || !type || !content) {
      return NextResponse.json(
        { error: 'Title, type, and content are required' },
        { status: 400 }
      );
    }

    const newArtifact: Artifact = {
      id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: description || '',
      type,
      content,
      language,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    // Return the created artifact
    return NextResponse.json({
      artifact: newArtifact,
      message: 'Artifact created successfully. Note: Server-side storage is not implemented in the free tier.'
    });
  } catch (error) {
    console.error('Create artifact error:', error);
    return NextResponse.json(
      { error: 'Failed to create artifact' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(listArtifacts);
export const POST = withApiAuth(createArtifact);
