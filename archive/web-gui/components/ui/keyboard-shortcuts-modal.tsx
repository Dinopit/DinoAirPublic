'use client';

import React from 'react';
import { X } from 'lucide-react';
import { formatShortcut, KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';
import { useFocusManagement } from '../../hooks/useFocusManagement';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  shortcuts,
}) => {
  const { containerRef } = useFocusManagement(isOpen, {
    restoreFocus: true,
    trapFocus: true,
    autoFocus: true
  });

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = getShortcutCategory(shortcut.key);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        aria-describedby="shortcuts-modal-description"
      >
        <div 
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          tabIndex={-1}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 id="shortcuts-modal-title" className="text-2xl font-semibold">
              Keyboard Shortcuts
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close keyboard shortcuts dialog"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          
          {/* Content */}
          <div 
            className="p-6 overflow-y-auto max-h-[60vh]"
            id="shortcuts-modal-description"
          >
            <div className="space-y-6">
              {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                <section key={category} aria-labelledby={`category-${category.toLowerCase()}`}>
                  <h3 
                    id={`category-${category.toLowerCase()}`}
                    className="text-lg font-medium mb-3 text-muted-foreground"
                  >
                    {category}
                  </h3>
                  <div className="space-y-2" role="list">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={`${shortcut.key}-${index}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        role="listitem"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <kbd 
                          className="px-3 py-1 text-sm font-mono bg-muted rounded border border-border"
                          aria-label={`Keyboard shortcut: ${formatShortcut(shortcut)}`}
                        >
                          {formatShortcut(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-border bg-muted/30">
            <p className="text-sm text-muted-foreground text-center">
              Press <kbd 
                className="px-2 py-0.5 text-xs font-mono bg-muted rounded border border-border"
                aria-label="Escape key"
              >
                Esc
              </kbd> to close this dialog
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

// Helper function to categorize shortcuts
function getShortcutCategory(key: string): string {
  const keyLower = key.toLowerCase();
  
  if (['n', 's', 'd'].includes(keyLower)) {
    return 'General';
  }
  if (['k', '/', ','].includes(keyLower)) {
    return 'Navigation';
  }
  if (keyLower === 'escape') {
    return 'System';
  }
  
  return 'Other';
}
