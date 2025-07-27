/**
 * File Type Utilities
 * Provides utilities for handling different file types, icons, and language mappings
 */

/**
 * Map of file types to their corresponding emoji icons
 * @constant
 */
const FILE_TYPE_ICONS: Record<string, string> = {
  'javascript': '🟨',
  'typescript': '🔷',
  'typescriptreact': '⚛️',
  'javascriptreact': '⚛️',
  'python': '🐍',
  'java': '☕',
  'cpp': '🔧',
  'c': '🔧',
  'csharp': '🟦',
  'html': '🌐',
  'css': '🎨',
  'json': '📋',
  'yaml': '📝',
  'yml': '📝',
  'markdown': '📄',
  'md': '📄',
  'text': '📝',
  'sql': '🗃️',
  'shell': '🖥️',
  'bash': '🖥️',
  'rust': '🦀',
  'go': '🐹',
  'php': '🐘'
};

/**
 * Map of file types to their corresponding PrismJS language identifiers
 * @constant
 */
const PRISM_LANGUAGE_MAP: Record<string, string> = {
  'javascript': 'javascript',
  'typescript': 'typescript',
  'typescriptreact': 'tsx',
  'javascriptreact': 'jsx',
  'jsx': 'jsx',
  'tsx': 'tsx',
  'python': 'python',
  'java': 'java',
  'cpp': 'cpp',
  'c': 'c',
  'csharp': 'csharp',
  'html': 'markup',
  'css': 'css',
  'json': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  'markdown': 'markdown',
  'md': 'markdown',
  'sql': 'sql',
  'shell': 'bash',
  'bash': 'bash',
  'rust': 'rust',
  'go': 'go',
  'php': 'php'
};

/**
 * Get the emoji icon for a given file type
 * @param type - The file type (e.g., 'javascript', 'python', 'typescript')
 * @returns The corresponding emoji icon or a default document icon
 * @example
 * ```typescript
 * const icon = getFileTypeIcon('javascript'); // Returns '🟨'
 * const unknownIcon = getFileTypeIcon('unknown'); // Returns '📄'
 * ```
 */
export function getFileTypeIcon(type: string): string {
  return FILE_TYPE_ICONS[type.toLowerCase()] || '📄';
}

/**
 * Get the PrismJS language identifier for syntax highlighting
 * @param type - The file type (e.g., 'javascript', 'python', 'typescript')
 * @returns The corresponding PrismJS language identifier or 'text' as fallback
 * @example
 * ```typescript
 * const lang = getPrismLanguage('typescript'); // Returns 'typescript'
 * const fallback = getPrismLanguage('unknown'); // Returns 'text'
 * ```
 */
export function getPrismLanguage(type: string): string {
  return PRISM_LANGUAGE_MAP[type.toLowerCase()] || 'text';
}

/**
 * Check if a file type is supported for syntax highlighting
 * @param type - The file type to check
 * @returns True if the file type has syntax highlighting support
 * @example
 * ```typescript
 * const isSupported = isSyntaxHighlightingSupported('javascript'); // Returns true
 * const notSupported = isSyntaxHighlightingSupported('binary'); // Returns false
 * ```
 */
export function isSyntaxHighlightingSupported(type: string): boolean {
  return type.toLowerCase() in PRISM_LANGUAGE_MAP;
}

/**
 * Get all supported file types
 * @returns Array of all supported file type identifiers
 * @example
 * ```typescript
 * const types = getSupportedFileTypes();
 * // Returns ['javascript', 'typescript', 'python', ...]
 * ```
 */
export function getSupportedFileTypes(): string[] {
  return Object.keys(FILE_TYPE_ICONS);
}

/**
 * Get file extension from file type
 * @param type - The file type
 * @returns The typical file extension for the type
 * @example
 * ```typescript
 * const ext = getFileExtension('javascript'); // Returns '.js'
 * const ext2 = getFileExtension('typescript'); // Returns '.ts'
 * ```
 */
export function getFileExtension(type: string): string {
  const extensionMap: Record<string, string> = {
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
    'sql': '.sql',
    'shell': '.sh',
    'bash': '.sh',
    'rust': '.rs',
    'go': '.go',
    'php': '.php'
  };
  
  return extensionMap[type.toLowerCase()] || '.txt';
}

/**
 * Determine file type from file extension
 * @param filename - The filename or extension
 * @returns The detected file type or 'text' as fallback
 * @example
 * ```typescript
 * const type = getFileTypeFromExtension('script.js'); // Returns 'javascript'
 * const type2 = getFileTypeFromExtension('.py'); // Returns 'python'
 * ```
 */
export function getFileTypeFromExtension(filename: string): string {
  const extension = filename.toLowerCase().includes('.') 
    ? filename.substring(filename.lastIndexOf('.'))
    : filename;
    
  const typeMap: Record<string, string> = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescriptreact',
    '.jsx': 'javascriptreact',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.html': 'html',
    '.css': 'css',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.txt': 'text',
    '.sql': 'sql',
    '.sh': 'bash',
    '.rs': 'rust',
    '.go': 'go',
    '.php': 'php'
  };
  
  return typeMap[extension] || 'text';
}
