'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { useDebounce } from '@/lib/hooks/useDebounce';

export interface SearchFilter {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'range' | 'boolean' | 'multiselect';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
}

export interface SearchState {
  query: string;
  filters: Record<string, any>;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

interface AdvancedSearchProps {
  placeholder?: string;
  filters?: SearchFilter[];
  onSearch: (searchState: SearchState) => Promise<{
    results: SearchResult[];
    total: number;
    facets?: Record<string, { value: string; count: number }[]>;
  }>;
  onResultClick?: (result: SearchResult) => void;
  className?: string;
  showFilters?: boolean;
  showSorting?: boolean;
  showPagination?: boolean;
}

export function AdvancedSearch({
  placeholder = 'Search...',
  filters = [],
  onSearch,
  onResultClick,
  className = '',
  showFilters = true,
  showSorting = true,
  showPagination = true
}: AdvancedSearchProps) {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    filters: {},
    sortBy: 'relevance',
    sortOrder: 'desc',
    page: 1,
    pageSize: 20
  });

  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [, setFacets] = useState<Record<string, { value: string; count: number }[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const debouncedQuery = useDebounce(searchState.query, 300);

  // Perform search when query or filters change
  useEffect(() => {
    performSearch();
  }, [
    debouncedQuery,
    searchState.filters,
    searchState.sortBy,
    searchState.sortOrder,
    searchState.page
  ]);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim() && Object.keys(searchState.filters).length === 0) {
      setResults([]);
      setTotal(0);
      setFacets({});
      return;
    }

    setIsLoading(true);
    try {
      const response = await onSearch({
        ...searchState,
        query: debouncedQuery
      });

      setResults(response.results);
      setTotal(response.total);
      setFacets(response.facets || {});
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setTotal(0);
      setFacets({});
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, searchState, onSearch]);

  const updateSearchState = (updates: Partial<SearchState>) => {
    setSearchState((prev) => ({
      ...prev,
      ...updates,
      page: updates.page !== undefined ? updates.page : 1 // Reset to first page unless explicitly set
    }));
  };

  const updateFilter = (filterId: string, value: any) => {
    updateSearchState({
      filters: {
        ...searchState.filters,
        [filterId]: value
      }
    });
  };

  const clearFilter = (filterId: string) => {
    const newFilters = { ...searchState.filters };
    delete newFilters[filterId];
    updateSearchState({ filters: newFilters });
  };

  const clearAllFilters = () => {
    updateSearchState({ filters: {} });
  };

  const renderFilter = (filter: SearchFilter) => {
    const value = searchState.filters[filter.id];

    switch (filter.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={filter.placeholder}
            value={value || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">All</option>
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        const selectedValues = value || [];
        return (
          <div className="space-y-2">
            {filter.options?.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((v: string) => v !== option.value);
                    updateFilter(filter.id, newValues);
                  }}
                  className="mr-2"
                />
                {option.label}
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        );

      case 'range':
        return (
          <div className="space-y-2">
            <input
              type="range"
              min={filter.min || 0}
              max={filter.max || 100}
              value={value || filter.min || 0}
              onChange={(e) => updateFilter(filter.id, parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-sm text-gray-600">Value: {value || filter.min || 0}</div>
          </div>
        );

      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => updateFilter(filter.id, e.target.checked)}
              className="mr-2"
            />
            {filter.label}
          </label>
        );

      default:
        return null;
    }
  };

  const activeFiltersCount = Object.keys(searchState.filters).filter(
    (key) =>
      searchState.filters[key] !== undefined &&
      searchState.filters[key] !== '' &&
      (Array.isArray(searchState.filters[key]) ? searchState.filters[key].length > 0 : true)
  ).length;

  return (
    <div className={`advanced-search ${className}`}>
      {/* Search Input */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder={placeholder}
          value={searchState.query}
          onChange={(e) => updateSearchState({ query: e.target.value })}
          className="w-full p-3 pr-10 border rounded-lg text-base sm:text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          ) : (
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Filters Toggle */}
      {showFilters && filters.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="flex items-center justify-between w-full sm:w-auto px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span className="font-medium">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            <svg
              className={`h-4 w-4 transform transition-transform ${isFiltersExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && isFiltersExpanded && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{filter.label}</label>
                  {searchState.filters[filter.id] && (
                    <button
                      onClick={() => clearFilter(filter.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {renderFilter(filter)}
              </div>
            ))}
          </div>

          {activeFiltersCount > 0 && (
            <div className="mt-4 pt-4 border-t">
              <button onClick={clearAllFilters} className="text-sm text-red-500 hover:text-red-700">
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sorting */}
      {showSorting && (
        <div className="flex items-center space-x-4 mb-4">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={searchState.sortBy}
            onChange={(e) => updateSearchState({ sortBy: e.target.value })}
            className="p-2 border rounded-md"
          >
            <option value="relevance">Relevance</option>
            <option value="date">Date</option>
            <option value="title">Title</option>
            <option value="type">Type</option>
          </select>
          <button
            onClick={() =>
              updateSearchState({
                sortOrder: searchState.sortOrder === 'asc' ? 'desc' : 'asc'
              })
            }
            className="p-2 border rounded-md hover:bg-gray-50"
          >
            {searchState.sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {results.length > 0 && <div className="text-sm text-gray-600">{total} results found</div>}

        {results.map((result) => (
          <div
            key={result.id}
            onClick={() => onResultClick?.(result)}
            className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-lg mb-1">{result.title}</h3>
                <p className="text-gray-600 mb-2">{result.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded">{result.type}</span>
                  <span>{result.category}</span>
                  <span>{new Date(result.updatedAt).toLocaleDateString()}</span>
                </div>
                {result.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-400">
                Score: {Math.round(result.relevanceScore * 100)}%
              </div>
            </div>
          </div>
        ))}

        {results.length === 0 && !isLoading && (debouncedQuery || activeFiltersCount > 0) && (
          <div className="text-center py-8 text-gray-500">
            No results found. Try adjusting your search terms or filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      {showPagination && total > searchState.pageSize && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Showing {(searchState.page - 1) * searchState.pageSize + 1} to{' '}
            {Math.min(searchState.page * searchState.pageSize, total)} of {total} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => updateSearchState({ page: searchState.page - 1 })}
              disabled={searchState.page === 1}
              className="px-3 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-2">
              Page {searchState.page} of {Math.ceil(total / searchState.pageSize)}
            </span>
            <button
              onClick={() => updateSearchState({ page: searchState.page + 1 })}
              disabled={searchState.page >= Math.ceil(total / searchState.pageSize)}
              className="px-3 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
