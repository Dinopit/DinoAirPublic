import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';


// Maximum file size: 100KB
const MAX_FILE_SIZE = 100 * 1024;

// Path to personalities directory (relative to project root)
const PERSONALITIES_DIR = path.join(process.cwd(), '..', '..', 'personalities');

interface PersonalityData {
  id?: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  system_prompt?: string;
  temperature?: number;
  maxTokens?: number;
  max_tokens?: number;
  isDefault?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

// Validate personality data
function validatePersonality(data: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Check required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Name is required and must be a non-empty string' });
  }

  // Validate optional fields
  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  }

  const systemPrompt = data.systemPrompt || data.system_prompt;
  if (systemPrompt !== undefined && typeof systemPrompt !== 'string') {
    errors.push({ field: 'systemPrompt', message: 'System prompt must be a string' });
  }

  if (data.temperature !== undefined) {
    const temp = parseFloat(data.temperature);
    if (isNaN(temp) || temp < 0 || temp > 2) {
      errors.push({ field: 'temperature', message: 'Temperature must be between 0 and 2' });
    }
  }

  const maxTokens = data.maxTokens || data.max_tokens;
  if (maxTokens !== undefined) {
    const tokens = parseInt(maxTokens);
    if (isNaN(tokens) || tokens < 1) {
      errors.push({ field: 'maxTokens', message: 'Max tokens must be a positive number' });
    }
  }

  return { valid: errors.length === 0, errors };
}

// Generate a unique ID for the personality
function generatePersonalityId(name: string): string {
  const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const uniqueSuffix = crypto.randomBytes(4).toString('hex');
  return `${baseId}-${uniqueSuffix}`;
}

// Normalize personality data to standard format
function normalizePersonalityData(data: PersonalityData): any {
  return {
    name: data.name.trim(),
    description: data.description?.trim() || `Custom personality: ${data.name}`,
    system_prompt: (data.systemPrompt || data.system_prompt || '').trim(),
    temperature: data.temperature,
    max_tokens: data.maxTokens || data.max_tokens,
    isDefault: false // Imported personalities are never default
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 100KB limit' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      return NextResponse.json(
        { success: false, error: 'File must be a JSON file' },
        { status: 400 }
      );
    }

    // Read and parse file content
    const fileContent = await file.text();
    let personalityData: PersonalityData;

    try {
      personalityData = JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format' },
        { status: 400 }
      );
    }

    // Validate personality data
    const validation = validatePersonality(personalityData);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          validationErrors: validation.errors 
        },
        { status: 400 }
      );
    }

    // Generate unique ID
    const personalityId = personalityData.id || generatePersonalityId(personalityData.name);

    // Check if personality already exists
    try {
      await fs.access(PERSONALITIES_DIR);
    } catch {
      // Create personalities directory if it doesn't exist
      await fs.mkdir(PERSONALITIES_DIR, { recursive: true });
    }

    const existingFiles = await fs.readdir(PERSONALITIES_DIR);
    const existingPersonalityFile = existingFiles.find(
      file => file === `${personalityId}.json`
    );

    if (existingPersonalityFile) {
      // Check if it's the same personality by comparing content
      const existingContent = await fs.readFile(
        path.join(PERSONALITIES_DIR, existingPersonalityFile),
        'utf-8'
      );
      const existingData = JSON.parse(existingContent);
      
      if (existingData.name === personalityData.name) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'A personality with this name already exists',
            existingId: personalityId
          },
          { status: 409 }
        );
      }
    }

    // Normalize and save personality data
    const normalizedData = normalizePersonalityData(personalityData);
    const filePath = path.join(PERSONALITIES_DIR, `${personalityId}.json`);
    
    await fs.writeFile(
      filePath,
      JSON.stringify(normalizedData, null, 2),
      'utf-8'
    );

    return NextResponse.json({
      success: true,
      message: 'Personality imported successfully',
      personality: {
        id: personalityId,
        ...normalizedData,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error importing personality:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS method for CORS preflight
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
