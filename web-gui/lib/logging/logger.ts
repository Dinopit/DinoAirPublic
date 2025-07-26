/**
 * DinoAir Client-Side Logging System
 * Provides structured logging with remote transmission and local storage
 * Enhanced with correlation ID support
 */

import { getCurrentCorrelationId } from '../correlation/correlation-id';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  logger: string;
  message: string;
  correlationId: string;
  context?: Record<string, any> | undefined;
  error?: {
    name: string;
    message: string;
    stack?: string | undefined;
  } | undefined;
  sessionId: string;
  userId?: string | undefined;
  url: string;
  userAgent: string;
}

export interface LoggerConfig {
  // Remote logging
  remoteEndpoint?: string | undefined;
  batchSize?: number | undefined;
  flushInterval?: number | undefined; // ms
  
  // Local storage
  useLocalStorage?: boolean | undefined;
  maxLocalEntries?: number | undefined;
  
  // Console output
  consoleOutput?: boolean | undefined;
  minConsoleLevel?: LogLevel | undefined;
  
  // Performance
  enablePerformanceMetrics?: boolean | undefined;
  
  // Privacy
  sanitizeUrls?: boolean | undefined;
  sanitizeUserData?: boolean | undefined;
}

class LogBuffer {
  private entries: LogEntry[] = [];
  private timer?: NodeJS.Timeout | undefined;
  
  constructor(
    private config: Required<LoggerConfig>,
    private onFlush: (entries: LogEntry[]) => void
  ) {
    this.startTimer();
  }
  
  add(entry: LogEntry): void {
    this.entries.push(entry);
    
    if (this.entries.length >= (this.config.batchSize ?? 50)) {
      this.flush();
    }
  }
  
  flush(): void {
    if (this.entries.length === 0) return;
    
    const entriesToSend = [...this.entries];
    this.entries = [];
    this.onFlush(entriesToSend);
    
    this.resetTimer();
  }
  
  private startTimer(): void {
    if (this.timer) return;
    
    this.timer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
  
  private resetTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null as any;
    }
    this.startTimer();
  }
  
  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.flush();
  }
}

export class Logger {
  
  constructor(
    private name: string,
    private manager: LogManager
  ) {}
  
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  error(message: string, error?: Error | any, context?: Record<string, any>): void {
    const errorInfo = error ? {
      name: error.name || 'Error',
      message: error.message || String(error),
      stack: error.stack
    } : undefined;
    
    this.log(LogLevel.ERROR, message, context, errorInfo);
  }
  
  critical(message: string, error?: Error | any, context?: Record<string, any>): void {
    const errorInfo = error ? {
      name: error.name || 'Error',
      message: error.message || String(error),
      stack: error.stack
    } : undefined;
    
    this.log(LogLevel.CRITICAL, message, context, errorInfo);
  }
  
  performance(operation: string, duration: number, context?: Record<string, any>): void {
    if (!this.manager.config.enablePerformanceMetrics) return;
    
    this.info(`Performance: ${operation}`, {
      ...context,
      performance: {
        operation,
        duration,
        timestamp: Date.now()
      }
    });
  }
  
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: LogEntry['error']
  ): void {
    this.manager.log({
      timestamp: new Date().toISOString(),
      level,
      logger: this.name,
      message,
      correlationId: getCurrentCorrelationId(),
      context,
      error,
      sessionId: this.manager.getSessionId(),
      userId: this.manager.getUserId(),
      url: this.sanitizeUrl(window.location.href),
      userAgent: navigator.userAgent
    });
  }
  
  private sanitizeUrl(url: string): string {
    if (!this.manager.config.sanitizeUrls) return url;
    
    try {
      const urlObj = new URL(url);
      // Remove sensitive query params
      const sensitiveParams = ['token', 'key', 'password', 'secret', 'auth'];
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });
      return urlObj.toString();
    } catch {
      return url;
    }
  }
}

export class LogManager {
  config: Required<LoggerConfig>;
  private buffer: LogBuffer;
  private loggers: Map<string, Logger> = new Map();
  private sessionId: string;
  private userId?: string;
  
  constructor(config?: LoggerConfig) {
    this.config = {
      remoteEndpoint: config?.remoteEndpoint ?? '/api/logs',
      batchSize: config?.batchSize ?? 50,
      flushInterval: config?.flushInterval ?? 5000,
      useLocalStorage: config?.useLocalStorage ?? true,
      maxLocalEntries: config?.maxLocalEntries ?? 1000,
      consoleOutput: config?.consoleOutput ?? true,
      minConsoleLevel: config?.minConsoleLevel ?? LogLevel.INFO,
      enablePerformanceMetrics: config?.enablePerformanceMetrics ?? true,
      sanitizeUrls: config?.sanitizeUrls ?? true,
      sanitizeUserData: config?.sanitizeUserData ?? true
    };
    
    this.sessionId = this.generateSessionId();
    this.buffer = new LogBuffer(this.config, this.sendLogs.bind(this));
    
    // Set up global error handler
    this.setupGlobalErrorHandler();
    
    // Set up page unload handler
    this.setupUnloadHandler();
  }
  
  getLogger(name: string): Logger {
    if (!this.loggers.has(name)) {
      this.loggers.set(name, new Logger(name, this));
    }
    return this.loggers.get(name)!;
  }
  
  log(entry: LogEntry): void {
    // Console output
    if (this.config.consoleOutput && entry.level >= (this.config.minConsoleLevel ?? LogLevel.INFO)) {
      this.consoleLog(entry);
    }
    
    // Local storage
    if (this.config.useLocalStorage) {
      this.saveToLocalStorage(entry);
    }
    
    // Add to buffer for remote sending
    if (this.config.remoteEndpoint) {
      this.buffer.add(entry);
    }
  }
  
  private consoleLog(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.correlationId}] [${entry.logger}]`;
    const message = `${prefix} ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.context);
        break;
      case LogLevel.INFO:
        console.info(message, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.context);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, entry.error || entry.context);
        break;
    }
  }
  
  private saveToLocalStorage(entry: LogEntry): void {
    try {
      const key = 'dinoair_logs';
      const existingLogs = JSON.parse(localStorage.getItem(key) || '[]');
      existingLogs.push(entry);
      
      // Limit size
      const maxEntries = this.config.maxLocalEntries ?? 1000;
      if (existingLogs.length > maxEntries) {
        existingLogs.splice(0, existingLogs.length - maxEntries);
      }
      
      localStorage.setItem(key, JSON.stringify(existingLogs));
    } catch (e) {
      // Local storage might be full or disabled
      console.warn('Failed to save log to local storage:', e);
    }
  }
  
  private async sendLogs(entries: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) return;
    
    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entries })
      });
      
      if (!response.ok) {
        console.error('Failed to send logs:', response.statusText);
        // Could implement retry logic here
      }
    } catch (error) {
      console.error('Failed to send logs:', error);
      // Could save failed logs for retry
    }
  }
  
  private setupGlobalErrorHandler(): void {
    window.addEventListener('error', (event) => {
      const logger = this.getLogger('window');
      logger.error('Uncaught error', event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      const logger = this.getLogger('window');
      logger.error('Unhandled promise rejection', event.reason);
    });
  }
  
  private setupUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      this.buffer.destroy();
    });
  }
  
  private generateSessionId(): string {
    const stored = sessionStorage.getItem('dinoair_session_id');
    if (stored) return stored;
    
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('dinoair_session_id', id);
    return id;
  }
  
  getSessionId(): string {
    return this.sessionId;
  }
  
  setUserId(userId: string): void {
    this.userId = userId;
  }
  
  getUserId(): string | undefined {
    return this.userId;
  }
  
  flush(): void {
    this.buffer.flush();
  }
  
  destroy(): void {
    this.buffer.destroy();
  }
}

// Global instance
let globalLogManager: LogManager | null = null;

export function initializeLogging(config?: LoggerConfig): LogManager {
  if (globalLogManager) {
    globalLogManager.destroy();
  }
  globalLogManager = new LogManager(config);
  return globalLogManager;
}

export function getLogger(name: string): Logger {
  if (!globalLogManager) {
    globalLogManager = new LogManager();
  }
  return globalLogManager.getLogger(name);
}

export function setUserId(userId: string): void {
  if (globalLogManager) {
    globalLogManager.setUserId(userId);
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private logger: Logger;
  private marks: Map<string, number> = new Map();
  
  constructor(loggerName: string = 'performance') {
    this.logger = getLogger(loggerName);
  }
  
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }
  
  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    if (!start) {
      this.logger.warn(`Start mark '${startMark}' not found`);
      return 0;
    }
    
    const end = endMark ? this.marks.get(endMark) : performance.now();
    if (!end) {
      this.logger.warn(`End mark '${endMark}' not found`);
      return 0;
    }
    
    const duration = end - start;
    this.logger.performance(name, duration);
    return duration;
  }
  
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.logger.performance(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.logger.error(`${name} failed`, error, { duration });
      throw error;
    }
  }
}

// React hook for logging
export function useLogger(name: string): Logger {
  return React.useMemo(() => getLogger(name), [name]);
}

// Decorator for method logging
export function logMethod(loggerName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const logger = getLogger(loggerName || target.constructor.name);
    
    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      logger.debug(`${propertyKey} called`, { args: args.slice(0, 3) }); // Limit args logged
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;
        logger.debug(`${propertyKey} completed`, { duration });
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        logger.error(`${propertyKey} failed`, error, { duration });
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Note: React import would be at the top in actual usage
declare const React: any;
