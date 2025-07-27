/** @type {import('next').NextConfig} */

// Memory-optimized Next.js configuration for DinoAir
require('dotenv').config();

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Disable PWA in development to reduce memory usage
const withPWA =
  process.env.NODE_ENV === 'production'
    ? require('next-pwa')({
        dest: 'public',
        register: true,
        skipWaiting: true,
        disable: false,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
              },
            },
          },
          {
            urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-font-assets',
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
        ],
      })
    : (config) => config;

const nextConfig = {
  // React strict mode for better development experience
  reactStrictMode: true,

  // SWC minification for faster builds and smaller bundles
  swcMinify: true,

  // Memory optimization settings
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Optimize images with memory constraints
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200], // Reduced sizes
    imageSizes: [16, 32, 48, 64, 96, 128], // Reduced sizes
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Limit concurrent image optimizations
    domains: [],
    remotePatterns: [],
  },

  // Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
    // Remove React DevTools in production
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  // Disable source maps in production to save memory
  productionBrowserSourceMaps: false,

  // Optimize font loading
  optimizeFonts: true,

  // Security headers with cache optimization
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images with validation
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, must-revalidate',
          },
        ],
      },
      // No cache for API routes
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },

  // Webpack optimizations for memory efficiency
  webpack: (config, { dev, isServer }) => {
    // Memory optimization for development
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };

      // Reduce memory usage in development
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
        removeAvailableModules: false,
        removeEmptyChunks: false,
      };
    }

    // Production optimizations
    if (!dev && !isServer) {
      // Advanced optimization for production builds
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        // Optimized chunk splitting for memory efficiency
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk (React, Next.js)
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Vendor libraries
            lib: {
              test(module) {
                return module.size() > 160000 && /node_modules[/\\]/.test(module.identifier());
              },
              name(module) {
                const hash = require('crypto')
                  .createHash('sha256')
                  .update(module.identifier())
                  .digest('hex');
                return `lib-${hash.substring(0, 8)}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Common components
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Large UI libraries
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 25,
            },
            // Chart.js libraries
            charts: {
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
          },
        },
        // Use deterministic module ids for long term caching
        moduleIds: 'deterministic',
        minimize: true,
      };
    }

    // Memory-efficient module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      // Use lighter alternatives where possible
      lodash: 'lodash-es',
    };

    // Handle node modules for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        os: false,
        buffer: false,
      };
    }

    // Reduce memory usage by limiting concurrent builds
    config.parallelism = 1;

    return config;
  },

  // Experimental features for performance
  experimental: {
    // Enable optimized package imports for tree shaking
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-toast',
      'date-fns',
      'chart.js',
      'react-chartjs-2',
    ],
    // Reduce server memory usage
    serverComponentsExternalPackages: ['swagger-ui-react', 'prismjs'],
    // Enable optimized CSS imports
    optimizeCss: true,
    // Memory optimization
    memoryBasedWorkers: true,
  },

  // Output configuration
  output: 'standalone',

  // Security
  poweredByHeader: false,

  // Enable compression
  compress: true,

  // Optimized build ID generation
  generateBuildId: async () => {
    if (process.env.GIT_COMMIT_SHA) {
      return process.env.GIT_COMMIT_SHA.substring(0, 8);
    }
    return `build-${Date.now()}`;
  },

  // Page extensions for better tree shaking
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Disable X-Powered-By header
  poweredByHeader: false,

  // Strict mode for better error catching
  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));
