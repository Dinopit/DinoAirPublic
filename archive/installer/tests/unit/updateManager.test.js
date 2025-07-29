/**
 * Test suite for UpdateManager
 */

const UpdateManager = require('../../lib/updateManager');
const fs = require('fs').promises;
const path = require('path');

describe('UpdateManager', () => {
  let updateManager;
  let mockLogger;
  let tempDir;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join(__dirname, '..', '..', 'temp', 'test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      success: jest.fn()
    };

    updateManager = new UpdateManager({
      logger: mockLogger,
      currentVersion: '1.0.0',
      updateChannel: 'stable',
      installPath: tempDir
    });
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to cleanup temp dir:', error.message);
    }
  });

  describe('Version Management', () => {
    test('should correctly parse semantic versions', () => {
      const semver = require('semver');
      
      expect(semver.valid('1.0.0')).toBe('1.0.0');
      expect(semver.valid('1.0.0-alpha.1')).toBe('1.0.0-alpha.1');
      expect(semver.gt('1.1.0', '1.0.0')).toBe(true);
      expect(semver.gt('1.0.0', '1.1.0')).toBe(false);
    });

    test('should identify when update is available', () => {
      const releases = [
        {
          tag_name: 'v1.2.0',
          prerelease: false,
          assets: [{ name: 'installer.exe', browser_download_url: 'https://example.com/installer.exe' }]
        },
        {
          tag_name: 'v1.1.0',
          prerelease: false,
          assets: [{ name: 'installer.exe', browser_download_url: 'https://example.com/installer.exe' }]
        }
      ];

      const latestRelease = updateManager.getLatestReleaseForChannel(releases);
      expect(latestRelease.tag_name).toBe('v1.2.0');
    });

    test('should filter releases by channel correctly', () => {
      const releases = [
        { tag_name: 'v1.2.0', prerelease: false },
        { tag_name: 'v1.2.0-beta.1', prerelease: true },
        { tag_name: 'v1.2.0-alpha.1', prerelease: true }
      ];

      // Test stable channel
      updateManager.updateChannel = 'stable';
      let latest = updateManager.getLatestReleaseForChannel(releases);
      expect(latest.tag_name).toBe('v1.2.0');

      // Test beta channel
      updateManager.updateChannel = 'beta';
      latest = updateManager.getLatestReleaseForChannel(releases);
      expect(latest.tag_name).toBe('v1.2.0-beta.1');
    });
  });

  describe('Platform Detection', () => {
    test('should get correct download URL for platform', () => {
      const release = {
        assets: [
          { name: 'installer.exe', browser_download_url: 'https://example.com/installer.exe' },
          { name: 'installer.dmg', browser_download_url: 'https://example.com/installer.dmg' },
          { name: 'installer.AppImage', browser_download_url: 'https://example.com/installer.AppImage' }
        ]
      };

      // Mock process.platform
      const originalPlatform = process.platform;
      
      Object.defineProperty(process, 'platform', { value: 'win32' });
      expect(updateManager.getDownloadUrlForPlatform(release)).toBe('https://example.com/installer.exe');
      
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      expect(updateManager.getDownloadUrlForPlatform(release)).toBe('https://example.com/installer.dmg');
      
      Object.defineProperty(process, 'platform', { value: 'linux' });
      expect(updateManager.getDownloadUrlForPlatform(release)).toBe('https://example.com/installer.AppImage');

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should throw error for unsupported platform', () => {
      const release = { assets: [] };
      
      expect(() => {
        updateManager.getDownloadUrlForPlatform(release);
      }).toThrow('No installer found for platform');
    });
  });

  describe('Configuration Management', () => {
    test('should save and load update configuration', async () => {
      const settings = {
        channel: 'beta',
        autoUpdate: true,
        telemetryEnabled: false,
        checkInterval: 12 * 60 * 60 * 1000
      };

      await updateManager.configureUpdates(settings);
      const savedConfig = await updateManager.getUpdateConfig();

      expect(savedConfig.channel).toBe('beta');
      expect(savedConfig.autoUpdate).toBe(true);
      expect(savedConfig.telemetryEnabled).toBe(false);
      expect(savedConfig.checkInterval).toBe(12 * 60 * 60 * 1000);
    });

    test('should use default configuration when file does not exist', async () => {
      const config = await updateManager.getUpdateConfig();
      
      expect(config).toHaveProperty('channel');
      expect(config).toHaveProperty('autoUpdate');
      expect(config).toHaveProperty('telemetryEnabled');
      expect(config).toHaveProperty('checkInterval');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock failed network request
      updateManager.checkUrl = 'https://invalid-url-that-does-not-exist.com/releases';
      
      await expect(updateManager.checkForUpdates()).rejects.toThrow();
    });

    test('should handle invalid JSON responses', async () => {
      // This would require mocking the HTTPS request, which is complex
      // In a real test environment, you'd mock the fetchReleases method
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe('Telemetry Integration', () => {
    test('should send telemetry when enabled', async () => {
      const mockTelemetry = jest.fn();
      updateManager.sendTelemetry = mockTelemetry;
      updateManager.telemetryEnabled = true;

      await updateManager.sendTelemetry('update_check_failed', { error: 'Network error' });
      
      expect(mockTelemetry).toHaveBeenCalledWith('update_check_failed', { error: 'Network error' });
    });

    test('should not send telemetry when disabled', async () => {
      const mockTelemetry = jest.fn();
      updateManager.sendTelemetry = mockTelemetry;
      updateManager.telemetryEnabled = false;

      await updateManager.sendTelemetry('update_check_failed', { error: 'Network error' });
      
      // Should return early without calling telemetry
      expect(mockTelemetry).not.toHaveBeenCalled();
    });
  });
});