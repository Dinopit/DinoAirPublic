import crypto from 'crypto';

// In production, these should be stored in a database or environment variables
const VALID_API_KEYS = new Set([
  'dinoair-free-tier-key-001',
  'dinoair-free-tier-key-002'
  // Add more API keys as needed
]);

// API key configuration
export interface ApiKeyConfig {
  key: string;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  rateLimit: number; // requests per minute
}

// In-memory storage for API key metadata (in production, use a database)
const apiKeyMetadata = new Map<string, ApiKeyConfig>();

// Initialize API keys
VALID_API_KEYS.forEach(key => {
  apiKeyMetadata.set(key, {
    key,
    createdAt: new Date(),
    lastUsed: new Date(),
    usageCount: 0,
    rateLimit: 60 // 60 requests per minute default
  });
});

/**
 * Validates an API key
 * @param apiKey The API key to validate
 * @returns true if valid, false otherwise
 */
export function validateApiKey(apiKey: string | null | undefined): boolean {
  // Check if authentication is disabled
  if (process.env.AUTH_ENABLED === 'false' || process.env.NEXT_PUBLIC_AUTH_ENABLED === 'false') {
    return true;
  }
  
  if (!apiKey) return false;
  
  // Remove 'Bearer ' prefix if present
  const cleanKey = apiKey.startsWith('Bearer ') ? apiKey.slice(7) : apiKey;
  
  return VALID_API_KEYS.has(cleanKey);
}

/**
 * Gets API key metadata
 * @param apiKey The API key
 * @returns API key configuration or null
 */
export function getApiKeyConfig(apiKey: string): ApiKeyConfig | null {
  const cleanKey = apiKey.startsWith('Bearer ') ? apiKey.slice(7) : apiKey;
  return apiKeyMetadata.get(cleanKey) || null;
}

/**
 * Updates API key usage statistics
 * @param apiKey The API key
 */
export function updateApiKeyUsage(apiKey: string): void {
  const cleanKey = apiKey.startsWith('Bearer ') ? apiKey.slice(7) : apiKey;
  const config = apiKeyMetadata.get(cleanKey);
  
  if (config) {
    config.lastUsed = new Date();
    config.usageCount++;
    apiKeyMetadata.set(cleanKey, config);
  }
}

/**
 * Generates a new API key
 * @returns A new API key
 */
export function generateApiKey(): string {
  const prefix = 'dinoair-free-tier-key';
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `${prefix}-${randomBytes}`;
}

/**
 * Adds a new API key to the valid keys
 * @param apiKey The API key to add
 * @param rateLimit Optional rate limit (requests per minute)
 */
export function addApiKey(apiKey: string, rateLimit: number = 60): void {
  VALID_API_KEYS.add(apiKey);
  apiKeyMetadata.set(apiKey, {
    key: apiKey,
    createdAt: new Date(),
    lastUsed: new Date(),
    usageCount: 0,
    rateLimit
  });
}

/**
 * Removes an API key
 * @param apiKey The API key to remove
 */
export function removeApiKey(apiKey: string): void {
  VALID_API_KEYS.delete(apiKey);
  apiKeyMetadata.delete(apiKey);
}

/**
 * Gets all API keys (for admin purposes)
 * @returns Array of API key configurations
 */
export function getAllApiKeys(): ApiKeyConfig[] {
  return Array.from(apiKeyMetadata.values());
}
