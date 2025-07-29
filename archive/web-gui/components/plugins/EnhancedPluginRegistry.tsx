'use client';

import React, { useState, useEffect } from 'react';

export interface PluginReview {
  id: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  createdAt: number;
  updatedAt: number;
  helpful: number;
  verified: boolean;
}

export interface ExtendedPluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  longDescription?: string;
  author: string;
  authorVerified: boolean;
  category: string;
  tags: string[];
  featured: boolean;
  homepage?: string;
  repository?: string;
  documentation?: string;
  downloadUrl: string;
  iconUrl?: string;
  screenshots?: string[];

  // Stats
  downloads: number;
  rating: number;
  reviewCount: number;
  weeklyDownloads: number;

  // Metadata
  size: string;
  createdAt: string;
  updatedAt: string;
  lastCompatibleVersion: string;

  // Security
  verified: boolean;
  signatureValid: boolean;
  trustLevel: 'high' | 'medium' | 'low' | 'unknown';

  // Reviews
  reviews: PluginReview[];

  // Dependencies
  dependencies?: string[];
  conflicts?: string[];

  // Permissions
  permissions: string[];
  dangerousPermissions: string[];
}

interface EnhancedPluginRegistryProps {
  onInstall: (pluginId: string) => Promise<void>;
  onViewDetails: (plugin: ExtendedPluginInfo) => void;
  installedPlugins: string[];
  loading?: boolean;
}

export function EnhancedPluginRegistry({
  onInstall,
  onViewDetails,
  installedPlugins,
  loading = false,
}: EnhancedPluginRegistryProps) {
  const [plugins, setPlugins] = useState<ExtendedPluginInfo[]>([]);
  const [filteredPlugins, setFilteredPlugins] = useState<ExtendedPluginInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'downloads' | 'rating' | 'updated' | 'name'>(
    'relevance'
  );
  const [showOnlyVerified, setShowOnlyVerified] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [registryLoading, setRegistryLoading] = useState(false);

  // Sample data (in production, this would come from API)
  useEffect(() => {
    loadPluginRegistry();
  }, []);

  useEffect(() => {
    filterAndSortPlugins();
  }, [plugins, searchQuery, selectedCategory, sortBy, showOnlyVerified, minRating]);

  const loadPluginRegistry = async () => {
    setRegistryLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const samplePlugins: ExtendedPluginInfo[] = [
        {
          id: 'ai-chat-enhancer',
          name: 'AI Chat Enhancer',
          version: '2.1.0',
          description:
            'Advanced chat features with message templates, auto-responses, and conversation analytics',
          longDescription:
            'Transform your chat experience with AI Chat Enhancer. This plugin provides intelligent message suggestions, customizable templates, automated responses, and detailed conversation analytics. Perfect for power users who want to maximize their productivity.',
          author: 'DinoAir Team',
          authorVerified: true,
          category: 'Chat',
          tags: ['productivity', 'ai', 'templates', 'analytics'],
          featured: true,
          homepage: 'https://github.com/dinopit/ai-chat-enhancer',
          repository: 'https://github.com/dinopit/ai-chat-enhancer',
          documentation: 'https://docs.dinoair.com/plugins/ai-chat-enhancer',
          downloadUrl: '/api/v1/plugins/registry/ai-chat-enhancer',
          iconUrl: '/plugins/icons/ai-chat-enhancer.png',
          screenshots: [
            '/plugins/screenshots/ai-chat-enhancer-1.png',
            '/plugins/screenshots/ai-chat-enhancer-2.png',
          ],
          downloads: 15420,
          rating: 4.8,
          reviewCount: 156,
          weeklyDownloads: 890,
          size: '2.1 MB',
          createdAt: '2024-01-15',
          updatedAt: '2024-12-20',
          lastCompatibleVersion: '1.2.0',
          verified: true,
          signatureValid: true,
          trustLevel: 'high',
          reviews: [],
          permissions: ['chat.read', 'chat.write', 'storage.write', 'ui.notifications'],
          dangerousPermissions: [],
        },
        {
          id: 'code-formatter',
          name: 'Smart Code Formatter',
          version: '1.5.2',
          description:
            'Intelligent code formatting and syntax highlighting for multiple programming languages',
          longDescription:
            'Automatically format and beautify code snippets in your conversations. Supports 50+ programming languages with customizable formatting rules, syntax highlighting, and code validation.',
          author: 'CodeMaster Inc',
          authorVerified: false,
          category: 'Development',
          tags: ['code', 'formatting', 'syntax', 'developer'],
          featured: false,
          homepage: 'https://codemaster.dev/formatter',
          downloadUrl: '/api/v1/plugins/registry/code-formatter',
          downloads: 8750,
          rating: 4.2,
          reviewCount: 89,
          weeklyDownloads: 234,
          size: '1.8 MB',
          createdAt: '2024-03-10',
          updatedAt: '2024-12-18',
          lastCompatibleVersion: '1.1.0',
          verified: false,
          signatureValid: true,
          trustLevel: 'medium',
          reviews: [],
          permissions: ['chat.read', 'ui.modify', 'network.fetch'],
          dangerousPermissions: ['ui.modify'],
        },
        {
          id: 'weather-widget',
          name: 'Weather Widget',
          version: '3.0.1',
          description: 'Display real-time weather information and forecasts in your chat interface',
          author: 'WeatherPro',
          authorVerified: true,
          category: 'Utilities',
          tags: ['weather', 'widget', 'forecast', 'location'],
          featured: true,
          downloadUrl: '/api/v1/plugins/registry/weather-widget',
          downloads: 12340,
          rating: 4.6,
          reviewCount: 203,
          weeklyDownloads: 456,
          size: '850 KB',
          createdAt: '2023-11-20',
          updatedAt: '2024-12-15',
          lastCompatibleVersion: '1.0.0',
          verified: true,
          signatureValid: true,
          trustLevel: 'high',
          reviews: [],
          permissions: ['network.fetch', 'ui.notifications', 'sensitive.location'],
          dangerousPermissions: ['sensitive.location'],
        },
      ];

      setPlugins(samplePlugins);
    } catch (error) {
      console.error('Failed to load plugin registry:', error);
    } finally {
      setRegistryLoading(false);
    }
  };

  const filterAndSortPlugins = () => {
    let filtered = [...plugins];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (plugin) =>
          plugin.name.toLowerCase().includes(query) ||
          plugin.description.toLowerCase().includes(query) ||
          plugin.author.toLowerCase().includes(query) ||
          plugin.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter((plugin) => plugin.category === selectedCategory);
    }

    // Apply verified filter
    if (showOnlyVerified) {
      filtered = filtered.filter((plugin) => plugin.verified);
    }

    // Apply rating filter
    if (minRating > 0) {
      filtered = filtered.filter((plugin) => plugin.rating >= minRating);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'downloads':
          return b.downloads - a.downloads;
        case 'rating':
          return b.rating - a.rating;
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'relevance':
        default:
          // Simple relevance: featured first, then by rating and downloads
          if (a.featured !== b.featured) {
            return b.featured ? 1 : -1;
          }
          return b.rating * b.downloads - a.rating * a.downloads;
      }
    });

    setFilteredPlugins(filtered);
  };

  const categories = ['Chat', 'Development', 'Utilities', 'Productivity', 'Entertainment'];

  const getTrustBadge = (plugin: ExtendedPluginInfo) => {
    if (plugin.verified && plugin.signatureValid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
          ✓ Verified
        </span>
      );
    } else if (plugin.signatureValid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
          🔐 Signed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
          ⚠️ Unverified
        </span>
      );
    }
  };

  const getRiskBadge = (plugin: ExtendedPluginInfo) => {
    if (plugin.dangerousPermissions.length > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
          ⚠️ High Risk
        </span>
      );
    } else if (plugin.permissions.length > 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
          📋 Many Permissions
        </span>
      );
    }
    return null;
  };

  if (loading || registryLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading plugins...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="relevance">Relevance</option>
              <option value="downloads">Downloads</option>
              <option value="rating">Rating</option>
              <option value="updated">Recently Updated</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlyVerified}
              onChange={(e) => setShowOnlyVerified(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Verified only
          </label>
          <div className="flex items-center gap-2">
            <span>Min rating:</span>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Any</option>
              <option value={3}>3+ stars</option>
              <option value={4}>4+ stars</option>
              <option value={4.5}>4.5+ stars</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          {filteredPlugins.length} plugin{filteredPlugins.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Plugin Grid */}
      {filteredPlugins.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No plugins found</h3>
          <p className="text-gray-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlugins.map((plugin) => (
            <div
              key={plugin.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onViewDetails(plugin)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {plugin.iconUrl ? (
                    <img src={plugin.iconUrl} alt={plugin.name} className="w-12 h-12 rounded-lg" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-xl">
                      🔌
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{plugin.name}</h3>
                    <p className="text-sm text-gray-500">by {plugin.author}</p>
                  </div>
                </div>
                {plugin.featured && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    ⭐ Featured
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{plugin.description}</p>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {getTrustBadge(plugin)}
                {getRiskBadge(plugin)}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <span>⭐</span>
                  <span>{plugin.rating.toFixed(1)}</span>
                  <span>({plugin.reviewCount})</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>⬇️</span>
                  <span>{plugin.downloads.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>📊</span>
                  <span>{plugin.weeklyDownloads}/week</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {plugin.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                    {tag}
                  </span>
                ))}
                {plugin.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded">
                    +{plugin.tags.length - 3} more
                  </span>
                )}
              </div>

              {/* Install Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInstall(plugin.id);
                }}
                disabled={installedPlugins.includes(plugin.id)}
                className={`w-full py-2 px-4 text-sm rounded-lg transition-colors ${
                  installedPlugins.includes(plugin.id)
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {installedPlugins.includes(plugin.id) ? 'Installed' : 'Install'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
