// Update checker utility for DinoAir

export interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string | undefined;
}

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  downloadUrl: string;
  changelog: ChangelogEntry[];
  urgent?: boolean;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    added?: string[];
    changed?: string[];
    fixed?: string[];
    removed?: string[];
    security?: string[];
  };
}

// Current version - this should match package.json
export const CURRENT_VERSION = '1.0.0';

// Update check endpoint - in production, this would be a real URL
const UPDATE_CHECK_URL = 'https://api.dinoair.com/updates/check';
const CHANGELOG_URL = 'https://api.dinoair.com/updates/changelog';

// Mock data for development
const MOCK_UPDATE_INFO: UpdateInfo = {
  version: '1.1.0',
  releaseDate: '2024-01-15',
  downloadUrl: 'https://github.com/dinoair/dinoair-free/releases/latest',
  changelog: [
    {
      version: '1.1.0',
      date: '2024-01-15',
      changes: {
        added: [
          'Plugin system for extending functionality',
          'Performance dashboard with real-time metrics',
          'Service status monitoring',
          'Debug mode with comprehensive logging',
          'REST API for programmatic access'
        ],
        changed: [
          'Improved chat response times by 30%',
          'Enhanced artifact management UI',
          'Better error handling and recovery'
        ],
        fixed: [
          'Memory leak in long-running conversations',
          'Artifact export formatting issues',
          'Dark mode inconsistencies'
        ]
      }
    },
    {
      version: '1.0.1',
      date: '2024-01-01',
      changes: {
        fixed: [
          'Connection timeout issues',
          'Artifact save confirmation',
          'Theme persistence'
        ]
      }
    }
  ]
};

// Parse version string to Version object
export function parseVersion(versionString: string): Version {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    throw new Error(`Invalid version string: ${versionString}`);
  }

  return {
    major: parseInt(match[1] || '0', 10),
    minor: parseInt(match[2] || '0', 10),
    patch: parseInt(match[3] || '0', 10),
    prerelease: match[4]
  };
}

// Compare two versions
export function compareVersions(v1: string, v2: string): number {
  const version1 = parseVersion(v1);
  const version2 = parseVersion(v2);

  // Compare major
  if (version1.major !== version2.major) {
    return version1.major - version2.major;
  }

  // Compare minor
  if (version1.minor !== version2.minor) {
    return version1.minor - version2.minor;
  }

  // Compare patch
  if (version1.patch !== version2.patch) {
    return version1.patch - version2.patch;
  }

  // Compare prerelease
  if (version1.prerelease && !version2.prerelease) return -1;
  if (!version1.prerelease && version2.prerelease) return 1;
  if (version1.prerelease && version2.prerelease) {
    return version1.prerelease.localeCompare(version2.prerelease);
  }

  return 0;
}

// Check if an update is available
export function isUpdateAvailable(currentVersion: string, latestVersion: string): boolean {
  return compareVersions(currentVersion, latestVersion) < 0;
}

// Check for updates
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    // In development, return mock data
    if (process.env.NODE_ENV === 'development') {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Only return update if mock version is newer
      if (isUpdateAvailable(CURRENT_VERSION, MOCK_UPDATE_INFO.version)) {
        return MOCK_UPDATE_INFO;
      }
      return null;
    }

    // In production, make actual API call
    const response = await fetch(`${UPDATE_CHECK_URL}?current=${CURRENT_VERSION}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Update check failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Check if update is available
    if (data.version && isUpdateAvailable(CURRENT_VERSION, data.version)) {
      return data as UpdateInfo;
    }

    return null;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return null;
  }
}

// Get full changelog
export async function getChangelog(): Promise<ChangelogEntry[]> {
  try {
    // In development, return mock changelog
    if (process.env.NODE_ENV === 'development') {
      await new Promise(resolve => setTimeout(resolve, 500));
      return MOCK_UPDATE_INFO.changelog;
    }

    // In production, make actual API call
    const response = await fetch(CHANGELOG_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch changelog: ${response.statusText}`);
    }

    const data = await response.json();
    return data as ChangelogEntry[];
  } catch (error) {
    console.error('Failed to fetch changelog:', error);
    return [];
  }
}

// Store update check preferences
export interface UpdatePreferences {
  checkAutomatically: boolean;
  checkInterval: number; // hours
  lastCheck: string | null;
  dismissedVersion: string | null;
}

const UPDATE_PREFS_KEY = 'dinoair-update-preferences';

export function getUpdatePreferences(): UpdatePreferences {
  const stored = localStorage.getItem(UPDATE_PREFS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse update preferences:', error);
    }
  }

  // Default preferences
  return {
    checkAutomatically: true,
    checkInterval: 24, // Check once per day
    lastCheck: null,
    dismissedVersion: null,
  };
}

export function saveUpdatePreferences(prefs: UpdatePreferences) {
  localStorage.setItem(UPDATE_PREFS_KEY, JSON.stringify(prefs));
}

// Check if it's time to check for updates
export function shouldCheckForUpdates(): boolean {
  const prefs = getUpdatePreferences();
  
  if (!prefs.checkAutomatically) {
    return false;
  }

  if (!prefs.lastCheck) {
    return true;
  }

  const lastCheck = new Date(prefs.lastCheck);
  const now = new Date();
  const hoursSinceLastCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceLastCheck >= prefs.checkInterval;
}

// Mark that we've checked for updates
export function markUpdateChecked() {
  const prefs = getUpdatePreferences();
  prefs.lastCheck = new Date().toISOString();
  saveUpdatePreferences(prefs);
}

// Dismiss an update version
export function dismissUpdate(version: string) {
  const prefs = getUpdatePreferences();
  prefs.dismissedVersion = version;
  saveUpdatePreferences(prefs);
}

// Check if update was dismissed
export function isUpdateDismissed(version: string): boolean {
  const prefs = getUpdatePreferences();
  return prefs.dismissedVersion === version;
}
