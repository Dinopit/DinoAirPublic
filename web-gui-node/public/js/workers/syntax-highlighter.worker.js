/**
 * DinoAir Syntax Highlighter Worker
 * Handles syntax highlighting operations in background thread
 */

// Import Prism.js for syntax highlighting
importScripts('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-java.min.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js');

class SyntaxHighlighter {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 100;

    console.log('[Syntax Worker] Initialized');
  }

  handleMessage(event) {
    const { type, id, data } = event.data;

    switch (type) {
      case 'HIGHLIGHT_CODE':
        this.highlightCode(id, data);
        break;
      case 'HIGHLIGHT_BATCH':
        this.highlightBatch(id, data);
        break;
      case 'CLEAR_CACHE':
        this.clearCache(id, data);
        break;
      default:
        this.sendError(id, `Unknown message type: ${type}`);
    }
  }

  async highlightCode(id, data) {
    try {
      const { code, language, options = {} } = data;

      // Check cache first
      const cacheKey = `${language}:${this.hashCode(code)}`;
      if (this.cache.has(cacheKey)) {
        this.sendSuccess(id, {
          highlighted: this.cache.get(cacheKey),
          fromCache: true
        });
        return;
      }

      this.sendProgress(id, 'Highlighting code...', 50);

      // Highlight code
      const highlighted = this.performHighlighting(code, language, options);

      // Cache result
      this.addToCache(cacheKey, highlighted);

      this.sendProgress(id, 'Complete', 100);

      this.sendSuccess(id, {
        highlighted,
        fromCache: false
      });
    } catch (error) {
      console.error('[Syntax Worker] Highlighting error:', error);
      this.sendError(id, error.message);
    }
  }

  async highlightBatch(id, data) {
    try {
      const { items } = data;
      const results = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const progress = Math.round((i / items.length) * 100);
        this.sendProgress(id, `Processing ${i + 1}/${items.length}...`, progress);

        try {
          const highlighted = this.performHighlighting(item.code, item.language, item.options);
          results.push({
            id: item.id,
            highlighted,
            success: true
          });
        } catch (error) {
          results.push({
            id: item.id,
            error: error.message,
            success: false
          });
        }
      }

      this.sendSuccess(id, { results });
    } catch (error) {
      console.error('[Syntax Worker] Batch highlighting error:', error);
      this.sendError(id, error.message);
    }
  }

  performHighlighting(code, language, options) {
    // Normalize language name
    const normalizedLang = this.normalizeLanguage(language);

    // Check if language is supported
    if (!Prism.languages[normalizedLang]) {
      return this.createFallbackHighlighting(code);
    }

    // Perform highlighting
    const highlighted = Prism.highlight(code, Prism.languages[normalizedLang], normalizedLang);

    return {
      html: highlighted,
      language: normalizedLang,
      lineCount: code.split('\n').length
    };
  }

  normalizeLanguage(language) {
    const langMap = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      cpp: 'cpp',
      'c++': 'cpp',
      html: 'markup',
      xml: 'markup'
    };

    return langMap[language.toLowerCase()] || language.toLowerCase();
  }

  createFallbackHighlighting(code) {
    // Simple fallback highlighting
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return {
      html: `<span class="token plain">${escaped}</span>`,
      language: 'plain',
      lineCount: code.split('\n').length
    };
  }

  addToCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clearCache(id, data) {
    this.cache.clear();
    this.sendSuccess(id, { cleared: true });
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash; // Convert to 32-bit integer
    }
    return hash;
  }

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

const highlighter = new SyntaxHighlighter();

self.addEventListener('message', event => {
  highlighter.handleMessage(event);
});

console.log('[Syntax Worker] Worker script loaded and ready');
