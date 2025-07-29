/**
 * DinoAir Advanced Search API Route
 * Provides comprehensive search functionality with filtering, sorting, and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/middleware/api-auth';

// Mock data for demonstration - in a real app, this would come from a database
const MOCK_DATA = [
  {
    id: '1',
    title: 'Getting Started with DinoAir',
    description: 'A comprehensive guide to setting up and using DinoAir for the first time.',
    type: 'documentation',
    category: 'guides',
    tags: ['setup', 'beginner', 'tutorial'],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    content: 'DinoAir is a powerful AI platform that combines local language models with image generation capabilities...',
    author: 'DinoAir Team',
    metadata: {
      readTime: 5,
      difficulty: 'beginner',
      views: 1250
    }
  },
  {
    id: '2',
    title: 'Advanced Chat Configuration',
    description: 'Learn how to configure advanced chat settings and customize your AI interactions.',
    type: 'documentation',
    category: 'configuration',
    tags: ['chat', 'advanced', 'configuration'],
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-25T16:45:00Z',
    content: 'Advanced chat configuration allows you to fine-tune your AI interactions...',
    author: 'Technical Team',
    metadata: {
      readTime: 8,
      difficulty: 'intermediate',
      views: 890
    }
  },
  {
    id: '3',
    title: 'Model Management Best Practices',
    description: 'Best practices for managing and optimizing AI models in DinoAir.',
    type: 'article',
    category: 'best-practices',
    tags: ['models', 'optimization', 'performance'],
    createdAt: '2024-01-05T11:30:00Z',
    updatedAt: '2024-01-22T13:20:00Z',
    content: 'Effective model management is crucial for optimal performance...',
    author: 'AI Research Team',
    metadata: {
      readTime: 12,
      difficulty: 'advanced',
      views: 2100
    }
  },
  {
    id: '4',
    title: 'Troubleshooting Common Issues',
    description: 'Solutions to frequently encountered problems and error messages.',
    type: 'troubleshooting',
    category: 'support',
    tags: ['troubleshooting', 'errors', 'solutions'],
    createdAt: '2024-01-12T15:45:00Z',
    updatedAt: '2024-01-28T10:15:00Z',
    content: 'This guide covers the most common issues users encounter...',
    author: 'Support Team',
    metadata: {
      readTime: 6,
      difficulty: 'beginner',
      views: 3200
    }
  },
  {
    id: '5',
    title: 'API Integration Guide',
    description: 'Complete guide for integrating with DinoAir APIs and webhooks.',
    type: 'documentation',
    category: 'development',
    tags: ['api', 'integration', 'webhooks', 'development'],
    createdAt: '2024-01-08T12:00:00Z',
    updatedAt: '2024-01-26T09:30:00Z',
    content: 'DinoAir provides comprehensive APIs for integration...',
    author: 'Developer Relations',
    metadata: {
      readTime: 15,
      difficulty: 'advanced',
      views: 1800
    }
  }
];

interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Calculate relevance score using TF-IDF inspired weighted scoring algorithm
 * 
 * This algorithm implements a simplified version of TF-IDF (Term Frequency-Inverse Document Frequency)
 * scoring commonly used in information retrieval systems. It assigns different weights to matches
 * in different fields based on their importance for search relevance.
 * 
 * Algorithm Overview:
 * 1. Split query into individual search terms
 * 2. For each field (title, description, content, tags), count matching terms
 * 3. Apply field-specific weights based on importance
 * 4. Normalize score by number of search terms
 * 
 * Field Weights (based on search relevance importance):
 * - Title: 0.4 (40%) - Most important for relevance
 * - Description: 0.3 (30%) - High importance for context
 * - Content: 0.2 (20%) - Medium importance for detailed matching
 * - Tags: 0.1 (10%) - Lower weight but good for categorization
 * 
 * Time Complexity: O(t * (|title| + |desc| + |content| + |tags|)) where t is number of terms
 * Space Complexity: O(t) for storing search terms array
 * 
 * @param item - The search item to score
 * @param query - The search query string
 * @returns Relevance score between 0 and 1 (1 being most relevant)
 */
function calculateRelevanceScore(item: any, query: string): number {
  if (!query) return 1;
  
  // Tokenize query into individual terms and normalize to lowercase
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
  if (searchTerms.length === 0) return 1;
  
  let totalScore = 0;
  
  // Field 1: Title matches (highest weight - 40%)
  // Titles are most indicative of content relevance
  const titleMatches = searchTerms.filter(term => 
    item.title.toLowerCase().includes(term)
  ).length;
  totalScore += titleMatches * 0.4;
  
  // Field 2: Description matches (high weight - 30%)
  // Descriptions provide important context and summary
  const descMatches = searchTerms.filter(term => 
    item.description.toLowerCase().includes(term)
  ).length;
  totalScore += descMatches * 0.3;
  
  // Field 3: Content matches (medium weight - 20%)
  // Full content matching for detailed relevance
  const contentMatches = searchTerms.filter(term => 
    item.content.toLowerCase().includes(term)
  ).length;
  totalScore += contentMatches * 0.2;
  
  // Field 4: Tag matches (lower weight - 10%)
  // Tags are good for categorization but less specific
  const tagMatches = searchTerms.filter(term => 
    item.tags.some((tag: string) => tag.toLowerCase().includes(term))
  ).length;
  totalScore += tagMatches * 0.1;
  
  // Normalize score by number of search terms to get percentage match
  // Cap at 1.0 to ensure score doesn't exceed maximum relevance
  return Math.min(totalScore / searchTerms.length, 1);
}

/**
 * Apply filters to search results using multi-criteria filtering algorithm
 * 
 * This algorithm implements a conjunctive (AND) filtering system where all
 * specified filter criteria must be satisfied for an item to pass through.
 * It supports various filter types including exact matches, range filters,
 * substring matches, and array intersections.
 * 
 * Algorithm Overview:
 * 1. Iterate through each item in the dataset
 * 2. For each item, check all active filter criteria
 * 3. Apply type-specific filtering logic based on filter key
 * 4. Return only items that satisfy ALL filter conditions
 * 
 * Supported Filter Types:
 * - Exact Match: type, category, difficulty
 * - Substring Match: author (case-insensitive)
 * - Array Intersection: tags (any selected tag must be present)
 * - Date Range: dateFrom, dateTo (inclusive)
 * - Numeric Range: minViews, maxReadTime
 * - Generic String: fallback for unknown filters
 * 
 * Time Complexity: O(n * f * c) where:
 * - n = number of items
 * - f = number of active filters
 * - c = average cost per filter check
 * 
 * Space Complexity: O(k) where k is the number of items that pass filters
 * 
 * @param items - Array of items to filter
 * @param filters - Object containing filter criteria
 * @returns Filtered array containing only items that match all criteria
 */
function applyFilters(items: any[], filters: Record<string, any>): any[] {
  return items.filter(item => {
    // Iterate through each filter criterion
    for (const [filterKey, filterValue] of Object.entries(filters)) {
      // Skip empty or null filter values
      if (!filterValue || filterValue === '' || (Array.isArray(filterValue) && filterValue.length === 0)) {
        continue;
      }
      
      // Apply filter-specific logic based on the filter key
      switch (filterKey) {
        case 'type':
          // Exact match filter for item type
          if (item.type !== filterValue) return false;
          break;
          
        case 'category':
          // Exact match filter for item category
          if (item.category !== filterValue) return false;
          break;
          
        case 'tags':
          // Array intersection filter - item must have at least one selected tag
          const selectedTags = Array.isArray(filterValue) ? filterValue : [filterValue];
          if (!selectedTags.some((tag: string) => item.tags.includes(tag))) {
            return false;
          }
          break;
          
        case 'author':
          // Case-insensitive substring match for author name
          if (!item.author.toLowerCase().includes(filterValue.toLowerCase())) {
            return false;
          }
          break;
          
        case 'difficulty':
          // Exact match filter for difficulty level (from metadata)
          if (item.metadata?.difficulty !== filterValue) return false;
          break;
          
        case 'dateFrom':
          // Date range filter - item must be created on or after this date
          if (new Date(item.createdAt) < new Date(filterValue)) return false;
          break;
          
        case 'dateTo':
          // Date range filter - item must be created on or before this date
          if (new Date(item.createdAt) > new Date(filterValue)) return false;
          break;
          
        case 'minViews':
          // Numeric range filter - item must have at least this many views
          if ((item.metadata?.views || 0) < parseInt(filterValue)) return false;
          break;
          
        case 'maxReadTime':
          // Numeric range filter - item must have read time less than or equal to this
          if ((item.metadata?.readTime || 0) > parseInt(filterValue)) return false;
          break;
          
        default:
          // Generic string matching for unknown/custom filters
          // Performs case-insensitive substring search if the field is a string
          if (typeof item[filterKey] === 'string' && 
              !item[filterKey].toLowerCase().includes(filterValue.toLowerCase())) {
            return false;
          }
      }
    }
    
    // Item passes all filter criteria
    return true;
  });
}

/**
 * Sort search results
 */
function sortResults(items: any[], sortBy: string, sortOrder: 'asc' | 'desc'): any[] {
  return items.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'relevance':
        aValue = a.relevanceScore;
        bValue = b.relevanceScore;
        break;
      case 'date':
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
        break;
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'views':
        aValue = a.metadata?.views || 0;
        bValue = b.metadata?.views || 0;
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Generate facets for filtering
 */
function generateFacets(items: any[]): Record<string, { value: string; count: number }[]> {
  const facets: Record<string, Record<string, number>> = {};
  
  items.forEach(item => {
    // Type facets
    facets.type = facets.type || {};
    facets.type[item.type] = (facets.type[item.type] || 0) + 1;
    
    // Category facets
    facets.category = facets.category || {};
    facets.category[item.category] = (facets.category[item.category] || 0) + 1;
    
    // Tag facets
    facets.tags = facets.tags || {};
    item.tags.forEach((tag: string) => {
      facets.tags![tag] = (facets.tags![tag] || 0) + 1;
    });
    
    // Difficulty facets
    if (item.metadata?.difficulty) {
      facets.difficulty = facets.difficulty || {};
      facets.difficulty[item.metadata.difficulty] = (facets.difficulty[item.metadata.difficulty] || 0) + 1;
    }
  });
  
  // Convert to required format
  const result: Record<string, { value: string; count: number }[]> = {};
  Object.entries(facets).forEach(([key, values]) => {
    result[key] = Object.entries(values)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  });
  
  return result;
}

async function handleSearch(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params: SearchParams = {
      query: searchParams.get('query') || '',
      filters: searchParams.get('filters') ? JSON.parse(searchParams.get('filters')!) : {},
      sortBy: searchParams.get('sortBy') || 'relevance',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
    };

    // Start with all data
    let results = [...MOCK_DATA];
    
    // Apply text search and calculate relevance scores
    if (params.query) {
      results = results
        .map(item => ({
          ...item,
          relevanceScore: calculateRelevanceScore(item, params.query!)
        }))
        .filter(item => item.relevanceScore > 0);
    } else {
      results = results.map(item => ({ ...item, relevanceScore: 1 }));
    }
    
    // Apply filters
    if (params.filters && Object.keys(params.filters).length > 0) {
      results = applyFilters(results, params.filters);
    }
    
    // Generate facets before pagination
    const facets = generateFacets(results);
    
    // Sort results
    results = sortResults(results, params.sortBy!, params.sortOrder!);
    
    // Apply pagination
    const total = results.length;
    const startIndex = (params.page! - 1) * params.pageSize!;
    const endIndex = startIndex + params.pageSize!;
    const paginatedResults = results.slice(startIndex, endIndex);
    
    // Format results for frontend
    const formattedResults = paginatedResults.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      type: item.type,
      category: item.category,
      tags: item.tags,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      relevanceScore: (item as any).relevanceScore,
      metadata: item.metadata
    }));

    return NextResponse.json({
      results: formattedResults,
      total,
      facets,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil(total / params.pageSize!),
        hasNext: endIndex < total,
        hasPrev: params.page! > 1
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export the handler with authentication
export const GET = withApiAuth(handleSearch);