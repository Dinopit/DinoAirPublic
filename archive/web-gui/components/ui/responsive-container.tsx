'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  centerContent?: boolean;
}

/**
 * ResponsiveContainer - A utility component for consistent responsive layouts
 * 
 * This component provides a standardized way to create responsive containers
 * with consistent padding, max-widths, and centering across the application.
 * 
 * Features:
 * - Responsive max-width breakpoints
 * - Consistent padding scales
 * - Optional content centering
 * - Mobile-first responsive design
 * 
 * @param children - Content to be wrapped
 * @param className - Additional CSS classes
 * @param maxWidth - Maximum width breakpoint
 * @param padding - Padding scale
 * @param centerContent - Whether to center content horizontally
 */
export function ResponsiveContainer({
  children,
  className,
  maxWidth = 'lg',
  padding = 'md',
  centerContent = true,
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-2 sm:px-4',
    md: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-6 sm:px-8 lg:px-12',
    xl: 'px-8 sm:px-12 lg:px-16',
  };

  return (
    <div
      className={cn(
        'w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        centerContent && 'mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * ResponsiveGrid - A utility component for responsive grid layouts
 * 
 * This component provides an easy way to create responsive grids with
 * different column counts at different breakpoints.
 * 
 * Features:
 * - Responsive column counts
 * - Consistent gap spacing
 * - Mobile-first approach
 * - Flexible breakpoint configuration
 * 
 * @param children - Grid items
 * @param className - Additional CSS classes
 * @param cols - Column configuration for different breakpoints
 * @param gap - Gap size between grid items
 */
export function ResponsiveGrid({
  children,
  className,
  cols = { default: 1, sm: 2, lg: 3 },
  gap = 'md',
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const getGridCols = () => {
    const classes = ['grid'];
    
    if (cols.default) classes.push(`grid-cols-${cols.default}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    
    return classes.join(' ');
  };

  return (
    <div
      className={cn(
        getGridCols(),
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'vertical' | 'horizontal' | 'responsive';
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}

/**
 * ResponsiveStack - A utility component for flexible stacking layouts
 * 
 * This component provides a flexible way to stack elements vertically,
 * horizontally, or responsively with consistent spacing and alignment.
 * 
 * Features:
 * - Vertical, horizontal, or responsive stacking
 * - Consistent spacing scales
 * - Flexible alignment options
 * - Mobile-first responsive behavior
 * 
 * @param children - Elements to stack
 * @param className - Additional CSS classes
 * @param direction - Stacking direction
 * @param spacing - Space between elements
 * @param align - Cross-axis alignment
 * @param justify - Main-axis alignment
 */
export function ResponsiveStack({
  children,
  className,
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
}: ResponsiveStackProps) {
  const spacingClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };

  const directionClasses = {
    vertical: 'flex flex-col',
    horizontal: 'flex flex-row',
    responsive: 'flex flex-col sm:flex-row',
  };

  return (
    <div
      className={cn(
        directionClasses[direction],
        spacingClasses[spacing],
        alignClasses[align],
        justifyClasses[justify],
        className
      )}
    >
      {children}
    </div>
  );
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * MobileMenu - A utility component for mobile navigation menus
 * 
 * This component provides a standardized mobile menu with slide-in animation,
 * backdrop, and proper accessibility features.
 * 
 * Features:
 * - Slide-in animation from right
 * - Backdrop with click-to-close
 * - Escape key handling
 * - Focus management
 * - Responsive behavior (hidden on desktop)
 * 
 * @param isOpen - Whether the menu is open
 * @param onClose - Function to close the menu
 * @param children - Menu content
 * @param className - Additional CSS classes
 */
export function MobileMenu({ isOpen, onClose, children, className }: MobileMenuProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Menu Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-xl transform transition-transform',
          'translate-x-0',
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

// Hook for responsive breakpoint detection
export function useResponsive() {
  const [breakpoint, setBreakpoint] = React.useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg');
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        setBreakpoint('sm');
        setIsMobile(true);
      } else if (width < 768) {
        setBreakpoint('md');
        setIsMobile(true);
      } else if (width < 1024) {
        setBreakpoint('lg');
        setIsMobile(false);
      } else if (width < 1280) {
        setBreakpoint('xl');
        setIsMobile(false);
      } else {
        setBreakpoint('2xl');
        setIsMobile(false);
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return { breakpoint, isMobile };
}