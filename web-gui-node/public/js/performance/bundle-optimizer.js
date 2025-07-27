/**
 * DinoAir Bundle Optimizer
 * Implements route-based code splitting, shared chunks, and preloading
 */

class BundleOptimizer {
  constructor() {
    this.loadedModules = new Map();
    this.preloadedModules = new Set();
    this.routeModules = new Map();
    this.sharedChunks = new Map();
    this.criticalRoutes = new Set(['/', '/chat', '/artifacts']);

    this.init();
  }

  init() {
    console.log('[Bundle Optimizer] Initializing...');

    // Setup route-based code splitting
    this.setupRouteSplitting();

    // Initialize shared chunks
    this.initializeSharedChunks();

    // Setup preloading
    this.setupPreloading();

    // Optimize tree shaking
    this.optimizeTreeShaking();

    console.log('[Bundle Optimizer] Initialized successfully');
  }

  // Route-based Code Splitting
  setupRouteSplitting() {
    // Define route modules
    this.routeModules.set('/', {
      modules: ['home', 'dashboard'],
      priority: 'high',
      preload: true
    });

    this.routeModules.set('/chat', {
      modules: ['chat', 'message-handler', 'ai-interface'],
      priority: 'high',
      preload: true
    });

    this.routeModules.set('/artifacts', {
      modules: ['artifacts', 'artifact-viewer', 'file-handler'],
      priority: 'high',
      preload: true
    });

    this.routeModules.set('/system', {
      modules: ['system-monitor', 'health-dashboard'],
      priority: 'medium',
      preload: false
    });

    this.routeModules.set('/settings', {
      modules: ['settings', 'preferences'],
      priority: 'low',
      preload: false
    });
  }

  async loadRouteModules(route) {
    console.log(`[Bundle Optimizer] Loading modules for route: ${route}`);

    const routeConfig = this.routeModules.get(route);
    if (!routeConfig) {
      console.warn(`[Bundle Optimizer] No modules defined for route: ${route}`);
      return [];
    }

    const loadPromises = routeConfig.modules.map(moduleName =>
      this.loadModule(moduleName, routeConfig.priority)
    );

    try {
      const modules = await Promise.all(loadPromises);
      console.log(`[Bundle Optimizer] Loaded ${modules.length} modules for route: ${route}`);
      return modules;
    } catch (error) {
      console.error(`[Bundle Optimizer] Failed to load modules for route: ${route}`, error);
      return [];
    }
  }

  async loadModule(moduleName, priority = 'medium') {
    // Check if module is already loaded
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    }

    console.log(`[Bundle Optimizer] Loading module: ${moduleName} (priority: ${priority})`);

    try {
      // Dynamic import with error handling
      const modulePromise = this.dynamicImport(moduleName);

      // Store promise immediately to prevent duplicate loads
      this.loadedModules.set(moduleName, modulePromise);

      const module = await modulePromise;

      // Update with actual module
      this.loadedModules.set(moduleName, module);

      console.log(`[Bundle Optimizer] Module loaded: ${moduleName}`);
      return module;
    } catch (error) {
      console.error(`[Bundle Optimizer] Failed to load module: ${moduleName}`, error);
      this.loadedModules.delete(moduleName);
      throw error;
    }
  }

  async dynamicImport(moduleName) {
    // Map module names to actual paths
    const moduleMap = {
      home: '/js/components/home.js',
      dashboard: '/js/components/dashboard.js',
      chat: '/js/components/chat.js',
      'message-handler': '/js/components/message-handler.js',
      'ai-interface': '/js/components/ai-interface.js',
      artifacts: '/js/components/artifacts.js',
      'artifact-viewer': '/js/components/artifact-viewer.js',
      'file-handler': '/js/components/file-handler.js',
      'system-monitor': '/js/components/system-monitor.js',
      'health-dashboard': '/js/components/health-dashboard.js',
      settings: '/js/components/settings.js',
      preferences: '/js/components/preferences.js'
    };

    const modulePath = moduleMap[moduleName];
    if (!modulePath) {
      throw new Error(`Unknown module: ${moduleName}`);
    }

    return import(modulePath);
  }

  // Shared Chunks Management
  initializeSharedChunks() {
    // Define shared dependencies
    this.sharedChunks.set('vendor', {
      modules: ['react', 'react-dom', 'lodash'],
      priority: 'critical',
      preload: true
    });

    this.sharedChunks.set('ui-components', {
      modules: ['button', 'modal', 'dropdown', 'tooltip'],
      priority: 'high',
      preload: true
    });

    this.sharedChunks.set('utilities', {
      modules: ['date-utils', 'string-utils', 'validation'],
      priority: 'medium',
      preload: false
    });

    this.sharedChunks.set('analytics', {
      modules: ['tracking', 'metrics', 'reporting'],
      priority: 'low',
      preload: false
    });
  }

  async loadSharedChunk(chunkName) {
    console.log(`[Bundle Optimizer] Loading shared chunk: ${chunkName}`);

    const chunkConfig = this.sharedChunks.get(chunkName);
    if (!chunkConfig) {
      console.warn(`[Bundle Optimizer] Unknown shared chunk: ${chunkName}`);
      return null;
    }

    try {
      // Load all modules in the chunk
      const modulePromises = chunkConfig.modules.map(moduleName =>
        this.loadModule(moduleName, chunkConfig.priority)
      );

      const modules = await Promise.all(modulePromises);

      console.log(`[Bundle Optimizer] Shared chunk loaded: ${chunkName}`);
      return modules;
    } catch (error) {
      console.error(`[Bundle Optimizer] Failed to load shared chunk: ${chunkName}`, error);
      throw error;
    }
  }

  // Preloading System
  setupPreloading() {
    // Preload critical routes on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.preloadCriticalRoutes();
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        this.preloadCriticalRoutes();
      }, 1000);
    }

    // Setup intersection observer for route preloading
    this.setupRoutePreloading();
  }

  async preloadCriticalRoutes() {
    console.log('[Bundle Optimizer] Preloading critical routes...');

    for (const route of this.criticalRoutes) {
      try {
        await this.preloadRoute(route);
      } catch (error) {
        console.error(`[Bundle Optimizer] Failed to preload route: ${route}`, error);
      }
    }
  }

  async preloadRoute(route) {
    if (this.preloadedModules.has(route)) {
      return;
    }

    console.log(`[Bundle Optimizer] Preloading route: ${route}`);

    try {
      // Load route modules in background
      await this.loadRouteModules(route);
      this.preloadedModules.add(route);

      console.log(`[Bundle Optimizer] Route preloaded: ${route}`);
    } catch (error) {
      console.error(`[Bundle Optimizer] Failed to preload route: ${route}`, error);
    }
  }

  setupRoutePreloading() {
    // Preload routes when user hovers over navigation links
    document.addEventListener('mouseover', event => {
      const link = event.target.closest('a[href]');
      if (link && link.href) {
        const url = new URL(link.href);
        const route = url.pathname;

        if (this.routeModules.has(route) && !this.preloadedModules.has(route)) {
          // Debounce preloading
          clearTimeout(this.preloadTimeout);
          this.preloadTimeout = setTimeout(() => {
            this.preloadRoute(route);
          }, 100);
        }
      }
    });
  }

  // Tree Shaking Optimization
  optimizeTreeShaking() {
    // Mark unused exports for tree shaking
    this.unusedExports = new Set();

    // Track module usage
    this.moduleUsage = new Map();

    // Setup usage tracking
    this.trackModuleUsage();
  }

  trackModuleUsage() {
    // Override import function to track usage
    const originalImport = window.import || (() => {});

    window.import = async modulePath => {
      // Track module access
      this.recordModuleUsage(modulePath);

      // Call original import
      return originalImport(modulePath);
    };
  }

  recordModuleUsage(modulePath) {
    const usage = this.moduleUsage.get(modulePath) || {
      count: 0,
      lastAccessed: null,
      exports: new Set()
    };

    usage.count++;
    usage.lastAccessed = Date.now();

    this.moduleUsage.set(modulePath, usage);
  }

  // Performance Monitoring
  getLoadingStats() {
    return {
      loadedModules: this.loadedModules.size,
      preloadedModules: this.preloadedModules.size,
      sharedChunks: this.sharedChunks.size,
      moduleUsage: Object.fromEntries(this.moduleUsage),
      memoryUsage: this.getMemoryUsage()
    };
  }

  getMemoryUsage() {
    if ('memory' in performance) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  // Bundle Analysis
  analyzeBundleSize() {
    const analysis = {
      totalModules: this.loadedModules.size,
      routeModules: {},
      sharedChunks: {},
      recommendations: []
    };

    // Analyze route modules
    for (const [route, config] of this.routeModules.entries()) {
      analysis.routeModules[route] = {
        moduleCount: config.modules.length,
        priority: config.priority,
        preloaded: this.preloadedModules.has(route)
      };
    }

    // Analyze shared chunks
    for (const [chunk, config] of this.sharedChunks.entries()) {
      analysis.sharedChunks[chunk] = {
        moduleCount: config.modules.length,
        priority: config.priority
      };
    }

    // Generate recommendations
    this.generateOptimizationRecommendations(analysis);

    return analysis;
  }

  generateOptimizationRecommendations(analysis) {
    // Check for unused modules
    const unusedModules = [];
    for (const [modulePath, usage] of this.moduleUsage.entries()) {
      if (usage.count === 0 || Date.now() - usage.lastAccessed > 24 * 60 * 60 * 1000) {
        unusedModules.push(modulePath);
      }
    }

    if (unusedModules.length > 0) {
      analysis.recommendations.push({
        type: 'remove-unused',
        message: `Consider removing ${unusedModules.length} unused modules`,
        modules: unusedModules
      });
    }

    // Check for large route modules
    for (const [route, config] of this.routeModules.entries()) {
      if (config.modules.length > 5) {
        analysis.recommendations.push({
          type: 'split-route',
          message: `Route ${route} has ${config.modules.length} modules, consider splitting`,
          route
        });
      }
    }

    // Check preloading effectiveness
    const preloadedButUnused = [];
    for (const route of this.preloadedModules) {
      const usage = this.moduleUsage.get(route);
      if (!usage || usage.count === 0) {
        preloadedButUnused.push(route);
      }
    }

    if (preloadedButUnused.length > 0) {
      analysis.recommendations.push({
        type: 'optimize-preloading',
        message: `${preloadedButUnused.length} preloaded routes are unused`,
        routes: preloadedButUnused
      });
    }
  }

  // Webpack Configuration Helper
  generateWebpackConfig() {
    return {
      optimization: {
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 10,
              reuseExistingChunk: true
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true
            }
          }
        },
        usedExports: true,
        sideEffects: false,
        concatenateModules: true,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic'
      },
      resolve: {
        alias: {
          '@components': '/js/components',
          '@utils': '/js/utils',
          '@workers': '/js/workers'
        }
      },
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', {
                    modules: false,
                    useBuiltIns: 'usage',
                    corejs: 3
                  }]
                ],
                plugins: [
                  '@babel/plugin-syntax-dynamic-import'
                ]
              }
            }
          }
        ]
      }
    };
  }

  // Cleanup
  cleanup() {
    // Clear unused modules
    for (const [modulePath, usage] of this.moduleUsage.entries()) {
      if (usage.count === 0) {
        this.loadedModules.delete(modulePath);
      }
    }

    console.log('[Bundle Optimizer] Cleanup completed');
  }
}

// Route Manager for SPA navigation
class RouteManager {
  constructor(bundleOptimizer) {
    this.bundleOptimizer = bundleOptimizer;
    this.currentRoute = window.location.pathname;
    this.routeHistory = [];

    this.init();
  }

  init() {
    // Setup route change detection
    window.addEventListener('popstate', () => {
      this.handleRouteChange();
    });

    // Override pushState and replaceState
    this.overrideHistoryMethods();
  }

  overrideHistoryMethods() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handleRouteChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handleRouteChange();
    };
  }

  async handleRouteChange() {
    const newRoute = window.location.pathname;

    if (newRoute !== this.currentRoute) {
      console.log(`[Route Manager] Route changed: ${this.currentRoute} -> ${newRoute}`);

      this.routeHistory.push(this.currentRoute);
      this.currentRoute = newRoute;

      // Load route modules
      try {
        await this.bundleOptimizer.loadRouteModules(newRoute);
      } catch (error) {
        console.error('[Route Manager] Failed to load route modules:', error);
      }
    }
  }

  async navigateTo(route) {
    if (route !== this.currentRoute) {
      // Preload route modules before navigation
      await this.bundleOptimizer.loadRouteModules(route);

      // Navigate
      history.pushState(null, '', route);
      this.handleRouteChange();
    }
  }
}

// Global instances
window.bundleOptimizer = new BundleOptimizer();
window.routeManager = new RouteManager(window.bundleOptimizer);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BundleOptimizer,
    RouteManager
  };
}

console.log('[Bundle Optimizer] Script loaded');
