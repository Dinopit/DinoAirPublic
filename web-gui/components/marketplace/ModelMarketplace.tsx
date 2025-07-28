import React, { useState, useMemo, useCallback, memo } from 'react';
import { ModelCategory } from '@/lib/services/model-registry';
import { useMarketplace } from '@/hooks/useMarketplace';
import ModelCard from './ModelCard';
import ModelFilters from './ModelFilters';
import ModelSearch from './ModelSearch';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ModelMarketplaceProps {
  onModelSelect?: (model: any) => void;
  showInstalled?: boolean;
  className?: string;
}

const ModelMarketplace: React.FC<ModelMarketplaceProps> = memo(
  ({ onModelSelect, showInstalled = true, className = '' }) => {
    const [selectedCategory, setSelectedCategory] = useState<ModelCategory | undefined>();
    const [searchQuery, setSearchQuery] = useState('');
    const [externalResults, setExternalResults] = useState<any[]>([]);
    const [showExternal, setShowExternal] = useState(false);

    const {
      models,
      isLoading,
      error,
      filters,
      installProgress,
      updateFilters,
      searchExternal,
      installModel,
      uninstallModel,
      clearError,
    } = useMarketplace({ autoFetch: true });

    // Memoize handlers to prevent unnecessary re-renders
    const handleCategoryChange = useCallback(
      (category: ModelCategory | undefined) => {
        setSelectedCategory(category);
        updateFilters({ category });
      },
      [updateFilters]
    );

    const handleSearchLocal = useCallback(
      (query: string) => {
        setSearchQuery(query);
        updateFilters({ search: query });
        setShowExternal(false);
      },
      [updateFilters]
    );

    const handleSearchExternal = useCallback(
      async (query: string) => {
        if (!query.trim()) return;

        setSearchQuery(query);
        try {
          const results = await searchExternal(query, 'huggingface', 20);
          setExternalResults(results);
          setShowExternal(true);
        } catch (error) {
          console.error('External search failed:', error);
        }
      },
      [searchExternal]
    );

    const handleInstallToggle = useCallback(
      async (model: any) => {
        if (model.isInstalled) {
          await uninstallModel(model.id);
        } else {
          await installModel(model.id);
        }
      },
      [installModel, uninstallModel]
    );

    const handleModelSelect = useCallback(
      (model: any) => {
        onModelSelect?.(model);
      },
      [onModelSelect]
    );

    // Memoize expensive computations
    const displayModels = useMemo(
      () => (showExternal ? externalResults : models),
      [showExternal, externalResults, models]
    );

    const filteredModels = useMemo(
      () => (showInstalled ? displayModels : displayModels.filter((m) => !m.isInstalled)),
      [showInstalled, displayModels]
    );

    // Memoize toggle handlers to prevent re-renders
    const handleShowLocal = useCallback(() => setShowExternal(false), []);
    const handleShowExternal = useCallback(() => setShowExternal(true), []);

    const handleExternalSearch = useCallback(() => {
      handleSearchExternal(searchQuery);
    }, [handleSearchExternal, searchQuery]);

    return (
      <div className={`model-marketplace ${className}`}>
        {/* Header */}
        <div className="marketplace-header border-b bg-card p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">AI Model Marketplace</h1>
                  <p className="text-muted-foreground mt-1">
                    Discover, install, and manage specialized AI models
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {displayModels.length} models found
                  </span>
                  {isLoading && <LoadingSpinner size="sm" />}
                </div>
              </div>

              {/* Search */}
              <ModelSearch
                onSearchLocal={handleSearchLocal}
                onSearchExternal={handleSearchExternal}
                placeholder="Search models..."
                defaultValue={searchQuery}
              />

              {/* Filters */}
              <ModelFilters
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
                showInstalled={showInstalled}
                installedFilter={filters?.installed}
                onInstalledFilterChange={(installed) => updateFilters({ installed })}
              />

              {/* External/Local Toggle */}
              {(externalResults.length > 0 || showExternal) && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleShowLocal}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      !showExternal
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    Local Registry ({models.length})
                  </button>
                  <button
                    onClick={handleShowExternal}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      showExternal
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    Hugging Face ({externalResults.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-7xl mx-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-red-600 mr-3">⚠️</div>
                  <div>
                    <h3 className="text-red-800 dark:text-red-200 font-medium">Error</h3>
                    <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                  </div>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Model Grid */}
        <div className="max-w-7xl mx-auto p-6">
          {isLoading && models.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-muted-foreground">Loading models...</p>
              </div>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-medium text-foreground mb-2">No models found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? `No models match "${searchQuery}". Try a different search term.`
                  : 'No models available with current filters.'}
              </p>
              {searchQuery && (
                <button
                  onClick={handleExternalSearch}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Search Hugging Face
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredModels.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  installProgress={installProgress?.get(model.id)}
                  onInstallToggle={() => handleInstallToggle(model)}
                  onSelect={onModelSelect ? () => handleModelSelect(model) : undefined}
                  showExternalBadge={showExternal}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

// Add display name for debugging
ModelMarketplace.displayName = 'ModelMarketplace';

export default ModelMarketplace;
