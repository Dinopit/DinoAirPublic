interface ArtifactVersion {
  id: string;
  artifactId: string;
  content: string;
  timestamp: Date;
  versionNumber: number;
}

interface VersionedArtifact {
  currentVersion: number;
  versions: ArtifactVersion[];
}

const STORAGE_KEY = 'dinoair-artifact-versions';
const MAX_VERSIONS = 10;

export class ArtifactVersionControl {
  private storage: Record<string, VersionedArtifact> = {};

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        Object.keys(parsed).forEach(artifactId => {
          parsed[artifactId].versions = parsed[artifactId].versions.map((v: any) => ({
            ...v,
            timestamp: new Date(v.timestamp)
          }));
        });
        this.storage = parsed;
      }
    } catch (error) {
      console.error('Failed to load version history:', error);
      this.storage = {};
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage));
    } catch (error) {
      console.error('Failed to save version history:', error);
    }
  }

  public addVersion(artifactId: string, content: string): void {
    if (!this.storage[artifactId]) {
      this.storage[artifactId] = {
        currentVersion: 0,
        versions: []
      };
    }

    const versionedArtifact = this.storage[artifactId];
    const newVersion: ArtifactVersion = {
      id: `${artifactId}-v${versionedArtifact.currentVersion + 1}`,
      artifactId,
      content,
      timestamp: new Date(),
      versionNumber: versionedArtifact.currentVersion + 1
    };

    versionedArtifact.versions.push(newVersion);
    versionedArtifact.currentVersion += 1;

    // Limit to MAX_VERSIONS
    if (versionedArtifact.versions.length > MAX_VERSIONS) {
      versionedArtifact.versions = versionedArtifact.versions.slice(-MAX_VERSIONS);
    }

    this.saveToStorage();
  }

  public getVersionHistory(artifactId: string): ArtifactVersion[] {
    return this.storage[artifactId]?.versions || [];
  }

  public getVersion(artifactId: string, versionNumber: number): ArtifactVersion | null {
    const versions = this.getVersionHistory(artifactId);
    return versions.find(v => v.versionNumber === versionNumber) || null;
  }

  public restoreVersion(artifactId: string, versionNumber: number): string | null {
    const version = this.getVersion(artifactId, versionNumber);
    return version ? version.content : null;
  }

  public getDiff(artifactId: string, version1: number, version2: number): {
    version1: string;
    version2: string;
    changes: number;
  } | null {
    const v1 = this.getVersion(artifactId, version1);
    const v2 = this.getVersion(artifactId, version2);

    if (!v1 || !v2) return null;

    const lines1 = v1.content.split('\n');
    const lines2 = v2.content.split('\n');
    let changes = 0;

    // Simple line-based diff count
    const maxLines = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLines; i++) {
      if (lines1[i] !== lines2[i]) {
        changes++;
      }
    }

    return {
      version1: v1.content,
      version2: v2.content,
      changes
    };
  }

  public clearHistory(artifactId: string): void {
    delete this.storage[artifactId];
    this.saveToStorage();
  }

  public clearAllHistory(): void {
    this.storage = {};
    this.saveToStorage();
  }
}

export const versionControl = new ArtifactVersionControl();