/**
 * PrismJS Initialization Utility
 * Handles dynamic loading and initialization of PrismJS for syntax highlighting
 */

// Global Prism instance
let Prism: any = null;

/**
 * List of supported programming languages for PrismJS
 * @constant
 */
const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript', 
  'jsx',
  'tsx',
  'python',
  'java',
  'cpp',
  'csharp',
  'css',
  'json',
  'yaml',
  'markdown',
  'sql',
  'bash',
  'rust',
  'go',
  'php'
] as const;

/**
 * Initialize PrismJS with all supported languages
 * Handles dynamic imports to avoid SSR issues
 * @returns Promise that resolves to the Prism instance or null if initialization fails
 * @example
 * ```typescript
 * const prism = await initializePrism();
 * if (prism) {
 *   prism.highlightAll();
 * }
 * ```
 */
export async function initializePrism(): Promise<any> {
  try {
    // Only initialize in browser environment
    if (typeof window === 'undefined' || Prism) {
      return Prism;
    }

    // Import core PrismJS
    const prismModule = await import('prismjs');
    Prism = prismModule.default;
    
    // Make Prism available globally for components that expect it
    (window as any).Prism = Prism;
    
    // Import theme with type assertion to avoid TS error
    await import('prismjs/themes/prism-tomorrow.css' as any);
    
    // Create language import promises
    const languageImports = SUPPORTED_LANGUAGES.map(lang => 
      import(`prismjs/components/prism-${lang}` as any).catch(error => {
        console.warn(`Failed to load PrismJS language component '${lang}':`, error);
        return null;
      })
    );
    
    // Load all languages, handling any failures gracefully
    const results = await Promise.allSettled(languageImports);
    
    // Log successful and failed imports for debugging
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;
    
    console.log(`PrismJS initialized: ${successful} languages loaded, ${failed} failed`);
    
    return Prism;
  } catch (error) {
    console.error('Failed to initialize PrismJS:', error);
    return null;
  }
}

/**
 * Apply syntax highlighting to all code blocks on the page
 * Safely handles cases where Prism is not available
 * @param delay - Optional delay in milliseconds before highlighting (default: 100)
 * @returns Promise that resolves when highlighting is complete
 * @example
 * ```typescript
 * await applySyntaxHighlighting();
 * // or with custom delay
 * await applySyntaxHighlighting(200);
 * ```
 */
export async function applySyntaxHighlighting(delay: number = 100): Promise<void> {
  try {
    // Ensure Prism is loaded
    const prismInstance = await initializePrism();
    if (!prismInstance?.highlightAll) {
      console.warn('PrismJS not available for syntax highlighting');
      return;
    }

    // Use setTimeout to ensure DOM is ready
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        try {
          prismInstance.highlightAll();
          resolve();
        } catch (highlightError) {
          console.error('Error during syntax highlighting:', highlightError);
          resolve(); // Continue without syntax highlighting rather than crashing
        }
      }, delay);
    });
  } catch (error) {
    console.error('Failed to apply syntax highlighting:', error);
  }
}

/**
 * Highlight a specific code element
 * @param element - The DOM element containing code to highlight
 * @param language - Optional language identifier for highlighting
 * @returns Promise that resolves when highlighting is complete
 * @example
 * ```typescript
 * const codeElement = document.querySelector('code');
 * await highlightElement(codeElement, 'javascript');
 * ```
 */
export async function highlightElement(element: Element, language?: string): Promise<void> {
  try {
    const prismInstance = await initializePrism();
    if (!prismInstance) {
      return;
    }

    if (language && prismInstance.languages[language]) {
      // Set language class if specified
      element.className = `language-${language}`;
    }

    // Highlight the specific element
    prismInstance.highlightElement(element);
  } catch (error) {
    console.error('Failed to highlight element:', error);
  }
}

/**
 * Check if PrismJS is initialized and ready
 * @returns True if Prism is available, false otherwise
 * @example
 * ```typescript
 * if (isPrismReady()) {
 *   // Safe to use Prism features
 * }
 * ```
 */
export function isPrismReady(): boolean {
  return Prism !== null && typeof Prism === 'object' && typeof Prism.highlightAll === 'function';
}

/**
 * Get the current Prism instance
 * @returns The Prism instance or null if not initialized
 * @example
 * ```typescript
 * const prism = getPrismInstance();
 * if (prism) {
 *   // Use prism directly
 * }
 * ```
 */
export function getPrismInstance(): any {
  return Prism;
}

/**
 * Reset PrismJS instance (useful for testing or reinitialization)
 * @example
 * ```typescript
 * resetPrism();
 * await initializePrism(); // Reinitialize
 * ```
 */
export function resetPrism(): void {
  Prism = null;
  if (typeof window !== 'undefined') {
    delete (window as any).Prism;
  }
}

/**
 * Get list of supported languages
 * @returns Array of supported language identifiers
 * @example
 * ```typescript
 * const languages = getSupportedLanguages();
 * console.log(languages); // ['javascript', 'typescript', 'python', ...]
 * ```
 */
export function getSupportedLanguages(): readonly string[] {
  return SUPPORTED_LANGUAGES;
}

/**
 * Check if a language is supported by the current PrismJS setup
 * @param language - The language identifier to check
 * @returns True if the language is supported
 * @example
 * ```typescript
 * const isSupported = isLanguageSupported('javascript'); // true
 * const notSupported = isLanguageSupported('cobol'); // false
 * ```
 */
export function isLanguageSupported(language: string): boolean {
  return SUPPORTED_LANGUAGES.includes(language as any);
}
