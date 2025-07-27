import React from 'react';
import { ModelMetadata, ModelInstallProgress } from '@/lib/services/model-registry';

interface ModelCardProps {
  model: ModelMetadata;
  installProgress?: ModelInstallProgress;
  onInstallToggle: () => void;
  onSelect?: () => void;
  showExternalBadge?: boolean;
  className?: string;
}

const ModelCard: React.FC<ModelCardProps> = ({
  model,
  installProgress,
  onInstallToggle,
  onSelect,
  showExternalBadge = false,
  className = ''
}) => {
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KB));
    return Math.round(bytes / Math.pow(BYTES_PER_KB, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatCategory = (category: string): string => {
    return category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getCategoryColor = (category: string): string => {
    const colors = {
      'code-generation': 'bg-blue-100 text-blue-800',
      'creative-writing': 'bg-purple-100 text-purple-800',
      'analysis': 'bg-green-100 text-green-800',
      'chat': 'bg-orange-100 text-orange-800',
      'image-generation': 'bg-pink-100 text-pink-800',
      'domain-specific': 'bg-gray-100 text-gray-800',
      'custom': 'bg-indigo-100 text-indigo-800'
    };
    return colors[category as keyof typeof colors] || colors.custom;
  };

  const isInstalling = installProgress?.status === 'downloading' || installProgress?.status === 'installing';

  return (
    <div className={`model-card bg-card border rounded-lg p-6 hover:shadow-lg transition-all duration-200 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{model.name}</h3>
            {showExternalBadge && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">HF</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">v{model.version}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {model.rating > 0 && (
            <div className="flex items-center">
              <span className="text-yellow-500">⭐</span>
              <span className="text-sm text-muted-foreground ml-1">{model.rating.toFixed(1)}</span>
            </div>
          )}
          {model.isInstalled && (
            <div className="w-3 h-3 bg-green-500 rounded-full" title="Installed" />
          )}
        </div>
      </div>

      {/* Category Badge */}
      <div className="mb-3">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(model.category)}`}>
          {formatCategory(model.category)}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
        {model.description || 'No description available.'}
      </p>

      {/* Tags */}
      {model.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {model.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded"
              >
                {tag}
              </span>
            ))}
            {model.tags.length > 3 && (
              <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded">
                +{model.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Size:</span>
          <span className="text-foreground">{formatSize(model.size)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Author:</span>
          <span className="text-foreground truncate ml-2">{model.author}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Downloads:</span>
          <span className="text-foreground">{model.downloads.toLocaleString()}</span>
        </div>
        {model.performance.benchmarks.accuracy && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Accuracy:</span>
            <span className="text-foreground">{model.performance.benchmarks.accuracy}%</span>
          </div>
        )}
      </div>

      {/* Installation Progress */}
      {installProgress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{installProgress.message}</span>
            <span className="text-sm text-muted-foreground">{installProgress.progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${installProgress.progress}%` }}
              role="progressbar"
              aria-label="Installation progress"
              aria-valuenow={installProgress.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {installProgress.downloadedBytes && installProgress.totalBytes && (
            <div className="text-xs text-muted-foreground mt-1">
              {formatSize(installProgress.downloadedBytes)} / {formatSize(installProgress.totalBytes)}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={onInstallToggle}
          disabled={isInstalling}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            model.isInstalled
              ? 'bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
          }`}
        >
          {isInstalling ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              {installProgress?.status === 'downloading' ? 'Downloading...' : 'Installing...'}
            </div>
          ) : model.isInstalled ? (
            'Uninstall'
          ) : (
            'Install'
          )}
        </button>
        
        {onSelect && (
          <button
            onClick={onSelect}
            className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
          >
            Select
          </button>
        )}
      </div>

      {/* External Source Info */}
      {showExternalBadge && model.huggingFaceId && (
        <div className="mt-3 pt-3 border-t border-border">
          <a
            href={model.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
          >
            <span>View on Hugging Face</span>
            <span className="ml-1">↗</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default ModelCard;