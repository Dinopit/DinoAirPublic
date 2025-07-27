/**
 * Plugin Security and Code Signing System
 * Provides cryptographic verification of plugin integrity and authenticity
 */

export interface PluginSignature {
  algorithm: 'RSA-PSS' | 'ECDSA';
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512';
  signature: string;
  publicKey: string;
  timestamp: number;
  signer: string;
}

export interface PluginCertificate {
  issuer: string;
  subject: string;
  serialNumber: string;
  validFrom: number;
  validTo: number;
  publicKey: string;
  fingerprint: string;
  revoked?: boolean;
}

export interface SecurityScanResult {
  passed: boolean;
  riskScore: number; // 0-100, higher is more risky
  issues: SecurityIssue[];
  scanTimestamp: number;
}

export interface SecurityIssue {
  type: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'malware' | 'permissions' | 'network' | 'code-quality' | 'privacy';
  message: string;
  details?: string;
  line?: number;
  column?: number;
}

export interface TrustedPublisher {
  name: string;
  publicKey: string;
  website: string;
  verified: boolean;
  trustLevel: 'high' | 'medium' | 'low';
  addedAt: number;
}

// Known dangerous patterns and their risk scores
const SECURITY_PATTERNS = [
  {
    pattern: /eval\s*\(/gi,
    type: 'critical' as const,
    category: 'code-quality' as const,
    message: 'Use of eval() is prohibited',
    score: 100,
  },
  {
    pattern: /Function\s*\(/gi,
    type: 'critical' as const,
    category: 'code-quality' as const,
    message: 'Dynamic function creation is prohibited',
    score: 90,
  },
  {
    pattern: /document\.cookie/gi,
    type: 'high' as const,
    category: 'privacy' as const,
    message: 'Direct cookie access detected',
    score: 70,
  },
  {
    pattern: /localStorage\.|sessionStorage\./gi,
    type: 'medium' as const,
    category: 'privacy' as const,
    message: 'Direct storage access (use plugin API instead)',
    score: 50,
  },
  {
    pattern: /XMLHttpRequest|fetch\(/gi,
    type: 'medium' as const,
    category: 'network' as const,
    message: 'Direct network access (use plugin API instead)',
    score: 40,
  },
  {
    pattern: /innerHTML\s*=/gi,
    type: 'medium' as const,
    category: 'code-quality' as const,
    message: 'Potential XSS vulnerability with innerHTML',
    score: 60,
  },
  {
    pattern: /outerHTML\s*=/gi,
    type: 'medium' as const,
    category: 'code-quality' as const,
    message: 'Potential XSS vulnerability with outerHTML',
    score: 60,
  },
  {
    pattern: /document\.write\(/gi,
    type: 'high' as const,
    category: 'code-quality' as const,
    message: 'Use of document.write() is dangerous',
    score: 80,
  },
  {
    pattern: /location\.(href|replace|assign)/gi,
    type: 'medium' as const,
    category: 'code-quality' as const,
    message: 'Page navigation detected',
    score: 30,
  },
  {
    pattern: /window\.open\(/gi,
    type: 'medium' as const,
    category: 'code-quality' as const,
    message: 'Popup creation detected',
    score: 35,
  },
  {
    pattern: /<script[\s>]/gi,
    type: 'high' as const,
    category: 'code-quality' as const,
    message: 'Script tag injection detected',
    score: 85,
  },
  {
    pattern: /javascript:/gi,
    type: 'high' as const,
    category: 'code-quality' as const,
    message: 'JavaScript URL scheme detected',
    score: 75,
  },
  {
    pattern: /data:.*script/gi,
    type: 'high' as const,
    category: 'code-quality' as const,
    message: 'Data URL with script detected',
    score: 80,
  },
];

// Trusted certificate authorities
const TRUSTED_CAS: { [key: string]: TrustedPublisher } = {
  'dinoair-official': {
    name: 'DinoAir Official',
    publicKey: 'LS0tLS1CRUdJTi...', // Base64 encoded public key
    website: 'https://dinoair.dev',
    verified: true,
    trustLevel: 'high',
    addedAt: Date.now(),
  },
  // Add more trusted publishers here
};

export class PluginSecurity {
  private trustedPublishers: Map<string, TrustedPublisher> = new Map();

  constructor() {
    // Load trusted publishers
    Object.entries(TRUSTED_CAS).forEach(([key, publisher]) => {
      this.trustedPublishers.set(key, publisher);
    });

    // Load user-added trusted publishers
    this.loadUserTrustedPublishers();
  }

  /**
   * Verify plugin signature and certificate
   */
  async verifyPlugin(
    code: string,
    signature: PluginSignature,
    certificate?: PluginCertificate
  ): Promise<{ valid: boolean; trusted: boolean; issues: string[] }> {
    const issues: string[] = [];
    let valid = false;
    let trusted = false;

    try {
      // Verify cryptographic signature
      valid = await this.verifySignature(code, signature);
      if (!valid) {
        issues.push('Invalid cryptographic signature');
      }

      // Verify certificate if provided
      if (certificate) {
        const certValid = this.verifyCertificate(certificate);
        if (!certValid) {
          issues.push('Invalid or expired certificate');
          valid = false;
        }

        // Check if signer is trusted
        trusted = this.isTrustedPublisher(certificate.subject);
        if (!trusted) {
          issues.push('Publisher is not in trusted list');
        }
      } else {
        issues.push('No certificate provided');
      }

      // Check certificate validity period
      if (certificate) {
        const now = Date.now();
        if (now < certificate.validFrom) {
          issues.push('Certificate is not yet valid');
          valid = false;
        }
        if (now > certificate.validTo) {
          issues.push('Certificate has expired');
          valid = false;
        }
        if (certificate.revoked) {
          issues.push('Certificate has been revoked');
          valid = false;
          trusted = false;
        }
      }
    } catch (error) {
      issues.push(
        `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      valid = false;
    }

    return { valid, trusted, issues };
  }

  /**
   * Scan plugin code for security issues
   */
  scanPluginCode(code: string): SecurityScanResult {
    const issues: SecurityIssue[] = [];
    let riskScore = 0;

    // Scan for dangerous patterns
    for (const pattern of SECURITY_PATTERNS) {
      const matches = Array.from(code.matchAll(pattern.pattern));

      for (const match of matches) {
        const lines = code.substring(0, match.index).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length;

        issues.push({
          type: pattern.type,
          category: pattern.category,
          message: pattern.message,
          line,
          column,
        });

        riskScore += pattern.score;
      }
    }

    // Additional heuristic checks
    riskScore += this.performHeuristicAnalysis(code, issues);

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    return {
      passed: riskScore < 50 && !issues.some((i) => i.type === 'critical'),
      riskScore,
      issues,
      scanTimestamp: Date.now(),
    };
  }

  /**
   * Perform heuristic analysis for suspicious patterns
   */
  private performHeuristicAnalysis(code: string, issues: SecurityIssue[]): number {
    let score = 0;

    // Check for obfuscated code
    const suspiciousCharRatio = (code.match(/[^\w\s.,;:()\[\]{}'"]/g) || []).length / code.length;
    if (suspiciousCharRatio > 0.1) {
      issues.push({
        type: 'medium',
        category: 'code-quality',
        message: 'Code appears to be obfuscated or heavily minified',
      });
      score += 30;
    }

    // Check for excessive complexity
    const functionCount = (code.match(/function\s+\w+/g) || []).length;
    const lineCount = code.split('\n').length;
    if (functionCount > 50 && lineCount > 1000) {
      issues.push({
        type: 'low',
        category: 'code-quality',
        message: 'Plugin is very large and complex',
      });
      score += 10;
    }

    // Check for base64 encoded content
    const base64Matches = code.match(/[A-Za-z0-9+/]{20,}={0,2}/g) || [];
    if (base64Matches.length > 5) {
      issues.push({
        type: 'medium',
        category: 'code-quality',
        message: 'Multiple base64 encoded strings detected',
      });
      score += 25;
    }

    // Check for excessive network activity indicators
    const networkKeywords = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'];
    const networkCount = networkKeywords.reduce((count, keyword) => {
      return count + (code.match(new RegExp(keyword, 'gi')) || []).length;
    }, 0);

    if (networkCount > 10) {
      issues.push({
        type: 'medium',
        category: 'network',
        message: 'High network activity detected',
      });
      score += 20;
    }

    return score;
  }

  /**
   * Verify cryptographic signature
   */
  private async verifySignature(data: string, signature: PluginSignature): Promise<boolean> {
    try {
      // Import public key
      const publicKey = await crypto.subtle.importKey(
        'spki',
        this.base64ToArrayBuffer(signature.publicKey),
        {
          name: signature.algorithm,
          hash: signature.hash,
        },
        false,
        ['verify']
      );

      // Create data hash
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      // Verify signature
      const signatureBuffer = this.base64ToArrayBuffer(signature.signature);

      return await crypto.subtle.verify(
        {
          name: signature.algorithm,
          saltLength: signature.algorithm === 'RSA-PSS' ? 32 : undefined,
        },
        publicKey,
        signatureBuffer,
        dataBuffer
      );
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify certificate validity
   */
  private verifyCertificate(certificate: PluginCertificate): boolean {
    const now = Date.now();

    // Check validity period
    if (now < certificate.validFrom || now > certificate.validTo) {
      return false;
    }

    // Check if revoked
    if (certificate.revoked) {
      return false;
    }

    // Additional certificate validation could be added here
    return true;
  }

  /**
   * Check if publisher is trusted
   */
  private isTrustedPublisher(subject: string): boolean {
    for (const [, publisher] of this.trustedPublishers) {
      if (publisher.name === subject && publisher.verified) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add trusted publisher
   */
  addTrustedPublisher(publisher: TrustedPublisher): void {
    const key = this.generatePublisherKey(publisher);
    this.trustedPublishers.set(key, publisher);
    this.saveUserTrustedPublishers();
  }

  /**
   * Remove trusted publisher
   */
  removeTrustedPublisher(publisherKey: string): void {
    this.trustedPublishers.delete(publisherKey);
    this.saveUserTrustedPublishers();
  }

  /**
   * Get all trusted publishers
   */
  getTrustedPublishers(): TrustedPublisher[] {
    return Array.from(this.trustedPublishers.values());
  }

  /**
   * Generate unique key for publisher
   */
  private generatePublisherKey(publisher: TrustedPublisher): string {
    return `${publisher.name}-${publisher.publicKey.substring(0, 16)}`;
  }

  /**
   * Load user-added trusted publishers from storage
   */
  private loadUserTrustedPublishers(): void {
    try {
      const stored = localStorage.getItem('plugin_trusted_publishers');
      if (stored) {
        const publishers = JSON.parse(stored);
        for (const [key, publisher] of Object.entries(publishers)) {
          this.trustedPublishers.set(key, publisher as TrustedPublisher);
        }
      }
    } catch (error) {
      console.error('Failed to load trusted publishers:', error);
    }
  }

  /**
   * Save user-added trusted publishers to storage
   */
  private saveUserTrustedPublishers(): void {
    try {
      const userPublishers: { [key: string]: TrustedPublisher } = {};

      for (const [key, publisher] of this.trustedPublishers) {
        // Only save user-added publishers (not built-in ones)
        if (!TRUSTED_CAS[key]) {
          userPublishers[key] = publisher;
        }
      }

      localStorage.setItem('plugin_trusted_publishers', JSON.stringify(userPublishers));
    } catch (error) {
      console.error('Failed to save trusted publishers:', error);
    }
  }

  /**
   * Utility function to convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Generate plugin fingerprint for integrity checking
   */
  async generateFingerprint(code: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if plugin has been tampered with
   */
  async verifyIntegrity(code: string, expectedFingerprint: string): Promise<boolean> {
    const actualFingerprint = await this.generateFingerprint(code);
    return actualFingerprint === expectedFingerprint;
  }

  /**
   * Create security report for plugin
   */
  async createSecurityReport(
    code: string,
    signature?: PluginSignature,
    certificate?: PluginCertificate
  ): Promise<{
    scanResult: SecurityScanResult;
    signatureValid: boolean;
    trusted: boolean;
    verificationIssues: string[];
    recommendation: 'safe' | 'caution' | 'dangerous';
  }> {
    // Scan code for security issues
    const scanResult = this.scanPluginCode(code);

    // Verify signature if provided
    let signatureValid = false;
    let trusted = false;
    let verificationIssues: string[] = [];

    if (signature) {
      const verification = await this.verifyPlugin(code, signature, certificate);
      signatureValid = verification.valid;
      trusted = verification.trusted;
      verificationIssues = verification.issues;
    }

    // Determine recommendation
    let recommendation: 'safe' | 'caution' | 'dangerous' = 'safe';

    if (scanResult.riskScore > 70 || scanResult.issues.some((i) => i.type === 'critical')) {
      recommendation = 'dangerous';
    } else if (scanResult.riskScore > 30 || !signatureValid || !trusted) {
      recommendation = 'caution';
    }

    return {
      scanResult,
      signatureValid,
      trusted,
      verificationIssues,
      recommendation,
    };
  }
}

// Global security manager instance
let globalSecurityManager: PluginSecurity | null = null;

export function getPluginSecurity(): PluginSecurity {
  if (!globalSecurityManager) {
    globalSecurityManager = new PluginSecurity();
  }
  return globalSecurityManager;
}
