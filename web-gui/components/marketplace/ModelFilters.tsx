import React from 'react';

// Define ModelCategory type locally to avoid import issues
type ModelCategory = 'chat' | 'image' | 'embedding' | 'all';

interface ModelFiltersProps {
  selectedCategory?: ModelCategory;
  onCategoryChange: (category: ModelCategory | undefined) => void;
  showInstalled: boolean;
  installedFilter?: boolean;
  onInstalledFilterChange: (installed: boolean | undefined) => void;
  className?: string;
}

const ModelFilters: React.FC<ModelFiltersProps> = ({
  selectedCategory,
  onCategoryChange,
  showInstalled,
  installedFilter,
  onInstalledFilterChange,
  className = '',
}) => {
  const categories = [
    { value: ModelCategory.CODE_GENERATION, label: 'Code Generation', icon: '💻' },
    { value: ModelCategory.CREATIVE_WRITING, label: 'Creative Writing', icon: '✍️' },
    { value: ModelCategory.ANALYSIS, label: 'Analysis', icon: '📊' },
    { value: ModelCategory.CHAT, label: 'Chat', icon: '💬' },
    { value: ModelCategory.IMAGE_GENERATION, label: 'Image Generation', icon: '🎨' },
    { value: ModelCategory.DOMAIN_SPECIFIC, label: 'Domain Specific', icon: '🔬' },
    { value: ModelCategory.CUSTOM, label: 'Custom', icon: '⚙️' },
  ];

  return (
    <div className={`model-filters ${className}`}>
      <div className="flex flex-wrap items-center gap-4">
        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-foreground">Category:</span>
          <select
            value={selectedCategory || ''}
            onChange={(e) => onCategoryChange((e.target.value as ModelCategory) || undefined)}
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
                  onInstalledFilterChange(true);
                } else if (value === 'available') {
                  onInstalledFilterChange(false);
                } else {
                  onInstalledFilterChange(undefined);
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
            onClick={() => onCategoryChange(undefined)}
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
                onCategoryChange(selectedCategory === category.value ? undefined : category.value)
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
              onCategoryChange(undefined);
              onInstalledFilterChange(undefined);
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
                onClick={() => onCategoryChange(undefined)}
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
                onClick={() => onInstalledFilterChange(undefined)}
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
};

export default ModelFilters;
