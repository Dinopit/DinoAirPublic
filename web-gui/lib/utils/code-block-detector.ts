interface CodeBlock {
  language: string;
  code: string;
  startIndex: number;
  endIndex: number;
}

interface ArtifactInfo {
  name: string;
  type: string;
  content: string;
}

export class CodeBlockDetector {
  /**
   * Detect code blocks in a message using markdown fence syntax
   */
  public static detectCodeBlocks(message: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    
    // Regex to match code blocks with optional language
    // Matches ```language\n...code...\n```
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    
    let match;
    while ((match = codeBlockRegex.exec(message)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
    
    return codeBlocks;
  }

  /**
   * Generate a filename based on the code content and language
   */
  public static generateFilename(codeBlock: CodeBlock, index: number): string {
    const timestamp = Date.now();
    const languageExtMap: Record<string, string> = {
      'javascript': 'js',
      'typescript': 'ts',
      'typescriptreact': 'tsx',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'python': 'py',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'csharp': 'cs',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yml',
      'markdown': 'md',
      'md': 'md',
      'xml': 'xml',
      'sql': 'sql',
      'shell': 'sh',
      'bash': 'sh',
      'sh': 'sh',
      'powershell': 'ps1',
      'dockerfile': 'dockerfile',
      'rust': 'rs',
      'go': 'go',
      'php': 'php',
      'ruby': 'rb',
      'swift': 'swift',
      'kotlin': 'kt',
      'r': 'r',
      'lua': 'lua',
      'perl': 'pl',
      'toml': 'toml',
      'ini': 'ini',
      'vue': 'vue',
      'svelte': 'svelte',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less'
    };

    const lowerLang = codeBlock.language.toLowerCase();
    const extension = languageExtMap[lowerLang] || 'txt';
    
    // Try to extract a meaningful name from the code
    let baseName = `code-${index + 1}`;
    
    // Check for common patterns to extract a better name
    const lines = codeBlock.code.split('\n');
    
    // Look for function/class/component names
    const functionMatch = lines[0].match(/(?:function|const|let|var|def|class|interface|type|export\s+default\s+function)\s+(\w+)/);
    if (functionMatch) {
      baseName = functionMatch[1];
    } else {
      // Look for React component
      const componentMatch = codeBlock.code.match(/(?:const|function|class)\s+(\w+)\s*[:=]?\s*(?:\(|React\.FC|Component)/);
      if (componentMatch) {
        baseName = componentMatch[1];
      } else {
        // Look for Python class/function
        const pythonMatch = codeBlock.code.match(/(?:class|def)\s+(\w+)/);
        if (pythonMatch) {
          baseName = pythonMatch[1];
        }
      }
    }
    
    return `${baseName}-${timestamp}.${extension}`;
  }

  /**
   * Convert code blocks to artifact info
   */
  public static codeBlocksToArtifacts(codeBlocks: CodeBlock[]): ArtifactInfo[] {
    return codeBlocks.map((block, index) => ({
      name: this.generateFilename(block, index),
      type: block.language || 'text',
      content: block.code
    }));
  }

  /**
   * Check if a message contains code blocks
   */
  public static hasCodeBlocks(message: string): boolean {
    const codeBlockRegex = /```[\s\S]*?```/;
    return codeBlockRegex.test(message);
  }

  /**
   * Extract inline code snippets (single backticks)
   */
  public static extractInlineCode(message: string): string[] {
    const inlineCodeRegex = /`([^`]+)`/g;
    const snippets: string[] = [];
    
    let match;
    while ((match = inlineCodeRegex.exec(message)) !== null) {
      // Only consider it if it's substantial (not just a single word)
      if (match[1].length > 20 || match[1].includes('\n')) {
        snippets.push(match[1]);
      }
    }
    
    return snippets;
  }

  /**
   * Determine if inline code should be converted to an artifact
   */
  public static shouldCreateArtifactFromInline(code: string): boolean {
    // Create artifact if:
    // - Multiple lines
    // - Contains common code patterns
    // - Longer than 50 characters
    
    if (code.includes('\n')) return true;
    if (code.length > 50) return true;
    
    // Check for code patterns
    const codePatterns = [
      /function\s+\w+/,
      /class\s+\w+/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /def\s+\w+/,
      /import\s+/,
      /export\s+/,
      /return\s+/,
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/
    ];
    
    return codePatterns.some(pattern => pattern.test(code));
  }
}