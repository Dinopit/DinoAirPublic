import React, { memo, useCallback, useMemo } from 'react';
import { ModelCategory } from '@/lib/services/model-registry';

interface ModelFiltersProps {
  selectedCategory?: ModelCategory;
  onCategoryChange: (category: ModelCategory | undefined) => void;
  showInstalled: boolean;
  installedFilter?: boolean;
  onInstalledFilterChange: (installed: boolean | undefined) => void;
  className?: string;
}

const ModelFilters: React.FC<ModelFiltersProps> = memo(
  ({
    selectedCategory,
    onCategoryChange,
    showInstalled,
    installedFilter,
    onInstalledFilterChange,
    className = '',
  }) => {
    // Memoize categories array to prevent recreation on each render
    const categories = useMemo(
      () => [
        { value: 'text' as ModelCategory, label: 'Text Models', icon: '💬' },
        { value: 'image' as ModelCategory, label: 'Image Generation', icon: '🎨' },
        { value: 'code' as ModelCategory, label: 'Code Generation', icon: '💻' },
        { value: 'multimodal' as ModelCategory, label: 'Multimodal', icon: '🔬' },
      ],
      []
    );

    // Memoize handlers to prevent child re-renders
    const handleCategoryClick = useCallback(
      (category: ModelCategory | undefined) => {
        onCategoryChange(category);
      },
      [onCategoryChange]
    );

    const handleInstalledToggle = useCallback(
      (installed: boolean | undefined) => {
        onInstalledFilterChange(installed);
      },
      [onInstalledFilterChange]
    );

    return (
      <div className={`model-filters ${className}`}>
        <div className="flex flex-wrap items-center gap-4">
          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-foreground">Category:</span>
            <select
              value={selectedCategory || ''}
              onChange={(e) => handleCategoryClick((e.target.value as ModelCategory) || undefined)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.icon} {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Installation Status Filter */}
          {showInstalled && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-foreground">Status:</span>
              <select
                value={
                  installedFilter === true
                    ? 'installed'
                    : installedFilter === false
                      ? 'available'
                      : 'all'
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'installed') {
                    handleInstalledToggle(true);
                  } else if (value === 'available') {
                    handleInstalledToggle(false);
                  } else {
                    handleInstalledToggle(undefined);
                  }
                }}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Models</option>
                <option value="installed">✅ Installed</option>
                <option value="available">📦 Available</option>
              </select>
            </div>
          )}

          {/* Quick Category Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleCategoryClick(undefined)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                !selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            {categories.slice(0, 4).map((category) => (
              <button
                key={category.value}
                onClick={() =>
                  handleCategoryClick(
                    selectedCategory === category.value ? undefined : category.value
                  )
                }
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                title={category.label}
              >
                {category.icon}
              </button>
            ))}
          </div>

          {/* Reset Filters */}
          {(selectedCategory || installedFilter !== undefined) && (
            <button
              onClick={() => {
                handleCategoryClick(undefined);
                handleInstalledToggle(undefined);
              }}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        {(selectedCategory || installedFilter !== undefined) && (
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {selectedCategory && (
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                {categories.find((c) => c.value === selectedCategory)?.label}
                <button
                  onClick={() => handleCategoryClick(undefined)}
                  className="ml-1 hover:text-primary/80"
                >
                  ✕
                </button>
              </span>
            )}
            {installedFilter !== undefined && (
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                {installedFilter ? 'Installed Only' : 'Available Only'}
                <button
                  onClick={() => handleInstalledToggle(undefined)}
                  className="ml-1 hover:text-primary/80"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

// Add display name for debugging
ModelFilters.displayName = 'ModelFilters';

export default ModelFilters;
