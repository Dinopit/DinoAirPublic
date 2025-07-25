/**
 * Test suite for TelemetryManager
 */

const TelemetryManager = require('../../lib/telemetryManager');
const fs = require('fs').promises;
const path = require('path');

describe('TelemetryManager', () => {
  let telemetryManager;
  let tempDir;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join(__dirname, '..', '..', 'temp', 'test-telemetry-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    telemetryManager = new TelemetryManager({
      enabled: true,
      userConsent: false,
      installPath: tempDir,
      endpoint: 'https://test-telemetry.example.com/events',
      batchSize: 5,
      flushInterval: 1000
    });
  });

  afterEach(async () => {
    await telemetryManager.cleanup();
    
    // Cleanup temp directory
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to cleanup temp dir:', error.message);
    }
  });

  describe('Initialization', () => {
    test('should initialize with default settings', async () => {
      await telemetryManager.initialize();
      
      expect(telemetryManager.anonymousId).toBeTruthy();
      expect(telemetryManager.sessionId).toBeTruthy();
      expect(telemetryManager.eventQueue).toEqual([]);
    });

    test('should create anonymous ID file', async () => {
      await telemetryManager.initialize();
      
      const idFile = path.join(tempDir, '.dinoair', 'telemetry-id');
      const idExists = await fs.access(idFile).then(() => true).catch(() => false);
      
      expect(idExists).toBe(true);
      
      const savedId = await fs.readFile(idFile, 'utf8');
      expect(savedId.trim()).toBe(telemetryManager.anonymousId);
    });

    test('should load existing anonymous ID', async () => {
      const existingId = 'existing-test-id-12345';
      const idFile = path.join(tempDir, '.dinoair', 'telemetry-id');
      
      await fs.mkdir(path.dirname(idFile), { recursive: true });
      await fs.writeFile(idFile, existingId);
      
      await telemetryManager.initialize();
      
      expect(telemetryManager.anonymousId).toBe(existingId);
    });
  });

  describe('User Consent', () => {
    test('should request and save user consent', async () => {
      const mockPrompt = jest.fn().mockResolvedValue({ enableTelemetry: true });
      
      const consent = await telemetryManager.requestUserConsent(mockPrompt);
      
      expect(consent).toBe(true);
      expect(telemetryManager.userConsent).toBe(true);
      
      // Check that consent was saved
      const consentFile = path.join(tempDir, '.dinoair', 'telemetry-consent.json');
      const consentExists = await fs.access(consentFile).then(() => true).catch(() => false);
      expect(consentExists).toBe(true);
    });

    test('should handle user rejection of consent', async () => {
      const mockPrompt = jest.fn().mockResolvedValue({ enableTelemetry: false });
      
      const consent = await telemetryManager.requestUserConsent(mockPrompt);
      
      expect(consent).toBe(false);
      expect(telemetryManager.userConsent).toBe(false);
    });

    test('should load saved consent', async () => {
      const consentData = {
        enabled: true,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
      
      const consentFile = path.join(tempDir, '.dinoair', 'telemetry-consent.json');
      await fs.mkdir(path.dirname(consentFile), { recursive: true });
      await fs.writeFile(consentFile, JSON.stringify(consentData));
      
      await telemetryManager.loadUserConsent();
      
      expect(telemetryManager.userConsent).toBe(true);
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await telemetryManager.initialize();
      telemetryManager.userConsent = true; // Grant consent for testing
    });

    test('should track events with proper structure', async () => {
      await telemetryManager.trackEvent('test_event', { key: 'value' });
      
      expect(telemetryManager.eventQueue).toHaveLength(1);
      
      const event = telemetryManager.eventQueue[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('sessionId');
      expect(event).toHaveProperty('anonymousId');
      expect(event.event).toBe('test_event');
      expect(event.properties.key).toBe('value');
    });

    test('should not track events without consent', async () => {
      telemetryManager.userConsent = false;
      
      await telemetryManager.trackEvent('test_event', { key: 'value' });
      
      expect(telemetryManager.eventQueue).toHaveLength(0);
    });

    test('should auto-flush when batch size is reached', async () => {
      // Mock the sendEvents method to avoid network calls
      telemetryManager.sendEvents = jest.fn().mockResolvedValue();
      
      // Add events up to batch size
      for (let i = 0; i < telemetryManager.batchSize; i++) {
        await telemetryManager.trackEvent(`test_event_${i}`);
      }
      
      expect(telemetryManager.sendEvents).toHaveBeenCalled();
      expect(telemetryManager.eventQueue).toHaveLength(0);
    });

    test('should track installation events', async () => {
      await telemetryManager.trackInstallationStart({
        mode: 'guided',
        hardware: { gpu: 'NVIDIA GTX 1080' },
        modelsCount: 3,
        customPath: true
      });
      
      const event = telemetryManager.eventQueue[0];
      expect(event.event).toBe('installation_started');
      expect(event.properties.installation_mode).toBe('guided');
      expect(event.properties.hardware_detected).toBe(true);
      expect(event.properties.models_count).toBe(3);
      expect(event.properties.custom_path).toBe(true);
    });

    test('should track hardware detection', async () => {
      const hardware = {
        gpu: { vendor: 'NVIDIA', memory: 8 * 1024 * 1024 * 1024 },
        cpu: { cores: 8 },
        memory: 16 * 1024 * 1024 * 1024,
        arch: 'x64',
        recommendedMode: 'full'
      };
      
      await telemetryManager.trackHardwareDetection(hardware);
      
      const event = telemetryManager.eventQueue[0];
      expect(event.event).toBe('hardware_detected');
      expect(event.properties.gpu_vendor).toBe('NVIDIA');
      expect(event.properties.gpu_memory_gb).toBe(8);
      expect(event.properties.cpu_cores).toBe(8);
      expect(event.properties.total_memory_gb).toBe(16);
    });
  });

  describe('Data Privacy', () => {
    test('should sanitize error messages', () => {
      const errorMessage = 'Failed to read C:\\Users\\john\\AppData\\Local\\file.txt';
      const sanitized = telemetryManager.sanitizeErrorMessage(errorMessage);
      
      expect(sanitized).not.toContain('john');
      expect(sanitized).toContain('[PATH]');
    });

    test('should hash sensitive data', () => {
      const sensitive = '/home/user/sensitive/path';
      const hashed = telemetryManager.hashString(sensitive);
      
      expect(hashed).toHaveLength(16);
      expect(hashed).not.toContain('user');
      expect(hashed).not.toContain('sensitive');
    });

    test('should generate unique IDs', () => {
      const id1 = telemetryManager.generateAnonymousId();
      const id2 = telemetryManager.generateAnonymousId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toHaveLength(32); // 16 bytes * 2 hex chars
      expect(id2).toHaveLength(32);
    });
  });

  describe('Configuration Management', () => {
    test('should disable telemetry completely', async () => {
      await telemetryManager.initialize();
      telemetryManager.userConsent = true;
      
      await telemetryManager.disable();
      
      expect(telemetryManager.enabled).toBe(false);
      expect(telemetryManager.userConsent).toBe(false);
      expect(telemetryManager.eventQueue).toHaveLength(0);
    });

    test('should handle periodic flush', async () => {
      telemetryManager.sendEvents = jest.fn().mockResolvedValue();
      telemetryManager.userConsent = true;
      
      // Add an event
      await telemetryManager.trackEvent('test_event');
      
      // Start periodic flush with short interval
      telemetryManager.flushInterval = 100;
      telemetryManager.startPeriodicFlush();
      
      // Wait for flush to occur
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(telemetryManager.sendEvents).toHaveBeenCalled();
      
      telemetryManager.stopPeriodicFlush();
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', async () => {
      // Create a telemetry manager with invalid path
      const invalidTelemetry = new TelemetryManager({
        installPath: '/invalid/path/that/does/not/exist/and/cannot/be/created'
      });
      
      // Should not throw error, but should disable telemetry
      await invalidTelemetry.initialize();
      expect(invalidTelemetry.enabled).toBe(false);
    });

    test('should handle network errors during flush', async () => {
      telemetryManager.userConsent = true;
      await telemetryManager.trackEvent('test_event');
      
      // Mock network failure
      telemetryManager.sendEvents = jest.fn().mockRejectedValue(new Error('Network error'));
      
      // Should not throw error
      await expect(telemetryManager.flush()).resolves.toBeUndefined();
    });
  });
});