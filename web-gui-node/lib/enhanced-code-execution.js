/**
 * Enhanced Code Execution Integration
 * Extended code execution service with project integration
 */

const { CodeExecutionService } = require('./code-execution-service');
const { VirtualFileSystem } = require('./virtual-file-system');
const path = require('path');

class EnhancedCodeExecutionService extends CodeExecutionService {
  constructor() {
    super();
    this.vfs = new VirtualFileSystem();
  }

  /**
   * Execute code within a project context
   */
  async executeProjectCode(projectId, fileName, options = {}) {
    const project = this.vfs.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Read the file content
    const code = await this.vfs.readFile(projectId, fileName);
    
    // Execute with project context
    const execution = await this.executeCode({
      language: project.language,
      code,
      options: {
        ...options,
        projectId,
        fileName,
        projectPath: project.path
      }
    });

    return execution;
  }

  /**
   * Execute multiple files in a project (for compiled languages)
   */
  async executeProject(projectId, options = {}) {
    const project = this.vfs.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const files = await this.vfs.listFiles(projectId);
    const mainFile = this._findMainFile(files, project.language);
    
    if (!mainFile) {
      throw new Error('No main file found in project');
    }

    return await this.executeProjectCode(projectId, mainFile.name, options);
  }

  /**
   * Install dependencies and execute project
   */
  async executeProjectWithDependencies(projectId, options = {}) {
    const project = this.vfs.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.dependencies.length > 0) {
      // Install dependencies first
      await this._installDependencies(project, options);
    }

    return await this.executeProject(projectId, options);
  }

  /**
   * Find the main file for execution
   */
  _findMainFile(files, language) {
    const mainFileNames = {
      python: ['main.py', 'app.py', '__main__.py'],
      javascript: ['index.js', 'main.js', 'app.js'],
      java: ['Main.java', 'App.java'],
      cpp: ['main.cpp', 'main.c'],
      go: ['main.go'],
      rust: ['main.rs']
    };

    const candidates = mainFileNames[language] || [];
    
    for (const candidate of candidates) {
      const file = files.find(f => f.name === candidate);
      if (file) return file;
    }

    // Return first file with matching extension
    const extensions = {
      python: '.py',
      javascript: '.js',
      java: '.java',
      cpp: ['.cpp', '.c'],
      go: '.go',
      rust: '.rs'
    };

    const ext = extensions[language];
    if (Array.isArray(ext)) {
      return files.find(f => ext.some(e => f.name.endsWith(e)));
    } else {
      return files.find(f => f.name.endsWith(ext));
    }
  }

  /**
   * Install project dependencies
   */
  async _installDependencies(project, options) {
    const langConfig = this.supportedLanguages[project.language];
    if (!langConfig || !langConfig.packageManager) {
      return; // No package manager for this language
    }

    // This would typically run in the same container as execution
    // For now, we'll just log the dependencies that would be installed
    console.log(`Installing dependencies for ${project.name}:`, 
      project.dependencies.map(d => `${d.name}@${d.version}`).join(', '));
  }

  /**
   * Get enhanced execution statistics including project info
   */
  getEnhancedStats() {
    const baseStats = this.getStats();
    const vfsStats = this.vfs.getStats();
    
    return {
      ...baseStats,
      projects: vfsStats.totalProjects,
      projectsByLanguage: vfsStats.languageStats,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { EnhancedCodeExecutionService };