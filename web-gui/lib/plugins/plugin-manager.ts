import { EventEmitter } from 'events';

// Plugin manifest interface
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  permissions?: string[];
  main: string; // Main JavaScript code
  config?: Record<string, any>;
}

// Plugin instance interface
export interface Plugin {
  manifest: PluginManifest;
  instance: PluginInstance;
  enabled: boolean;
  loadedAt: string;
}

// Plugin API interface that plugins can use
export interface PluginAPI {
  // Chat related
  onChatMessage: (callback: (message: ChatMessage) => void | Promise<void>) => void;
  onChatResponse: (callback: (response: ChatResponse) => void | Promise<void>) => void;
  sendChatMessage: (message: string) => Promise<void>;
  
  // UI related
  registerCommand: (command: Command) => void;
  showNotification: (notification: Notification) => void;
  
  // Storage
  storage: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
    remove: (key: string) => void;
  };
  
  // Utilities
  logger: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
  };
}

// Plugin instance that each plugin implements
export interface PluginInstance {
  onLoad?: (api: PluginAPI) => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
  onEnable?: () => void | Promise<void>;
  onDisable?: () => void | Promise<void>;
}

// Types used by plugins
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  timestamp: string;
}

export interface Command {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
  action: () => void | Promise<void>;
}

export interface Notification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

// Plugin Manager class
export class PluginManager extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private commands: Map<string, Command> = new Map();
  private storagePrefix = 'dinoair-plugin-';

  constructor() {
    super();
    this.loadPlugins();
  }

  // Load all plugins from localStorage
  private loadPlugins() {
    const storedPlugins = localStorage.getItem('dinoair-plugins');
    if (!storedPlugins) return;

    try {
      const pluginList = JSON.parse(storedPlugins) as PluginManifest[];
      pluginList.forEach(manifest => {
        this.loadPlugin(manifest);
      });
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  }

  // Save plugin list to localStorage
  private savePlugins() {
    const pluginList = Array.from(this.plugins.values()).map(p => p.manifest);
    localStorage.setItem('dinoair-plugins', JSON.stringify(pluginList));
  }

  // Create plugin API for a specific plugin
  private createPluginAPI(pluginId: string): PluginAPI {
    return {
      // Chat events
      onChatMessage: (callback) => {
        this.on(`chat:message:${pluginId}`, callback);
      },
      onChatResponse: (callback) => {
        this.on(`chat:response:${pluginId}`, callback);
      },
      sendChatMessage: async (message) => {
        this.emit('chat:send', { pluginId, message });
      },

      // UI commands
      registerCommand: (command) => {
        const fullCommand = { ...command, pluginId };
        this.commands.set(`${pluginId}:${command.id}`, fullCommand);
        this.emit('command:register', fullCommand);
      },
      showNotification: (notification) => {
        this.emit('notification:show', { ...notification, pluginId });
      },

      // Plugin storage
      storage: {
        get: (key: string) => {
          const fullKey = `${this.storagePrefix}${pluginId}-${key}`;
          const value = localStorage.getItem(fullKey);
          return value ? JSON.parse(value) : null;
        },
        set: (key: string, value: any) => {
          const fullKey = `${this.storagePrefix}${pluginId}-${key}`;
          localStorage.setItem(fullKey, JSON.stringify(value));
        },
        remove: (key: string) => {
          const fullKey = `${this.storagePrefix}${pluginId}-${key}`;
          localStorage.removeItem(fullKey);
        }
      },

      // Logger
      logger: {
        log: (...args) => console.log(`[Plugin: ${pluginId}]`, ...args),
        error: (...args) => console.error(`[Plugin: ${pluginId}]`, ...args),
        warn: (...args) => console.warn(`[Plugin: ${pluginId}]`, ...args)
      }
    };
  }

  // Load a plugin from manifest
  public async loadPlugin(manifest: PluginManifest): Promise<boolean> {
    try {
      // Check if plugin already loaded
      if (this.plugins.has(manifest.id)) {
        console.warn(`Plugin ${manifest.id} is already loaded`);
        return false;
      }

      // Create plugin instance from code
      const pluginCode = manifest.main;
      const pluginModule = new Function('exports', 'require', 'module', pluginCode);
      const exports: any = {};
      const module = { exports };
      
      // Execute plugin code
      pluginModule(exports, () => {}, module);
      
      const PluginClass = module.exports.default || module.exports;
      const instance = new PluginClass() as PluginInstance;

      // Create plugin entry
      const plugin: Plugin = {
        manifest,
        instance,
        enabled: true,
        loadedAt: new Date().toISOString()
      };

      // Store plugin
      this.plugins.set(manifest.id, plugin);

      // Create API and call onLoad
      const api = this.createPluginAPI(manifest.id);
      if (instance.onLoad) {
        await instance.onLoad(api);
      }

      // Enable plugin
      if (instance.onEnable) {
        await instance.onEnable();
      }

      this.savePlugins();
      this.emit('plugin:loaded', manifest.id);
      
      return true;
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.id}:`, error);
      return false;
    }
  }

  // Unload a plugin
  public async unloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try {
      // Disable first if enabled
      if (plugin.enabled && plugin.instance.onDisable) {
        await plugin.instance.onDisable();
      }

      // Call onUnload
      if (plugin.instance.onUnload) {
        await plugin.instance.onUnload();
      }

      // Remove commands
      this.commands.forEach((command, key) => {
        if (key.startsWith(`${pluginId}:`)) {
          this.commands.delete(key);
          this.emit('command:unregister', command);
        }
      });

      // Remove event listeners
      this.removeAllListeners(`chat:message:${pluginId}`);
      this.removeAllListeners(`chat:response:${pluginId}`);

      // Remove plugin
      this.plugins.delete(pluginId);
      this.savePlugins();
      
      this.emit('plugin:unloaded', pluginId);
      return true;
    } catch (error) {
      console.error(`Failed to unload plugin ${pluginId}:`, error);
      return false;
    }
  }

  // Enable/disable a plugin
  public async togglePlugin(pluginId: string, enabled: boolean): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try {
      if (enabled && !plugin.enabled) {
        if (plugin.instance.onEnable) {
          await plugin.instance.onEnable();
        }
        plugin.enabled = true;
      } else if (!enabled && plugin.enabled) {
        if (plugin.instance.onDisable) {
          await plugin.instance.onDisable();
        }
        plugin.enabled = false;
      }

      this.emit('plugin:toggled', { pluginId, enabled });
      return true;
    } catch (error) {
      console.error(`Failed to toggle plugin ${pluginId}:`, error);
      return false;
    }
  }

  // Get all loaded plugins
  public getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  // Get a specific plugin
  public getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  // Get all registered commands
  public getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  // Emit chat events to plugins
  public emitChatMessage(message: ChatMessage) {
    this.plugins.forEach((plugin, id) => {
      if (plugin.enabled) {
        this.emit(`chat:message:${id}`, message);
      }
    });
  }

  public emitChatResponse(response: ChatResponse) {
    this.plugins.forEach((plugin, id) => {
      if (plugin.enabled) {
        this.emit(`chat:response:${id}`, response);
      }
    });
  }

  // Install plugin from URL or file
  public async installPlugin(source: string | File): Promise<boolean> {
    try {
      let manifestText: string;
      
      if (typeof source === 'string') {
        // URL - fetch the manifest
        const response = await fetch(source);
        manifestText = await response.text();
      } else {
        // File - read the content
        manifestText = await source.text();
      }

      const manifest = JSON.parse(manifestText) as PluginManifest;
      
      // Validate manifest
      if (!manifest.id || !manifest.name || !manifest.version || !manifest.main) {
        throw new Error('Invalid plugin manifest');
      }

      // Load the plugin
      return await this.loadPlugin(manifest);
    } catch (error) {
      console.error('Failed to install plugin:', error);
      return false;
    }
  }
}

// Singleton instance
let pluginManager: PluginManager | null = null;

export function getPluginManager(): PluginManager {
  if (!pluginManager) {
    pluginManager = new PluginManager();
  }
  return pluginManager;
}
