/**
 * Plugin Sandbox System
 * Provides secure execution environment for plugins using Web Workers
 */

export interface SandboxMessage {
  id: string;
  type: 'execute' | 'api-call' | 'response' | 'error' | 'permission-request';
  payload: any;
  timestamp: number;
}

export interface PluginAPI {
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
  logger: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
  };
  ui: {
    showNotification: (notification: any) => Promise<void>;
    registerCommand: (command: any) => Promise<void>;
  };
  chat: {
    onMessage: (callback: (message: any) => void) => void;
    onResponse: (callback: (response: any) => void) => void;
    sendMessage: (message: string) => Promise<void>;
  };
  network: {
    fetch: (url: string, options?: any) => Promise<Response>;
  };
}

export interface SandboxOptions {
  pluginId: string;
  permissions: string[];
  timeoutMs?: number;
  memoryLimitMB?: number;
}

export class PluginSandbox {
  private worker: Worker | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private apiCallHandlers: Map<string, Function> = new Map();
  private permissionHandlers: Map<string, Function> = new Map();
  private options: SandboxOptions;
  private isTerminated = false;

  constructor(options: SandboxOptions) {
    this.options = options;
    this.setupAPIHandlers();
  }

  private setupAPIHandlers() {
    // Storage API handlers
    this.apiCallHandlers.set('storage.get', async (key: string) => {
      const storageKey = `plugin_${this.options.pluginId}_${key}`;
      const encrypted = localStorage.getItem(storageKey);
      if (!encrypted) return null;
      
      try {
        // Decrypt plugin data (implement your encryption here)
        return JSON.parse(encrypted);
      } catch {
        return null;
      }
    });

    this.apiCallHandlers.set('storage.set', async (key: string, value: any) => {
      const storageKey = `plugin_${this.options.pluginId}_${key}`;
      // Encrypt plugin data (implement your encryption here)
      const encrypted = JSON.stringify(value);
      localStorage.setItem(storageKey, encrypted);
    });

    this.apiCallHandlers.set('storage.remove', async (key: string) => {
      const storageKey = `plugin_${this.options.pluginId}_${key}`;
      localStorage.removeItem(storageKey);
    });

    // Logger API handlers
    this.apiCallHandlers.set('logger.log', (...args: any[]) => {
      console.log(`[Plugin:${this.options.pluginId}]`, ...args);
    });

    this.apiCallHandlers.set('logger.error', (...args: any[]) => {
      console.error(`[Plugin:${this.options.pluginId}]`, ...args);
    });

    this.apiCallHandlers.set('logger.warn', (...args: any[]) => {
      console.warn(`[Plugin:${this.options.pluginId}]`, ...args);
    });

    // UI API handlers
    this.apiCallHandlers.set('ui.showNotification', async (notification: any) => {
      if (!this.hasPermission('ui')) {
        throw new Error('Plugin does not have UI permission');
      }
      
      // Emit notification event
      window.dispatchEvent(new CustomEvent('plugin-notification', {
        detail: { pluginId: this.options.pluginId, notification }
      }));
    });

    this.apiCallHandlers.set('ui.registerCommand', async (command: any) => {
      if (!this.hasPermission('commands')) {
        throw new Error('Plugin does not have commands permission');
      }
      
      // Register command
      window.dispatchEvent(new CustomEvent('plugin-register-command', {
        detail: { pluginId: this.options.pluginId, command }
      }));
    });

    // Network API handlers
    this.apiCallHandlers.set('network.fetch', async (url: string, options?: any) => {
      if (!this.hasPermission('network')) {
        throw new Error('Plugin does not have network permission');
      }
      
      // Validate URL against allowed domains
      const allowedDomains = await this.getAllowedDomains();
      const urlObj = new URL(url);
      
      if (!allowedDomains.includes(urlObj.hostname)) {
        throw new Error(`Network access to ${urlObj.hostname} is not permitted`);
      }
      
      return fetch(url, options);
    });
  }

  private async getAllowedDomains(): Promise<string[]> {
    // Return list of allowed domains for this plugin
    // This could be configured per plugin or globally
    return ['api.openai.com', 'api.anthropic.com', 'localhost'];
  }

  private hasPermission(permission: string): boolean {
    return this.options.permissions.includes(permission);
  }

  async execute(code: string): Promise<any> {
    if (this.isTerminated) {
      throw new Error('Sandbox has been terminated');
    }

    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      
      // Setup timeout
      const timeout = setTimeout(() => {
        this.terminate();
        reject(new Error('Plugin execution timeout'));
      }, this.options.timeoutMs || 30000);

      // Setup message handler
      this.messageHandlers.set(messageId, (data) => {
        clearTimeout(timeout);
        
        if (data.type === 'response') {
          resolve(data.payload);
        } else if (data.type === 'error') {
          reject(new Error(data.payload));
        }
      });

      // Create and configure worker
      this.createWorker();
      
      // Send execution message
      this.sendMessage({
        id: messageId,
        type: 'execute',
        payload: {
          code,
          permissions: this.options.permissions,
          pluginId: this.options.pluginId
        },
        timestamp: Date.now()
      });
    });
  }

  private createWorker() {
    if (this.worker) {
      this.worker.terminate();
    }

    // Create worker with sandbox code
    const workerCode = this.generateWorkerCode();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerURL = URL.createObjectURL(blob);
    
    this.worker = new Worker(workerURL);
    
    this.worker.onmessage = (event) => {
      this.handleWorkerMessage(event.data);
    };

    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
      this.terminate();
    };

    // Clean up blob URL
    URL.revokeObjectURL(workerURL);
  }

  private handleWorkerMessage(message: SandboxMessage) {
    if (message.type === 'api-call') {
      this.handleAPICall(message);
    } else if (message.type === 'permission-request') {
      this.handlePermissionRequest(message);
    } else {
      const handler = this.messageHandlers.get(message.id);
      if (handler) {
        handler(message);
        this.messageHandlers.delete(message.id);
      }
    }
  }

  private async handleAPICall(message: SandboxMessage) {
    try {
      const { method, args } = message.payload;
      const handler = this.apiCallHandlers.get(method);
      
      if (!handler) {
        throw new Error(`Unknown API method: ${method}`);
      }

      const result = await handler(...args);
      
      this.sendMessage({
        id: message.id,
        type: 'response',
        payload: result,
        timestamp: Date.now()
      });
    } catch (error) {
      this.sendMessage({
        id: message.id,
        type: 'error',
        payload: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
    }
  }

  private async handlePermissionRequest(message: SandboxMessage) {
    const { permission, reason } = message.payload;
    
    // Check if permission is already granted
    if (this.hasPermission(permission)) {
      this.sendMessage({
        id: message.id,
        type: 'response',
        payload: true,
        timestamp: Date.now()
      });
      return;
    }

    // Request permission from user
    const granted = await this.requestPermissionFromUser(permission, reason);
    
    if (granted) {
      this.options.permissions.push(permission);
    }

    this.sendMessage({
      id: message.id,
      type: 'response',
      payload: granted,
      timestamp: Date.now()
    });
  }

  private async requestPermissionFromUser(permission: string, reason: string): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md mx-4">
          <h3 class="text-lg font-semibold mb-4">Permission Request</h3>
          <p class="text-gray-600 mb-4">
            Plugin "${this.options.pluginId}" is requesting "${permission}" permission.
          </p>
          <p class="text-sm text-gray-500 mb-6">${reason}</p>
          <div class="flex gap-3 justify-end">
            <button class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded" data-action="deny">
              Deny
            </button>
            <button class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded" data-action="allow">
              Allow
            </button>
          </div>
        </div>
      `;

      const handleClick = (event: Event) => {
        const target = event.target as HTMLElement;
        const action = target.dataset.action;
        
        if (action === 'allow' || action === 'deny') {
          document.body.removeChild(modal);
          resolve(action === 'allow');
        }
      };

      modal.addEventListener('click', handleClick);
      document.body.appendChild(modal);
    });
  }

  private sendMessage(message: SandboxMessage) {
    if (this.worker && !this.isTerminated) {
      this.worker.postMessage(message);
    }
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWorkerCode(): string {
    return `
// Plugin Sandbox Worker
class PluginSandboxWorker {
  constructor() {
    this.api = this.createAPIProxy();
    this.messageHandlers = new Map();
    
    self.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  createAPIProxy() {
    const makeAPICall = (method, ...args) => {
      return new Promise((resolve, reject) => {
        const messageId = this.generateMessageId();
        
        this.messageHandlers.set(messageId, (data) => {
          if (data.type === 'response') {
            resolve(data.payload);
          } else if (data.type === 'error') {
            reject(new Error(data.payload));
          }
        });

        self.postMessage({
          id: messageId,
          type: 'api-call',
          payload: { method, args },
          timestamp: Date.now()
        });
      });
    };

    return {
      storage: {
        get: (key) => makeAPICall('storage.get', key),
        set: (key, value) => makeAPICall('storage.set', key, value),
        remove: (key) => makeAPICall('storage.remove', key)
      },
      logger: {
        log: (...args) => makeAPICall('logger.log', ...args),
        error: (...args) => makeAPICall('logger.error', ...args),
        warn: (...args) => makeAPICall('logger.warn', ...args)
      },
      ui: {
        showNotification: (notification) => makeAPICall('ui.showNotification', notification),
        registerCommand: (command) => makeAPICall('ui.registerCommand', command)
      },
      chat: {
        onMessage: (callback) => {
          this.chatMessageCallback = callback;
        },
        onResponse: (callback) => {
          this.chatResponseCallback = callback;
        },
        sendMessage: (message) => makeAPICall('chat.sendMessage', message)
      },
      network: {
        fetch: (url, options) => makeAPICall('network.fetch', url, options)
      }
    };
  }

  async handleMessage(message) {
    if (message.type === 'execute') {
      await this.executePlugin(message);
    } else {
      const handler = this.messageHandlers.get(message.id);
      if (handler) {
        handler(message);
        this.messageHandlers.delete(message.id);
      }
    }
  }

  async executePlugin(message) {
    try {
      const { code, permissions, pluginId } = message.payload;
      
      const context = {
        api: this.api,
        console: {
          log: (...args) => this.api.logger.log(...args),
          error: (...args) => this.api.logger.error(...args),
          warn: (...args) => this.api.logger.warn(...args)
        },
        setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 10000)),
        setInterval: (fn, ms) => setInterval(fn, Math.max(ms, 100)),
        clearTimeout,
        clearInterval,
        Promise,
        JSON,
        Date,
        Math,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Error,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        encodeURIComponent,
        decodeURIComponent,
        btoa,
        atob
      };

      const dangerousGlobals = [
        'window', 'document', 'eval', 'Function', 'XMLHttpRequest',
        'fetch', 'localStorage', 'sessionStorage', 'indexedDB',
        'importScripts', 'postMessage', 'close', 'self', 'global'
      ];

      const wrappedCode = '(function(' + Object.keys(context).join(', ') + ') {' +
        '"use strict";' +
        dangerousGlobals.map(g => 'var ' + g + ' = undefined;').join('') +
        'class PluginInstance {' +
        'constructor() { this.api = api; }' +
        code +
        '}' +
        'return new PluginInstance();' +
        '})';

      const pluginFactory = eval(wrappedCode);
      const plugin = pluginFactory(...Object.values(context));

      if (typeof plugin.onLoad === 'function') {
        await plugin.onLoad(this.api);
      }

      self.postMessage({
        id: message.id,
        type: 'response',
        payload: { success: true, pluginId },
        timestamp: Date.now()
      });

      this.pluginInstance = plugin;

    } catch (error) {
      self.postMessage({
        id: message.id,
        type: 'error',
        payload: error.message,
        timestamp: Date.now()
      });
    }
  }

  generateMessageId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}

new PluginSandboxWorker();
`;
  }

  terminate() {
    this.isTerminated = true;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.messageHandlers.clear();
  }

  getMemoryUsage(): number {
    // Estimate memory usage (implementation depends on browser capabilities)
    return 0;
  }

  isAlive(): boolean {
    return !this.isTerminated && this.worker !== null;
  }
}

// Factory function for creating sandboxes
export function createPluginSandbox(options: SandboxOptions): PluginSandbox {
  return new PluginSandbox(options);
}
