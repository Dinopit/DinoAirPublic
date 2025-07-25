import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  cmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    for (const shortcut of shortcuts) {
      const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const matchesCtrl = shortcut.ctrl ? isCtrlOrCmd : !shortcut.ctrl ? !event.ctrlKey : true;
      const matchesCmd = shortcut.cmd ? isCtrlOrCmd : !shortcut.cmd ? !event.metaKey : true;
      const matchesShift = shortcut.shift ? event.shiftKey : !shortcut.shift ? !event.shiftKey : true;
      const matchesAlt = shortcut.alt ? event.altKey : !shortcut.alt ? !event.altKey : true;

      if (matchesKey && matchesCtrl && matchesCmd && matchesShift && matchesAlt) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);

  return shortcuts;
};

// Helper function to format shortcut for display
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts = [];
  
  if (shortcut.ctrl || shortcut.cmd) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  
  // Format the key
  const keyDisplay = shortcut.key.length === 1 
    ? shortcut.key.toUpperCase() 
    : shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1);
  
  parts.push(keyDisplay);
  
  return parts.join(' + ');
};