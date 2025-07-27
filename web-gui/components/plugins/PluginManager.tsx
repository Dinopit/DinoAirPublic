'use client';

import React, { useState } from 'react';

import { usePlugins } from '@/hooks/usePlugins';

interface PluginManagerProps {
  className?: string;
}

export function PluginManager({ className = '' }: PluginManagerProps) {
  const {
    plugins,
    loading,
    error,
    notifications,
    registryPlugins,
    registryLoading,
    installFromRegistry,
    uninstallPlugin,
    togglePlugin,
    browseRegistry,
    removeNotification
  } = usePlugins();

  const [activeTab, setActiveTab] = useState<'installed' | 'registry'>('installed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Filter plugins based on search
  const filteredPlugins = plugins.filter(plugin =>
    plugin.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plugin.manifest.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInstallFromRegistry = async (pluginId: string) => {
    await installFromRegistry(pluginId);
    // Refresh registry to update install status
    browseRegistry();
  };

  const handleUninstall = async (pluginId: string) => {
    if (confirm('Are you sure you want to uninstall this plugin?')) {
      await uninstallPlugin(pluginId);
    }
  };

  const handleToggle = async (pluginId: string, enabled: boolean) => {
    await togglePlugin(pluginId, enabled);
  };

  React.useEffect(() => {
    if (activeTab === 'registry') {
      browseRegistry({ featured: true });
    }
  }, [activeTab, browseRegistry]);

  return (
    <div className={`plugin-manager ${className}`}>
      {/* Header */}
      <div className="plugin-header border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Plugin Manager</h2>
        <p className="text-gray-600 mt-2">
          Manage and discover plugins to extend DinoAir's functionality
        </p>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications mt-4 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.timestamp}
              className={`notification p-3 rounded-lg border-l-4 ${
                notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
                notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
                notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                'bg-blue-50 border-blue-400 text-blue-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{notification.title}</h4>
                  <p className="text-sm mt-1">{notification.message}</p>
                </div>
                <button
                  onClick={() => removeNotification(notification.timestamp)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-display mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-red-800 font-medium">Error</h4>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs mt-6">
        <div className="tab-nav border-b border-gray-200">
          <button
            className={`tab-button px-4 py-2 font-medium border-b-2 ${
              activeTab === 'installed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('installed')}
          >
            Installed Plugins ({plugins.length})
          </button>
          <button
            className={`tab-button px-4 py-2 font-medium border-b-2 ml-8 ${
              activeTab === 'registry'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('registry')}
          >
            Plugin Registry
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters mt-6 flex gap-4">
        <div className="search-box flex-1">
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {activeTab === 'registry' && (
          <div className="category-filter">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="Chat">Chat</option>
              <option value="Utilities">Utilities</option>
              <option value="Development">Development</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="plugin-content mt-6">
        {activeTab === 'installed' ? (
          <InstalledPluginsTab
            plugins={filteredPlugins}
            loading={loading}
            onUninstall={handleUninstall}
            onToggle={handleToggle}
          />
        ) : (
          <RegistryTab
            plugins={registryPlugins}
            loading={registryLoading}
            installedPlugins={plugins}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            onInstall={handleInstallFromRegistry}
            onSearch={browseRegistry}
          />
        )}
      </div>
    </div>
  );
}

// Installed Plugins Tab Component
interface InstalledPluginsTabProps {
  plugins: any[];
  loading: boolean;
  onUninstall: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

function InstalledPluginsTab({ plugins, loading, onUninstall, onToggle }: InstalledPluginsTabProps) {
  if (loading) {
    return (
      <div className="loading text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="mt-2 text-gray-600">Loading plugins...</p>
      </div>
    );
  }

  if (plugins.length === 0) {
    return (
      <div className="empty-state text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">🔌</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No plugins installed</h3>
        <p className="text-gray-500 mb-4">
          Browse the Plugin Registry to discover and install plugins.
        </p>
      </div>
    );
  }

  return (
    <div className="installed-plugins space-y-4">
      {plugins.map((plugin) => (
        <div
          key={plugin.manifest.id}
          className="plugin-card border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="plugin-info flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {plugin.manifest.name}
                </h3>
                <span className="version-badge px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  v{plugin.manifest.version}
                </span>
                <span className={`status-badge px-2 py-1 text-xs rounded ${
                  plugin.enabled 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {plugin.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-1">{plugin.manifest.description}</p>
              <p className="text-gray-500 text-xs mt-2">
                By {plugin.manifest.author} • Loaded {new Date(plugin.loadedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="plugin-actions flex gap-2 ml-4">
              <button
                onClick={() => onToggle(plugin.manifest.id, !plugin.enabled)}
                className={`toggle-btn px-3 py-1 text-sm rounded ${
                  plugin.enabled
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                {plugin.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => onUninstall(plugin.manifest.id)}
                className="uninstall-btn px-3 py-1 text-sm bg-red-100 text-red-800 hover:bg-red-200 rounded"
              >
                Uninstall
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Registry Tab Component
interface RegistryTabProps {
  plugins: any[];
  loading: boolean;
  installedPlugins: any[];
  searchQuery: string;
  selectedCategory: string;
  onInstall: (id: string) => void;
  onSearch: (filters?: any) => void;
}

function RegistryTab({
  plugins,
  loading,
  installedPlugins,
  searchQuery,
  selectedCategory,
  onInstall,
  onSearch
}: RegistryTabProps) {
  const isInstalled = (pluginId: string) => 
    installedPlugins.some(p => p.manifest.id === pluginId);

  React.useEffect(() => {
    onSearch({
      search: searchQuery || undefined,
      category: selectedCategory || undefined,
      featured: !searchQuery && !selectedCategory ? true : undefined
    });
  }, [searchQuery, selectedCategory, onSearch]);

  if (loading) {
    return (
      <div className="loading text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="mt-2 text-gray-600">Loading registry...</p>
      </div>
    );
  }

  return (
    <div className="registry-plugins">
      {plugins.length === 0 ? (
        <div className="empty-state text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No plugins found</h3>
          <p className="text-gray-500">
            Try adjusting your search terms or category filter.
          </p>
        </div>
      ) : (
        <div className="plugin-grid grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="registry-card border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="plugin-header flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{plugin.name}</h3>
                  <p className="text-sm text-gray-500">by {plugin.author}</p>
                </div>
                {plugin.featured && (
                  <span className="featured-badge px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                    Featured
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {plugin.description}
              </p>
              
              <div className="plugin-meta flex items-center gap-4 mb-3 text-xs text-gray-500">
                <span>⭐ {plugin.rating}</span>
                <span>⬇️ {plugin.downloads}</span>
                <span>v{plugin.version}</span>
              </div>
              
              <div className="plugin-tags mb-3">
                {plugin.tags.slice(0, 3).map((tag: string) => (
                  <span
                    key={tag}
                    className="tag px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mr-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <button
                onClick={() => onInstall(plugin.id)}
                disabled={isInstalled(plugin.id)}
                className={`install-btn w-full py-2 px-4 text-sm rounded ${
                  isInstalled(plugin.id)
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isInstalled(plugin.id) ? 'Installed' : 'Install'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
