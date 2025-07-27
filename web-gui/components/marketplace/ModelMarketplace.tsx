import React, { useState } from 'react';
import { ModelMetadata, ModelCategory } from '@/lib/services/model-registry';
import { useMarketplace } from '@/hooks/useMarketplace';
import ModelCard from './ModelCard';
import ModelFilters from './ModelFilters';
import ModelSearch from './ModelSearch';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ModelMarketplaceProps {
  onModelSelect?: (model: ModelMetadata) => void;
  showInstalled?: boolean;
  className?: string;
}

const ModelMarketplace: React.FC<ModelMarketplaceProps> = ({
  onModelSelect,
  showInstalled = true,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [externalResults, setExternalResults] = useState<ModelMetadata[]>([]);
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
    clearError
  } = useMarketplace({ autoFetch: true });

  const handleCategoryChange = (category: ModelCategory | undefined) => {
    setSelectedCategory(category);
    updateFilters({ category });
  };

  const handleSearchLocal = (query: string) => {
    setSearchQuery(query);
    updateFilters({ search: query });
    setShowExternal(false);
  };

  const handleSearchExternal = async (query: string) => {
    if (!query.trim()) return;
    
    setSearchQuery(query);
    const results = await searchExternal(query, 'huggingface', 20);
    setExternalResults(results);
    setShowExternal(true);
  };

  const handleInstallToggle = async (model: ModelMetadata) => {
    if (model.isInstalled) {
      await uninstallModel(model.id);
    } else {
      await installModel(model.id);
    }
  };

  const displayModels = showExternal ? externalResults : models;
  const filteredModels = showInstalled ? displayModels : displayModels.filter(m => !m.isInstalled);

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
              installedFilter={filters.installed}
              onInstalledFilterChange={(installed) => updateFilters({ installed })}
            />

            {/* External/Local Toggle */}
            {(externalResults.length > 0 || showExternal) && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowExternal(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    !showExternal 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Local Registry ({models.length})
                </button>
                <button
                  onClick={() => setShowExternal(true)}
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-red-600 mr-3">⚠️</div>
                <div>
                  <h3 className="text-red-800 font-medium">Error</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
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
                : 'No models available with current filters.'
              }
            </p>
            {searchQuery && (
              <button
                onClick={() => handleSearchExternal(searchQuery)}
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
                installProgress={installProgress.get(model.id)}
                onInstallToggle={() => handleInstallToggle(model)}
                onSelect={onModelSelect ? () => onModelSelect(model) : undefined}
                showExternalBadge={showExternal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelMarketplace;