const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { withRetry, isRetryableError } = require('./retry');

class ModelDownloader {
  constructor(options = {}) {
    this.downloadDir = options.downloadDir || './models';
    this.chunkSize = options.chunkSize || 1024 * 1024;
    this.maxRetries = options.maxRetries || 3;
    this.checksumAlgorithm = options.checksumAlgorithm || 'sha256';
  }

  async downloadWithIntegrity(url, filename, expectedChecksum, options = {}) {
    const filePath = path.join(this.downloadDir, filename);
    const tempPath = `${filePath}.tmp`;
    
    try {
      await this.ensureDirectoryExists(this.downloadDir);
      
      if (await this.verifyExistingFile(filePath, expectedChecksum)) {
        console.log(`File ${filename} already exists and is valid`);
        return filePath;
      }
      
      const downloadResult = await withRetry(async () => {
        return await this.downloadFile(url, tempPath, options);
      }, {
        maxRetries: this.maxRetries,
        retryCondition: (error) => {
          return isRetryableError(error) || error.code === 'PARTIAL_DOWNLOAD';
        }
      });
      
      const actualChecksum = await this.calculateChecksum(tempPath);
      
      if (expectedChecksum && actualChecksum !== expectedChecksum) {
        await fs.promises.unlink(tempPath).catch(() => {});
        throw new Error(`Checksum mismatch. Expected: ${expectedChecksum}, Got: ${actualChecksum}`);
      }
      
      await fs.promises.rename(tempPath, filePath);
      
      return {
        path: filePath,
        size: downloadResult.size,
        checksum: actualChecksum,
        downloadTime: downloadResult.downloadTime
      };
      
    } catch (error) {
      await fs.promises.unlink(tempPath).catch(() => {});
      throw error;
    }
  }
  
  async downloadFile(url, filePath, options = {}) {
    const startTime = Date.now();
    let resumePosition = 0;
    
    if (await this.fileExists(filePath)) {
      const stats = await fs.promises.stat(filePath);
      resumePosition = stats.size;
    }
    
    const headers = {};
    if (resumePosition > 0) {
      headers['Range'] = `bytes=${resumePosition}-`;
    }
    
    const response = await fetch(url, {
      headers,
      timeout: options.timeout || 30000
    });
    
    if (!response.ok && response.status !== 206) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    
    const totalSize = parseInt(response.headers.get('content-length') || '0') + resumePosition;
    const writeStream = fs.createWriteStream(filePath, { flags: resumePosition > 0 ? 'a' : 'w' });
    
    let downloadedSize = resumePosition;
    
    return new Promise((resolve, reject) => {
      response.body.on('data', (chunk) => {
        downloadedSize += chunk.length;
        writeStream.write(chunk);
        
        if (options.onProgress) {
          options.onProgress({
            downloaded: downloadedSize,
            total: totalSize,
            percentage: totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0
          });
        }
      });
      
      response.body.on('end', () => {
        writeStream.end();
        resolve({
          size: downloadedSize,
          downloadTime: Date.now() - startTime
        });
      });
      
      response.body.on('error', (error) => {
        writeStream.destroy();
        reject(error);
      });
      
      writeStream.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  async calculateChecksum(filePath) {
    const hash = crypto.createHash(this.checksumAlgorithm);
    const stream = fs.createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
  
  async verifyExistingFile(filePath, expectedChecksum) {
    if (!await this.fileExists(filePath)) {
      return false;
    }
    
    if (!expectedChecksum) {
      return true;
    }
    
    try {
      const actualChecksum = await this.calculateChecksum(filePath);
      return actualChecksum === expectedChecksum;
    } catch (error) {
      console.warn(`Error verifying file ${filePath}:`, error.message);
      return false;
    }
  }
  
  async fileExists(filePath) {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

module.exports = { ModelDownloader };
