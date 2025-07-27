import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { withApiAuth } from '@/lib/middleware/api-auth';

interface RegistryPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  downloadUrl: string;
  featured: boolean;
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

// Sample plugin registry - in production this would be from a database
const SAMPLE_PLUGINS: RegistryPlugin[] = [
  {
    id: 'example-plugin',
    name: 'Example Plugin',
    version: '1.0.0',
    description: 'A simple example plugin that adds custom chat commands',
    author: 'DinoAir Team',
    homepage: 'https://github.com/dinoair/example-plugin',
    downloadUrl: '/api/v1/plugins/registry/example-plugin',
    featured: true,
    category: 'Chat',
    tags: ['chat', 'commands', 'example'],
    downloads: 1250,
    rating: 4.8,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 'weather-plugin',
    name: 'Weather Assistant',
    version: '2.1.0',
    description: 'Get weather information in chat with customizable locations and alerts',
    author: 'WeatherDev',
    homepage: 'https://github.com/weatherdev/dinoair-weather',
    downloadUrl: '/api/v1/plugins/registry/weather-plugin',
    featured: false,
    category: 'Utilities',
    tags: ['weather', 'utilities', 'api'],
    downloads: 890,
    rating: 4.5,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z'
  },
  {
    id: 'code-formatter',
    name: 'Code Formatter',
    version: '1.5.2',
    description: 'Automatically format code blocks in chat responses with syntax highlighting',
    author: 'CodeTools',
    homepage: 'https://github.com/codetools/dinoair-formatter',
    downloadUrl: '/api/v1/plugins/registry/code-formatter',
    featured: true,
    category: 'Development',
    tags: ['code', 'formatting', 'syntax'],
    downloads: 2100,
    rating: 4.9,
    createdAt: '2023-12-15T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z'
  }
];

// GET: Browse plugin registry
async function browseRegistry(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured') === 'true';
    const sort = searchParams.get('sort') || 'downloads';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let filteredPlugins = [...SAMPLE_PLUGINS];

    // Apply filters
    if (category) {
      filteredPlugins = filteredPlugins.filter(p => 
        p.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredPlugins = filteredPlugins.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (featured) {
      filteredPlugins = filteredPlugins.filter(p => p.featured);
    }

    // Apply sorting
    filteredPlugins.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating - a.rating;
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'downloads':
        default:
          return b.downloads - a.downloads;
      }
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPlugins = filteredPlugins.slice(startIndex, endIndex);

    // Get available categories and tags
    const categories = Array.from(new Set(SAMPLE_PLUGINS.map(p => p.category)));
    const tags = Array.from(new Set(SAMPLE_PLUGINS.flatMap(p => p.tags)));

    return NextResponse.json({
      plugins: paginatedPlugins,
      pagination: {
        page,
        limit,
        total: filteredPlugins.length,
        pages: Math.ceil(filteredPlugins.length / limit)
      },
      filters: {
        categories,
        tags,
        applied: {
          category,
          search,
          featured,
          sort
        }
      }
    });

  } catch (error) {
    console.error('Browse registry error:', error);
    return NextResponse.json(
      { error: 'Failed to browse plugin registry' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(browseRegistry);
