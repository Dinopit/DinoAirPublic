/**
 * DinoAir Logging Configuration
 * Centralized configuration for logging system across the application
 */

import { LogLevel, LoggerConfig } from './logger';

export interface DinoAirLoggingConfig extends LoggerConfig {
  // Application-specific settings
  applicationName?: string | undefined;
  environment?: string | undefined;
  
  // Correlation ID settings
  enableCorrelationIds?: boolean | undefined;
  correlationIdHeader?: string | undefined;
  
  // Remote logging settings
  remoteLogLevel?: LogLevel | undefined;
  retryFailedLogs?: boolean | undefined;
  maxRetries?: number | undefined;
  
  // Performance settings
  enablePerformanceLogging?: boolean | undefined;
  performanceThresholds?: {
    slow: number;    // ms
    warning: number; // ms
    error: number;   // ms
  } | undefined;
  
  // Security settings
  sanitizePasswords?: boolean | undefined;
  sanitizeTokens?: boolean | undefined;
  redactFields?: string[] | undefined;
  
  // Development settings
  prettyPrint?: boolean | undefined;
  logStackTraces?: boolean | undefined;
}

/**
 * Default logging configuration
 */
export const DEFAULT_LOGGING_CONFIG: Required<DinoAirLoggingConfig> = {
  // Basic config
  remoteEndpoint: '/api/logs',
  batchSize: 50,
  flushInterval: 5000,
  useLocalStorage: true,
  maxLocalEntries: 1000,
  consoleOutput: true,
  minConsoleLevel: LogLevel.INFO,
  enablePerformanceMetrics: true,
  sanitizeUrls: true,
  sanitizeUserData: true,
  
  // Application-specific
  applicationName: 'DinoAir',
  environment: process.env.NODE_ENV || 'development',
  
  // Correlation IDs
  enableCorrelationIds: true,
  correlationIdHeader: 'x-correlation-id',
  
  // Remote logging
  remoteLogLevel: LogLevel.INFO,
  retryFailedLogs: true,
  maxRetries: 3,
  
  // Performance
  enablePerformanceLogging: true,
  performanceThresholds: {
    slow: 1000,    // 1 second
    warning: 5000, // 5 seconds
    error: 10000   // 10 seconds
  },
  
  // Security
  sanitizePasswords: true,
  sanitizeTokens: true,
  redactFields: ['password', 'token', 'secret', 'apiKey', 'authorization'],
  
  // Development
  prettyPrint: process.env.NODE_ENV === 'development',
  logStackTraces: process.env.NODE_ENV === 'development'
};

/**
 * Environment-specific configurations
 */
export const ENVIRONMENT_CONFIGS: Record<string, Partial<DinoAirLoggingConfig>> = {
  development: {
    minConsoleLevel: LogLevel.DEBUG,
    remoteLogLevel: LogLevel.DEBUG,
    batchSize: 10,
    flushInterval: 2000,
    enablePerformanceMetrics: true,
    prettyPrint: true,
    logStackTraces: true
  },
  
  test: {
    consoleOutput: false,
    useLocalStorage: false,
    remoteEndpoint: undefined, // Disable remote logging in tests
    enablePerformanceMetrics: false,
    prettyPrint: false,
    logStackTraces: false
  },
  
  staging: {
    minConsoleLevel: LogLevel.INFO,
    remoteLogLevel: LogLevel.INFO,
    batchSize: 100,
    flushInterval: 10000,
    enablePerformanceMetrics: true,
    prettyPrint: false,
    logStackTraces: true
  },
  
  production: {
    minConsoleLevel: LogLevel.WARN,
    remoteLogLevel: LogLevel.INFO,
    batchSize: 200,
    flushInterval: 30000,
    enablePerformanceMetrics: true,
    prettyPrint: false,
    logStackTraces: false,
    sanitizeUrls: true,
    sanitizeUserData: true
  }
};

/**
 * Creates a logging configuration for the current environment
 */
export function createLoggingConfig(
  environment?: string,
  overrides?: Partial<DinoAirLoggingConfig>
): Required<DinoAirLoggingConfig> {
  const env = environment || process.env.NODE_ENV || 'development';
  const envConfig = ENVIRONMENT_CONFIGS[env] || {};
  
  return {
    ...DEFAULT_LOGGING_CONFIG,
    ...envConfig,
    ...overrides,
    environment: env
  };
}

/**
 * Validates logging configuration
 */
export function validateLoggingConfig(config: DinoAirLoggingConfig): string[] {
  const errors: string[] = [];
  
  if (config.batchSize && config.batchSize <= 0) {
    errors.push('batchSize must be greater than 0');
  }
  
  if (config.flushInterval && config.flushInterval <= 0) {
    errors.push('flushInterval must be greater than 0');
  }
  
  if (config.maxLocalEntries && config.maxLocalEntries <= 0) {
    errors.push('maxLocalEntries must be greater than 0');
  }
  
  if (config.maxRetries && config.maxRetries < 0) {
    errors.push('maxRetries must be 0 or greater');
  }
  
  if (config.performanceThresholds) {
    const { slow, warning, error } = config.performanceThresholds;
    if (slow >= warning || warning >= error) {
      errors.push('performanceThresholds must be in ascending order (slow < warning < error)');
    }
  }
  
  return errors;
}

/**
 * Log level configuration utilities
 */
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.CRITICAL]: 'CRITICAL'
};

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '#6b7280',
  [LogLevel.INFO]: '#3b82f6',
  [LogLevel.WARN]: '#f59e0b',
  [LogLevel.ERROR]: '#ef4444',
  [LogLevel.CRITICAL]: '#dc2626'
};

/**
 * Sanitizes sensitive data from log entries
 */
export function sanitizeLogData(
  data: any,
  redactFields: string[] | undefined = DEFAULT_LOGGING_CONFIG.redactFields
): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item, redactFields));
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // Check if field should be redacted
    const shouldRedact = redactFields?.some(field => 
      lowerKey.includes(field.toLowerCase())
    ) || false;
    
    if (shouldRedact) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value, redactFields);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Performance threshold checker
 */
export function getPerformanceLevel(
  duration: number,
  thresholds = DEFAULT_LOGGING_CONFIG.performanceThresholds
): LogLevel {
  if (!thresholds) {
    return LogLevel.DEBUG;
  }
  
  if (duration >= thresholds.error) {
    return LogLevel.ERROR;
  } else if (duration >= thresholds.warning) {
    return LogLevel.WARN;
  } else if (duration >= thresholds.slow) {
    return LogLevel.INFO;
  } else {
    return LogLevel.DEBUG;
  }
}

/**
 * Environment variable helpers
 */
export function getLogLevelFromEnv(
  envVar: string = 'LOG_LEVEL',
  defaultLevel: LogLevel = LogLevel.INFO
): LogLevel {
  const level = process.env[envVar]?.toUpperCase();
  
  switch (level) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    case 'CRITICAL': return LogLevel.CRITICAL;
    default: return defaultLevel;
  }
}

export function getBooleanFromEnv(
  envVar: string,
  defaultValue: boolean = false
): boolean {
  const value = process.env[envVar]?.toLowerCase();
  if (value === undefined) return defaultValue;
  
  return value === 'true' || value === '1' || value === 'yes';
}

export function getNumberFromEnv(
  envVar: string,
  defaultValue: number
): number {
  const value = process.env[envVar];
  if (value === undefined) return defaultValue;
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}
