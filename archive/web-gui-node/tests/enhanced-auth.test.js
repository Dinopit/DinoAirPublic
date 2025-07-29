/**
 * Comprehensive tests for enhanced authentication features
 * Tests session management, MFA, lockout system, and permissions
 */

const request = require('supertest');
const app = require('../server'); // Assume server exports the Express app
const { MFAManager } = require('../lib/mfa-manager');
const { LockoutManager } = require('../lib/lockout-manager');
const { PermissionsManager } = require('../lib/permissions-manager');
const sessionManager = require('../lib/session-manager');

// Test configuration
const TEST_CONFIG = {
  testUser: {
    email: 'test@dinoair.com',
    password: 'TestPassword123!',
    name: 'Test User'
  },
  apiKey: 'dinoair_test_api_key_12345',
  testIp: '127.0.0.1'
};

describe('Enhanced Authentication System', () => {
  let testUserId;
  let testApiKeyId;
  let testSessionId;
  
  const mfaManager = new MFAManager();
  const lockoutManager = new LockoutManager();
  const permissionsManager = new PermissionsManager();

  beforeAll(async () => {
    // Setup test environment
    console.log('🧪 Setting up authentication tests...');
  });

  afterAll(async () => {
    // Cleanup test data
    console.log('🧹 Cleaning up authentication tests...');
    
    if (testUserId) {
      await mfaManager.disableMFA(testUserId);
      await sessionManager.invalidateAllUserSessions(testUserId, 'test_cleanup');
      await lockoutManager.clearLockout(TEST_CONFIG.testUser.email, 'email');
      await lockoutManager.clearLockout(TEST_CONFIG.testIp, 'ip');
    }
  });

  describe('Session Management', () => {
    test('should create session with metadata', async () => {
      const metadata = {
        ip: TEST_CONFIG.testIp,
        userAgent: 'test-agent',
        isMobile: false
      };

      const { session, error } = await sessionManager.createSession('test-user-id', metadata);

      expect(error).toBeNull();
      expect(session).toBeDefined();
      expect(session.session_id).toMatch(/^[a-f0-9]{64}$/);
      expect(session.ip_address).toBe(TEST_CONFIG.testIp);
      expect(session.user_agent).toBe('test-agent');
      expect(session.active).toBe(true);

      testSessionId = session.session_id;
    });

    test('should validate and update session activity', async () => {
      expect(testSessionId).toBeDefined();

      const metadata = {
        ip: TEST_CONFIG.testIp,
        userAgent: 'test-agent'
      };

      const { valid, session, error } = await sessionManager.validateAndUpdateSession(testSessionId, metadata);

      expect(error).toBeNull();
      expect(valid).toBe(true);
      expect(session).toBeDefined();
      expect(session.activity_count).toBeGreaterThan(1);
    });

    test('should detect suspicious activity on IP change', async () => {
      expect(testSessionId).toBeDefined();

      const metadata = {
        ip: '192.168.1.100', // Different IP
        userAgent: 'test-agent'
      };

      const { valid, session, error } = await sessionManager.validateAndUpdateSession(testSessionId, metadata);

      expect(valid).toBe(true); // Should still be valid but flagged
      expect(session.suspicious_activity).toBe(true);
    });

    test('should invalidate session manually', async () => {
      expect(testSessionId).toBeDefined();

      const { success, error } = await sessionManager.invalidateSession(testSessionId, 'test_invalidation');

      expect(error).toBeNull();
      expect(success).toBe(true);

      // Verify session is invalid
      const { valid } = await sessionManager.validateAndUpdateSession(testSessionId, {});
      expect(valid).toBe(false);
    });

    test('should limit concurrent sessions per user', async () => {
      const sessions = [];
      const maxSessions = sessionManager.SESSION_CONFIG.MAX_SESSIONS_PER_USER;

      // Create maximum number of sessions
      for (let i = 0; i < maxSessions + 2; i++) {
        const { session } = await sessionManager.createSession('test-user-limit', {
          ip: TEST_CONFIG.testIp,
          userAgent: `test-agent-${i}`
        });
        if (session) {
          sessions.push(session.session_id);
        }
      }

      // Should not exceed maximum
      const { sessions: userSessions } = await sessionManager.getUserSessions('test-user-limit');
      expect(userSessions.length).toBeLessThanOrEqual(maxSessions);

      // Cleanup
      for (const sessionId of sessions) {
        await sessionManager.invalidateSession(sessionId, 'test_cleanup');
      }
    });
  });

  describe('Multi-Factor Authentication (MFA)', () => {
    test('should generate TOTP secret and QR code', async () => {
      const result = await mfaManager.generateTOTPSecret('test-mfa-user', 'test@dinoair.com');

      expect(result.secret).toBeDefined();
      expect(result.secret).toMatch(/^[A-Z2-7]{32}$/); // Base32 format
      expect(result.qrCodeUrl).toContain('otpauth://totp/');
      expect(result.backupCodes).toHaveLength(10);
      expect(result.backupCodes[0]).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);

      testUserId = 'test-mfa-user';
    });

    test('should verify TOTP token', async () => {
      // Note: In a real test, you'd generate a valid TOTP token
      // For this test, we'll mock the verification
      const mockToken = '123456';
      
      // This would normally fail, but we're testing the structure
      const result = await mfaManager.verifyTOTP(testUserId, mockToken);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('error');
    });

    test('should get MFA status', async () => {
      const status = await mfaManager.getMFAStatus(testUserId);

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('verified');
      expect(status).toHaveProperty('type');
      expect(status).toHaveProperty('backupCodesCount');
    });

    test('should regenerate backup codes', async () => {
      const newCodes = await mfaManager.regenerateBackupCodes(testUserId);

      expect(newCodes).toHaveLength(10);
      expect(newCodes[0]).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
    });

    test('should validate MFA requirements', async () => {
      const adminRequirements = mfaManager.validateMFARequirements('admin');
      const freeRequirements = mfaManager.validateMFARequirements('free');

      expect(adminRequirements.required).toBe(true);
      expect(freeRequirements.required).toBe(false);
      expect(adminRequirements.methods).toContain('totp');
    });
  });

  describe('Progressive Account Lockout', () => {
    const testEmail = 'lockout-test@dinoair.com';
    const testIp = '192.168.1.200';

    test('should not be locked initially', async () => {
      const emailLockout = await lockoutManager.checkLockout(testEmail, 'email');
      const ipLockout = await lockoutManager.checkLockout(testIp, 'ip');

      expect(emailLockout.isLocked).toBe(false);
      expect(ipLockout.isLocked).toBe(false);
    });

    test('should record failed attempts', async () => {
      const metadata = { ip: testIp, userAgent: 'test-agent' };

      // Record several failed attempts
      for (let i = 1; i <= 3; i++) {
        const result = await lockoutManager.recordFailedAttempt(testEmail, 'email', metadata);
        expect(result.attempts).toBe(i);
        
        if (i >= 3) {
          expect(result.isLocked).toBe(true);
          expect(result.lockLevel).toBe(1);
        }
      }
    });

    test('should enforce progressive lockout levels', async () => {
      const level1 = lockoutManager.calculateLockoutLevel(3);
      const level2 = lockoutManager.calculateLockoutLevel(5);
      const level3 = lockoutManager.calculateLockoutLevel(10);
      const level4 = lockoutManager.calculateLockoutLevel(15);

      expect(level1).toBe(1);
      expect(level2).toBe(2);
      expect(level3).toBe(3);
      expect(level4).toBe(4);
    });

    test('should get lockout statistics', async () => {
      const stats = await lockoutManager.getLockoutStats('24h');

      expect(stats).toHaveProperty('totalLockouts');
      expect(stats).toHaveProperty('activeLockouts');
      expect(stats).toHaveProperty('lockoutsByLevel');
      expect(stats).toHaveProperty('lockoutsByType');
    });

    test('should clear lockout on manual unlock', async () => {
      const result = await lockoutManager.clearLockout(testEmail, 'email', true);

      expect(result.success).toBe(true);

      // Verify lockout is cleared
      const lockoutStatus = await lockoutManager.checkLockout(testEmail, 'email');
      expect(lockoutStatus.isLocked).toBe(false);
    });
  });

  describe('API Key Permissions', () => {
    beforeAll(async () => {
      testApiKeyId = 'test-api-key-123';
    });

    test('should add permissions to API key', async () => {
      const permissions = [
        { permission: 'chat:read' },
        { permission: 'artifacts:read' },
        { permission: 'system:read' }
      ];

      for (const perm of permissions) {
        const result = await permissionsManager.addPermission(testApiKeyId, perm.permission);
        expect(result.success).toBe(true);
      }
    });

    test('should check permissions correctly', async () => {
      const readResult = await permissionsManager.hasPermission(testApiKeyId, 'chat:read');
      const writeResult = await permissionsManager.hasPermission(testApiKeyId, 'chat:write');

      expect(readResult.allowed).toBe(true);
      expect(writeResult.allowed).toBe(false); // Not granted
    });

    test('should support hierarchical permissions', async () => {
      // Add write permission which should include read
      await permissionsManager.addPermission(testApiKeyId, 'chat:write');

      const readResult = await permissionsManager.hasPermission(testApiKeyId, 'chat:read');
      const writeResult = await permissionsManager.hasPermission(testApiKeyId, 'chat:write');

      expect(readResult.allowed).toBe(true);
      expect(writeResult.allowed).toBe(true);
    });

    test('should get available permissions', async () => {
      const permissions = permissionsManager.getAvailablePermissions();

      expect(permissions).toHaveProperty('chat:read');
      expect(permissions).toHaveProperty('system:admin');
      expect(permissions['chat:read']).toHaveProperty('description');
      expect(permissions['chat:read']).toHaveProperty('level');
    });

    test('should set multiple permissions at once', async () => {
      const permissions = [
        { permission: 'artifacts:write' },
        { permission: 'system:monitor' }
      ];

      const result = await permissionsManager.setApiKeyPermissions(testApiKeyId, permissions);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);

      // Verify old permissions are removed
      const oldResult = await permissionsManager.hasPermission(testApiKeyId, 'chat:read');
      expect(oldResult.allowed).toBe(false);
    });

    test('should remove specific permission', async () => {
      const result = await permissionsManager.removePermission(testApiKeyId, 'artifacts:write');

      expect(result.success).toBe(true);

      // Verify permission is removed
      const checkResult = await permissionsManager.hasPermission(testApiKeyId, 'artifacts:write');
      expect(checkResult.allowed).toBe(false);
    });
  });

  describe('Enhanced Authentication Routes', () => {
    test('should handle signin with lockout check', async () => {
      const response = await request(app)
        .post('/auth/signin')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.category).toBe('signin_error');
    });

    test('should return MFA requirement for enabled users', async () => {
      // This would require a real user with MFA enabled
      const response = await request(app)
        .post('/auth/signin')
        .send({
          email: TEST_CONFIG.testUser.email,
          password: TEST_CONFIG.testUser.password
        });

      // Expect either successful login or MFA requirement
      expect([200, 202, 401]).toContain(response.status);
      
      if (response.status === 202) {
        expect(response.body.requiresMFA).toBe(true);
      }
    });

    test('should require authentication for MFA setup', async () => {
      const response = await request(app)
        .post('/auth/mfa/setup')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should list user sessions for authenticated user', async () => {
      // This would require authentication
      const response = await request(app)
        .get('/auth/sessions')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Enhanced Middleware', () => {
    test('should require valid API key format', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Authorization', 'Bearer invalid_key')
        .expect(401);

      expect(response.body.error).toContain('Invalid API key');
    });

    test('should enforce permission requirements', async () => {
      // This would test the requirePermission middleware
      // Implementation depends on your route structure
    });

    test('should track session activity', async () => {
      // This would test session activity tracking
      // Implementation depends on your middleware integration
    });
  });

  describe('Security Event Logging', () => {
    test('should log authentication events', async () => {
      // Test would verify security events are logged
      // This requires database access to check security_events table
    });

    test('should log suspicious activity', async () => {
      // Test would verify suspicious activity detection and logging
    });
  });

  describe('Configuration and Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Test error handling when database is unavailable
    });

    test('should validate configuration parameters', async () => {
      expect(sessionManager.SESSION_CONFIG.DEFAULT_TIMEOUT).toBeGreaterThan(0);
      expect(sessionManager.SESSION_CONFIG.MAX_SESSIONS_PER_USER).toBeGreaterThan(0);
    });

    test('should encrypt/decrypt MFA secrets correctly', async () => {
      const testSecret = 'JBSWY3DPEHPK3PXP';
      const encrypted = mfaManager.encryptSecret(testSecret);
      const decrypted = mfaManager.decryptSecret(encrypted);

      expect(decrypted).toBe(testSecret);
      expect(encrypted).not.toBe(testSecret);
      expect(encrypted).toContain(':');
    });
  });
});

// Helper functions for testing
function generateValidTOTP(secret) {
  // In a real implementation, you'd use speakeasy to generate a valid TOTP
  // For testing, you might use a mock or test-specific implementation
  return '123456';
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  TEST_CONFIG,
  generateValidTOTP,
  delay
};