/**
 * Database Backup and Recovery Scripts for DinoAir
 * Provides automated backup, verification, and recovery procedures
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { dbPool } = require('../lib/db-pool');
require('dotenv').config();

/**
 * Backup Configuration
 */
const BACKUP_CONFIG = {
  backupDir: process.env.DB_BACKUP_DIR || path.join(__dirname, '..', 'backups'),
  retentionDays: parseInt(process.env.DB_BACKUP_RETENTION_DAYS) || 7,
  compressionLevel: parseInt(process.env.DB_BACKUP_COMPRESSION) || 6,
  maxBackupSize: parseInt(process.env.DB_MAX_BACKUP_SIZE) || 1024 * 1024 * 1024, // 1GB
  verifyBackups: process.env.DB_VERIFY_BACKUPS !== 'false',
  encryptBackups: process.env.DB_ENCRYPT_BACKUPS === 'true',
  encryptionKey: process.env.DB_BACKUP_ENCRYPTION_KEY,
  s3Bucket: process.env.DB_BACKUP_S3_BUCKET,
  s3Region: process.env.DB_BACKUP_S3_REGION || 'us-east-1'
};

/**
 * Database Backup Manager
 */
class DatabaseBackupManager {
  constructor() {
    this.backupDir = BACKUP_CONFIG.backupDir;
    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`Backup directory ensured: ${this.backupDir}`);
    } catch (error) {
      console.error('Failed to create backup directory:', error);
      throw error;
    }
  }

  /**
   * Generate backup filename with timestamp
   * @param {string} type - Backup type (full, schema, data)
   * @returns {string} Backup filename
   */
  generateBackupFilename(type = 'full') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const environment = process.env.NODE_ENV || 'development';
    return `dinoair-${environment}-${type}-${timestamp}.sql`;
  }

  /**
   * Create database backup using pg_dump
   * @param {Object} options - Backup options
   * @returns {Promise<Object>} Backup result
   */
  async createBackup(options = {}) {
    const {
      type = 'full',
      compress = true,
      includeData = true,
      includeSchema = true,
      tables = null
    } = options;

    const startTime = Date.now();
    const filename = this.generateBackupFilename(type);
    const backupPath = path.join(this.backupDir, filename);
    
    console.log(`Starting ${type} backup: ${filename}`);

    try {
      // Build pg_dump command
      const pgDumpArgs = this.buildPgDumpArgs({
        backupPath,
        type,
        compress,
        includeData,
        includeSchema,
        tables
      });

      // Execute pg_dump
      const backupResult = await this.executePgDump(pgDumpArgs);
      
      // Get backup file stats
      const stats = await fs.stat(backupPath);
      const duration = Date.now() - startTime;

      // Verify backup if enabled
      let verification = null;
      if (BACKUP_CONFIG.verifyBackups) {
        verification = await this.verifyBackup(backupPath);
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(backupPath);

      // Encrypt backup if enabled
      let encryptedPath = null;
      if (BACKUP_CONFIG.encryptBackups && BACKUP_CONFIG.encryptionKey) {
        encryptedPath = await this.encryptBackup(backupPath);
      }

      const backupInfo = {
        filename,
        path: backupPath,
        encryptedPath,
        type,
        size: stats.size,
        sizeHuman: this.formatBytes(stats.size),
        duration,
        checksum,
        verification,
        createdAt: new Date().toISOString(),
        pgDumpVersion: backupResult.version,
        compressed: compress,
        includeData,
        includeSchema,
        tables: tables || 'all'
      };

      // Save backup metadata
      await this.saveBackupMetadata(backupInfo);

      // Upload to S3 if configured
      if (BACKUP_CONFIG.s3Bucket) {
        await this.uploadToS3(backupInfo);
      }

      console.log(`Backup completed successfully: ${filename} (${this.formatBytes(stats.size)}, ${duration}ms)`);
      return backupInfo;

    } catch (error) {
      console.error('Backup failed:', error);
      
      // Clean up failed backup file
      try {
        await fs.unlink(backupPath);
      } catch (cleanupError) {
        console.error('Failed to clean up backup file:', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * Build pg_dump arguments
   * @param {Object} options - Dump options
   * @returns {Array} pg_dump arguments
   */
  buildPgDumpArgs(options) {
    const {
      backupPath,
      type,
      compress,
      includeData,
      includeSchema,
      tables
    } = options;

    const args = [
      '--verbose',
      '--no-password',
      '--format=custom'
    ];

    // Add compression
    if (compress) {
      args.push(`--compress=${BACKUP_CONFIG.compressionLevel}`);
    }

    // Schema and data options
    if (!includeData) {
      args.push('--schema-only');
    } else if (!includeSchema) {
      args.push('--data-only');
    }

    // Specific tables
    if (tables && Array.isArray(tables)) {
      tables.forEach(table => {
        args.push('--table', table);
      });
    }

    // Output file
    args.push('--file', backupPath);

    // Database connection
    const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_TRANSACTION_URL;
    if (dbUrl) {
      args.push(dbUrl);
    } else {
      // Individual connection parameters
      args.push(
        '--host', process.env.SUPABASE_DB_HOST || 'localhost',
        '--port', process.env.SUPABASE_DB_PORT || '5432',
        '--username', process.env.SUPABASE_DB_USER || 'postgres',
        '--dbname', process.env.SUPABASE_DB_NAME || 'postgres'
      );
    }

    return args;
  }

  /**
   * Execute pg_dump command
   * @param {Array} args - pg_dump arguments
   * @returns {Promise<Object>} Execution result
   */
  async executePgDump(args) {
    return new Promise((resolve, reject) => {
      const pgDump = spawn('pg_dump', args, {
        env: {
          ...process.env,
          PGPASSWORD: process.env.SUPABASE_DB_PASSWORD
        }
      });

      let stdout = '';
      let stderr = '';
      let version = null;

      pgDump.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pgDump.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        // Extract pg_dump version
        const versionMatch = output.match(/pg_dump \(PostgreSQL\) ([\d.]+)/);
        if (versionMatch) {
          version = versionMatch[1];
        }
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, version, exitCode: code });
        } else {
          reject(new Error(`pg_dump failed with exit code ${code}: ${stderr}`));
        }
      });

      pgDump.on('error', (error) => {
        reject(new Error(`Failed to start pg_dump: ${error.message}`));
      });
    });
  }

  /**
   * Verify backup integrity
   * @param {string} backupPath - Path to backup file
   * @returns {Promise<Object>} Verification result
   */
  async verifyBackup(backupPath) {
    const startTime = Date.now();
    
    try {
      // Use pg_restore to verify the backup
      const verifyResult = await this.executePgRestore([
        '--list',
        '--verbose',
        backupPath
      ]);

      const duration = Date.now() - startTime;
      
      // Parse the output to count objects
      const lines = verifyResult.stderr.split('\n');
      const objectCount = lines.filter(line => 
        line.includes('TABLE') || 
        line.includes('INDEX') || 
        line.includes('CONSTRAINT') ||
        line.includes('SEQUENCE')
      ).length;

      return {
        valid: true,
        duration,
        objectCount,
        verifiedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Backup verification failed:', error);
      return {
        valid: false,
        error: error.message,
        verifiedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Execute pg_restore command
   * @param {Array} args - pg_restore arguments
   * @returns {Promise<Object>} Execution result
   */
  async executePgRestore(args) {
    return new Promise((resolve, reject) => {
      const pgRestore = spawn('pg_restore', args);

      let stdout = '';
      let stderr = '';

      pgRestore.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pgRestore.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pgRestore.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, exitCode: code });
        } else {
          reject(new Error(`pg_restore failed with exit code ${code}: ${stderr}`));
        }
      });

      pgRestore.on('error', (error) => {
        reject(new Error(`Failed to start pg_restore: ${error.message}`));
      });
    });
  }

  /**
   * Calculate file checksum
   * @param {string} filePath - Path to file
   * @returns {Promise<string>} SHA256 checksum
   */
  async calculateChecksum(filePath) {
    const hash = crypto.createHash('sha256');
    const fileBuffer = await fs.readFile(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  /**
   * Encrypt backup file
   * @param {string} backupPath - Path to backup file
   * @returns {Promise<string>} Path to encrypted file
   */
  async encryptBackup(backupPath) {
    if (!BACKUP_CONFIG.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const encryptedPath = `${backupPath}.enc`;
    const cipher = crypto.createCipher('aes-256-cbc', BACKUP_CONFIG.encryptionKey);
    
    const input = await fs.readFile(backupPath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    
    await fs.writeFile(encryptedPath, encrypted);
    
    console.log(`Backup encrypted: ${encryptedPath}`);
    return encryptedPath;
  }

  /**
   * Save backup metadata
   * @param {Object} backupInfo - Backup information
   */
  async saveBackupMetadata(backupInfo) {
    const metadataPath = path.join(this.backupDir, `${backupInfo.filename}.meta.json`);
    await fs.writeFile(metadataPath, JSON.stringify(backupInfo, null, 2));
  }

  /**
   * Upload backup to S3 (placeholder - requires AWS SDK)
   * @param {Object} backupInfo - Backup information
   */
  async uploadToS3(backupInfo) {
    console.log(`S3 upload configured but not implemented: ${backupInfo.filename}`);
    // TODO: Implement S3 upload using AWS SDK
  }

  /**
   * Restore database from backup
   * @param {string} backupPath - Path to backup file
   * @param {Object} options - Restore options
   * @returns {Promise<Object>} Restore result
   */
  async restoreFromBackup(backupPath, options = {}) {
    const {
      dropExisting = false,
      createDatabase = false,
      dataOnly = false,
      schemaOnly = false,
      tables = null
    } = options;

    const startTime = Date.now();
    
    console.log(`Starting database restore from: ${backupPath}`);

    try {
      // Verify backup exists and is valid
      await fs.access(backupPath);
      
      // Build pg_restore arguments
      const args = ['--verbose', '--no-password'];
      
      if (dropExisting) {
        args.push('--clean');
      }
      
      if (createDatabase) {
        args.push('--create');
      }
      
      if (dataOnly) {
        args.push('--data-only');
      } else if (schemaOnly) {
        args.push('--schema-only');
      }
      
      if (tables && Array.isArray(tables)) {
        tables.forEach(table => {
          args.push('--table', table);
        });
      }

      // Database connection
      const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_TRANSACTION_URL;
      if (dbUrl) {
        args.push('--dbname', dbUrl);
      } else {
        args.push(
          '--host', process.env.SUPABASE_DB_HOST || 'localhost',
          '--port', process.env.SUPABASE_DB_PORT || '5432',
          '--username', process.env.SUPABASE_DB_USER || 'postgres',
          '--dbname', process.env.SUPABASE_DB_NAME || 'postgres'
        );
      }

      args.push(backupPath);

      // Execute restore
      const restoreResult = await this.executePgRestore(args);
      const duration = Date.now() - startTime;

      console.log(`Database restore completed successfully (${duration}ms)`);
      
      return {
        success: true,
        duration,
        backupPath,
        restoredAt: new Date().toISOString(),
        output: restoreResult.stderr
      };

    } catch (error) {
      console.error('Database restore failed:', error);
      throw error;
    }
  }

  /**
   * List available backups
   * @returns {Promise<Array>} List of backup files with metadata
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.sql') || file.endsWith('.sql.enc')) {
          const filePath = path.join(this.backupDir, file);
          const metadataPath = path.join(this.backupDir, `${file}.meta.json`);
          
          let metadata = null;
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            metadata = JSON.parse(metadataContent);
          } catch (error) {
            // Metadata file doesn't exist, create basic info
            const stats = await fs.stat(filePath);
            metadata = {
              filename: file,
              path: filePath,
              size: stats.size,
              sizeHuman: this.formatBytes(stats.size),
              createdAt: stats.birthtime.toISOString(),
              type: 'unknown'
            };
          }

          backups.push(metadata);
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return backups;
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Clean up old backups based on retention policy
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldBackups() {
    const retentionMs = BACKUP_CONFIG.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - retentionMs);
    
    console.log(`Cleaning up backups older than ${BACKUP_CONFIG.retentionDays} days (before ${cutoffDate.toISOString()})`);

    try {
      const backups = await this.listBackups();
      const toDelete = backups.filter(backup => 
        new Date(backup.createdAt) < cutoffDate
      );

      let deletedCount = 0;
      let deletedSize = 0;

      for (const backup of toDelete) {
        try {
          await fs.unlink(backup.path);
          
          // Delete metadata file
          const metadataPath = `${backup.path}.meta.json`;
          try {
            await fs.unlink(metadataPath);
          } catch (error) {
            // Metadata file might not exist
          }

          // Delete encrypted file if exists
          if (backup.encryptedPath) {
            try {
              await fs.unlink(backup.encryptedPath);
            } catch (error) {
              // Encrypted file might not exist
            }
          }

          deletedCount++;
          deletedSize += backup.size;
          console.log(`Deleted old backup: ${backup.filename}`);
        } catch (error) {
          console.error(`Failed to delete backup ${backup.filename}:`, error);
        }
      }

      console.log(`Cleanup completed: ${deletedCount} backups deleted, ${this.formatBytes(deletedSize)} freed`);
      
      return {
        deletedCount,
        deletedSize,
        deletedSizeHuman: this.formatBytes(deletedSize),
        remainingBackups: backups.length - deletedCount
      };

    } catch (error) {
      console.error('Backup cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Schedule automatic backups
   * @param {string} schedule - Cron-like schedule (simplified)
   */
  scheduleBackups(schedule = 'daily') {
    let interval;
    
    switch (schedule) {
      case 'hourly':
        interval = 60 * 60 * 1000; // 1 hour
        break;
      case 'daily':
        interval = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'weekly':
        interval = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      default:
        interval = 24 * 60 * 60 * 1000; // Default to daily
    }

    console.log(`Scheduling automatic backups every ${schedule} (${interval}ms)`);
    
    setInterval(async () => {
      try {
        console.log('Starting scheduled backup...');
        await this.createBackup({ type: 'scheduled' });
        await this.cleanupOldBackups();
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, interval);
  }
}

// Create singleton instance
const backupManager = new DatabaseBackupManager();

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const options = process.argv.slice(3);

  switch (command) {
    case 'backup':
      backupManager.createBackup()
        .then(result => {
          console.log('Backup completed:', result.filename);
          process.exit(0);
        })
        .catch(error => {
          console.error('Backup failed:', error);
          process.exit(1);
        });
      break;

    case 'restore':
      const backupPath = options[0];
      if (!backupPath) {
        console.error('Usage: node database-backup.js restore <backup-path>');
        process.exit(1);
      }
      
      backupManager.restoreFromBackup(backupPath)
        .then(result => {
          console.log('Restore completed successfully');
          process.exit(0);
        })
        .catch(error => {
          console.error('Restore failed:', error);
          process.exit(1);
        });
      break;

    case 'list':
      backupManager.listBackups()
        .then(backups => {
          console.log(`Found ${backups.length} backups:`);
          backups.forEach(backup => {
            console.log(`  ${backup.filename} (${backup.sizeHuman}) - ${backup.createdAt}`);
          });
          process.exit(0);
        })
        .catch(error => {
          console.error('Failed to list backups:', error);
          process.exit(1);
        });
      break;

    case 'cleanup':
      backupManager.cleanupOldBackups()
        .then(result => {
          console.log(`Cleanup completed: ${result.deletedCount} backups deleted`);
          process.exit(0);
        })
        .catch(error => {
          console.error('Cleanup failed:', error);
          process.exit(1);
        });
      break;

    default:
      console.log('Usage: node database-backup.js <command> [options]');
      console.log('Commands:');
      console.log('  backup   - Create a new backup');
      console.log('  restore  - Restore from backup file');
      console.log('  list     - List available backups');
      console.log('  cleanup  - Clean up old backups');
      process.exit(1);
  }
}

module.exports = {
  DatabaseBackupManager,
  backupManager
};