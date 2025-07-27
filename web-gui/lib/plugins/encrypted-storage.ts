/**
 * Encrypted Plugin Storage System
 * Provides secure, encrypted storage for plugin data with per-plugin isolation
 */

export interface EncryptedStorageOptions {
  pluginId: string;
  encryptionKey?: CryptoKey;
  keyDerivationSalt?: Uint8Array;
}

export interface StorageQuota {
  maxSizeBytes: number;
  currentSizeBytes: number;
  maxKeys: number;
  currentKeys: number;
}

export interface StorageMetadata {
  pluginId: string;
  key: string;
  encrypted: boolean;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  lastAccessedAt: number;
  expiresAt?: number;
  tags?: string[];
}

export interface StorageOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[];
  compress?: boolean;
  backup?: boolean;
}

// Storage encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12,
  tagLength: 16,
  iterations: 100000, // PBKDF2 iterations
  hash: 'SHA-256'
};

// Default quota limits per plugin
const DEFAULT_QUOTA: StorageQuota = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB per plugin
  currentSizeBytes: 0,
  maxKeys: 1000, // Max 1000 keys per plugin
  currentKeys: 0
};

export class EncryptedPluginStorage {
  private pluginId: string;
  private encryptionKey: CryptoKey | null = null;
  private keyDerivationSalt: Uint8Array;
  private storagePrefix: string;
  private metadataCache: Map<string, StorageMetadata> = new Map();

  constructor(options: EncryptedStorageOptions) {
    this.pluginId = options.pluginId;
    this.storagePrefix = `plugin_encrypted_${this.pluginId}_`;

    // Use provided salt or generate new one
    this.keyDerivationSalt =
      options.keyDerivationSalt || crypto.getRandomValues(new Uint8Array(16));

    if (options.encryptionKey) {
      this.encryptionKey = options.encryptionKey;
    }

    // Load metadata cache
    this.loadMetadataCache();

    // Set up cleanup interval
    this.setupCleanupInterval();
  }

  /**
   * Initialize encryption with password or derive key
   */
  async initialize(password?: string): Promise<void> {
    if (this.encryptionKey) {
      return; // Already initialized
    }

    if (password) {
      this.encryptionKey = await this.deriveKeyFromPassword(password);
    } else {
      // Generate a random key for this session
      this.encryptionKey = await crypto.subtle.generateKey(
        {
          name: ENCRYPTION_CONFIG.algorithm,
          length: ENCRYPTION_CONFIG.keyLength
        },
        false, // Not extractable for security
        ['encrypt', 'decrypt']
      );
    }

    // Store salt for future key derivation
    localStorage.setItem(
      `${this.storagePrefix}salt`,
      btoa(String.fromCharCode(...this.keyDerivationSalt))
    );
  }

  /**
   * Store encrypted data
   */
  async setItem(key: string, value: any, options: StorageOptions = {}): Promise<void> {
    await this.ensureInitialized();

    // Check quota before storing
    await this.checkQuota(key, value);

    try {
      // Serialize value
      const serializedValue = JSON.stringify(value);

      // Compress if requested
      const dataToEncrypt = options.compress
        ? await this.compressData(serializedValue)
        : new TextEncoder().encode(serializedValue);

      // Encrypt data
      const encryptedData = await this.encryptData(dataToEncrypt);

      // Create storage entry
      const storageEntry = {
        data: encryptedData,
        metadata: {
          compressed: !!options.compress,
          encrypted: true,
          createdAt: Date.now(),
          expiresAt: options.ttl ? Date.now() + options.ttl : undefined,
          tags: options.tags || []
        }
      };

      // Store encrypted data
      const storageKey = this.getStorageKey(key);
      localStorage.setItem(storageKey, JSON.stringify(storageEntry));

      // Update metadata
      await this.updateMetadata(key, serializedValue.length, options);

      // Create backup if requested
      if (options.backup) {
        await this.createBackup(key, storageEntry);
      }
    } catch (error) {
      throw new Error(
        `Failed to store encrypted data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve and decrypt data
   */
  async getItem<T = any>(key: string): Promise<T | null> {
    await this.ensureInitialized();

    try {
      const storageKey = this.getStorageKey(key);
      const stored = localStorage.getItem(storageKey);

      if (!stored) {
        return null;
      }

      const storageEntry = JSON.parse(stored);

      // Check expiration
      if (storageEntry.metadata.expiresAt && Date.now() > storageEntry.metadata.expiresAt) {
        await this.removeItem(key);
        return null;
      }

      // Decrypt data
      const decryptedData = await this.decryptData(storageEntry.data);

      // Decompress if necessary
      const rawData = storageEntry.metadata.compressed
        ? await this.decompressData(decryptedData)
        : new TextDecoder().decode(decryptedData);

      // Update access metadata
      await this.updateAccessMetadata(key);

      // Parse and return
      return JSON.parse(rawData);
    } catch (error) {
      console.error(`Failed to retrieve encrypted data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    const storageKey = this.getStorageKey(key);
    localStorage.removeItem(storageKey);

    // Remove from metadata cache
    this.metadataCache.delete(key);

    // Update metadata storage
    await this.saveMetadataCache();

    // Remove backup if exists
    const backupKey = `${storageKey}_backup`;
    localStorage.removeItem(backupKey);
  }

  /**
   * Clear all data for this plugin
   */
  async clear(): Promise<void> {
    const keys = await this.getAllKeys();

    for (const key of keys) {
      await this.removeItem(key);
    }

    // Clear metadata
    this.metadataCache.clear();
    localStorage.removeItem(this.getStorageKey('_metadata'));
  }

  /**
   * Get all keys for this plugin
   */
  async getAllKeys(): Promise<string[]> {
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        key.startsWith(this.storagePrefix) &&
        !key.includes('_metadata') &&
        !key.includes('_backup')
      ) {
        keys.push(key.replace(this.storagePrefix, ''));
      }
    }

    return keys;
  }

  /**
   * Get storage quota information
   */
  async getQuota(): Promise<StorageQuota> {
    const quota = { ...DEFAULT_QUOTA };

    // Calculate current usage
    const keys = await this.getAllKeys();
    quota.currentKeys = keys.length;

    let totalSize = 0;
    for (const key of keys) {
      const metadata = this.metadataCache.get(key);
      if (metadata) {
        totalSize += metadata.sizeBytes;
      }
    }

    quota.currentSizeBytes = totalSize;
    return quota;
  }

  /**
   * Get metadata for a specific key
   */
  getMetadata(key: string): StorageMetadata | null {
    return this.metadataCache.get(key) || null;
  }

  /**
   * Find keys by tags
   */
  async findByTags(tags: string[]): Promise<string[]> {
    const matchingKeys: string[] = [];

    for (const [key, metadata] of this.metadataCache) {
      if (metadata.tags && tags.some((tag) => metadata.tags!.includes(tag))) {
        matchingKeys.push(key);
      }
    }

    return matchingKeys;
  }

  /**
   * Export encrypted data for backup
   */
  async exportData(): Promise<{ [key: string]: any }> {
    const exported: { [key: string]: any } = {};
    const keys = await this.getAllKeys();

    for (const key of keys) {
      const storageKey = this.getStorageKey(key);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        exported[key] = JSON.parse(stored);
      }
    }

    // Include metadata
    exported._metadata = Object.fromEntries(this.metadataCache);
    exported._salt = btoa(String.fromCharCode(...this.keyDerivationSalt));

    return exported;
  }

  /**
   * Import encrypted data from backup
   */
  async importData(data: { [key: string]: any }): Promise<void> {
    // Clear existing data
    await this.clear();

    // Import salt
    if (data._salt) {
      this.keyDerivationSalt = Uint8Array.from(atob(data._salt), (c) => c.charCodeAt(0));
    }

    // Import metadata
    if (data._metadata) {
      for (const [key, metadata] of Object.entries(data._metadata)) {
        this.metadataCache.set(key, metadata as StorageMetadata);
      }
    }

    // Import data
    for (const [key, value] of Object.entries(data)) {
      if (!key.startsWith('_')) {
        const storageKey = this.getStorageKey(key);
        localStorage.setItem(storageKey, JSON.stringify(value));
      }
    }

    await this.saveMetadataCache();
  }

  /**
   * Private helper methods
   */

  private async ensureInitialized(): Promise<void> {
    if (!this.encryptionKey) {
      await this.initialize();
    }
  }

  private async deriveKeyFromPassword(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive actual encryption key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.keyDerivationSalt,
        iterations: ENCRYPTION_CONFIG.iterations,
        hash: ENCRYPTION_CONFIG.hash
      },
      keyMaterial,
      {
        name: ENCRYPTION_CONFIG.algorithm,
        length: ENCRYPTION_CONFIG.keyLength
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encryptData(data: Uint8Array): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.ivLength));

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ENCRYPTION_CONFIG.algorithm,
        iv: iv
      },
      this.encryptionKey,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  }

  private async decryptData(encryptedData: string): Promise<Uint8Array> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, ENCRYPTION_CONFIG.ivLength);
    const encrypted = combined.slice(ENCRYPTION_CONFIG.ivLength);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ENCRYPTION_CONFIG.algorithm,
        iv: iv
      },
      this.encryptionKey,
      encrypted
    );

    return new Uint8Array(decryptedBuffer);
  }

  private async compressData(data: string): Promise<Uint8Array> {
    // Simple LZ compression (in production, use a proper compression library)
    const encoder = new TextEncoder();
    return encoder.encode(data);
  }

  private async decompressData(data: Uint8Array): Promise<string> {
    // Simple decompression (in production, use a proper compression library)
    const decoder = new TextDecoder();
    return decoder.decode(data);
  }

  private getStorageKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }

  private async checkQuota(key: string, value: any): Promise<void> {
    const quota = await this.getQuota();
    const valueSize = JSON.stringify(value).length;

    // Check if adding this item would exceed quota
    if (!this.metadataCache.has(key)) {
      if (quota.currentKeys >= quota.maxKeys) {
        throw new Error('Storage quota exceeded: too many keys');
      }
    }

    const currentItemSize = this.metadataCache.get(key)?.sizeBytes || 0;
    const newTotalSize = quota.currentSizeBytes - currentItemSize + valueSize;

    if (newTotalSize > quota.maxSizeBytes) {
      throw new Error('Storage quota exceeded: size limit reached');
    }
  }

  private async updateMetadata(
    key: string,
    sizeBytes: number,
    options: StorageOptions
  ): Promise<void> {
    const now = Date.now();
    const existing = this.metadataCache.get(key);

    const metadata: StorageMetadata = {
      pluginId: this.pluginId,
      key,
      encrypted: true,
      sizeBytes,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      accessCount: existing?.accessCount || 0,
      lastAccessedAt: existing?.lastAccessedAt || now,
      expiresAt: options.ttl ? now + options.ttl : undefined,
      tags: options.tags
    };

    this.metadataCache.set(key, metadata);
    await this.saveMetadataCache();
  }

  private async updateAccessMetadata(key: string): Promise<void> {
    const metadata = this.metadataCache.get(key);
    if (metadata) {
      metadata.accessCount++;
      metadata.lastAccessedAt = Date.now();
      await this.saveMetadataCache();
    }
  }

  private loadMetadataCache(): void {
    try {
      const stored = localStorage.getItem(this.getStorageKey('_metadata'));
      if (stored) {
        const metadata = JSON.parse(stored);
        for (const [key, value] of Object.entries(metadata)) {
          this.metadataCache.set(key, value as StorageMetadata);
        }
      }
    } catch (error) {
      console.error('Failed to load metadata cache:', error);
    }
  }

  private async saveMetadataCache(): Promise<void> {
    try {
      const metadata = Object.fromEntries(this.metadataCache);
      localStorage.setItem(this.getStorageKey('_metadata'), JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save metadata cache:', error);
    }
  }

  private async createBackup(key: string, storageEntry: any): Promise<void> {
    try {
      const backupKey = `${this.getStorageKey(key)}_backup`;
      const backup = {
        ...storageEntry,
        backedUpAt: Date.now()
      };
      localStorage.setItem(backupKey, JSON.stringify(backup));
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  }

  private setupCleanupInterval(): void {
    // Clean up expired items every 5 minutes
    setInterval(
      () => {
        this.cleanupExpiredItems();
      },
      5 * 60 * 1000
    );
  }

  private async cleanupExpiredItems(): Promise<void> {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const [key, metadata] of this.metadataCache) {
      if (metadata.expiresAt && now > metadata.expiresAt) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      await this.removeItem(key);
    }
  }
}

// Factory function for creating encrypted storage instances
export function createEncryptedStorage(
  pluginId: string,
  password?: string
): EncryptedPluginStorage {
  const storage = new EncryptedPluginStorage({ pluginId });

  if (password) {
    storage.initialize(password);
  }

  return storage;
}

// Global storage manager for multiple plugins
export class GlobalStorageManager {
  private storageInstances: Map<string, EncryptedPluginStorage> = new Map();

  getPluginStorage(pluginId: string, password?: string): EncryptedPluginStorage {
    if (!this.storageInstances.has(pluginId)) {
      const storage = createEncryptedStorage(pluginId, password);
      this.storageInstances.set(pluginId, storage);
    }

    return this.storageInstances.get(pluginId)!;
  }

  async clearPluginStorage(pluginId: string): Promise<void> {
    const storage = this.storageInstances.get(pluginId);
    if (storage) {
      await storage.clear();
      this.storageInstances.delete(pluginId);
    }
  }

  async getGlobalQuota(): Promise<{ [pluginId: string]: StorageQuota }> {
    const quotas: { [pluginId: string]: StorageQuota } = {};

    for (const [pluginId, storage] of this.storageInstances) {
      quotas[pluginId] = await storage.getQuota();
    }

    return quotas;
  }
}

// Global instance
let globalStorageManager: GlobalStorageManager | null = null;

export function getGlobalStorageManager(): GlobalStorageManager {
  if (!globalStorageManager) {
    globalStorageManager = new GlobalStorageManager();
  }
  return globalStorageManager;
}
