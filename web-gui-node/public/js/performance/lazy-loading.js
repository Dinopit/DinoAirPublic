/**
 * DinoAir Advanced Lazy Loading and Virtualization
 * Implements intersection observer, virtual scrolling, and progressive loading
 */

class LazyLoadingManager {
  constructor() {
    this.intersectionObserver = null;
    this.virtualScrollers = new Map();
    this.lazyImages = new Set();
    this.lazyComponents = new Set();

    this.init();
  }

  init() {
    console.log('[Lazy Loading] Initializing...');

    // Initialize intersection observer
    this.initIntersectionObserver();

    // Setup lazy loading for existing elements
    this.setupExistingElements();

    console.log('[Lazy Loading] Initialized successfully');
  }

  initIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
      console.warn('[Lazy Loading] IntersectionObserver not supported, using fallback');
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.handleIntersection(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
      }
    );
  }

  handleIntersection(element) {
    if (element.dataset.lazyType === 'image') {
      this.loadLazyImage(element);
    } else if (element.dataset.lazyType === 'component') {
      this.loadLazyComponent(element);
    } else if (element.dataset.lazyType === 'library') {
      this.loadLazyLibrary(element);
    }
  }

  // Lazy Image Loading with Progressive Enhancement
  setupLazyImages() {
    const images = document.querySelectorAll('img[data-src]');

    images.forEach(img => {
      this.lazyImages.add(img);
      img.dataset.lazyType = 'image';

      // Add blur-up placeholder
      if (img.dataset.placeholder) {
        img.src = img.dataset.placeholder;
        img.style.filter = 'blur(5px)';
        img.style.transition = 'filter 0.3s ease';
      }

      if (this.intersectionObserver) {
        this.intersectionObserver.observe(img);
      } else {
        // Fallback for browsers without IntersectionObserver
        this.loadLazyImage(img);
      }
    });
  }

  loadLazyImage(img) {
    const actualSrc = img.dataset.src;
    if (!actualSrc) { return; }

    // Create new image to preload
    const newImg = new Image();

    newImg.onload = () => {
      // Replace src and remove blur
      img.src = actualSrc;
      img.style.filter = 'none';
      img.classList.add('loaded');

      // Remove from observer
      if (this.intersectionObserver) {
        this.intersectionObserver.unobserve(img);
      }

      this.lazyImages.delete(img);

      console.log('[Lazy Loading] Image loaded:', actualSrc);
    };

    newImg.onerror = () => {
      img.classList.add('error');
      console.error('[Lazy Loading] Failed to load image:', actualSrc);
    };

    newImg.src = actualSrc;
  }

  // Lazy Component Loading
  setupLazyComponents() {
    const components = document.querySelectorAll('[data-lazy-component]');

    components.forEach(element => {
      this.lazyComponents.add(element);
      element.dataset.lazyType = 'component';

      // Add loading placeholder
      element.innerHTML = '<div class="lazy-loading">Loading...</div>';

      if (this.intersectionObserver) {
        this.intersectionObserver.observe(element);
      }
    });
  }

  async loadLazyComponent(element) {
    const componentName = element.dataset.lazyComponent;
    if (!componentName) { return; }

    try {
      console.log('[Lazy Loading] Loading component:', componentName);

      // Show loading state
      element.innerHTML = '<div class="lazy-loading">Loading component...</div>';

      // Dynamic import of component
      const module = await import(`/js/components/${componentName}.js`);
      const Component = module.default || module[componentName];

      if (Component) {
        // Initialize component
        const instance = new Component(element);
        await instance.render();

        element.classList.add('loaded');
        console.log('[Lazy Loading] Component loaded:', componentName);
      }

      // Remove from observer
      if (this.intersectionObserver) {
        this.intersectionObserver.unobserve(element);
      }

      this.lazyComponents.delete(element);
    } catch (error) {
      console.error('[Lazy Loading] Failed to load component:', componentName, error);
      element.innerHTML = '<div class="lazy-error">Failed to load component</div>';
    }
  }

  // Lazy Library Loading
  async loadLazyLibrary(element) {
    const libraryName = element.dataset.lazyLibrary;
    const { libraryUrl } = element.dataset;

    if (!libraryName || !libraryUrl) { return; }

    try {
      console.log('[Lazy Loading] Loading library:', libraryName);

      // Check if library is already loaded
      if (window[libraryName]) {
        this.initializeLibraryComponent(element, libraryName);
        return;
      }

      // Load library script
      await this.loadScript(libraryUrl);

      // Initialize component with library
      this.initializeLibraryComponent(element, libraryName);

      console.log('[Lazy Loading] Library loaded:', libraryName);
    } catch (error) {
      console.error('[Lazy Loading] Failed to load library:', libraryName, error);
    }
  }

  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  initializeLibraryComponent(element, libraryName) {
    // Initialize component based on library
    switch (libraryName) {
      case 'Prism':
        if (window.Prism) {
          window.Prism.highlightAllUnder(element);
        }
        break;
      case 'Chart':
        if (window.Chart && element.dataset.chartConfig) {
          const config = JSON.parse(element.dataset.chartConfig);
          new window.Chart(element, config);
        }
        break;
      default:
        console.log('[Lazy Loading] Unknown library:', libraryName);
    }
  }

  setupExistingElements() {
    this.setupLazyImages();
    this.setupLazyComponents();
  }

  // Add new elements to lazy loading
  observe(element) {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }
  }

  unobserve(element) {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
  }
}

// Virtual Scrolling Implementation
class VirtualScroller {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      itemHeight: options.itemHeight || 50,
      bufferSize: options.bufferSize || 5,
      threshold: options.threshold || 100,
      ...options
    };

    this.items = [];
    this.visibleItems = [];
    this.startIndex = 0;
    this.endIndex = 0;
    this.scrollTop = 0;
    this.containerHeight = 0;

    this.init();
  }

  init() {
    console.log('[Virtual Scroller] Initializing...');

    this.setupContainer();
    this.bindEvents();
    this.calculateVisibleRange();
    this.render();

    console.log('[Virtual Scroller] Initialized successfully');
  }

  setupContainer() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';

    // Create viewport
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'relative';
    this.viewport.style.width = '100%';
    this.container.appendChild(this.viewport);

    // Create content container
    this.content = document.createElement('div');
    this.content.style.position = 'absolute';
    this.content.style.top = '0';
    this.content.style.left = '0';
    this.content.style.width = '100%';
    this.viewport.appendChild(this.content);

    this.containerHeight = this.container.clientHeight;
  }

  bindEvents() {
    this.container.addEventListener('scroll', () => {
      this.handleScroll();
    });

    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  handleScroll() {
    const newScrollTop = this.container.scrollTop;

    if (Math.abs(newScrollTop - this.scrollTop) > this.options.threshold) {
      this.scrollTop = newScrollTop;
      this.calculateVisibleRange();
      this.render();
    }
  }

  handleResize() {
    this.containerHeight = this.container.clientHeight;
    this.calculateVisibleRange();
    this.render();
  }

  calculateVisibleRange() {
    const visibleStart = Math.floor(this.scrollTop / this.options.itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(this.containerHeight / this.options.itemHeight),
      this.items.length - 1
    );

    this.startIndex = Math.max(0, visibleStart - this.options.bufferSize);
    this.endIndex = Math.min(this.items.length - 1, visibleEnd + this.options.bufferSize);
  }

  render() {
    // Clear content
    this.content.innerHTML = '';

    // Set total height
    this.viewport.style.height = `${this.items.length * this.options.itemHeight}px`;

    // Render visible items
    for (let i = this.startIndex; i <= this.endIndex; i++) {
      const item = this.items[i];
      if (!item) { continue; }

      const element = this.renderItem(item, i);
      element.style.position = 'absolute';
      element.style.top = `${i * this.options.itemHeight}px`;
      element.style.width = '100%';
      element.style.height = `${this.options.itemHeight}px`;

      this.content.appendChild(element);
    }

    console.log(`[Virtual Scroller] Rendered items ${this.startIndex}-${this.endIndex}`);
  }

  renderItem(item, index) {
    const element = document.createElement('div');
    element.className = 'virtual-item';
    element.dataset.index = index;

    if (this.options.renderItem) {
      this.options.renderItem(element, item, index);
    } else {
      element.textContent = item.toString();
    }

    return element;
  }

  setItems(items) {
    this.items = items;
    this.calculateVisibleRange();
    this.render();
  }

  addItem(item) {
    this.items.push(item);
    this.calculateVisibleRange();
    this.render();
  }

  removeItem(index) {
    this.items.splice(index, 1);
    this.calculateVisibleRange();
    this.render();
  }

  scrollToIndex(index) {
    const scrollTop = index * this.options.itemHeight;
    this.container.scrollTop = scrollTop;
  }

  getVisibleRange() {
    return {
      start: this.startIndex,
      end: this.endIndex,
      total: this.items.length
    };
  }
}

// Progressive Image Loading with Blur-up
class ProgressiveImageLoader {
  constructor() {
    this.loadingImages = new Map();
  }

  loadImage(src, placeholder = null) {
    return new Promise((resolve, reject) => {
      if (this.loadingImages.has(src)) {
        return this.loadingImages.get(src);
      }

      const promise = new Promise((res, rej) => {
        const img = new Image();

        img.onload = () => {
          this.loadingImages.delete(src);
          res({
            src,
            width: img.naturalWidth,
            height: img.naturalHeight,
            element: img
          });
        };

        img.onerror = () => {
          this.loadingImages.delete(src);
          rej(new Error(`Failed to load image: ${src}`));
        };

        img.src = src;
      });

      this.loadingImages.set(src, promise);
      return promise;
    });
  }

  createProgressiveImage(container, src, placeholder = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'progressive-image';
    wrapper.style.position = 'relative';
    wrapper.style.overflow = 'hidden';

    // Create placeholder
    if (placeholder) {
      const placeholderImg = document.createElement('img');
      placeholderImg.src = placeholder;
      placeholderImg.style.filter = 'blur(5px)';
      placeholderImg.style.transform = 'scale(1.1)';
      placeholderImg.style.transition = 'opacity 0.3s ease';
      placeholderImg.className = 'progressive-placeholder';
      wrapper.appendChild(placeholderImg);
    }

    // Load actual image
    this.loadImage(src).then(result => {
      const actualImg = result.element;
      actualImg.style.position = 'absolute';
      actualImg.style.top = '0';
      actualImg.style.left = '0';
      actualImg.style.width = '100%';
      actualImg.style.height = '100%';
      actualImg.style.objectFit = 'cover';
      actualImg.style.opacity = '0';
      actualImg.style.transition = 'opacity 0.3s ease';
      actualImg.className = 'progressive-actual';

      wrapper.appendChild(actualImg);

      // Fade in actual image
      setTimeout(() => {
        actualImg.style.opacity = '1';

        // Fade out placeholder
        if (placeholder) {
          const placeholderImg = wrapper.querySelector('.progressive-placeholder');
          if (placeholderImg) {
            placeholderImg.style.opacity = '0';
            setTimeout(() => {
              if (placeholderImg.parentNode) {
                placeholderImg.parentNode.removeChild(placeholderImg);
              }
            }, 300);
          }
        }
      }, 50);
    }).catch(error => {
      console.error('[Progressive Image] Load failed:', error);
      wrapper.classList.add('error');
    });

    container.appendChild(wrapper);
    return wrapper;
  }
}

// Global instances
window.lazyLoadingManager = new LazyLoadingManager();
window.progressiveImageLoader = new ProgressiveImageLoader();

// Utility functions
window.createVirtualScroller = (container, options) => {
  return new VirtualScroller(container, options);
};

window.setupLazyLoading = () => {
  window.lazyLoadingManager.setupExistingElements();
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.setupLazyLoading();
  });
} else {
  window.setupLazyLoading();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LazyLoadingManager,
    VirtualScroller,
    ProgressiveImageLoader
  };
}

console.log('[Lazy Loading] Script loaded');
