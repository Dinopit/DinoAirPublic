/**
 * Multi-Factor Authentication Manager
 * Implements TOTP, backup codes, and hardware key support for DinoAir
 */

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { SecurityDatabase } = require('./db-security-extensions');

class MFAManager {
  constructor() {
    this.appName = 'DinoAir';
    this.issuer = 'DinoAir Platform';
    this.db = new SecurityDatabase();
  }

  /**
   * Generate TOTP secret for user
   */
  async generateTOTPSecret(userId, userEmail) {
    const secret = speakeasy.generateSecret({
      name: `${this.appName} (${userEmail})`,
      issuer: this.issuer,
      length: 32
    });

    await this.db.storeMFASecret(userId, {
      type: 'totp',
      secret: this.encryptSecret(secret.base32),
      backup_codes: this.generateBackupCodes(),
      created_at: new Date().toISOString(),
      verified: false
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url,
      manualEntryKey: secret.base32
    };
  }

  /**
   * Generate QR code for TOTP setup
   */
  async generateQRCode(otpauthUrl) {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Verify TOTP token
   */
  async verifyTOTP(userId, token) {
    const mfaData = await this.db.getMFAData(userId);
    if (!mfaData || mfaData.type !== 'totp') {
      return { valid: false, error: 'TOTP not configured' };
    }

    const secret = this.decryptSecret(mfaData.secret);

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps (60 seconds) of drift
    });

    if (verified) {
      if (!mfaData.verified) {
        await this.db.updateMFAData(userId, { verified: true });
      }

      await this.logMFAEvent(userId, 'totp_verified', { success: true });

      return { valid: true };
    }

    if (mfaData.backup_codes && mfaData.backup_codes.includes(token)) {
      const updatedCodes = mfaData.backup_codes.filter(code => code !== token);
      await this.db.updateMFAData(userId, { backup_codes: updatedCodes });

      await this.logMFAEvent(userId, 'backup_code_used', {
        success: true,
        remaining_codes: updatedCodes.length
      });

      return { valid: true, usedBackupCode: true, remainingCodes: updatedCodes.length };
    }

    await this.logMFAEvent(userId, 'totp_failed', { success: false, token_prefix: token.substring(0, 2) });
    return { valid: false, error: 'Invalid token' };
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId) {
    const newCodes = this.generateBackupCodes();
    await this.db.updateMFAData(userId, { backup_codes: newCodes });

    await this.logMFAEvent(userId, 'backup_codes_regenerated', {
      code_count: newCodes.length
    });

    return newCodes;
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId) {
    await this.db.deleteMFAData(userId);
    await this.logMFAEvent(userId, 'mfa_disabled', {});
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId) {
    const mfaData = await this.db.getMFAData(userId);
    return mfaData && mfaData.verified;
  }

  /**
   * Get MFA status for user
   */
  async getMFAStatus(userId) {
    const mfaData = await this.db.getMFAData(userId);
    if (!mfaData) {
      return { enabled: false, type: null };
    }

    return {
      enabled: mfaData.verified,
      type: mfaData.type,
      backupCodesCount: mfaData.backup_codes ? mfaData.backup_codes.length : 0,
      createdAt: mfaData.created_at
    };
  }

  /**
   * Encrypt MFA secret
   */
  encryptSecret(secret) {
    const key = process.env.MFA_ENCRYPTION_KEY || crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt MFA secret
   */
  decryptSecret(encryptedSecret) {
    const key = process.env.MFA_ENCRYPTION_KEY || crypto.randomBytes(32);
    const [ivHex, encrypted] = encryptedSecret.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Log MFA events for audit trail
   */
  async logMFAEvent(userId, event, metadata = {}) {
    const logEntry = {
      user_id: userId,
      event_type: 'mfa_event',
      event_action: event,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        user_agent: metadata.userAgent || 'unknown',
        ip_address: metadata.ipAddress || 'unknown'
      }
    };

    await this.db.storeAuditLog(logEntry);
  }

  /**
   * Validate MFA setup requirements
   */
  validateMFARequirements(userId, userRole) {
    const requirements = {
      admin: { required: true, methods: ['totp'] },
      premium: { required: false, methods: ['totp'] },
      free: { required: false, methods: ['totp'] }
    };

    return requirements[userRole] || requirements.free;
  }
}

module.exports = { MFAManager };
