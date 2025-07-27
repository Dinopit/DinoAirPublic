/**
 * Plugin Permission Management System
 * Handles runtime permission requests and enforcement
 */

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'storage' | 'network' | 'ui' | 'chat' | 'system' | 'sensitive';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  required?: boolean;
}

export interface PermissionRequest {
  pluginId: string;
  permission: Permission;
  reason: string;
  timestamp: number;
  approved?: boolean;
  approvedAt?: number;
  expiresAt?: number;
}

export interface PermissionPolicy {
  autoApprove?: string[]; // Permissions that can be auto-approved
  alwaysDeny?: string[]; // Permissions that should always be denied
  requireReconfirm?: string[]; // Permissions that require periodic reconfirmation
  maxDuration?: { [key: string]: number }; // Max duration for permissions (ms)
}

// Built-in permission definitions
export const BUILT_IN_PERMISSIONS: { [key: string]: Permission } = {
  'storage.read': {
    id: 'storage.read',
    name: 'Read Storage',
    description: 'Access stored data for this plugin',
    category: 'storage',
    riskLevel: 'low'
  },
  'storage.write': {
    id: 'storage.write',
    name: 'Write Storage',
    description: 'Store and modify data for this plugin',
    category: 'storage',
    riskLevel: 'low'
  },
  'network.fetch': {
    id: 'network.fetch',
    name: 'Network Access',
    description: 'Make network requests to external services',
    category: 'network',
    riskLevel: 'medium'
  },
  'network.unlimited': {
    id: 'network.unlimited',
    name: 'Unlimited Network Access',
    description: 'Make network requests to any domain',
    category: 'network',
    riskLevel: 'high'
  },
  'ui.notifications': {
    id: 'ui.notifications',
    name: 'Show Notifications',
    description: 'Display notifications to the user',
    category: 'ui',
    riskLevel: 'low'
  },
  'ui.commands': {
    id: 'ui.commands',
    name: 'Register Commands',
    description: 'Add commands to the user interface',
    category: 'ui',
    riskLevel: 'medium'
  },
  'ui.modify': {
    id: 'ui.modify',
    name: 'Modify Interface',
    description: 'Change the user interface appearance',
    category: 'ui',
    riskLevel: 'high'
  },
  'chat.read': {
    id: 'chat.read',
    name: 'Read Messages',
    description: 'Access chat messages and conversations',
    category: 'chat',
    riskLevel: 'medium'
  },
  'chat.write': {
    id: 'chat.write',
    name: 'Send Messages',
    description: 'Send messages in chat conversations',
    category: 'chat',
    riskLevel: 'medium'
  },
  'chat.history': {
    id: 'chat.history',
    name: 'Access Chat History',
    description: 'Read previous chat conversations',
    category: 'chat',
    riskLevel: 'high'
  },
  'system.info': {
    id: 'system.info',
    name: 'System Information',
    description: 'Access basic system information',
    category: 'system',
    riskLevel: 'low'
  },
  'system.clipboard': {
    id: 'system.clipboard',
    name: 'Clipboard Access',
    description: 'Read from and write to clipboard',
    category: 'system',
    riskLevel: 'medium'
  },
  'sensitive.location': {
    id: 'sensitive.location',
    name: 'Location Access',
    description: 'Access device location information',
    category: 'sensitive',
    riskLevel: 'critical'
  },
  'sensitive.camera': {
    id: 'sensitive.camera',
    name: 'Camera Access',
    description: 'Access device camera',
    category: 'sensitive',
    riskLevel: 'critical'
  },
  'sensitive.microphone': {
    id: 'sensitive.microphone',
    name: 'Microphone Access',
    description: 'Access device microphone',
    category: 'sensitive',
    riskLevel: 'critical'
  }
};

export class PermissionManager {
  private grantedPermissions: Map<string, Map<string, PermissionRequest>> = new Map();
  private policy: PermissionPolicy;
  private eventTarget = new EventTarget();

  constructor(policy: PermissionPolicy = {}) {
    this.policy = {
      autoApprove: ['storage.read', 'storage.write', 'ui.notifications'],
      alwaysDeny: ['sensitive.location', 'sensitive.camera', 'sensitive.microphone'],
      requireReconfirm: ['network.unlimited', 'ui.modify', 'chat.history'],
      maxDuration: {
        'network.fetch': 24 * 60 * 60 * 1000, // 24 hours
        'network.unlimited': 60 * 60 * 1000, // 1 hour
        'ui.modify': 30 * 60 * 1000 // 30 minutes
      },
      ...policy
    };

    // Load saved permissions from storage
    this.loadPersistedPermissions();

    // Set up cleanup interval for expired permissions
    setInterval(() => this.cleanupExpiredPermissions(), 60000); // Every minute
  }

  /**
   * Request permission for a plugin
   */
  async requestPermission(
    pluginId: string,
    permissionId: string,
    reason: string = ''
  ): Promise<boolean> {
    const permission = BUILT_IN_PERMISSIONS[permissionId];
    if (!permission) {
      throw new Error(`Unknown permission: ${permissionId}`);
    }

    // Check if permission is always denied
    if (this.policy.alwaysDeny?.includes(permissionId)) {
      this.logPermissionRequest(pluginId, permission, false, 'Policy denied');
      return false;
    }

    // Check if already granted and not expired
    const existing = this.getGrantedPermission(pluginId, permissionId);
    if (existing && !this.isExpired(existing)) {
      // Check if reconfirmation is required
      if (this.policy.requireReconfirm?.includes(permissionId)) {
        const timeSinceApproval = Date.now() - (existing.approvedAt || 0);
        const reconfirmInterval = 24 * 60 * 60 * 1000; // 24 hours

        if (timeSinceApproval > reconfirmInterval) {
          return this.showPermissionDialog(pluginId, permission, reason, true);
        }
      }
      return true;
    }

    // Check if can be auto-approved
    if (this.policy.autoApprove?.includes(permissionId)) {
      return this.grantPermission(pluginId, permission, reason, true);
    }

    // Show permission dialog
    return this.showPermissionDialog(pluginId, permission, reason);
  }

  /**
   * Check if plugin has specific permission
   */
  hasPermission(pluginId: string, permissionId: string): boolean {
    const permission = this.getGrantedPermission(pluginId, permissionId);
    return permission !== null && !this.isExpired(permission);
  }

  /**
   * Get all permissions for a plugin
   */
  getPluginPermissions(pluginId: string): PermissionRequest[] {
    const pluginPerms = this.grantedPermissions.get(pluginId);
    if (!pluginPerms) return [];

    return Array.from(pluginPerms.values()).filter((p) => !this.isExpired(p));
  }

  /**
   * Revoke permission for a plugin
   */
  revokePermission(pluginId: string, permissionId: string): void {
    const pluginPerms = this.grantedPermissions.get(pluginId);
    if (pluginPerms) {
      pluginPerms.delete(permissionId);
      this.persistPermissions();

      this.eventTarget.dispatchEvent(
        new CustomEvent('permission-revoked', {
          detail: { pluginId, permissionId }
        })
      );
    }
  }

  /**
   * Revoke all permissions for a plugin
   */
  revokeAllPermissions(pluginId: string): void {
    this.grantedPermissions.delete(pluginId);
    this.persistPermissions();

    this.eventTarget.dispatchEvent(
      new CustomEvent('permissions-revoked', {
        detail: { pluginId }
      })
    );
  }

  /**
   * Show permission request dialog
   */
  private async showPermissionDialog(
    pluginId: string,
    permission: Permission,
    reason: string,
    isReconfirm: boolean = false
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = this.createPermissionModal(pluginId, permission, reason, isReconfirm);

      const handleResponse = (approved: boolean, rememberChoice: boolean = false) => {
        document.body.removeChild(modal);

        if (approved) {
          this.grantPermission(pluginId, permission, reason, false, rememberChoice);
        } else {
          this.logPermissionRequest(pluginId, permission, false, 'User denied');
        }

        resolve(approved);
      };

      // Set up event handlers
      const allowBtn = modal.querySelector('[data-action="allow"]') as HTMLElement;
      const denyBtn = modal.querySelector('[data-action="deny"]') as HTMLElement;
      const rememberCheckbox = modal.querySelector('#remember-choice') as HTMLInputElement;

      allowBtn?.addEventListener('click', () => {
        handleResponse(true, rememberCheckbox?.checked || false);
      });

      denyBtn?.addEventListener('click', () => {
        handleResponse(false, rememberCheckbox?.checked || false);
      });

      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          handleResponse(false);
        }
      });

      document.body.appendChild(modal);
    });
  }

  /**
   * Create permission request modal
   */
  private createPermissionModal(
    pluginId: string,
    permission: Permission,
    reason: string,
    isReconfirm: boolean
  ): HTMLElement {
    const modal = document.createElement('div');
    modal.className =
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';

    const riskColors = {
      low: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      critical: 'text-red-600 bg-red-50 border-red-200'
    };

    const riskColor = riskColors[permission.riskLevel];

    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
        <div class="p-6">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 rounded-full ${riskColor} flex items-center justify-center">
                ${
                  permission.riskLevel === 'critical'
                    ? '⚠️'
                    : permission.riskLevel === 'high'
                      ? '🔒'
                      : permission.riskLevel === 'medium'
                        ? '🔐'
                        : '🔓'
                }
              </div>
            </div>
            <div class="ml-4 flex-1">
              <h3 class="text-lg font-semibold text-gray-900">
                ${isReconfirm ? 'Reconfirm Permission' : 'Permission Request'}
              </h3>
              <p class="mt-1 text-sm text-gray-500">
                Plugin: <span class="font-medium">${pluginId}</span>
              </p>
            </div>
          </div>

          <div class="mt-4">
            <div class="border rounded-lg p-4 ${riskColor}">
              <div class="flex items-center">
                <h4 class="font-medium">${permission.name}</h4>
                <span class="ml-2 px-2 py-1 text-xs rounded-full ${riskColor}">
                  ${permission.riskLevel.toUpperCase()} RISK
                </span>
              </div>
              <p class="text-sm mt-1">${permission.description}</p>
            </div>
          </div>

          ${
            reason
              ? `
            <div class="mt-4">
              <h5 class="font-medium text-gray-900">Why this permission is needed:</h5>
              <p class="text-sm text-gray-600 mt-1">${reason}</p>
            </div>
          `
              : ''
          }

          <div class="mt-4">
            <label class="flex items-center">
              <input type="checkbox" id="remember-choice" class="rounded border-gray-300">
              <span class="ml-2 text-sm text-gray-600">Remember my choice</span>
            </label>
          </div>

          <div class="mt-6 flex gap-3 justify-end">
            <button 
              class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              data-action="deny"
            >
              Deny
            </button>
            <button 
              class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              data-action="allow"
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    `;

    return modal;
  }

  /**
   * Grant permission to a plugin
   */
  private grantPermission(
    pluginId: string,
    permission: Permission,
    reason: string,
    autoApproved: boolean,
    persistent: boolean = false
  ): boolean {
    if (!this.grantedPermissions.has(pluginId)) {
      this.grantedPermissions.set(pluginId, new Map());
    }

    const now = Date.now();
    const maxDuration = this.policy.maxDuration?.[permission.id];
    const expiresAt = maxDuration ? now + maxDuration : undefined;

    const request: PermissionRequest = {
      pluginId,
      permission,
      reason,
      timestamp: now,
      approved: true,
      approvedAt: now,
      expiresAt
    };

    this.grantedPermissions.get(pluginId)!.set(permission.id, request);

    if (persistent) {
      this.persistPermissions();
    }

    this.logPermissionRequest(
      pluginId,
      permission,
      true,
      autoApproved ? 'Auto-approved' : 'User approved'
    );

    this.eventTarget.dispatchEvent(
      new CustomEvent('permission-granted', {
        detail: request
      })
    );

    return true;
  }

  /**
   * Get granted permission for a plugin
   */
  private getGrantedPermission(pluginId: string, permissionId: string): PermissionRequest | null {
    const pluginPerms = this.grantedPermissions.get(pluginId);
    return pluginPerms?.get(permissionId) || null;
  }

  /**
   * Check if permission has expired
   */
  private isExpired(request: PermissionRequest): boolean {
    return request.expiresAt ? Date.now() > request.expiresAt : false;
  }

  /**
   * Clean up expired permissions
   */
  private cleanupExpiredPermissions(): void {
    for (const [pluginId, permissions] of this.grantedPermissions) {
      for (const [permissionId, request] of permissions) {
        if (this.isExpired(request)) {
          permissions.delete(permissionId);

          this.eventTarget.dispatchEvent(
            new CustomEvent('permission-expired', {
              detail: { pluginId, permissionId }
            })
          );
        }
      }

      if (permissions.size === 0) {
        this.grantedPermissions.delete(pluginId);
      }
    }

    this.persistPermissions();
  }

  /**
   * Persist permissions to storage
   */
  private persistPermissions(): void {
    const data: any = {};

    for (const [pluginId, permissions] of this.grantedPermissions) {
      data[pluginId] = {};
      for (const [permissionId, request] of permissions) {
        data[pluginId][permissionId] = request;
      }
    }

    localStorage.setItem('plugin_permissions', JSON.stringify(data));
  }

  /**
   * Load persisted permissions from storage
   */
  private loadPersistedPermissions(): void {
    try {
      const data = localStorage.getItem('plugin_permissions');
      if (!data) return;

      const parsed = JSON.parse(data);

      for (const [pluginId, permissions] of Object.entries(parsed)) {
        const pluginPerms = new Map<string, PermissionRequest>();

        for (const [permissionId, request] of Object.entries(permissions as any)) {
          // Only load non-expired permissions
          if (!this.isExpired(request as PermissionRequest)) {
            pluginPerms.set(permissionId, request as PermissionRequest);
          }
        }

        if (pluginPerms.size > 0) {
          this.grantedPermissions.set(pluginId, pluginPerms);
        }
      }
    } catch (error) {
      console.error('Failed to load persisted permissions:', error);
    }
  }

  /**
   * Log permission request for audit
   */
  private logPermissionRequest(
    pluginId: string,
    permission: Permission,
    approved: boolean,
    reason: string
  ): void {
    console.log(
      `[PermissionManager] ${pluginId} requested ${permission.id}: ${approved ? 'APPROVED' : 'DENIED'} (${reason})`
    );

    // In production, this could be sent to an audit service
    const auditEvent = {
      timestamp: Date.now(),
      pluginId,
      permissionId: permission.id,
      permissionName: permission.name,
      riskLevel: permission.riskLevel,
      approved,
      reason
    };

    // Store audit log
    const auditLog = JSON.parse(localStorage.getItem('permission_audit_log') || '[]');
    auditLog.push(auditEvent);

    // Keep only last 1000 entries
    if (auditLog.length > 1000) {
      auditLog.splice(0, auditLog.length - 1000);
    }

    localStorage.setItem('permission_audit_log', JSON.stringify(auditLog));
  }

  /**
   * Get audit log
   */
  getAuditLog(): any[] {
    return JSON.parse(localStorage.getItem('permission_audit_log') || '[]');
  }

  /**
   * Event listener methods
   */
  addEventListener(type: string, listener: EventListener): void {
    this.eventTarget.addEventListener(type, listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.eventTarget.removeEventListener(type, listener);
  }
}

// Global permission manager instance
let globalPermissionManager: PermissionManager | null = null;

export function getPermissionManager(): PermissionManager {
  if (!globalPermissionManager) {
    globalPermissionManager = new PermissionManager();
  }
  return globalPermissionManager;
}
