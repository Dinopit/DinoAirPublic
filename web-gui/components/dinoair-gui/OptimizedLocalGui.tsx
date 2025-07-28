'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ThemeToggle } from '../ui/theme-toggle';
import { useKeyboardShortcuts, KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '../ui/keyboard-shortcuts-modal';
import { OnboardingTutorial } from '../ui/onboarding-tutorial';
import { SettingsPanel } from '../ui/settings-panel';
import { ToastProvider, useToast } from '../ui/toast';
import { Menu, X, Settings, Keyboard, Bug, BarChart3 } from 'lucide-react';
import { DebugProvider, useDebug } from '../../contexts/debug-context';
import { useScreenReader } from '../../hooks/useScreenReader';
import { OfflineIndicator } from '../ui/offline-indicator';

// Import model registry initialization
import '../../lib/services/model-registry-init';

// Dynamically import heavy components to reduce initial bundle size
const LocalChatView = dynamic(() => import('./LocalChatView'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading chat...</div>,
});

const LocalArtifactsView = dynamic(() => import('./LocalArtifactsView'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading artifacts...</div>,
});

const DinoLocalAssistant = dynamic(() => import('./DinoLocalAssistant'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading assistant...</div>,
});

const DebugPanel = dynamic(() => import('../ui/debug-panel'), {
  ssr: false,
  loading: () => <div>Loading debug panel...</div>,
});

const PluginManager = dynamic(
  () => import('../plugins/PluginManager').then((mod) => ({ default: mod.PluginManager })),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-64">Loading plugins...</div>,
  }
);

const ModelMarketplace = dynamic(() => import('../marketplace/ModelMarketplace'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">Loading marketplace...</div>
  ),
});

type Tab = 'chat' | 'artifacts' | 'local-tools' | 'plugins' | 'marketplace';

// Memory-optimized component with proper cleanup
const OptimizedLocalGuiContent = () => {
  // FIX 1: Lazy state initialization - avoid immediate state computation
  const [activeTab, setActiveTab] = useState<Tab>(() => 'chat');
  const [showShortcutsModal, setShowShortcutsModal] = useState(() => false);
  const [showSettings, setShowSettings] = useState(() => false);
  const [showOnboarding, setShowOnboarding] = useState(() => false);
  const [showDebugPanel, setShowDebugPanel] = useState(() => false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(() => false);

  // Use refs to cache DOM queries
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const themeToggleRef = useRef<HTMLButtonElement | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);

  const { addToast } = useToast();
  const { debugMode, toggleDebugMode } = useDebug();
  const { announceNavigation } = useScreenReader();

  // FIX 2: Lazy initialization for expensive operations
  const hasSeenTutorial = useMemo(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem('dinoair-tutorial-completed') === 'true';
    } catch {
      return true; // Assume seen if localStorage fails
    }
  }, []); // ✅ Empty deps - only compute once

  // FIX 4: Proper useEffect dependencies to prevent infinite loops
  useEffect(() => {
    if (!hasSeenTutorial) {
      setShowOnboarding(true);
    }
  }, [hasSeenTutorial]); // ✅ Stable dependency

  // FIX 3: AbortController pattern for complete cleanup
  useEffect(() => {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (window.innerWidth >= 768) {
          setIsMobileMenuOpen(false);
        }
      }, 100); // Throttle resize events
    };

    window.addEventListener('resize', handleResize, {
      passive: true,
      signal: controller.signal, // 🧹 AbortController cleanup
    });

    return () => {
      controller.abort(); // 🧹 Full teardown
      clearTimeout(timeoutId);
    };
  }, []); // ✅ Empty deps, only once

  // Optimized DOM query handlers with caching
  const updateChatInputRef = useCallback(() => {
    if (!chatInputRef.current) {
      chatInputRef.current = document.querySelector(
        'textarea[placeholder="Type your message..."]'
      ) as HTMLTextAreaElement;
    }
  }, []);

  const updateThemeToggleRef = useCallback(() => {
    if (!themeToggleRef.current) {
      themeToggleRef.current = document.querySelector('[data-theme-toggle]') as HTMLButtonElement;
    }
  }, []);

  const updateSaveButtonRef = useCallback(() => {
    if (!saveButtonRef.current) {
      saveButtonRef.current = document.querySelector(
        'button:has-text("Save Chat")'
      ) as HTMLButtonElement;
    }
  }, []);

  const handleNewChat = useCallback(() => {
    console.log('New chat');
  }, []);

  const handleSaveConversation = useCallback(() => {
    updateSaveButtonRef();
    if (saveButtonRef.current) {
      saveButtonRef.current.click();
      addToast({
        type: 'success',
        title: 'Conversation saved',
        message: 'Your conversation has been saved successfully.',
      });
    } else {
      addToast({
        type: 'info',
        title: 'No active conversation',
        message: 'Start a conversation first before saving.',
      });
    }
  }, [addToast, updateSaveButtonRef]);

  const handleToggleDarkMode = useCallback(() => {
    updateThemeToggleRef();
    if (themeToggleRef.current) {
      themeToggleRef.current.click();
    }
  }, [updateThemeToggleRef]);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
    setIsMobileMenuOpen(false);
  }, []);

  const handleOpenMonitoring = useCallback(() => {
    // Use try-catch for safer window operations
    try {
      window.open('/monitoring', '_blank');
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.warn('Could not open monitoring window:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not open monitoring dashboard',
      });
    }
  }, [addToast]);

  const handleFocusChatInput = useCallback(() => {
    if (activeTab === 'chat') {
      updateChatInputRef();
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }
  }, [activeTab, updateChatInputRef]);

  // Memoize keyboard shortcuts to prevent recreation on every render
  const shortcuts: KeyboardShortcut[] = useMemo(
    () => [
      {
        key: 'k',
        ctrl: true,
        cmd: true,
        description: 'Focus on chat input',
        action: handleFocusChatInput,
      },
      {
        key: '1',
        ctrl: true,
        cmd: true,
        description: 'Switch to Chat tab',
        action: () => {
          setActiveTab('chat');
          announceNavigation('Switched to Chat tab');
        },
      },
      {
        key: '2',
        ctrl: true,
        cmd: true,
        description: 'Switch to Artifacts tab',
        action: () => {
          setActiveTab('artifacts');
          announceNavigation('Switched to Artifacts tab');
        },
      },
      {
        key: '3',
        ctrl: true,
        cmd: true,
        description: 'Switch to Model Marketplace tab',
        action: () => {
          setActiveTab('marketplace');
          announceNavigation('Switched to Model Marketplace tab');
        },
      },
      {
        key: '4',
        ctrl: true,
        cmd: true,
        description: 'Switch to Plugins tab',
        action: () => {
          setActiveTab('plugins');
          announceNavigation('Switched to Plugins tab');
        },
      },
      {
        key: '/',
        ctrl: true,
        cmd: true,
        description: 'Show keyboard shortcuts',
        action: () => setShowShortcutsModal(true),
      },
      {
        key: 's',
        ctrl: true,
        cmd: true,
        description: 'Save current conversation',
        action: handleSaveConversation,
      },
      {
        key: 'n',
        ctrl: true,
        cmd: true,
        description: 'New chat',
        action: handleNewChat,
      },
      {
        key: 'd',
        ctrl: true,
        cmd: true,
        description: 'Toggle dark mode',
        action: handleToggleDarkMode,
      },
      {
        key: 'd',
        ctrl: true,
        cmd: true,
        shift: true,
        description: 'Toggle debug mode',
        action: () => {
          toggleDebugMode();
          if (!debugMode) {
            setShowDebugPanel(true);
          }
          addToast({
            type: 'info',
            title: debugMode ? 'Debug mode disabled' : 'Debug mode enabled',
            message: debugMode
              ? 'Debug logging has been turned off'
              : 'Debug panel can be opened from the toolbar',
          });
        },
      },
      {
        key: ',',
        ctrl: true,
        cmd: true,
        description: 'Open settings',
        action: handleOpenSettings,
      },
      {
        key: 'm',
        ctrl: true,
        cmd: true,
        description: 'Open monitoring dashboard',
        action: handleOpenMonitoring,
      },
    ],
    [
      handleFocusChatInput,
      handleSaveConversation,
      handleNewChat,
      handleToggleDarkMode,
      handleOpenSettings,
      handleOpenMonitoring,
      toggleDebugMode,
      debugMode,
      addToast,
      announceNavigation,
    ]
  );

  useKeyboardShortcuts({ shortcuts });

  // Memoize tab content to prevent unnecessary re-renders
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'chat':
        return <LocalChatView />;
      case 'artifacts':
        return <LocalArtifactsView />;
      case 'local-tools':
        return <DinoLocalAssistant />;
      case 'plugins':
        return <PluginManager />;
      case 'marketplace':
        return <ModelMarketplace />;
      default:
        return <LocalChatView />;
    }
  }, [activeTab]);

  const navigationTabs = useMemo(
    () => [
      { id: 'chat' as Tab, label: 'Chat', icon: '💬' },
      { id: 'artifacts' as Tab, label: 'Artifacts', icon: '📦' },
      { id: 'marketplace' as Tab, label: 'Models', icon: '🤖' },
      { id: 'local-tools' as Tab, label: 'Local Tools', icon: '🛠️' },
      { id: 'plugins' as Tab, label: 'Plugins', icon: '🔌' },
    ],
    []
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🦕</span>
              <h1 className="text-lg font-semibold">DinoAir</h1>
              <OfflineIndicator />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <ThemeToggle />

            <button
              onClick={() => setShowShortcutsModal(true)}
              className="p-2 rounded-md hover:bg-accent"
              title="Keyboard Shortcuts (Ctrl+/)"
              aria-label="Show keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </button>

            {debugMode && (
              <button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="p-2 rounded-md hover:bg-accent"
                title="Toggle Debug Panel"
                aria-label="Toggle debug panel"
              >
                <Bug className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={handleOpenMonitoring}
              className="p-2 rounded-md hover:bg-accent"
              title="Open Monitoring Dashboard (Ctrl+M)"
              aria-label="Open monitoring dashboard"
            >
              <BarChart3 className="h-4 w-4" />
            </button>

            <button
              onClick={handleOpenSettings}
              className="p-2 rounded-md hover:bg-accent"
              title="Settings (Ctrl+,)"
              aria-label="Open settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-accent"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className={`border-t md:block ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="px-4 py-2">
            <div className="flex space-x-1">
              {navigationTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                    announceNavigation(`Switched to ${tab.label} tab`);
                  }}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                    activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{tabContent}</main>

      {/* Debug Panel */}
      {debugMode && showDebugPanel && (
        <div className="border-t">
          <DebugPanel isOpen={showDebugPanel} onClose={() => setShowDebugPanel(false)} />
        </div>
      )}

      {/* Modals */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal
          isOpen={showShortcutsModal}
          shortcuts={shortcuts}
          onClose={() => setShowShortcutsModal(false)}
        />
      )}

      {showSettings && (
        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
      )}

      {showOnboarding && (
        <OnboardingTutorial
          isOpen={showOnboarding}
          onClose={() => {
            setShowOnboarding(false);
            try {
              localStorage.setItem('dinoair-tutorial-completed', 'true');
            } catch (error) {
              console.warn('Could not save tutorial completion status:', error);
            }
          }}
          onComplete={() => {
            setShowOnboarding(false);
            try {
              localStorage.setItem('dinoair-tutorial-completed', 'true');
            } catch (error) {
              console.warn('Could not save tutorial completion status:', error);
            }
          }}
        />
      )}
    </div>
  );
};

// Main component with providers
const OptimizedLocalGui = () => {
  return (
    <ToastProvider>
      <DebugProvider>
        <OptimizedLocalGuiContent />
      </DebugProvider>
    </ToastProvider>
  );
};

export default OptimizedLocalGui;
