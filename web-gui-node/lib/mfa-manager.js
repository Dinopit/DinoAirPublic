/**
 * Enhanced Multi-Factor Authentication Manager
 * Implements TOTP, backup codes, and security monitoring for DinoAir
 */

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { supabaseAdmin } = require('./supabase');

class MFAManager {
  constructor() {
    this.appName = 'DinoAir';
    this.issuer = 'DinoAir Platform';
    this.encryptionKey = process.env.MFA_ENCRYPTION_KEY || 'dinoair-default-mfa-key-change-in-production';
  }

  /**
   * Generate TOTP secret for user with enhanced security
   */
  async generateTOTPSecret(userId, userEmail) {
    console.log(`🔐 [${new Date().toISOString()}] MFA: Generating TOTP secret for user ${userId}`);
    
    try {
      // Check if user already has MFA configured
      const existingMFA = await this.getMFAData(userId);
      if (existingMFA && existingMFA.enabled) {
        throw new Error('MFA already configured for this user');
      }

      const secret = speakeasy.generateSecret({
        name: `${this.appName} (${userEmail})`,
        issuer: this.issuer,
        length: 32
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      const encryptedBackupCodes = backupCodes.map(code => this.encryptSecret(code));

      // Store MFA configuration
      const mfaData = {
        user_id: userId,
        mfa_type: 'totp',
        secret_key: this.encryptSecret(secret.base32),
        backup_codes: encryptedBackupCodes,
        enabled: false,
        verified: false,
        created_at: new Date().toISOString(),
        failure_count: 0
      };

      const { error } = await supabaseAdmin
        .from('user_mfa')
        .upsert([mfaData]);

      if (error) {
        console.error('Error storing MFA data:', error);
        throw new Error('Failed to store MFA configuration');
      }

      // Log MFA setup initiation
      await this.logSecurityEvent(userId, 'mfa_setup_initiated', 'info', 
        'User initiated MFA setup', {});

      console.log(`✅ TOTP secret generated for user ${userId}`);
      
      return {
        secret: secret.base32,
        qrCodeUrl: secret.otpauth_url,
        manualEntryKey: secret.base32,
        backupCodes: backupCodes // Return unencrypted codes for user display
      };
    } catch (error) {
      console.error('Error generating TOTP secret:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for TOTP setup with enhanced error handling
   */
  async generateQRCode(otpauthUrl) {
    try {
      console.log(`🔐 [${new Date().toISOString()}] MFA: Generating QR code`);
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      console.log(`✅ QR code generated successfully`);
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Verify TOTP token with enhanced security checks
   */
  async verifyTOTP(userId, token, metadata = {}) {
    console.log(`🔐 [${new Date().toISOString()}] MFA: Verifying TOTP for user ${userId}`);
    
    try {
      const mfaData = await this.getMFAData(userId);
      if (!mfaData) {
        await this.logSecurityEvent(userId, 'mfa_verification_failed', 'warning', 
          'TOTP verification attempted but MFA not configured', metadata);
        return { valid: false, error: 'MFA not configured' };
      }

      if (!token || token.length !== 6) {
        await this.recordMFAFailure(userId);
        return { valid: false, error: 'Invalid token format' };
      }

      // Check if account is locked due to too many failures
      if (mfaData.failure_count >= 5) {
        await this.logSecurityEvent(userId, 'mfa_verification_blocked', 'critical', 
          'MFA verification blocked due to too many failures', metadata);
        return { valid: false, error: 'MFA temporarily locked due to too many failures' };
      }

      const secret = this.decryptSecret(mfaData.secret_key);

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 60 seconds of clock drift
        step: 30
      });

      if (verified) {
        // Successful verification
        await this.clearMFAFailures(userId);
        
        if (!mfaData.verified) {
          // First successful verification - enable MFA
          await supabaseAdmin
            .from('user_mfa')
            .update({ 
              verified: true, 
              enabled: true,
              last_used: new Date().toISOString()
            })
            .eq('user_id', userId);

          await this.logSecurityEvent(userId, 'mfa_enabled', 'info', 
            'MFA successfully enabled for user', metadata);
        } else {
          // Update last used timestamp
          await supabaseAdmin
            .from('user_mfa')
            .update({ last_used: new Date().toISOString() })
            .eq('user_id', userId);
        }

        await this.logSecurityEvent(userId, 'mfa_verification_success', 'info', 
          'TOTP verification successful', metadata);

        console.log(`✅ TOTP verification successful for user ${userId}`);
        return { valid: true, firstTimeSetup: !mfaData.verified };
      }

      // Check if it's a backup code
      if (mfaData.backup_codes && mfaData.backup_codes.length > 0) {
        const isBackupCode = await this.verifyBackupCode(userId, token, mfaData.backup_codes);
        if (isBackupCode) {
          return isBackupCode;
        }
      }

      // Failed verification
      await this.recordMFAFailure(userId);
      await this.logSecurityEvent(userId, 'mfa_verification_failed', 'warning', 
        'TOTP verification failed', { ...metadata, token_prefix: token.substring(0, 2) });

      console.log(`❌ TOTP verification failed for user ${userId}`);
      return { valid: false, error: 'Invalid token' };

    } catch (error) {
      console.error('Error verifying TOTP:', error);
      await this.logSecurityEvent(userId, 'mfa_verification_error', 'critical', 
        'MFA verification system error', metadata);
      return { valid: false, error: 'Verification system error' };
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId, token, encryptedBackupCodes) {
    try {
      // Decrypt all backup codes and check for match
      const decryptedCodes = encryptedBackupCodes.map(code => this.decryptSecret(code));
      const codeIndex = decryptedCodes.findIndex(code => code === token.toUpperCase());

      if (codeIndex !== -1) {
        // Remove used backup code
        const updatedCodes = [...encryptedBackupCodes];
        updatedCodes.splice(codeIndex, 1);

        await supabaseAdmin
          .from('user_mfa')
          .update({ 
            backup_codes: updatedCodes,
            last_used: new Date().toISOString()
          })
          .eq('user_id', userId);

        await this.clearMFAFailures(userId);
        await this.logSecurityEvent(userId, 'backup_code_used', 'warning', 
          'Backup code used for authentication', { remaining_codes: updatedCodes.length });

        console.log(`✅ Backup code verified for user ${userId}`);
        return { 
          valid: true, 
          usedBackupCode: true, 
          remainingCodes: updatedCodes.length 
        };
      }

      return false;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }

  /**
   * Generate backup codes with enhanced security
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character codes with better entropy
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`);
    }
    return codes;
  }

  /**
   * Regenerate backup codes with audit logging
   */
  async regenerateBackupCodes(userId, metadata = {}) {
    console.log(`🔐 [${new Date().toISOString()}] MFA: Regenerating backup codes for user ${userId}`);
    
    try {
      const mfaData = await this.getMFAData(userId);
      if (!mfaData || !mfaData.enabled) {
        throw new Error('MFA not enabled for user');
      }

      const newCodes = this.generateBackupCodes();
      const encryptedCodes = newCodes.map(code => this.encryptSecret(code));

      const { error } = await supabaseAdmin
        .from('user_mfa')
        .update({ backup_codes: encryptedCodes })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating backup codes:', error);
        throw new Error('Failed to regenerate backup codes');
      }

      await this.logSecurityEvent(userId, 'backup_codes_regenerated', 'info',
        'Backup codes regenerated by user', { ...metadata, code_count: newCodes.length });

      console.log(`✅ Backup codes regenerated for user ${userId}`);
      return newCodes;
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw error;
    }
  }

  /**
   * Disable MFA with proper cleanup and logging
   */
  async disableMFA(userId, metadata = {}) {
    console.log(`🔐 [${new Date().toISOString()}] MFA: Disabling MFA for user ${userId}`);
    
    try {
      const mfaData = await this.getMFAData(userId);
      if (!mfaData) {
        return { success: true, message: 'MFA was not enabled' };
      }

      const { error } = await supabaseAdmin
        .from('user_mfa')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error disabling MFA:', error);
        throw new Error('Failed to disable MFA');
      }

      await this.logSecurityEvent(userId, 'mfa_disabled', 'warning',
        'MFA disabled by user', metadata);

      console.log(`✅ MFA disabled for user ${userId}`);
      return { success: true, message: 'MFA disabled successfully' };
    } catch (error) {
      console.error('Error disabling MFA:', error);
      throw error;
    }
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId) {
    try {
      const mfaData = await this.getMFAData(userId);
      return mfaData && mfaData.enabled && mfaData.verified;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  }

  /**
   * Get comprehensive MFA status for user
   */
  async getMFAStatus(userId) {
    try {
      const mfaData = await this.getMFAData(userId);
      if (!mfaData) {
        return { 
          enabled: false, 
          type: null, 
          verified: false,
          backupCodesCount: 0,
          failureCount: 0
        };
      }

      // Decrypt backup codes to count them
      let backupCodesCount = 0;
      if (mfaData.backup_codes && Array.isArray(mfaData.backup_codes)) {
        backupCodesCount = mfaData.backup_codes.length;
      }

      return {
        enabled: mfaData.enabled,
        verified: mfaData.verified,
        type: mfaData.mfa_type,
        backupCodesCount,
        createdAt: mfaData.created_at,
        lastUsed: mfaData.last_used,
        failureCount: mfaData.failure_count || 0
      };
    } catch (error) {
      console.error('Error getting MFA status:', error);
      return { 
        enabled: false, 
        type: null, 
        verified: false,
        backupCodesCount: 0,
        failureCount: 0,
        error: 'Failed to get MFA status'
      };
    }
  }

  /**
   * Get MFA data from database
   */
  async getMFAData(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_mfa')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching MFA data:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting MFA data:', error);
      return null;
    }
  }

  /**
   * Record MFA failure
   */
  async recordMFAFailure(userId) {
    try {
      const { error } = await supabaseAdmin
        .from('user_mfa')
        .update({ 
          failure_count: supabaseAdmin.increment(1)
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error recording MFA failure:', error);
      }
    } catch (error) {
      console.error('Error recording MFA failure:', error);
    }
  }

  /**
   * Clear MFA failures on successful verification
   */
  async clearMFAFailures(userId) {
    try {
      const { error } = await supabaseAdmin
        .from('user_mfa')
        .update({ failure_count: 0 })
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing MFA failures:', error);
      }
    } catch (error) {
      console.error('Error clearing MFA failures:', error);
    }
  }

  /**
   * Encrypt MFA secret with improved security
   */
  encryptSecret(secret) {
    try {
      const key = crypto.scryptSync(this.encryptionKey, 'dinoair-mfa-salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      let encrypted = cipher.update(secret, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
      console.error('Error encrypting secret:', error);
      // Fallback to simpler encryption
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      
      let encrypted = cipher.update(secret, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return `${iv.toString('hex')}:${encrypted}`;
    }
  }

  /**
   * Decrypt MFA secret with backward compatibility
   */
  decryptSecret(encryptedSecret) {
    try {
      const parts = encryptedSecret.split(':');
      
      if (parts.length === 3) {
        // New format with GCM
        const [ivHex, authTagHex, encrypted] = parts;
        const key = crypto.scryptSync(this.encryptionKey, 'dinoair-mfa-salt', 32);
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipherGCM(key);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
      } else if (parts.length === 2) {
        // Fallback format with CBC
        const [ivHex, encrypted] = parts;
        const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
      } else {
        throw new Error('Invalid encrypted secret format');
      }
    } catch (error) {
      console.error('Error decrypting secret:', error);
      throw new Error('Failed to decrypt MFA secret');
    }
  }

  /**
   * Log security events for audit trail
   */
  async logSecurityEvent(userId, eventType, severity, description, metadata = {}) {
    try {
      const { error } = await supabaseAdmin
        .from('security_events')
        .insert([{
          user_id: userId,
          event_type: eventType,
          event_severity: severity,
          event_description: description,
          ip_address: metadata.ip || '127.0.0.1',
          user_agent: metadata.userAgent || null,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString()
          }
        }]);

      if (error) {
        console.error('Error logging security event:', error);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Validate MFA requirements based on user role and security policy
   */
  validateMFARequirements(userRole, securityPolicy = {}) {
    const defaultRequirements = {
      admin: { 
        required: true, 
        methods: ['totp'], 
        maxFailures: 3,
        requireForSensitiveOps: true 
      },
      premium: { 
        required: false, 
        methods: ['totp'], 
        maxFailures: 5,
        requireForSensitiveOps: false 
      },
      free: { 
        required: false, 
        methods: ['totp'], 
        maxFailures: 5,
        requireForSensitiveOps: false 
      }
    };

    const requirements = { ...defaultRequirements[userRole] || defaultRequirements.free };
    
    // Apply security policy overrides
    if (securityPolicy.forceMFA) {
      requirements.required = true;
    }
    
    if (securityPolicy.maxMFAFailures) {
      requirements.maxFailures = securityPolicy.maxMFAFailures;
    }

    return requirements;
  }

  /**
   * Check if MFA is required for a specific operation
   */
  async isMFARequiredForOperation(userId, operation) {
    const sensitiveOperations = [
      'password_change',
      'email_change', 
      'api_key_creation',
      'user_deletion',
      'security_settings_change',
      'admin_action'
    ];

    if (!sensitiveOperations.includes(operation)) {
      return false;
    }

    const mfaStatus = await this.getMFAStatus(userId);
    return mfaStatus.enabled;
  }
}
}

module.exports = { MFAManager };
