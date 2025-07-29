import { useState, useEffect, useCallback } from 'react';
import { getPluginManager, Plugin, PluginManifest } from '@/lib/plugins/plugin-manager';

interface UsePluginsOptions {
  autoLoad?: boolean;
}

interface PluginRegistryItem {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  downloadUrl: string;
  featured: boolean;
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

interface PluginNotification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  timestamp: string;
}

export function usePlugins(options: UsePluginsOptions = {}) {
  const { autoLoad = true } = options;

  // State management
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PluginNotification[]>([]);
  const [registryPlugins, setRegistryPlugins] = useState<PluginRegistryItem[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);

  // Plugin manager instance
  const pluginManager = getPluginManager();

  // Load installed plugins
  const loadPlugins = useCallback(() => {
    try {
      const loadedPlugins = pluginManager.getPlugins();
      setPlugins(loadedPlugins);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugins');
      console.error('Failed to load plugins:', err);
    }
  }, [pluginManager]);

  // Install plugin from manifest
  const installPlugin = useCallback(async (manifest: PluginManifest): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Validate manifest on server
      const response = await fetch('/api/v1/plugins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manifest }),
      });

      const result = await response.json();

      if (!response.ok || !result.valid) {
        throw new Error(result.error || 'Plugin validation failed');
      }

      if (result.securityIssues && result.securityIssues.length > 0) {
        throw new Error(`Security issues found: ${result.securityIssues.join(', ')}`);
      }

      // Install the plugin using plugin manager
      const success = await pluginManager.loadPlugin(manifest);
      
      if (success) {
        loadPlugins();
        addNotification({
          type: 'success',
          title: 'Plugin Installed',
          message: `${manifest.name} has been installed successfully.`,
          duration: 5000
        });
      } else {
        throw new Error('Plugin installation failed');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to install plugin';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Installation Failed',
        message: errorMessage,
        duration: 8000
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [pluginManager, loadPlugins]);

  // Install plugin from registry
  const installFromRegistry = useCallback(async (pluginId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Download plugin from registry
      const response = await fetch(`/api/v1/plugins/registry/${pluginId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to download plugin from registry');
      }

      // Install the downloaded plugin
      return await installPlugin(result.manifest);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to install from registry';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Registry Installation Failed',
        message: errorMessage,
        duration: 8000
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [installPlugin]);

  // Uninstall plugin
  const uninstallPlugin = useCallback(async (pluginId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const success = await pluginManager.unloadPlugin(pluginId);
      
      if (success) {
        loadPlugins();
        addNotification({
          type: 'info',
          title: 'Plugin Uninstalled',
          message: 'Plugin has been uninstalled successfully.',
          duration: 3000
        });
      } else {
        throw new Error('Plugin uninstallation failed');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to uninstall plugin';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Uninstall Failed',
        message: errorMessage,
        duration: 5000
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [pluginManager, loadPlugins]);

  // Toggle plugin enabled/disabled
  const togglePlugin = useCallback(async (pluginId: string, enabled: boolean): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const success = await pluginManager.togglePlugin(pluginId, enabled);
      
      if (success) {
        loadPlugins();
        addNotification({
          type: 'success',
          title: `Plugin ${enabled ? 'Enabled' : 'Disabled'}`,
          message: `Plugin has been ${enabled ? 'enabled' : 'disabled'} successfully.`,
          duration: 3000
        });
      } else {
        throw new Error(`Failed to ${enabled ? 'enable' : 'disable'} plugin`);
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${enabled ? 'enable' : 'disable'} plugin`;
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Toggle Failed',
        message: errorMessage,
        duration: 5000
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [pluginManager, loadPlugins]);

  // Browse plugin registry
  const browseRegistry = useCallback(async (filters?: {
    category?: string;
    search?: string;
    featured?: boolean;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<void> => {
    setRegistryLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.featured !== undefined) params.append('featured', filters.featured.toString());
      if (filters?.sort) params.append('sort', filters.sort);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/v1/plugins/registry?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to browse registry');
      }

      setRegistryPlugins(result.plugins);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to browse registry';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Registry Error',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setRegistryLoading(false);
    }
  }, []);

  // Add notification
  const addNotification = useCallback((notification: Omit<PluginNotification, 'timestamp'>) => {
    const newNotification = {
      ...notification,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.timestamp !== newNotification.timestamp));
      }, notification.duration);
    }
  }, []);

  // Remove notification
  const removeNotification = useCallback((timestamp: string) => {
    setNotifications(prev => prev.filter(n => n.timestamp !== timestamp));
  }, []);

  // Plugin manager event handlers
  useEffect(() => {
    const handlePluginLoaded = (pluginId: string) => {
      loadPlugins();
      console.log(`Plugin loaded: ${pluginId}`);
    };

    const handlePluginUnloaded = (pluginId: string) => {
      loadPlugins();
      console.log(`Plugin unloaded: ${pluginId}`);
    };

    const handlePluginToggled = (data: { pluginId: string; enabled: boolean }) => {
      loadPlugins();
      console.log(`Plugin ${data.pluginId} ${data.enabled ? 'enabled' : 'disabled'}`);
    };

    const handleNotification = (notification: any) => {
      addNotification({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        duration: notification.duration
      });
    };

    // Register event listeners
    pluginManager.on('plugin:loaded', handlePluginLoaded);
    pluginManager.on('plugin:unloaded', handlePluginUnloaded);
    pluginManager.on('plugin:toggled', handlePluginToggled);
    pluginManager.on('notification:show', handleNotification);

    // Initial load
    if (autoLoad) {
      loadPlugins();
    }

    // Cleanup
    return () => {
      pluginManager.removeListener('plugin:loaded', handlePluginLoaded);
      pluginManager.removeListener('plugin:unloaded', handlePluginUnloaded);
      pluginManager.removeListener('plugin:toggled', handlePluginToggled);
      pluginManager.removeListener('notification:show', handleNotification);
    };
  }, [pluginManager, autoLoad, loadPlugins, addNotification]);

  return {
    // State
    plugins,
    loading,
    error,
    notifications,
    registryPlugins,
    registryLoading,

    // Actions
    installPlugin,
    installFromRegistry,
    uninstallPlugin,
    togglePlugin,
    browseRegistry,
    loadPlugins,
    
    // Notifications
    addNotification,
    removeNotification,

    // Utils
    getPlugin: useCallback((id: string) => plugins.find(p => p.manifest.id === id), [plugins]),
    isPluginInstalled: useCallback((id: string) => plugins.some(p => p.manifest.id === id), [plugins]),
    enabledPluginsCount: plugins.filter(p => p.enabled).length,
    totalPluginsCount: plugins.length
  };
}