import React, { memo, useMemo, useCallback } from 'react';
import { IModelInfo } from '@/lib/services/model-registry';

interface ModelInstallProgress {
  status: 'downloading' | 'installing' | 'completed' | 'error';
  progress: number;
  message: string;
  downloadedBytes?: number;
  totalBytes?: number;
}

interface ModelCardProps {
  model: IModelInfo;
  installProgress?: ModelInstallProgress;
  onInstallToggle: () => void;
  onSelect?: () => void;
  showExternalBadge?: boolean;
  className?: string;
}

const BYTES_PER_KB = 1024;

const ModelCard: React.FC<ModelCardProps> = memo(
  ({
    model,
    installProgress,
    onInstallToggle,
    onSelect,
    showExternalBadge = false,
    className = '',
  }) => {
    // Memoize expensive calculations
    const formattedSize = useMemo(() => {
      const sizeNum = typeof model.size === 'string' ? parseInt(model.size) || 0 : 0;
      if (sizeNum === 0) return model.size || 'Unknown';
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(sizeNum) / Math.log(BYTES_PER_KB));
      return Math.round((sizeNum / Math.pow(BYTES_PER_KB, i)) * 100) / 100 + ' ' + sizes[i];
    }, [model.size]);

    const formattedCategory = useMemo(() => {
      return model.type
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }, [model.type]);

    const categoryColor = useMemo(() => {
      const colors = {
        text: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        image: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
        code: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        multimodal: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      };
      return colors[model.type as keyof typeof colors] || colors.text;
    }, [model.type]);

    const isInstalling = useMemo(
      () => installProgress?.status === 'downloading' || installProgress?.status === 'installing',
      [installProgress?.status]
    );

    // Memoize handlers to prevent unnecessary re-renders
    const handleInstallClick = useCallback(() => {
      if (!isInstalling) {
        onInstallToggle();
      }
    }, [onInstallToggle, isInstalling]);

    const handleSelectClick = useCallback(() => {
      onSelect?.();
    }, [onSelect]);

    const progressBarStyle = useMemo(
      () => ({
        width: `${installProgress?.progress || 0}%`,
      }),
      [installProgress?.progress]
    );

    // Memoize download info display
    const downloadInfo = useMemo(() => {
      if (!installProgress?.downloadedBytes || !installProgress?.totalBytes) return null;

      const formatBytes = (bytes: number) => {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KB));
        return Math.round((bytes / Math.pow(BYTES_PER_KB, i)) * 100) / 100 + ' ' + sizes[i];
      };

      return `${formatBytes(installProgress.downloadedBytes)} / ${formatBytes(installProgress.totalBytes)}`;
    }, [installProgress?.downloadedBytes, installProgress?.totalBytes]);

    return (
      <div
        className={`model-card bg-card border rounded-lg p-6 hover:shadow-lg transition-all duration-200 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{model.name}</h3>
              {showExternalBadge && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                  HF
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{model.provider}</p>
          </div>

          <div className="flex items-center space-x-2">
            {model.rating && model.rating > 0 && (
              <div className="flex items-center">
                <span className="text-yellow-500">⭐</span>
                <span className="text-sm text-muted-foreground ml-1">
                  {model.rating.toFixed(1)}
                </span>
              </div>
            )}
            {model.isInstalled && (
              <div className="w-3 h-3 bg-green-500 rounded-full" title="Installed" />
            )}
          </div>
        </div>

        {/* Category Badge */}
        <div className="mb-3">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${categoryColor}`}
          >
            {formattedCategory}
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
            <span className="text-foreground">{formattedSize}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider:</span>
            <span className="text-foreground truncate ml-2">{model.provider}</span>
          </div>
          {model.downloads && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Downloads:</span>
              <span className="text-foreground">{model.downloads.toLocaleString()}</span>
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
                style={progressBarStyle}
                role="progressbar"
                aria-label="Installation progress"
                aria-valuenow={installProgress.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            {downloadInfo && (
              <div className="text-xs text-muted-foreground mt-1">{downloadInfo}</div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              model.isInstalled
                ? 'bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
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
              onClick={handleSelectClick}
              className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
            >
              Select
            </button>
          )}
        </div>
      </div>
    );
  }
);

// Add display name for debugging
ModelCard.displayName = 'ModelCard';

export default ModelCard;
