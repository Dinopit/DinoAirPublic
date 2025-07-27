import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { tool, action, params } = await request.json();
    
    // Validate and sanitize input
    const allowedTools = ['tool1', 'tool2', 'tool3']; // Replace with actual allowed tools
    const allowedActions = ['action1', 'action2', 'action3']; // Replace with actual allowed actions
    
    if (!allowedTools.includes(tool)) {
      throw new Error('Invalid tool specified');
    }
    
    if (!allowedActions.includes(action)) {
      throw new Error('Invalid action specified');
    }
    
    const sanitizedParams = {
      content: params.content ? params.content.toString() : undefined,
      query: params.query ? params.query.toString() : undefined,
      title: params.title ? params.title.toString() : undefined,
      start_time: params.start_time ? params.start_time.toString() : undefined,
      description: params.description ? params.description.toString() : undefined,
      app_name: params.app_name ? params.app_name.toString() : undefined,
      path: params.path ? params.path.toString() : undefined,
      days: params.days ? parseInt(params.days, 10) : undefined,
      limit: params.limit ? parseInt(params.limit, 10) : undefined,
      note_id: params.note_id ? params.note_id.toString() : undefined,
    };
    
    const scriptPath = path.join(process.cwd(), '..', 'dino_local_toolset', 'main.py');
    
    const args = ['--tool', tool, '--action', action];
    
    if (sanitizedParams.content) args.push('--input', sanitizedParams.content);
    if (sanitizedParams.query) args.push('--query', sanitizedParams.query);
    if (sanitizedParams.title) args.push('--title', sanitizedParams.title);
    if (sanitizedParams.start_time) args.push('--start-time', sanitizedParams.start_time);
    if (sanitizedParams.description) args.push('--description', sanitizedParams.description);
    if (sanitizedParams.app_name) args.push('--app-name', sanitizedParams.app_name);
    if (sanitizedParams.path) args.push('--path', sanitizedParams.path);
    if (sanitizedParams.days) args.push('--days', sanitizedParams.days.toString());
    if (sanitizedParams.limit) args.push('--limit', sanitizedParams.limit.toString());
    if (sanitizedParams.note_id) args.push('--note-id', sanitizedParams.note_id);
    
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [scriptPath, ...args]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(NextResponse.json(result));
          } catch (error) {
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Failed to parse Python script output',
              stdout,
              stderr 
            }));
          }
        } else {
          resolve(NextResponse.json({ 
            success: false, 
            error: `Python script exited with code ${code}`,
            stderr 
          }));
        }
      });
      
      pythonProcess.on('error', (error) => {
        resolve(NextResponse.json({ 
          success: false, 
          error: `Failed to start Python script: ${error.message}` 
        }));
      });
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: `API error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}
