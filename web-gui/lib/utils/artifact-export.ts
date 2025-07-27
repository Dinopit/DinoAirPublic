import JSZip from 'jszip';

interface Artifact {
  id: string;
  name: string;
  type: string;
  content: string;
  createdAt: Date;
}

interface ExportManifest {
  exportDate: string;
  totalArtifacts: number;
  artifacts: {
    id: string;
    name: string;
    type: string;
    createdAt: string;
    fileSize: number;
  }[];
}

export class ArtifactExporter {
  /**
   * Get file extension based on artifact type and name
   */
  private static getFileExtension(artifact: Artifact): string {
    // First check if the name already has an extension
    const lastDot = artifact.name.lastIndexOf('.');
    if (lastDot > 0 && lastDot < artifact.name.length - 1) {
      return artifact.name.substring(lastDot);
    }

    // Otherwise, determine extension based on type or content
    const typeMap: Record<string, string> = {
      'javascript': '.js',
      'typescript': '.ts',
      'typescriptreact': '.tsx',
      'javascriptreact': '.jsx',
      'python': '.py',
      'java': '.java',
      'cpp': '.cpp',
      'c': '.c',
      'csharp': '.cs',
      'html': '.html',
      'css': '.css',
      'json': '.json',
      'yaml': '.yaml',
      'yml': '.yml',
      'markdown': '.md',
      'md': '.md',
      'text': '.txt',
      'xml': '.xml',
      'sql': '.sql',
      'shell': '.sh',
      'bash': '.sh',
      'powershell': '.ps1',
      'dockerfile': '.dockerfile',
      'docker': '.dockerfile',
      'rust': '.rs',
      'go': '.go',
      'php': '.php',
      'ruby': '.rb',
      'swift': '.swift',
      'kotlin': '.kt',
      'r': '.r',
      'lua': '.lua',
      'perl': '.pl',
      'toml': '.toml',
      'ini': '.ini',
      'vue': '.vue',
      'svelte': '.svelte',
      'scss': '.scss',
      'sass': '.sass',
      'less': '.less'
    };

    const lowerType = artifact.type.toLowerCase();
    return typeMap[lowerType] || '.txt';
  }

  /**
   * Export a single artifact as a file download
   */
  public static exportSingle(artifact: Artifact): void {
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Ensure filename has proper extension
    let filename = artifact.name;
    const extension = this.getFileExtension(artifact);
    if (!filename.endsWith(extension)) {
      filename += extension;
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export multiple artifacts as a ZIP file
   */
  public static async exportBulk(artifacts: Artifact[], includeManifest: boolean = true): Promise<void> {
    const zip = new JSZip();

    // Create manifest if requested
    if (includeManifest) {
      const manifest: ExportManifest = {
        exportDate: new Date().toISOString(),
        totalArtifacts: artifacts.length,
        artifacts: artifacts.map(artifact => ({
          id: artifact.id,
          name: artifact.name,
          type: artifact.type,
          createdAt: artifact.createdAt.toISOString(),
          fileSize: new Blob([artifact.content]).size
        }))
      };
      
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    }

    // Add each artifact to the ZIP
    artifacts.forEach(artifact => {
      let filename = artifact.name;
      const extension = this.getFileExtension(artifact);
      if (!filename.endsWith(extension)) {
        filename += extension;
      }

      // Handle duplicate filenames by appending ID
      const existingFile = zip.files[filename];
      if (existingFile) {
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        filename = `${nameWithoutExt}_${artifact.id}${extension}`;
      }

      zip.file(filename, artifact.content);
    });

    // Generate and download the ZIP
    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dinoair-artifacts-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate ZIP file:', error);
      throw new Error('Failed to export artifacts as ZIP');
    }
  }

  /**
   * Export selected artifacts with version history
   */
  public static async exportWithVersions(
    artifacts: Artifact[], 
    versionHistories: Record<string, any[]>
  ): Promise<void> {
    const zip = new JSZip();

    // Create folders for each artifact with versions
    for (const artifact of artifacts) {
      const folderName = artifact.name.replace(/[<>:"/\\|?*]/g, '_'); // Sanitize folder name
      const artifactFolder = zip.folder(folderName);
      
      if (!artifactFolder) continue;

      // Add current version
      let filename = artifact.name;
      const extension = this.getFileExtension(artifact);
      if (!filename.endsWith(extension)) {
        filename += extension;
      }
      artifactFolder.file(`current_${filename}`, artifact.content);

      // Add version history if available
      const versions = versionHistories[artifact.id];
      if (versions && versions.length > 0) {
        const versionsFolder = artifactFolder.folder('versions');
        if (versionsFolder) {
          versions.forEach((version: any) => {
            const versionFilename = `v${version.versionNumber}_${new Date(version.timestamp).toISOString().split('T')[0]}_${filename}`;
            versionsFolder.file(versionFilename, version.content);
          });
        }
      }

      // Add metadata
      const metadata = {
        id: artifact.id,
        name: artifact.name,
        type: artifact.type,
        createdAt: artifact.createdAt.toISOString(),
        versionCount: versions?.length || 0
      };
      artifactFolder.file('metadata.json', JSON.stringify(metadata, null, 2));
    }

    // Generate and download
    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dinoair-artifacts-with-versions-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate ZIP with versions:', error);
      throw new Error('Failed to export artifacts with versions');
    }
  }
}
