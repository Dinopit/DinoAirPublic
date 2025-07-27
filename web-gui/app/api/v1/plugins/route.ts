import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { withApiAuth } from '@/lib/middleware/api-auth';

// GET: List all installed plugins
async function listPlugins(_request: NextRequest) {
  try {
    // Since plugins are stored client-side, we'll return instructions
    // for accessing them. In production, this could be from a database.
    return NextResponse.json({
      plugins: [],
      total: 0,
      message: 'Plugins are managed client-side. Use the plugin manager interface to access them.',
      endpoints: {
        install: '/api/v1/plugins/install',
        registry: '/api/v1/plugins/registry',
        docs: '/api/v1/plugins/docs'
      }
    });
  } catch (error) {
    console.error('List plugins error:', error);
    return NextResponse.json(
      { error: 'Failed to list plugins' },
      { status: 500 }
    );
  }
}

// POST: Validate plugin manifest
async function validatePlugin(request: NextRequest) {
  try {
    const body = await request.json();
    const { manifest } = body;

    if (!manifest) {
      return NextResponse.json(
        { error: 'Plugin manifest is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = ['id', 'name', 'version', 'description', 'author', 'main'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid plugin manifest',
          missingFields,
          requiredFields 
        },
        { status: 400 }
      );
    }

    // Validate version format
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(manifest.version)) {
      return NextResponse.json(
        { error: 'Invalid version format. Expected: x.y.z' },
        { status: 400 }
      );
    }

    // Validate plugin ID format
    const idRegex = /^[a-z0-9-]+$/;
    if (!idRegex.test(manifest.id)) {
      return NextResponse.json(
        { error: 'Invalid plugin ID. Use lowercase letters, numbers, and hyphens only' },
        { status: 400 }
      );
    }

    // Basic security checks
    const securityIssues = [];
    if (manifest.main.includes('eval(')) {
      securityIssues.push('Plugin code contains eval() which is not allowed');
    }
    if (manifest.main.includes('Function(')) {
      securityIssues.push('Plugin code contains Function() constructor which may be unsafe');
    }
    if (manifest.main.includes('document.cookie')) {
      securityIssues.push('Plugin code attempts to access cookies directly');
    }

    return NextResponse.json({
      valid: securityIssues.length === 0,
      manifest,
      securityIssues,
      message: securityIssues.length === 0 ? 'Plugin manifest is valid' : 'Plugin has security issues'
    });

  } catch (error) {
    console.error('Validate plugin error:', error);
    return NextResponse.json(
      { error: 'Failed to validate plugin' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(listPlugins);
export const POST = withApiAuth(validatePlugin);
