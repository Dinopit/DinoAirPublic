import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { withApiAuth } from '@/lib/middleware/api-auth';

// POST: Install a plugin from URL or uploaded manifest
async function installPlugin(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, type = 'url', manifest } = body;

    // Validate request
    if (type === 'url' && !source) {
      return NextResponse.json(
        { error: 'Plugin source URL is required' },
        { status: 400 }
      );
    }

    if (type === 'manifest' && !manifest) {
      return NextResponse.json(
        { error: 'Plugin manifest is required' },
        { status: 400 }
      );
    }

    let pluginManifest;

    if (type === 'url') {
      // Fetch plugin manifest from URL
      try {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch plugin: ${response.statusText}`);
        }
        pluginManifest = await response.json();
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to fetch plugin from URL: ${error}` },
          { status: 400 }
        );
      }
    } else {
      pluginManifest = manifest;
    }

    // Validate manifest using the same validation logic
    const requiredFields = ['id', 'name', 'version', 'description', 'author', 'main'];
    const missingFields = requiredFields.filter(field => !pluginManifest[field]);
    
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

    // Security validation
    const securityIssues = [];
    const mainCode = pluginManifest.main;
    
    // Check for dangerous code patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, message: 'eval() is not allowed' },
      { pattern: /new\s+Function\s*\(/, message: 'Function constructor is not allowed' },
      { pattern: /document\.cookie/, message: 'Direct cookie access is not allowed' },
      { pattern: /window\.location/, message: 'Location manipulation is not allowed' },
      { pattern: /fetch\s*\([^)]*(?:file:|ftp:|data:)/, message: 'File/FTP/Data URL fetch is not allowed' },
      { pattern: /import\s+.*\s+from\s+['"]\w+:/, message: 'Protocol imports are not allowed' }
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(mainCode)) {
        securityIssues.push(message);
      }
    }

    if (securityIssues.length > 0) {
      return NextResponse.json(
        { 
          error: 'Plugin contains security issues',
          securityIssues 
        },
        { status: 400 }
      );
    }

    // Return successful validation - actual installation happens client-side
    return NextResponse.json({
      success: true,
      message: 'Plugin validated successfully. Installation will be handled client-side.',
      manifest: pluginManifest,
      installUrl: `/plugins/install?plugin=${encodeURIComponent(JSON.stringify(pluginManifest))}`
    });

  } catch (error) {
    console.error('Install plugin error:', error);
    return NextResponse.json(
      { error: 'Failed to install plugin' },
      { status: 500 }
    );
  }
}

export const POST = withApiAuth(installPlugin);
