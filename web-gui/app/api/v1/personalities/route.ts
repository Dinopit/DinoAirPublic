import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface Personality {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  temperature?: number;
  topP?: number;
  topK?: number;
}

async function listPersonalities(request: NextRequest) {
  try {
    const personalitiesDir = path.join(process.cwd(), '..', 'personalities');
    const personalities: Personality[] = [];

    try {
      const files = await fs.readdir(personalitiesDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(personalitiesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          personalities.push({
            id: file.replace('.json', ''),
            name: data.name || file.replace('.json', ''),
            description: data.description || '',
            systemPrompt: data.system_prompt || data.systemPrompt || '',
            temperature: data.temperature,
            topP: data.top_p || data.topP,
            topK: data.top_k || data.topK,
          });
        }
      }
    } catch (error) {
      // If personalities directory doesn't exist, return default personalities
      personalities.push(
        {
          id: 'assistant',
          name: 'Assistant',
          description: 'A helpful AI assistant',
          systemPrompt: 'You are a helpful AI assistant.',
        },
        {
          id: 'creative',
          name: 'Creative',
          description: 'A creative and imaginative AI',
          systemPrompt: 'You are a creative and imaginative AI assistant.',
          temperature: 0.9,
        },
        {
          id: 'technical',
          name: 'Technical',
          description: 'A technical and precise AI',
          systemPrompt: 'You are a technical and precise AI assistant focused on accuracy.',
          temperature: 0.3,
        },
        {
          id: 'witty',
          name: 'Witty',
          description: 'A witty and humorous AI',
          systemPrompt: 'You are a witty and humorous AI assistant.',
          temperature: 0.8,
        }
      );
    }

    return NextResponse.json({
      personalities,
      total: personalities.length,
    });
  } catch (error) {
    console.error('Personalities API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personalities' },
      { status: 500 }
    );
  }
}

export const GET = listPersonalities;