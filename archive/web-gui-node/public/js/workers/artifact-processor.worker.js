/**
 * DinoAir Artifact Processing Worker
 * Handles heavy artifact processing tasks in background thread
 */

// Import JSZip for file compression/decompression
importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');

class ArtifactProcessor {
  constructor() {
    this.processingQueue = [];
    this.isProcessing = false;

    console.log('[Artifact Worker] Initialized');
  }

  /**
   * Process incoming messages from main thread
   */
  handleMessage(event) {
    const { type, id, data } = event.data;

    console.log(`[Artifact Worker] Received message: ${type}`);

    switch (type) {
      case 'PROCESS_ARTIFACT':
        this.processArtifact(id, data);
        break;
      case 'COMPRESS_FILES':
        this.compressFiles(id, data);
        break;
      case 'DECOMPRESS_ARCHIVE':
        this.decompressArchive(id, data);
        break;
      case 'ANALYZE_CODE':
        this.analyzeCode(id, data);
        break;
      case 'GENERATE_PREVIEW':
        this.generatePreview(id, data);
        break;
      case 'VALIDATE_ARTIFACT':
        this.validateArtifact(id, data);
        break;
      case 'BATCH_PROCESS':
        this.batchProcess(id, data);
        break;
      default:
        this.sendError(id, `Unknown message type: ${type}`);
    }
  }

  /**
   * Process a single artifact
   */
  async processArtifact(id, data) {
    try {
      const { content, type, metadata } = data;

      this.sendProgress(id, 'Processing artifact...', 10);

      const result = {
        id: data.id,
        type,
        metadata: {
          ...metadata,
          processedAt: new Date().toISOString(),
          size: content.length,
          lines: this.countLines(content),
          words: this.countWords(content),
          characters: content.length
        }
      };

      this.sendProgress(id, 'Analyzing content...', 30);

      // Analyze content based on type
      if (type === 'code') {
        result.analysis = await this.analyzeCodeContent(content, metadata.language);
      } else if (type === 'text') {
        result.analysis = await this.analyzeTextContent(content);
      } else if (type === 'data') {
        result.analysis = await this.analyzeDataContent(content);
      }

      this.sendProgress(id, 'Generating preview...', 60);

      // Generate preview
      result.preview = this.generateContentPreview(content, type);

      this.sendProgress(id, 'Validating artifact...', 80);

      // Validate artifact
      result.validation = this.validateArtifactContent(content, type);

      this.sendProgress(id, 'Complete', 100);

      this.sendSuccess(id, result);
    } catch (error) {
      console.error('[Artifact Worker] Processing error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Compress multiple files into a ZIP archive
   */
  async compressFiles(id, data) {
    try {
      const { files, options = {} } = data;

      this.sendProgress(id, 'Initializing compression...', 5);

      const zip = new JSZip();
      let processedFiles = 0;

      // Add files to ZIP
      for (const file of files) {
        const { name, content, type } = file;

        if (type === 'text' || type === 'code') {
          zip.file(name, content);
        } else if (type === 'binary') {
          // Handle binary data
          const binaryData = this.base64ToArrayBuffer(content);
          zip.file(name, binaryData);
        }

        processedFiles++;
        const progress = Math.round((processedFiles / files.length) * 70) + 10;
        this.sendProgress(id, `Adding file ${processedFiles}/${files.length}...`, progress);
      }

      this.sendProgress(id, 'Generating archive...', 85);

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: {
          level: options.compressionLevel || 6
        }
      });

      this.sendProgress(id, 'Complete', 100);

      // Convert to base64 for transfer
      const base64Data = this.arrayBufferToBase64(zipBlob);

      this.sendSuccess(id, {
        data: base64Data,
        size: zipBlob.byteLength,
        originalSize: files.reduce((total, file) => total + file.content.length, 0),
        compressionRatio: Math.round((1 - zipBlob.byteLength / files.reduce((total, file) => total + file.content.length, 0)) * 100)
      });
    } catch (error) {
      console.error('[Artifact Worker] Compression error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Decompress ZIP archive
   */
  async decompressArchive(id, data) {
    try {
      const { archiveData, options = {} } = data;

      this.sendProgress(id, 'Loading archive...', 10);

      // Convert base64 to ArrayBuffer
      const arrayBuffer = this.base64ToArrayBuffer(archiveData);

      this.sendProgress(id, 'Reading archive structure...', 20);

      // Load ZIP file
      const zip = await JSZip.loadAsync(arrayBuffer);

      const files = [];
      const fileNames = Object.keys(zip.files);
      let processedFiles = 0;

      this.sendProgress(id, 'Extracting files...', 30);

      // Extract files
      for (const fileName of fileNames) {
        const file = zip.files[fileName];

        if (!file.dir) {
          let content;
          const fileExtension = fileName.split('.').pop().toLowerCase();

          // Determine if file is text or binary
          if (this.isTextFile(fileExtension)) {
            content = await file.async('text');
          } else {
            const arrayBuffer = await file.async('arraybuffer');
            content = this.arrayBufferToBase64(arrayBuffer);
          }

          files.push({
            name: fileName,
            content,
            size: file._data ? file._data.uncompressedSize : content.length,
            type: this.getFileType(fileExtension),
            lastModified: file.date
          });
        }

        processedFiles++;
        const progress = Math.round((processedFiles / fileNames.length) * 60) + 30;
        this.sendProgress(id, `Extracting ${processedFiles}/${fileNames.length}...`, progress);
      }

      this.sendProgress(id, 'Complete', 100);

      this.sendSuccess(id, {
        files,
        totalFiles: files.length,
        totalSize: files.reduce((total, file) => total + file.size, 0)
      });
    } catch (error) {
      console.error('[Artifact Worker] Decompression error:', error);
      this.sendError(id, error.message);
    }
  }

  /**
   * Analyze code content
   */
  async analyzeCodeContent(content, language) {
    const analysis = {
      language,
      complexity: this.calculateComplexity(content, language),
      functions: this.extractFunctions(content, language),
      imports: this.extractImports(content, language),
      comments: this.extractComments(content, language),
      todos: this.extractTodos(content),
      metrics: {
        cyclomaticComplexity: this.calculateCyclomaticComplexity(content, language),
        maintainabilityIndex: this.calculateMaintainabilityIndex(content),
        duplicateLines: this.findDuplicateLines(content)
      }
    };

    return analysis;
  }

  /**
   * Analyze text content
   */
  async analyzeTextContent(content) {
    const analysis = {
      readabilityScore: this.calculateReadabilityScore(content),
      sentiment: this.analyzeSentiment(content),
      keywords: this.extractKeywords(content),
      structure: this.analyzeTextStructure(content),
      statistics: {
        sentences: this.countSentences(content),
        paragraphs: this.countParagraphs(content),
        averageWordsPerSentence: this.calculateAverageWordsPerSentence(content)
      }
    };

    return analysis;
  }

  /**
   * Analyze data content (JSON, CSV, etc.)
   */
  async analyzeDataContent(content) {
    try {
      let data;
      let format = 'unknown';

      // Try to parse as JSON
      try {
        data = JSON.parse(content);
        format = 'json';
      } catch {
        // Try to parse as CSV
        if (content.includes(',') && content.includes('\n')) {
          data = this.parseCSV(content);
          format = 'csv';
        }
      }

      const analysis = {
        format,
        structure: this.analyzeDataStructure(data),
        schema: this.generateSchema(data),
        statistics: this.calculateDataStatistics(data)
      };

      return analysis;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Generate content preview
   */
  generateContentPreview(content, type) {
    const maxLength = 500;

    if (content.length <= maxLength) {
      return content;
    }

    if (type === 'code') {
      // For code, try to preserve complete lines
      const lines = content.split('\n');
      let preview = '';

      for (const line of lines) {
        if (preview.length + line.length + 1 <= maxLength) {
          preview += `${line}\n`;
        } else {
          break;
        }
      }

      return `${preview}...`;
    }

    // For text, cut at word boundary
    const words = content.substring(0, maxLength).split(' ');
    words.pop(); // Remove potentially incomplete last word
    return `${words.join(' ')}...`;
  }

  /**
   * Validate artifact content
   */
  validateArtifactContent(content, type) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Basic validations
    if (!content || content.trim().length === 0) {
      validation.isValid = false;
      validation.errors.push('Content is empty');
    }

    if (content.length > 1000000) { // 1MB limit
      validation.warnings.push('Content is very large and may impact performance');
    }

    // Type-specific validations
    if (type === 'code') {
      this.validateCode(content, validation);
    } else if (type === 'data') {
      this.validateData(content, validation);
    }

    return validation;
  }

  /**
   * Batch process multiple artifacts
   */
  async batchProcess(id, data) {
    try {
      const { artifacts, options = {} } = data;
      const results = [];
      let processed = 0;

      this.sendProgress(id, 'Starting batch processing...', 5);

      for (const artifact of artifacts) {
        try {
          // Process each artifact
          const result = await this.processArtifactSync(artifact);
          results.push(result);

          processed++;
          const progress = Math.round((processed / artifacts.length) * 90) + 5;
          this.sendProgress(id, `Processed ${processed}/${artifacts.length} artifacts...`, progress);
        } catch (error) {
          results.push({
            id: artifact.id,
            error: error.message
          });
        }
      }

      this.sendProgress(id, 'Complete', 100);

      this.sendSuccess(id, {
        results,
        totalProcessed: processed,
        totalErrors: results.filter(r => r.error).length
      });
    } catch (error) {
      console.error('[Artifact Worker] Batch processing error:', error);
      this.sendError(id, error.message);
    }
  }

  // Utility methods
  countLines(content) {
    return content.split('\n').length;
  }

  countWords(content) {
    return content.trim().split(/\s+/).length;
  }

  countSentences(content) {
    return content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }

  countParagraphs(content) {
    return content.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  }

  calculateComplexity(content, language) {
    // Simple complexity calculation based on nesting and control structures
    const controlStructures = ['if', 'for', 'while', 'switch', 'try', 'catch'];
    let complexity = 1; // Base complexity

    for (const structure of controlStructures) {
      const regex = new RegExp(`\\b${structure}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  extractFunctions(content, language) {
    const functions = [];

    // Simple function extraction (can be enhanced for specific languages)
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }

    return functions;
  }

  extractImports(content, language) {
    const imports = [];

    // Extract import statements
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  extractComments(content, language) {
    const comments = [];

    // Extract single-line comments
    const singleLineRegex = /\/\/(.*)$/gm;
    let match;

    while ((match = singleLineRegex.exec(content)) !== null) {
      comments.push({
        type: 'single',
        content: match[1].trim(),
        line: content.substring(0, match.index).split('\n').length
      });
    }

    // Extract multi-line comments
    const multiLineRegex = /\/\*([\s\S]*?)\*\//g;
    while ((match = multiLineRegex.exec(content)) !== null) {
      comments.push({
        type: 'multi',
        content: match[1].trim(),
        line: content.substring(0, match.index).split('\n').length
      });
    }

    return comments;
  }

  extractTodos(content) {
    const todos = [];
    const todoRegex = /(?:TODO|FIXME|HACK|NOTE):\s*(.*)$/gmi;
    let match;

    while ((match = todoRegex.exec(content)) !== null) {
      todos.push({
        type: match[0].split(':')[0].toUpperCase(),
        content: match[1].trim(),
        line: content.substring(0, match.index).split('\n').length
      });
    }

    return todos;
  }

  calculateCyclomaticComplexity(content, language) {
    // Simplified cyclomatic complexity calculation
    const complexityKeywords = ['if', 'else', 'for', 'while', 'case', 'catch', '&&', '||'];
    let complexity = 1;

    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  calculateMaintainabilityIndex(content) {
    // Simplified maintainability index
    const lines = this.countLines(content);
    const complexity = this.calculateComplexity(content);

    // Formula: 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code)
    // Simplified version
    return Math.max(0, Math.round(100 - (complexity * 2) - (lines * 0.1)));
  }

  findDuplicateLines(content) {
    const lines = content.split('\n');
    const lineCount = {};
    const duplicates = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        if (lineCount[trimmed]) {
          lineCount[trimmed].push(index + 1);
        } else {
          lineCount[trimmed] = [index + 1];
        }
      }
    });

    Object.entries(lineCount).forEach(([line, occurrences]) => {
      if (occurrences.length > 1) {
        duplicates.push({
          line,
          occurrences
        });
      }
    });

    return duplicates;
  }

  calculateReadabilityScore(content) {
    // Simplified Flesch Reading Ease score
    const sentences = this.countSentences(content);
    const words = this.countWords(content);
    const syllables = this.countSyllables(content);

    if (sentences === 0 || words === 0) { return 0; }

    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  countSyllables(content) {
    // Simple syllable counting
    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    let syllables = 0;

    words.forEach(word => {
      const vowels = word.match(/[aeiouy]+/g);
      syllables += vowels ? vowels.length : 1;
    });

    return syllables;
  }

  analyzeSentiment(content) {
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing', 'poor'];

    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    let positive = 0;
    let negative = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) { positive++; }
      if (negativeWords.includes(word)) { negative++; }
    });

    const total = positive + negative;
    if (total === 0) { return 'neutral'; }

    const score = (positive - negative) / total;
    if (score > 0.1) { return 'positive'; }
    if (score < -0.1) { return 'negative'; }
    return 'neutral';
  }

  extractKeywords(content) {
    // Simple keyword extraction
    const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordCount = {};

    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }

  analyzeTextStructure(content) {
    const lines = content.split('\n');
    const structure = {
      headings: [],
      lists: [],
      codeBlocks: []
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Detect headings (markdown style)
      if (trimmed.startsWith('#')) {
        const level = trimmed.match(/^#+/)[0].length;
        structure.headings.push({
          level,
          text: trimmed.substring(level).trim(),
          line: index + 1
        });
      }

      // Detect lists
      if (trimmed.match(/^[-*+]\s/) || trimmed.match(/^\d+\.\s/)) {
        structure.lists.push({
          type: trimmed.match(/^\d+\./) ? 'ordered' : 'unordered',
          text: trimmed,
          line: index + 1
        });
      }

      // Detect code blocks
      if (trimmed.startsWith('```')) {
        structure.codeBlocks.push({
          language: trimmed.substring(3).trim(),
          line: index + 1
        });
      }
    });

    return structure;
  }

  calculateAverageWordsPerSentence(content) {
    const sentences = this.countSentences(content);
    const words = this.countWords(content);

    return sentences > 0 ? Math.round(words / sentences) : 0;
  }

  parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }

    return data;
  }

  analyzeDataStructure(data) {
    if (Array.isArray(data)) {
      return {
        type: 'array',
        length: data.length,
        itemTypes: this.getArrayItemTypes(data)
      };
    } else if (typeof data === 'object' && data !== null) {
      return {
        type: 'object',
        keys: Object.keys(data),
        keyCount: Object.keys(data).length
      };
    }
    return {
      type: typeof data,
      value: data
    };
  }

  getArrayItemTypes(array) {
    const types = {};
    array.forEach(item => {
      const type = Array.isArray(item) ? 'array' : typeof item;
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  generateSchema(data) {
    // Simple schema generation
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      if (typeof firstItem === 'object') {
        const schema = {};
        Object.keys(firstItem).forEach(key => {
          const types = [...new Set(data.map(item => typeof item[key]))];
          schema[key] = types.length === 1 ? types[0] : types;
        });
        return schema;
      }
    }

    return null;
  }

  calculateDataStatistics(data) {
    const stats = {
      totalItems: 0,
      dataTypes: {}
    };

    if (Array.isArray(data)) {
      stats.totalItems = data.length;
      data.forEach(item => {
        const type = typeof item;
        stats.dataTypes[type] = (stats.dataTypes[type] || 0) + 1;
      });
    }

    return stats;
  }

  validateCode(content, validation) {
    // Basic code validation
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack = [];

    for (const char of content) {
      if (brackets[char]) {
        stack.push(brackets[char]);
      } else if (Object.values(brackets).includes(char)) {
        if (stack.length === 0 || stack.pop() !== char) {
          validation.errors.push('Mismatched brackets detected');
          validation.isValid = false;
          break;
        }
      }
    }

    if (stack.length > 0) {
      validation.errors.push('Unclosed brackets detected');
      validation.isValid = false;
    }
  }

  validateData(content, validation) {
    // Try to parse as JSON
    try {
      JSON.parse(content);
    } catch (error) {
      validation.warnings.push('Content is not valid JSON');
    }
  }

  isTextFile(extension) {
    const textExtensions = ['txt', 'md', 'js', 'ts', 'html', 'css', 'json', 'xml', 'csv', 'py', 'java', 'cpp', 'c', 'h'];
    return textExtensions.includes(extension);
  }

  getFileType(extension) {
    const codeExtensions = ['js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'xml'];
    const dataExtensions = ['json', 'csv', 'xml'];

    if (codeExtensions.includes(extension)) { return 'code'; }
    if (dataExtensions.includes(extension)) { return 'data'; }
    return 'text';
  }

  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async processArtifactSync(artifact) {
    // Synchronous version of processArtifact for batch processing
    const { content, type, metadata } = artifact;

    const result = {
      id: artifact.id,
      type,
      metadata: {
        ...metadata,
        processedAt: new Date().toISOString(),
        size: content.length,
        lines: this.countLines(content),
        words: this.countWords(content),
        characters: content.length
      }
    };

    // Analyze content based on type
    if (type === 'code') {
      result.analysis = await this.analyzeCodeContent(content, metadata.language);
    } else if (type === 'text') {
      result.analysis = await this.analyzeTextContent(content);
    } else if (type === 'data') {
      result.analysis = await this.analyzeDataContent(content);
    }

    // Generate preview
    result.preview = this.generateContentPreview(content, type);

    // Validate artifact
    result.validation = this.validateArtifactContent(content, type);

    return result;
  }

  // Communication methods
  sendProgress(id, message, progress) {
    self.postMessage({
      type: 'PROGRESS',
      id,
      data: { message, progress }
    });
  }

  sendSuccess(id, result) {
    self.postMessage({
      type: 'SUCCESS',
      id,
      data: result
    });
  }

  sendError(id, error) {
    self.postMessage({
      type: 'ERROR',
      id,
      data: { error }
    });
  }
}

// Initialize worker
const processor = new ArtifactProcessor();

// Listen for messages from main thread
self.addEventListener('message', event => {
  processor.handleMessage(event);
});

console.log('[Artifact Worker] Worker script loaded and ready');
