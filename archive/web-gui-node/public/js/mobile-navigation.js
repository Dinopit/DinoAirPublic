/**
 * Mobile Navigation Enhancement
 * Handles mobile menu toggle and improved touch interactions
 */

class MobileNavigation {
  constructor() {
    this.isMenuOpen = false;
    this.init();
  }

  init() {
    this.createMobileMenuToggle();
    this.setupEventListeners();
    this.handleResize();
  }

  createMobileMenuToggle() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    // Create mobile menu toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'mobile-menu-toggle';
    toggleButton.innerHTML = '☰';
    toggleButton.setAttribute('aria-label', 'Toggle navigation menu');
    toggleButton.setAttribute('aria-expanded', 'false');
    
    // Insert before theme toggle if it exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      navActions.insertBefore(toggleButton, themeToggle);
    } else {
      navActions.appendChild(toggleButton);
    }

    this.toggleButton = toggleButton;
  }

  setupEventListeners() {
    if (!this.toggleButton) return;

    // Mobile menu toggle
    this.toggleButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isMenuOpen && !e.target.closest('.navbar')) {
        this.closeMenu();
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMenuOpen) {
        this.closeMenu();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Close menu when navigation link is clicked
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (this.isMenuOpen) {
          this.closeMenu();
        }
      });
    });
  }

  toggleMenu() {
    if (this.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;

    this.isMenuOpen = true;
    navMenu.classList.add('mobile-open');
    this.toggleButton.innerHTML = '✕';
    this.toggleButton.setAttribute('aria-expanded', 'true');
    
    // Add animation class
    navMenu.style.opacity = '0';
    navMenu.style.transform = 'translateY(-10px)';
    
    requestAnimationFrame(() => {
      navMenu.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      navMenu.style.opacity = '1';
      navMenu.style.transform = 'translateY(0)';
    });

    // Prevent body scroll on mobile
    document.body.style.overflow = 'hidden';
    
    // Focus management
    const firstLink = navMenu.querySelector('.nav-link');
    if (firstLink) {
      firstLink.focus();
    }
  }

  closeMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;

    this.isMenuOpen = false;
    navMenu.style.opacity = '0';
    navMenu.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      navMenu.classList.remove('mobile-open');
      navMenu.style.transition = '';
      navMenu.style.opacity = '';
      navMenu.style.transform = '';
    }, 200);

    this.toggleButton.innerHTML = '☰';
    this.toggleButton.setAttribute('aria-expanded', 'false');
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Return focus to toggle button
    this.toggleButton.focus();
  }

  handleResize() {
    // Auto-close menu on desktop breakpoint
    if (window.innerWidth > 768 && this.isMenuOpen) {
      this.closeMenu();
    }
    
    // Show/hide toggle button based on screen size
    if (this.toggleButton) {
      if (window.innerWidth <= 768) {
        this.toggleButton.style.display = 'block';
      } else {
        this.toggleButton.style.display = 'none';
      }
    }
  }

  // Public methods for external control
  isOpen() {
    return this.isMenuOpen;
  }

  close() {
    if (this.isMenuOpen) {
      this.closeMenu();
    }
  }
}

// Initialize mobile navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.mobileNavigation = new MobileNavigation();
});

// Add CSS for mobile menu toggle button (in case it's not in main.css)
const style = document.createElement('style');
style.textContent = `
  .mobile-menu-toggle {
    display: none;
    background: none;
    border: none;
    font-size: var(--text-xl);
    color: var(--text-primary);
    cursor: pointer;
    padding: var(--space-2);
    min-height: 44px;
    min-width: 44px;
    border-radius: var(--radius-md);
    transition: background-color var(--transition-fast);
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  
  .mobile-menu-toggle:hover {
    background-color: var(--bg-secondary);
  }
  
  .mobile-menu-toggle:active {
    transform: scale(0.95);
  }
  
  @media (max-width: 768px) {
    .mobile-menu-toggle {
      display: block;
    }
    
    .nav-menu {
      display: none;
    }
    
    .nav-menu.mobile-open {
      display: flex;
    }
  }
`;
document.head.appendChild(style);

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileNavigation;
}