/**
 * Unit Tests for FileUtils Module
 */

const FileUtils = require('../../lib/fileUtils');
const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    copyFile: jest.fn(),
    chmod: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
    rm: jest.fn(),
    utimes: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    appendFile: jest.fn(),
    realpath: jest.fn(),
    mkdtemp: jest.fn(),
    symlink: jest.fn()
  }
}));

// Mock path module methods we might need
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  dirname: jest.fn(),
  join: jest.fn()
}));

// Mock os module for createTempDirectory
jest.mock('os', () => ({
  tmpdir: jest.fn()
}));

describe('FileUtils', () => {
  let fileUtils;
  let mockLogger;
  let fsPromises;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock logger
    mockLogger = testUtils.createMockLogger();
    
    // Create FileUtils instance
    fileUtils = new FileUtils({ logger: mockLogger });
    
    // Get reference to mocked fs.promises
    fsPromises = fs.promises;
    
    // Setup default path mocks
    path.dirname.mockImplementation(jest.requireActual('path').dirname);
    path.join.mockImplementation(jest.requireActual('path').join);
    
    // Setup default realpath mock (returns the input path as-is for most tests)
    fsPromises.realpath.mockImplementation((inputPath) => Promise.resolve(inputPath));
  });

  describe('Constructor', () => {
    it('should create FileUtils with default options', () => {
      const defaultFileUtils = new FileUtils();
      expect(defaultFileUtils.logger).toBeNull();
    });

    it('should create FileUtils with custom logger', () => {
      const customFileUtils = new FileUtils({ logger: mockLogger });
      expect(customFileUtils.logger).toBe(mockLogger);
    });
  });

  describe('exists', () => {
    it('should return true when file exists', async () => {
      fsPromises.access.mockResolvedValue();
      
      const result = await fileUtils.exists('/test/path');
      
      expect(result).toBe(true);
      expect(fsPromises.access).toHaveBeenCalledWith('/test/path');
    });

    it('should return false when file does not exist', async () => {
      fsPromises.access.mockRejectedValue(new Error('ENOENT'));
      
      const result = await fileUtils.exists('/nonexistent/path');
      
      expect(result).toBe(false);
      expect(fsPromises.access).toHaveBeenCalledWith('/nonexistent/path');
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory successfully', async () => {
      fsPromises.mkdir.mockResolvedValue();
      
      const result = await fileUtils.ensureDirectory('/test/dir');
      
      expect(result).toBe(true);
      expect(fsPromises.mkdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
      expect(mockLogger.debug).toHaveBeenCalledWith('Directory created/verified: /test/dir');
    });

    it('should handle directory creation error', async () => {
      const error = new Error('Permission denied');
      fsPromises.mkdir.mockRejectedValue(error);
      
      await expect(fileUtils.ensureDirectory('/test/dir')).rejects.toThrow('Permission denied');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create directory /test/dir: Permission denied');
    });

    it('should work without logger', async () => {
      const fileUtilsNoLogger = new FileUtils();
      fsPromises.mkdir.mockResolvedValue();
      
      const result = await fileUtilsNoLogger.ensureDirectory('/test/dir');
      
      expect(result).toBe(true);
      expect(fsPromises.mkdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
    });
  });

  describe('copyFile', () => {
    beforeEach(() => {
      path.dirname.mockReturnValue('/dest');
    });

    it('should copy file successfully', async () => {
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.copyFile.mockResolvedValue();
      
      const result = await fileUtils.copyFile('/source/file.txt', '/dest/file.txt');
      
      expect(result).toBe(true);
      expect(fsPromises.mkdir).toHaveBeenCalledWith('/dest', { recursive: true });
      expect(fsPromises.copyFile).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt');
      expect(mockLogger.debug).toHaveBeenCalledWith('File copied: /source/file.txt → /dest/file.txt');
    });

    it('should copy file with permissions', async () => {
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.copyFile.mockResolvedValue();
      fsPromises.chmod.mockResolvedValue();
      
      const result = await fileUtils.copyFile('/source/file.txt', '/dest/file.txt', { mode: 0o755 });
      
      expect(result).toBe(true);
      expect(fsPromises.copyFile).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt');
      expect(fsPromises.chmod).toHaveBeenCalledWith('/dest/file.txt', 0o755);
    });

    it('should handle copy error', async () => {
      fsPromises.mkdir.mockResolvedValue();
      const error = new Error('Copy failed');
      fsPromises.copyFile.mockRejectedValue(error);
      
      await expect(fileUtils.copyFile('/source/file.txt', '/dest/file.txt')).rejects.toThrow('Copy failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to copy file /source/file.txt to /dest/file.txt: Copy failed');
    });
  });

  describe('copyDirectory', () => {
    beforeEach(() => {
      path.join.mockImplementation((a, b) => `${a}/${b}`);
    });

    it('should copy directory successfully', async () => {
      fsPromises.access.mockResolvedValue(); // Source exists
      fsPromises.mkdir.mockResolvedValue(); // Destination created
      fsPromises.readdir.mockResolvedValue(['file1.txt', 'file2.txt']);
      fsPromises.stat.mockImplementation((filePath) => {
        return Promise.resolve({
          isDirectory: () => false,
          isFile: () => true,
          atime: new Date(),
          mtime: new Date()
        });
      });
      fsPromises.copyFile.mockResolvedValue();
      
      const result = await fileUtils.copyDirectory('/source', '/dest');
      
      expect(result).toBe(true);
      expect(fsPromises.readdir).toHaveBeenCalledWith('/source');
      expect(fsPromises.copyFile).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledWith('Directory copied: /source → /dest');
    });

    it('should handle source directory not existing', async () => {
      fsPromises.access.mockRejectedValue(new Error('ENOENT'));
      
      await expect(fileUtils.copyDirectory('/nonexistent', '/dest')).rejects.toThrow('Source directory does not exist: /nonexistent');
    });

    it('should copy nested directories recursively', async () => {
      fsPromises.access.mockResolvedValue();
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.readdir.mockImplementation((dirPath) => {
        if (dirPath === '/source') {
          return Promise.resolve(['subdir', 'file.txt']);
        }
        if (dirPath === '/source/subdir') {
          return Promise.resolve(['nested.txt']);
        }
        return Promise.resolve([]);
      });
      fsPromises.stat.mockImplementation((filePath) => {
        if (filePath === '/source/subdir') {
          return Promise.resolve({
            isDirectory: () => true,
            isFile: () => false
          });
        }
        return Promise.resolve({
          isDirectory: () => false,
          isFile: () => true,
          atime: new Date(),
          mtime: new Date()
        });
      });
      fsPromises.copyFile.mockResolvedValue();
      
      const result = await fileUtils.copyDirectory('/source', '/dest');
      
      expect(result).toBe(true);
      expect(fsPromises.readdir).toHaveBeenCalledWith('/source');
      expect(fsPromises.readdir).toHaveBeenCalledWith('/source/subdir');
    });

    it('should apply filter function', async () => {
      fsPromises.access.mockResolvedValue();
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.readdir.mockResolvedValue(['file1.txt', 'file2.log']);
      fsPromises.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        atime: new Date(),
        mtime: new Date()
      });
      fsPromises.copyFile.mockResolvedValue();
      
      const filter = (src, dest) => src.endsWith('.txt');
      const result = await fileUtils.copyDirectory('/source', '/dest', { filter });
      
      expect(result).toBe(true);
      expect(fsPromises.copyFile).toHaveBeenCalledTimes(1);
      expect(fsPromises.copyFile).toHaveBeenCalledWith('/source/file1.txt', '/dest/file1.txt');
    });

    it('should skip existing files when overwrite is false', async () => {
      fsPromises.access.mockImplementation((filePath) => {
        if (filePath === '/dest/file1.txt') {
          return Promise.resolve(); // File exists
        }
        if (filePath === '/source') {
          return Promise.resolve(); // Source exists
        }
        return Promise.reject(new Error('ENOENT'));
      });
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.readdir.mockResolvedValue(['file1.txt']);
      fsPromises.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        atime: new Date(),
        mtime: new Date()
      });
      
      const result = await fileUtils.copyDirectory('/source', '/dest', { overwrite: false });
      
      expect(result).toBe(true);
      expect(fsPromises.copyFile).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Skipping existing file: /dest/file1.txt');
    });

    it('should preserve timestamps when requested', async () => {
      fsPromises.access.mockResolvedValue();
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.readdir.mockResolvedValue(['file1.txt']);
      const testDate = new Date('2023-01-01');
      fsPromises.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        atime: testDate,
        mtime: testDate
      });
      fsPromises.copyFile.mockResolvedValue();
      fsPromises.utimes.mockResolvedValue();
      
      const result = await fileUtils.copyDirectory('/source', '/dest', { preserveTimestamps: true });
      
      expect(result).toBe(true);
      expect(fsPromises.utimes).toHaveBeenCalledWith('/dest/file1.txt', testDate, testDate);
    });

    it('should handle circular references', async () => {
      fsPromises.access.mockResolvedValue();
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.realpath.mockResolvedValue('/real/source');
      fsPromises.readdir.mockResolvedValue([]);
      
      // Create a visited set with the source path already in it
      const visited = new Set(['/real/source']);
      
      const result = await fileUtils.copyDirectory('/source', '/dest', { _visited: visited });
      
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('Skipping circular reference: /source');
    });

    it('should handle maximum recursion depth', async () => {
      fsPromises.access.mockResolvedValue();
      
      await expect(
        fileUtils.copyDirectory('/source', '/dest', { _depth: 101, maxDepth: 100 })
      ).rejects.toThrow('Maximum recursion depth exceeded (100)');
    });
  });

  describe('move', () => {
    beforeEach(() => {
      path.dirname.mockReturnValue('/dest');
    });

    it('should move file successfully', async () => {
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.rename.mockResolvedValue();
      
      const result = await fileUtils.move('/source/file.txt', '/dest/file.txt');
      
      expect(result).toBe(true);
      expect(fsPromises.mkdir).toHaveBeenCalledWith('/dest', { recursive: true });
      expect(fsPromises.rename).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt');
      expect(mockLogger.debug).toHaveBeenCalledWith('Moved: /source/file.txt → /dest/file.txt');
    });

    it('should handle move error', async () => {
      fsPromises.mkdir.mockResolvedValue();
      const error = new Error('Move failed');
      fsPromises.rename.mockRejectedValue(error);
      
      await expect(fileUtils.move('/source/file.txt', '/dest/file.txt')).rejects.toThrow('Move failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to move /source/file.txt to /dest/file.txt: Move failed');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      fsPromises.unlink.mockResolvedValue();
      
      const result = await fileUtils.deleteFile('/test/file.txt');
      
      expect(result).toBe(true);
      expect(fsPromises.unlink).toHaveBeenCalledWith('/test/file.txt');
      expect(mockLogger.debug).toHaveBeenCalledWith('File deleted: /test/file.txt');
    });

    it('should handle file not existing gracefully', async () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fsPromises.unlink.mockRejectedValue(error);
      
      const result = await fileUtils.deleteFile('/nonexistent/file.txt');
      
      expect(result).toBe(true);
      expect(fsPromises.unlink).toHaveBeenCalledWith('/nonexistent/file.txt');
    });

    it('should handle other delete errors', async () => {
      const error = new Error('Permission denied');
      fsPromises.unlink.mockRejectedValue(error);
      
      await expect(fileUtils.deleteFile('/test/file.txt')).rejects.toThrow('Permission denied');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete file /test/file.txt: Permission denied');
    });
  });

  describe('deleteDirectory', () => {
    it('should delete directory successfully', async () => {
      fsPromises.rm.mockResolvedValue();
      
      const result = await fileUtils.deleteDirectory('/test/dir');
      
      expect(result).toBe(true);
      expect(fsPromises.rm).toHaveBeenCalledWith('/test/dir', { recursive: true, force: true });
      expect(mockLogger.debug).toHaveBeenCalledWith('Directory deleted: /test/dir');
    });

    it('should handle directory not existing gracefully', async () => {
      const error = new Error('Directory not found');
      error.code = 'ENOENT';
      fsPromises.rm.mockRejectedValue(error);
      
      const result = await fileUtils.deleteDirectory('/nonexistent/dir');
      
      expect(result).toBe(true);
      expect(fsPromises.rm).toHaveBeenCalledWith('/nonexistent/dir', { recursive: true, force: true });
    });

    it('should handle other delete errors', async () => {
      const error = new Error('Permission denied');
      fsPromises.rm.mockRejectedValue(error);
      
      await expect(fileUtils.deleteDirectory('/test/dir')).rejects.toThrow('Permission denied');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete directory /test/dir: Permission denied');
    });
  });

  describe('readFile', () => {
    it('should read file successfully', async () => {
      const content = 'test file content';
      fsPromises.readFile.mockResolvedValue(content);
      
      const result = await fileUtils.readFile('/test/file.txt');
      
      expect(result).toBe(content);
      expect(fsPromises.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf8');
      expect(mockLogger.debug).toHaveBeenCalledWith('File read: /test/file.txt');
    });

    it('should read file with custom encoding', async () => {
      const content = Buffer.from('binary content');
      fsPromises.readFile.mockResolvedValue(content);
      
      const result = await fileUtils.readFile('/test/file.bin', 'binary');
      
      expect(result).toBe(content);
      expect(fsPromises.readFile).toHaveBeenCalledWith('/test/file.bin', 'binary');
    });

    it('should handle read file error', async () => {
      const error = new Error('Read failed');
      fsPromises.readFile.mockRejectedValue(error);
      
      await expect(fileUtils.readFile('/test/file.txt')).rejects.toThrow('Read failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to read file /test/file.txt: Read failed');
    });
  });

  describe('writeFile', () => {
    beforeEach(() => {
      path.dirname.mockReturnValue('/test');
    });

    it('should write file successfully', async () => {
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.writeFile.mockResolvedValue();
      
      const result = await fileUtils.writeFile('/test/file.txt', 'content');
      
      expect(result).toBe(true);
      expect(fsPromises.mkdir).toHaveBeenCalledWith('/test', { recursive: true });
      expect(fsPromises.writeFile).toHaveBeenCalledWith('/test/file.txt', 'content', {});
      expect(mockLogger.debug).toHaveBeenCalledWith('File written: /test/file.txt');
    });

    it('should write file with options', async () => {
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.writeFile.mockResolvedValue();
      
      const options = { encoding: 'utf8', mode: 0o644 };
      const result = await fileUtils.writeFile('/test/file.txt', 'content', options);
      
      expect(result).toBe(true);
      expect(fsPromises.writeFile).toHaveBeenCalledWith('/test/file.txt', 'content', options);
    });

    it('should handle write file error', async () => {
      fsPromises.mkdir.mockResolvedValue();
      const error = new Error('Write failed');
      fsPromises.writeFile.mockRejectedValue(error);
      
      await expect(fileUtils.writeFile('/test/file.txt', 'content')).rejects.toThrow('Write failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to write file /test/file.txt: Write failed');
    });
  });

  describe('appendFile', () => {
    beforeEach(() => {
      path.dirname.mockReturnValue('/test');
    });

    it('should append to file successfully', async () => {
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.appendFile.mockResolvedValue();
      
      const result = await fileUtils.appendFile('/test/file.txt', 'new content');
      
      expect(result).toBe(true);
      expect(fsPromises.mkdir).toHaveBeenCalledWith('/test', { recursive: true });
      expect(fsPromises.appendFile).toHaveBeenCalledWith('/test/file.txt', 'new content', {});
      expect(mockLogger.debug).toHaveBeenCalledWith('Content appended to file: /test/file.txt');
    });

    it('should append to file with options', async () => {
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.appendFile.mockResolvedValue();
      
      const options = { encoding: 'utf8' };
      const result = await fileUtils.appendFile('/test/file.txt', 'content', options);
      
      expect(result).toBe(true);
      expect(fsPromises.appendFile).toHaveBeenCalledWith('/test/file.txt', 'content', options);
    });

    it('should handle append file error', async () => {
      fsPromises.mkdir.mockResolvedValue();
      const error = new Error('Append failed');
      fsPromises.appendFile.mockRejectedValue(error);
      
      await expect(fileUtils.appendFile('/test/file.txt', 'content')).rejects.toThrow('Append failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to append to file /test/file.txt: Append failed');
    });
  });

  describe('getStats', () => {
    it('should get file stats successfully', async () => {
      const mockStats = {
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
        birthtime: new Date('2023-01-01'),
        mtime: new Date('2023-01-02'),
        atime: new Date('2023-01-03'),
        mode: 0o644
      };
      fsPromises.stat.mockResolvedValue(mockStats);
      
      const result = await fileUtils.getStats('/test/file.txt');
      
      expect(result).toEqual({
        isFile: true,
        isDirectory: false,
        size: 1024,
        created: mockStats.birthtime,
        modified: mockStats.mtime,
        accessed: mockStats.atime,
        mode: 0o644
      });
      expect(fsPromises.stat).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should handle get stats error', async () => {
      const error = new Error('Stat failed');
      fsPromises.stat.mockRejectedValue(error);
      
      await expect(fileUtils.getStats('/test/file.txt')).rejects.toThrow('Stat failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get stats for /test/file.txt: Stat failed');
    });
  });

  describe('listDirectory', () => {
    it('should list directory contents successfully', async () => {
      fsPromises.readdir.mockResolvedValue(['file1.txt', 'file2.txt', 'subdir']);
      path.join.mockImplementation((a, b) => `${a}/${b}`);
      
      const result = await fileUtils.listDirectory('/test/dir');
      
      expect(result).toEqual([
        { name: 'file1.txt', path: '/test/dir/file1.txt' },
        { name: 'file2.txt', path: '/test/dir/file2.txt' },
        { name: 'subdir', path: '/test/dir/subdir' }
      ]);
      expect(fsPromises.readdir).toHaveBeenCalledWith('/test/dir');
    });

    it('should list directory with stats', async () => {
      fsPromises.readdir.mockResolvedValue(['file1.txt']);
      path.join.mockImplementation((a, b) => `${a}/${b}`);
      const mockStats = {
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
        birthtime: new Date('2023-01-01'),
        mtime: new Date('2023-01-02'),
        atime: new Date('2023-01-03'),
        mode: 0o644
      };
      fsPromises.stat.mockResolvedValue(mockStats);
      
      const result = await fileUtils.listDirectory('/test/dir', { includeStats: true });
      
      expect(result).toEqual([{
        name: 'file1.txt',
        path: '/test/dir/file1.txt',
        stats: {
          isFile: true,
          isDirectory: false,
          size: 1024,
          created: mockStats.birthtime,
          modified: mockStats.mtime,
          accessed: mockStats.atime,
          mode: 0o644
        }
      }]);
    });

    it('should list directory recursively', async () => {
      fsPromises.readdir.mockImplementation((dirPath) => {
        if (dirPath === '/test/dir') {
          return Promise.resolve(['file1.txt', 'subdir']);
        }
        if (dirPath === '/test/dir/subdir') {
          return Promise.resolve(['file2.txt']);
        }
        return Promise.resolve([]);
      });
      path.join.mockImplementation((a, b) => `${a}/${b}`);
      fsPromises.stat.mockImplementation((filePath) => {
        if (filePath === '/test/dir/subdir') {
          return Promise.resolve({
            isFile: () => false,
            isDirectory: () => true,
            size: 0,
            birthtime: new Date(),
            mtime: new Date(),
            atime: new Date(),
            mode: 0o755
          });
        }
        return Promise.resolve({
          isFile: () => true,
          isDirectory: () => false,
          size: 1024,
          birthtime: new Date(),
          mtime: new Date(),
          atime: new Date(),
          mode: 0o644
        });
      });
      
      const result = await fileUtils.listDirectory('/test/dir', { recursive: true, includeStats: true });
      
      expect(result.length).toBe(3); // file1.txt, subdir, file2.txt
      expect(result.some(item => item.name === 'file2.txt' && item.path === '/test/dir/subdir/file2.txt')).toBe(true);
    });

    it('should handle list directory error', async () => {
      const error = new Error('List failed');
      fsPromises.readdir.mockRejectedValue(error);
      
      await expect(fileUtils.listDirectory('/test/dir')).rejects.toThrow('List failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to list directory /test/dir: List failed');
    });
  });

  describe('findFiles', () => {
    beforeEach(() => {
      path.join.mockImplementation((a, b) => `${a}/${b}`);
    });

    it('should find files matching pattern', async () => {
      // Mock listDirectory to return items with stats
      jest.spyOn(fileUtils, 'listDirectory').mockResolvedValue([
        {
          name: 'test.txt',
          path: '/test/dir/test.txt',
          stats: {
            isFile: () => true,
            isDirectory: () => false,
            size: 1024,
            created: new Date(),
            modified: new Date(),
            accessed: new Date(),
            mode: 0o644
          }
        },
        {
          name: 'other.log',
          path: '/test/dir/other.log',
          stats: {
            isFile: () => true,
            isDirectory: () => false,
            size: 512,
            created: new Date(),
            modified: new Date(),
            accessed: new Date(),
            mode: 0o644
          }
        },
        {
          name: 'test.js',
          path: '/test/dir/test.js',
          stats: {
            isFile: () => true,
            isDirectory: () => false,
            size: 2048,
            created: new Date(),
            modified: new Date(),
            accessed: new Date(),
            mode: 0o644
          }
        }
      ]);
      
      const result = await fileUtils.findFiles('/test/dir', 'test');
      
      expect(result).toEqual(['/test/dir/test.txt', '/test/dir/test.js']);
    });

    it('should find files case insensitive by default', async () => {
      jest.spyOn(fileUtils, 'listDirectory').mockResolvedValue([
        {
          name: 'TEST.txt',
          path: '/test/dir/TEST.txt',
          stats: {
            isFile: () => true,
            isDirectory: () => false,
            size: 1024,
            created: new Date(),
            modified: new Date(),
            accessed: new Date(),
            mode: 0o644
          }
        },
        {
          name: 'other.log',
          path: '/test/dir/other.log',
          stats: {
            isFile: () => true,
            isDirectory: () => false,
            size: 512,
            created: new Date(),
            modified: new Date(),
            accessed: new Date(),
            mode: 0o644
          }
        }
      ]);
      
      const result = await fileUtils.findFiles('/test/dir', 'test');
      
      expect(result).toEqual(['/test/dir/TEST.txt']);
    });

    it('should find files case sensitive when specified', async () => {
      jest.spyOn(fileUtils, 'listDirectory').mockResolvedValue([
        {
          name: 'TEST.txt',
          path: '/test/dir/TEST.txt',
          stats: {
            isFile: () => true,
            isDirectory: () => false,
            size: 1024,
            created: new Date(),
            modified: new Date(),
            accessed: new Date(),
            mode: 0o644
          }
        },
        {
          name: 'test.txt',
          path: '/test/dir/test.txt',
          stats: {
            isFile: () => true,
            isDirectory: () => false,
            size: 1024,
            created: new Date(),
            modified: new Date(),
            accessed: new Date(),
            mode: 0o644
          }
        }
      ]);
      
      const result = await fileUtils.findFiles('/test/dir', 'test', { caseSensitive: true });
      
      expect(result).toEqual(['/test/dir/test.txt']);
    });

    it('should find files recursively', async () => {
      // Create a spy but restore original implementation for this test
      const originalFindFiles = fileUtils.findFiles.bind(fileUtils);
      
      // Mock listDirectory calls
      jest.spyOn(fileUtils, 'listDirectory').mockImplementation((dirPath) => {
        if (dirPath === '/test/dir') {
          return Promise.resolve([
            {
              name: 'test.txt',
              path: '/test/dir/test.txt',
              stats: {
                isFile: () => true,
                isDirectory: () => false,
                size: 1024,
                created: new Date(),
                modified: new Date(),
                accessed: new Date(),
                mode: 0o644
              }
            },
            {
              name: 'subdir',
              path: '/test/dir/subdir',
              stats: {
                isFile: () => false,
                isDirectory: () => true,
                size: 0,
                created: new Date(),
                modified: new Date(),
                accessed: new Date(),
                mode: 0o755
              }
            }
          ]);
        }
        if (dirPath === '/test/dir/subdir') {
          return Promise.resolve([
            {
              name: 'test.js',
              path: '/test/dir/subdir/test.js',
              stats: {
                isFile: () => true,
                isDirectory: () => false,
                size: 2048,
                created: new Date(),
                modified: new Date(),
                accessed: new Date(),
                mode: 0o644
              }
            }
          ]);
        }
        return Promise.resolve([]);
      });
      
      const result = await fileUtils.findFiles('/test/dir', 'test', { recursive: true });
      
      expect(result).toEqual(['/test/dir/test.txt', '/test/dir/subdir/test.js']);
    });

    it('should handle find files error', async () => {
      const error = new Error('Find failed');
      fsPromises.readdir.mockRejectedValue(error);
      
      await expect(fileUtils.findFiles('/test/dir', 'test')).rejects.toThrow('Find failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to find files in /test/dir: Find failed');
    });
  });

  describe('getDirectorySize', () => {
    beforeEach(() => {
      path.join.mockImplementation((a, b) => `${a}/${b}`);
    });

    it('should calculate directory size successfully', async () => {
      jest.spyOn(fileUtils, 'listDirectory').mockResolvedValue([
        {
          name: 'file1.txt',
          path: '/test/dir/file1.txt',
          stats: {
            isFile: () => true,
            isDirectory: () => false,
            size: 1024,
            created: new Date(),
            modified: new Date(),
            accessed: new Date(),
            mode: 0o644
          }
        },
        {
          name: 'file2.txt',
          path: '/test/dir/file2.txt',
          stats: {
            isFile: () => true,
            isDirectory: () => false,
            size: 2048,
            created: new Date(),
            modified: new Date(),
            accessed: new Date(),
            mode: 0o644
          }
        }
      ]);
      
      const result = await fileUtils.getDirectorySize('/test/dir');
      
      expect(result).toBe(3072); // 1024 + 2048
    });

    it('should calculate directory size recursively', async () => {
      // Mock listDirectory calls for different paths
      jest.spyOn(fileUtils, 'listDirectory').mockImplementation((dirPath) => {
        if (dirPath === '/test/dir') {
          return Promise.resolve([
            {
              name: 'file1.txt',
              path: '/test/dir/file1.txt',
              stats: {
                isFile: () => true,
                isDirectory: () => false,
                size: 1024,
                created: new Date(),
                modified: new Date(),
                accessed: new Date(),
                mode: 0o644
              }
            },
            {
              name: 'subdir',
              path: '/test/dir/subdir',
              stats: {
                isFile: () => false,
                isDirectory: () => true,
                size: 0,
                created: new Date(),
                modified: new Date(),
                accessed: new Date(),
                mode: 0o755
              }
            }
          ]);
        }
        if (dirPath === '/test/dir/subdir') {
          return Promise.resolve([
            {
              name: 'file2.txt',
              path: '/test/dir/subdir/file2.txt',
              stats: {
                isFile: () => true,
                isDirectory: () => false,
                size: 2048,
                created: new Date(),
                modified: new Date(),
                accessed: new Date(),
                mode: 0o644
              }
            }
          ]);
        }
        return Promise.resolve([]);
      });
      
      const result = await fileUtils.getDirectorySize('/test/dir');
      
      expect(result).toBe(3072); // 1024 + 2048
    });

    it('should handle get directory size error', async () => {
      const error = new Error('Size calculation failed');
      fsPromises.readdir.mockRejectedValue(error);
      
      await expect(fileUtils.getDirectorySize('/test/dir')).rejects.toThrow('Size calculation failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get directory size for /test/dir: Size calculation failed');
    });
  });

  describe('createTempDirectory', () => {
    const os = require('os');

    it('should create temporary directory successfully', async () => {
      os.tmpdir.mockReturnValue('/tmp');
      path.join.mockReturnValue('/tmp/dinoair-');
      fsPromises.mkdtemp.mockResolvedValue('/tmp/dinoair-abc123');
      
      const result = await fileUtils.createTempDirectory();
      
      expect(result).toBe('/tmp/dinoair-abc123');
      expect(fsPromises.mkdtemp).toHaveBeenCalledWith('/tmp/dinoair-');
      expect(mockLogger.debug).toHaveBeenCalledWith('Temporary directory created: /tmp/dinoair-abc123');
    });

    it('should create temporary directory with custom prefix', async () => {
      os.tmpdir.mockReturnValue('/tmp');
      path.join.mockReturnValue('/tmp/custom-');
      fsPromises.mkdtemp.mockResolvedValue('/tmp/custom-xyz789');
      
      const result = await fileUtils.createTempDirectory('custom-');
      
      expect(result).toBe('/tmp/custom-xyz789');
      expect(fsPromises.mkdtemp).toHaveBeenCalledWith('/tmp/custom-');
    });

    it('should handle create temp directory error', async () => {
      os.tmpdir.mockReturnValue('/tmp');
      path.join.mockReturnValue('/tmp/dinoair-');
      const error = new Error('Temp creation failed');
      fsPromises.mkdtemp.mockRejectedValue(error);
      
      await expect(fileUtils.createTempDirectory()).rejects.toThrow('Temp creation failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create temporary directory: Temp creation failed');
    });
  });

  describe('setPermissions', () => {
    it('should set file permissions successfully', async () => {
      fsPromises.chmod.mockResolvedValue();
      
      const result = await fileUtils.setPermissions('/test/file.txt', 0o755);
      
      expect(result).toBe(true);
      expect(fsPromises.chmod).toHaveBeenCalledWith('/test/file.txt', 0o755);
      expect(mockLogger.debug).toHaveBeenCalledWith('Permissions set for /test/file.txt: 755');
    });

    it('should handle set permissions error', async () => {
      const error = new Error('Permission change failed');
      fsPromises.chmod.mockRejectedValue(error);
      
      await expect(fileUtils.setPermissions('/test/file.txt', 0o755)).rejects.toThrow('Permission change failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to set permissions for /test/file.txt: Permission change failed');
    });
  });

  describe('createSymlink', () => {
    beforeEach(() => {
      path.dirname.mockReturnValue('/test');
    });

    it('should create symbolic link successfully', async () => {
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.symlink.mockResolvedValue();
      
      const result = await fileUtils.createSymlink('/target/file.txt', '/test/link.txt');
      
      expect(result).toBe(true);
      expect(fsPromises.mkdir).toHaveBeenCalledWith('/test', { recursive: true });
      expect(fsPromises.symlink).toHaveBeenCalledWith('/target/file.txt', '/test/link.txt');
      expect(mockLogger.debug).toHaveBeenCalledWith('Symlink created: /test/link.txt → /target/file.txt');
    });

    it('should handle create symlink error', async () => {
      fsPromises.mkdir.mockResolvedValue();
      const error = new Error('Symlink creation failed');
      fsPromises.symlink.mockRejectedValue(error);
      
      await expect(fileUtils.createSymlink('/target/file.txt', '/test/link.txt')).rejects.toThrow('Symlink creation failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create symlink /test/link.txt → /target/file.txt: Symlink creation failed');
    });
  });

  describe('Error Handling', () => {
    it('should work without logger for all methods', async () => {
      const fileUtilsNoLogger = new FileUtils();
      
      // Test exists
      fsPromises.access.mockResolvedValue();
      await expect(fileUtilsNoLogger.exists('/test')).resolves.toBe(true);
      
      // Test ensureDirectory
      fsPromises.mkdir.mockResolvedValue();
      await expect(fileUtilsNoLogger.ensureDirectory('/test')).resolves.toBe(true);
      
      // Test copyFile
      fsPromises.copyFile.mockResolvedValue();
      path.dirname.mockReturnValue('/dest');
      await expect(fileUtilsNoLogger.copyFile('/src', '/dest')).resolves.toBe(true);
      
      // Test move
      fsPromises.rename.mockResolvedValue();
      await expect(fileUtilsNoLogger.move('/src', '/dest')).resolves.toBe(true);
      
      // Test deleteFile
      fsPromises.unlink.mockResolvedValue();
      await expect(fileUtilsNoLogger.deleteFile('/test')).resolves.toBe(true);
      
      // Test deleteDirectory
      fsPromises.rm.mockResolvedValue();
      await expect(fileUtilsNoLogger.deleteDirectory('/test')).resolves.toBe(true);
    });
  });
});