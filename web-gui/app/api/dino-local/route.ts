import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { tool, action, params } = await request.json();
    
    const scriptPath = path.join(process.cwd(), '..', 'dino_local_toolset', 'main.py');
    
    const args = ['--tool', tool, '--action', action];
    
    if (params.content) args.push('--input', params.content);
    if (params.query) args.push('--query', params.query);
    if (params.title) args.push('--title', params.title);
    if (params.start_time) args.push('--start-time', params.start_time);
    if (params.description) args.push('--description', params.description);
    if (params.app_name) args.push('--app-name', params.app_name);
    if (params.path) args.push('--path', params.path);
    if (params.days) args.push('--days', params.days.toString());
    if (params.limit) args.push('--limit', params.limit.toString());
    if (params.note_id) args.push('--note-id', params.note_id);
    
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
