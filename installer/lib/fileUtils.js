/**
 * File Utils Module
 * Provides file system operations for the DinoAir CLI installer
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Promisify fs methods for async/await usage
const fsPromises = fs.promises;

class FileUtils {
  constructor(options = {}) {
    this.logger = options.logger || null;
  }

  /**
   * Check if a file or directory exists
   */
  async exists(filePath) {
    try {
      await fsPromises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure a directory exists, create it if it doesn't
   */
  async ensureDirectory(dirPath) {
    try {
      await fsPromises.mkdir(dirPath, { recursive: true });
      if (this.logger) {
        this.logger.debug(`Directory created/verified: ${dirPath}`);
      }
      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to create directory ${dirPath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Copy a single file
   */
  async copyFile(sourcePath, destPath, options = {}) {
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      await this.ensureDirectory(destDir);

      // Copy the file
      await fsPromises.copyFile(sourcePath, destPath);
      
      // Set permissions if specified
      if (options.mode) {
        await fsPromises.chmod(destPath, options.mode);
      }

      if (this.logger) {
        this.logger.debug(`File copied: ${sourcePath} → ${destPath}`);
      }
      
      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to copy file ${sourcePath} to ${destPath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Copy a directory recursively
   */
  async copyDirectory(sourceDir, destDir, options = {}) {
    const { 
      filter = () => true, 
      overwrite = true,
      preserveTimestamps = false,
      _visited = new Set(),
      _depth = 0,
      maxDepth = 100
    } = options;

    try {
      // Prevent infinite recursion with depth limit
      if (_depth > maxDepth) {
        throw new Error(`Maximum recursion depth exceeded (${maxDepth})`);
      }

      // Prevent circular references
      const sourceRealPath = await fsPromises.realpath(sourceDir);
      if (_visited.has(sourceRealPath)) {
        if (this.logger) {
          this.logger.debug(`Skipping circular reference: ${sourceDir}`);
        }
        return true;
      }
      _visited.add(sourceRealPath);

      // Ensure source directory exists
      if (!(await this.exists(sourceDir))) {
        throw new Error(`Source directory does not exist: ${sourceDir}`);
      }

      // Ensure destination directory exists
      await this.ensureDirectory(destDir);

      // Get list of items in source directory
      const items = await fsPromises.readdir(sourceDir);

      for (const item of items) {
        const sourcePath = path.join(sourceDir, item);
        const destPath = path.join(destDir, item);

        // Apply filter
        if (!filter(sourcePath, destPath)) {
          continue;
        }

        const stats = await fsPromises.stat(sourcePath);

        if (stats.isDirectory()) {
          // Recursively copy subdirectory with updated options
          const recursiveOptions = {
            ...options,
            _visited,
            _depth: _depth + 1
          };
          await this.copyDirectory(sourcePath, destPath, recursiveOptions);
        } else if (stats.isFile()) {
          // Check if destination exists and overwrite setting
          if (!overwrite && (await this.exists(destPath))) {
            if (this.logger) {
              this.logger.debug(`Skipping existing file: ${destPath}`);
            }
            continue;
          }

          // Copy file
          await this.copyFile(sourcePath, destPath);

          // Preserve timestamps if requested
          if (preserveTimestamps) {
            await fsPromises.utimes(destPath, stats.atime, stats.mtime);
          }
        }
      }

      // Remove from visited set when done with this directory
      _visited.delete(sourceRealPath);

      if (this.logger) {
        this.logger.debug(`Directory copied: ${sourceDir} → ${destDir}`);
      }

      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to copy directory ${sourceDir} to ${destDir}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Move/rename a file or directory
   */
  async move(sourcePath, destPath) {
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      await this.ensureDirectory(destDir);

      await fsPromises.rename(sourcePath, destPath);
      
      if (this.logger) {
        this.logger.debug(`Moved: ${sourcePath} → ${destPath}`);
      }
      
      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to move ${sourcePath} to ${destPath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath) {
    try {
      await fsPromises.unlink(filePath);
      
      if (this.logger) {
        this.logger.debug(`File deleted: ${filePath}`);
      }
      
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, consider it successful
        return true;
      }
      
      if (this.logger) {
        this.logger.error(`Failed to delete file ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a directory recursively
   */
  async deleteDirectory(dirPath) {
    try {
      await fsPromises.rm(dirPath, { recursive: true, force: true });
      
      if (this.logger) {
        this.logger.debug(`Directory deleted: ${dirPath}`);
      }
      
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Directory doesn't exist, consider it successful
        return true;
      }
      
      if (this.logger) {
        this.logger.error(`Failed to delete directory ${dirPath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Read a file as text
   */
  async readFile(filePath, encoding = 'utf8') {
    try {
      const content = await fsPromises.readFile(filePath, encoding);
      
      if (this.logger) {
        this.logger.debug(`File read: ${filePath}`);
      }
      
      return content;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to read file ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Write content to a file
   */
  async writeFile(filePath, content, options = {}) {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await this.ensureDirectory(dir);

      await fsPromises.writeFile(filePath, content, options);
      
      if (this.logger) {
        this.logger.debug(`File written: ${filePath}`);
      }
      
      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to write file ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Append content to a file
   */
  async appendFile(filePath, content, options = {}) {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await this.ensureDirectory(dir);

      await fsPromises.appendFile(filePath, content, options);
      
      if (this.logger) {
        this.logger.debug(`Content appended to file: ${filePath}`);
      }
      
      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to append to file ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get file/directory stats
   */
  async getStats(filePath) {
    try {
      const stats = await fsPromises.stat(filePath);
      
      return {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        mode: stats.mode
      };
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to get stats for ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath, options = {}) {
    const { recursive = false, includeStats = false } = options;

    try {
      const items = await fsPromises.readdir(dirPath);
      const results = [];

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const result = { name: item, path: itemPath };

        if (includeStats) {
          result.stats = await this.getStats(itemPath);
        }

        results.push(result);

        // Recursively list subdirectories if requested
        if (recursive && includeStats && result.stats.isDirectory) {
          const subItems = await this.listDirectory(itemPath, options);
          results.push(...subItems);
        }
      }

      return results;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to list directory ${dirPath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Find files matching a pattern
   */
  async findFiles(dirPath, pattern, options = {}) {
    const { recursive = true, caseSensitive = false } = options;
    const results = [];

    try {
      const items = await this.listDirectory(dirPath, { includeStats: true });

      for (const item of items) {
        if (item.stats.isFile()) {
          const fileName = caseSensitive ? item.name : item.name.toLowerCase();
          const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

          if (fileName.includes(searchPattern)) {
            results.push(item.path);
          }
        } else if (item.stats.isDirectory() && recursive) {
          const subResults = await this.findFiles(item.path, pattern, options);
          results.push(...subResults);
        }
      }

      return results;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to find files in ${dirPath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get directory size recursively
   */
  async getDirectorySize(dirPath) {
    let totalSize = 0;

    try {
      const items = await this.listDirectory(dirPath, { includeStats: true });

      for (const item of items) {
        if (item.stats.isFile()) {
          totalSize += item.stats.size;
        } else if (item.stats.isDirectory()) {
          totalSize += await this.getDirectorySize(item.path);
        }
      }

      return totalSize;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to get directory size for ${dirPath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create a temporary directory
   */
  async createTempDirectory(prefix = 'dinoair-') {
    try {
      const tempDir = await fsPromises.mkdtemp(path.join(require('os').tmpdir(), prefix));
      
      if (this.logger) {
        this.logger.debug(`Temporary directory created: ${tempDir}`);
      }
      
      return tempDir;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to create temporary directory: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Set file permissions
   */
  async setPermissions(filePath, mode) {
    try {
      await fsPromises.chmod(filePath, mode);
      
      if (this.logger) {
        this.logger.debug(`Permissions set for ${filePath}: ${mode.toString(8)}`);
      }
      
      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to set permissions for ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create a symbolic link
   */
  async createSymlink(target, linkPath) {
    try {
      // Ensure directory exists
      const dir = path.dirname(linkPath);
      await this.ensureDirectory(dir);

      await fsPromises.symlink(target, linkPath);
      
      if (this.logger) {
        this.logger.debug(`Symlink created: ${linkPath} → ${target}`);
      }
      
      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to create symlink ${linkPath} → ${target}: ${error.message}`);
      }
      throw error;
    }
  }
}

module.exports = FileUtils;