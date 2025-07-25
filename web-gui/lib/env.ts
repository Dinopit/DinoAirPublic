import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Server-side environment variables schema
   */
  server: {
    // Node environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    
    // API Configuration
    API_BASE_URL: z.string().url().default('http://localhost:8080'),
    API_KEY: z.string().min(1).default('dinoair-free-tier-api-key'),
    API_SECRET: z.string().min(32).default('your-secret-key-here-min-32-chars'),
    
    // Database (if needed in future)
    DATABASE_URL: z.string().url().optional(),
    
    // Session and Security
    SESSION_SECRET: z.string().min(32).default('your-session-secret-min-32-chars'),
    JWT_SECRET: z.string().min(32).default('your-jwt-secret-min-32-characters'),
    
    // CORS Configuration
    CORS_ORIGIN: z.string().default('*'),
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000), // 1 minute
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
    
    // ComfyUI Backend
    COMFYUI_API_URL: z.string().url().default('http://localhost:8188'),
    COMFYUI_WORKFLOW_PATH: z.string().default('./FreeTierPacked/sd15-workflow.json'),
    
    // File Storage
    UPLOAD_DIR: z.string().default('./uploads'),
    MAX_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB
    
    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    
    // Performance
    ENABLE_CACHE: z.coerce.boolean().default(true),
    CACHE_TTL: z.coerce.number().default(3600), // 1 hour
  },

  /**
   * Client-side environment variables schema
   * Prefix with NEXT_PUBLIC_ to expose to client
   */
  client: {
    // App Info
    NEXT_PUBLIC_APP_NAME: z.string().default('DinoAir Free Tier'),
    NEXT_PUBLIC_VERSION: z.string().default('1.0.0'),
    NEXT_PUBLIC_IS_FREE_TIER: z.coerce.boolean().default(true),
    
    // API Endpoint (for client-side requests)
    NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000/api'),
    
    // WebSocket Configuration
    NEXT_PUBLIC_WS_URL: z.string().url().default('ws://localhost:8080'),
    
    // Features Toggle
    NEXT_PUBLIC_ENABLE_IMAGE_GEN: z.coerce.boolean().default(true),
    NEXT_PUBLIC_ENABLE_CHAT: z.coerce.boolean().default(true),
    NEXT_PUBLIC_ENABLE_ARTIFACTS: z.coerce.boolean().default(true),
    
    // UI Configuration
    NEXT_PUBLIC_THEME: z.enum(['light', 'dark', 'system']).default('system'),
    NEXT_PUBLIC_MAX_MESSAGE_LENGTH: z.coerce.number().default(4000),
    
    // Analytics (optional)
    NEXT_PUBLIC_GA_ID: z.string().optional(),
    NEXT_PUBLIC_ENABLE_ANALYTICS: z.coerce.boolean().default(false),
    
    // Development
    NEXT_PUBLIC_DEBUG_MODE: z.coerce.boolean().default(false),
  },

  /**
   * Runtime environment variables
   */
  runtimeEnv: {
    // Server
    NODE_ENV: process.env.NODE_ENV,
    API_BASE_URL: process.env.API_BASE_URL,
    API_KEY: process.env.API_KEY,
    API_SECRET: process.env.API_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    COMFYUI_API_URL: process.env.COMFYUI_API_URL,
    COMFYUI_WORKFLOW_PATH: process.env.COMFYUI_WORKFLOW_PATH,
    UPLOAD_DIR: process.env.UPLOAD_DIR,
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
    LOG_LEVEL: process.env.LOG_LEVEL,
    ENABLE_CACHE: process.env.ENABLE_CACHE,
    CACHE_TTL: process.env.CACHE_TTL,
    
    // Client
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_VERSION: process.env.NEXT_PUBLIC_VERSION,
    NEXT_PUBLIC_IS_FREE_TIER: process.env.NEXT_PUBLIC_IS_FREE_TIER,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_ENABLE_IMAGE_GEN: process.env.NEXT_PUBLIC_ENABLE_IMAGE_GEN,
    NEXT_PUBLIC_ENABLE_CHAT: process.env.NEXT_PUBLIC_ENABLE_CHAT,
    NEXT_PUBLIC_ENABLE_ARTIFACTS: process.env.NEXT_PUBLIC_ENABLE_ARTIFACTS,
    NEXT_PUBLIC_THEME: process.env.NEXT_PUBLIC_THEME,
    NEXT_PUBLIC_MAX_MESSAGE_LENGTH: process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE,
  },

  /**
   * Skip validation in certain environments
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Empty string is treated as undefined
   */
  emptyStringAsUndefined: true,
});

// Export typed environment variables
export type Env = typeof env;