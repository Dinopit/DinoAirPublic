import type { Meta, StoryObj } from '@storybook/react';
import { AdvancedSearch, SearchFilter, SearchResult } from './advanced-search';

// Mock search function for Storybook
const mockSearch = async (searchState: any) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const mockResults: SearchResult[] = [
    {
      id: '1',
      title: 'Getting Started with DinoAir',
      description: 'A comprehensive guide to setting up and using DinoAir for the first time.',
      type: 'documentation',
      category: 'guides',
      tags: ['setup', 'beginner', 'tutorial'],
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
      relevanceScore: 0.95,
      metadata: { readTime: 5, difficulty: 'beginner', views: 1250 },
    },
    {
      id: '2',
      title: 'Advanced Chat Configuration',
      description:
        'Learn how to configure advanced chat settings and customize your AI interactions.',
      type: 'documentation',
      category: 'configuration',
      tags: ['chat', 'advanced', 'configuration'],
      createdAt: '2024-01-10T09:15:00Z',
      updatedAt: '2024-01-25T16:45:00Z',
      relevanceScore: 0.87,
      metadata: { readTime: 8, difficulty: 'intermediate', views: 890 },
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
      relevanceScore: 0.82,
      metadata: { readTime: 12, difficulty: 'advanced', views: 2100 },
    },
  ];

  // Filter results based on query
  const filteredResults = searchState.query
    ? mockResults.filter(
        (result) =>
          result.title.toLowerCase().includes(searchState.query.toLowerCase()) ||
          result.description.toLowerCase().includes(searchState.query.toLowerCase())
      )
    : mockResults;

  return {
    results: filteredResults,
    total: filteredResults.length,
    facets: {
      type: [
        { value: 'documentation', count: 2 },
        { value: 'article', count: 1 },
      ],
      category: [
        { value: 'guides', count: 1 },
        { value: 'configuration', count: 1 },
        { value: 'best-practices', count: 1 },
      ],
      tags: [
        { value: 'setup', count: 1 },
        { value: 'beginner', count: 1 },
        { value: 'advanced', count: 2 },
        { value: 'chat', count: 1 },
        { value: 'models', count: 1 },
      ],
    },
  };
};

const sampleFilters: SearchFilter[] = [
  {
    id: 'type',
    label: 'Content Type',
    type: 'select',
    options: [
      { value: 'documentation', label: 'Documentation' },
      { value: 'article', label: 'Article' },
      { value: 'tutorial', label: 'Tutorial' },
      { value: 'troubleshooting', label: 'Troubleshooting' },
    ],
  },
  {
    id: 'category',
    label: 'Category',
    type: 'select',
    options: [
      { value: 'guides', label: 'Guides' },
      { value: 'configuration', label: 'Configuration' },
      { value: 'best-practices', label: 'Best Practices' },
      { value: 'development', label: 'Development' },
      { value: 'support', label: 'Support' },
    ],
  },
  {
    id: 'tags',
    label: 'Tags',
    type: 'multiselect',
    options: [
      { value: 'setup', label: 'Setup' },
      { value: 'beginner', label: 'Beginner' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'chat', label: 'Chat' },
      { value: 'models', label: 'Models' },
      { value: 'api', label: 'API' },
      { value: 'troubleshooting', label: 'Troubleshooting' },
    ],
  },
  {
    id: 'difficulty',
    label: 'Difficulty',
    type: 'select',
    options: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
    ],
  },
  {
    id: 'dateFrom',
    label: 'Created After',
    type: 'date',
    placeholder: 'Select start date',
  },
  {
    id: 'dateTo',
    label: 'Created Before',
    type: 'date',
    placeholder: 'Select end date',
  },
  {
    id: 'minViews',
    label: 'Minimum Views',
    type: 'text',
    placeholder: 'Enter minimum view count',
  },
  {
    id: 'maxReadTime',
    label: 'Max Read Time (minutes)',
    type: 'range',
    min: 1,
    max: 30,
  },
];

const meta: Meta<typeof AdvancedSearch> = {
  title: 'UI/AdvancedSearch',
  component: AdvancedSearch,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A comprehensive search component with advanced filtering, sorting, and pagination capabilities. Supports multiple filter types including text, select, multiselect, date ranges, and boolean filters.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the search input',
    },
    showFilters: {
      control: 'boolean',
      description: 'Whether to show the filters panel',
    },
    showSorting: {
      control: 'boolean',
      description: 'Whether to show sorting options',
    },
    showPagination: {
      control: 'boolean',
      description: 'Whether to show pagination controls',
    },
    onSearch: {
      action: 'search',
      description: 'Callback function called when search is performed',
    },
    onResultClick: {
      action: 'result-clicked',
      description: 'Callback function called when a result is clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Search documentation, articles, and guides...',
    filters: sampleFilters,
    onSearch: mockSearch,
    onResultClick: (result: any) => console.log('Clicked result:', result),
    showFilters: true,
    showSorting: true,
    showPagination: true,
  },
};

export const WithoutFilters: Story = {
  args: {
    placeholder: 'Simple search without filters...',
    filters: [],
    onSearch: mockSearch,
    onResultClick: (result: any) => console.log('Clicked result:', result),
    showFilters: false,
    showSorting: true,
    showPagination: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'A simplified search interface without filter options.',
      },
    },
  },
};

export const MinimalSearch: Story = {
  args: {
    placeholder: 'Minimal search interface...',
    filters: [],
    onSearch: mockSearch,
    onResultClick: (result: any) => console.log('Clicked result:', result),
    showFilters: false,
    showSorting: false,
    showPagination: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'A minimal search interface with just the search input and results.',
      },
    },
  },
};

export const WithBasicFilters: Story = {
  args: {
    placeholder: 'Search with basic filters...',
    filters: sampleFilters.slice(0, 3), // Only first 3 filters
    onSearch: mockSearch,
    onResultClick: (result: any) => console.log('Clicked result:', result),
    showFilters: true,
    showSorting: true,
    showPagination: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Search interface with a reduced set of basic filters.',
      },
    },
  },
};

export const LoadingState: Story = {
  args: {
    placeholder: 'Search with loading state...',
    filters: sampleFilters,
    onSearch: async (searchState: any) => {
      // Simulate longer loading
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return mockSearch(searchState);
    },
    onResultClick: (result: any) => console.log('Clicked result:', result),
    showFilters: true,
    showSorting: true,
    showPagination: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the loading state during search operations.',
      },
    },
  },
};

export const EmptyResults: Story = {
  args: {
    placeholder: 'Search that returns no results...',
    filters: sampleFilters,
    onSearch: async () => ({
      results: [],
      total: 0,
      facets: {},
    }),
    onResultClick: (result: any) => console.log('Clicked result:', result),
    showFilters: true,
    showSorting: true,
    showPagination: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the empty state when no search results are found.',
      },
    },
  },
};

export const MobileView: Story = {
  args: {
    placeholder: 'Mobile search interface...',
    filters: sampleFilters,
    onSearch: mockSearch,
    onResultClick: (result: any) => console.log('Clicked result:', result),
    showFilters: true,
    showSorting: true,
    showPagination: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'The search interface optimized for mobile devices.',
      },
    },
  },
};

export const DarkTheme: Story = {
  args: {
    placeholder: 'Search in dark theme...',
    filters: sampleFilters,
    onSearch: mockSearch,
    onResultClick: (result: any) => console.log('Clicked result:', result),
    showFilters: true,
    showSorting: true,
    showPagination: true,
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'The search interface in dark theme mode.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="dark">
        <Story />
      </div>
    ),
  ],
};

// Interactive demo story
export const InteractiveDemo: Story = {
  args: {
    placeholder: 'Try searching for "chat", "setup", or "advanced"...',
    filters: sampleFilters,
    onSearch: mockSearch,
    onResultClick: (result: any) => console.log('Clicked result:', result),
    showFilters: true,
    showSorting: true,
    showPagination: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'An interactive demo. Try searching for different terms and using the filters to see how the component responds.',
      },
    },
  },
};
