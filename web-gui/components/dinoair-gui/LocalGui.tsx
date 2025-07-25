'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import LocalChatView from './LocalChatView';
import LocalArtifactsView from './LocalArtifactsView';
import { ThemeToggle } from '../ui/theme-toggle';
import { useKeyboardShortcuts, KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '../ui/keyboard-shortcuts-modal';
import { OnboardingTutorial } from '../ui/onboarding-tutorial';
import { SettingsPanel } from '../ui/settings-panel';
import { ToastProvider, useToast } from '../ui/toast';
import { Menu, X, Settings, Keyboard, Bug, Puzzle } from 'lucide-react';
import { DebugProvider, useDebug } from '../../contexts/debug-context';
import DebugPanel from '../ui/debug-panel';
import { PluginManager } from '../plugins';

type Tab = 'chat' | 'artifacts' | 'plugins';

const LocalGuiContent = () => {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const { addToast } = useToast();
  const { debugMode, toggleDebugMode, addLog } = useDebug();

  // Check if user should see onboarding
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('dinoair-tutorial-completed');
    if (hasSeenTutorial !== 'true') {
      setShowOnboarding(true);
    }
  }, []);

  // Close mobile menu when screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNewChat = useCallback(() => {
    // This will be implemented when we have access to chat functions
    console.log('New chat');
  }, []);

  const handleSaveConversation = useCallback(() => {
    // Find the save button in LocalChatView and click it
    const saveButton = document.querySelector('button:has-text("Save Chat")') as HTMLButtonElement;
    if (saveButton) {
      saveButton.click();
      addToast({
        type: 'success',
        title: 'Conversation saved',
        message: 'Your conversation has been saved successfully.'
      });
    } else {
      addToast({
        type: 'info',
        title: 'No active conversation',
        message: 'Start a conversation first before saving.'
      });
    }
  }, [addToast]);

  const handleToggleDarkMode = useCallback(() => {
    // Toggle dark mode - this is handled by the ThemeToggle component
    const themeToggleButton = document.querySelector('[data-theme-toggle]') as HTMLButtonElement;
    if (themeToggleButton) {
      themeToggleButton.click();
    }
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
    setIsMobileMenuOpen(false);
  }, []);

  const handleFocusChatInput = useCallback(() => {
    if (activeTab === 'chat') {
      // Find the chat input in the LocalChatView
      const chatInput = document.querySelector('textarea[placeholder="Type your message..."]') as HTMLTextAreaElement;
      if (chatInput) {
        chatInput.focus();
      }
    }
  }, [activeTab]);

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrl: true,
      cmd: true,
      description: 'Focus on chat input',
      action: handleFocusChatInput
    },
    {
      key: '1',
      ctrl: true,
      cmd: true,
      description: 'Switch to Chat tab',
      action: () => setActiveTab('chat')
    },
    {
      key: '2',
      ctrl: true,
      cmd: true,
      description: 'Switch to Artifacts tab',
      action: () => setActiveTab('artifacts')
    },
    {
      key: '3',
      ctrl: true,
      cmd: true,
      description: 'Switch to Plugins tab',
      action: () => setActiveTab('plugins')
    },
    {
      key: '/',
      ctrl: true,
      cmd: true,
      description: 'Show keyboard shortcuts',
      action: () => setShowShortcutsModal(true)
    },
    {
      key: 's',
      ctrl: true,
      cmd: true,
      description: 'Save current conversation',
      action: handleSaveConversation
    },
    {
      key: 'n',
      ctrl: true,
      cmd: true,
      description: 'New chat',
      action: handleNewChat
    },
    {
      key: 'd',
      ctrl: true,
      cmd: true,
      description: 'Toggle dark mode',
      action: handleToggleDarkMode
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
          message: debugMode ? 'Debug logging has been turned off' : 'Debug panel can be opened from the toolbar'
        });
      }
    },
    {
      key: ',',
      ctrl: true,
      cmd: true,
      description: 'Open settings',
      action: handleOpenSettings
    },
    {
      key: 'Escape',
      description: 'Close modals/dialogs',
      action: () => {
        setShowShortcutsModal(false);
        setShowSettings(false);
        setShowDebugPanel(false);
        setIsMobileMenuOpen(false);
      }
    }
  ];

  useKeyboardShortcuts({ shortcuts });

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex justify-between items-center border-b bg-card">
        <div className="flex items-center">
          {/* Mobile menu button */}
          <button
            className="md:hidden p-4 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Desktop tabs */}
          <div className="hidden md:flex">
            <button
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => handleTabChange('chat')}
            >
              Chat
            </button>
            <button
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'artifacts'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => handleTabChange('artifacts')}
            >
              Artifacts
            </button>
            <button
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'plugins'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => handleTabChange('plugins')}
            >
              <Puzzle className="w-4 h-4" />
              Plugins
            </button>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 px-4">
          {debugMode && (
            <button
              onClick={() => setShowDebugPanel(true)}
              className="p-2 hover:bg-muted rounded-lg transition-colors text-orange-500"
              aria-label="Debug panel"
              title="Open debug panel"
            >
              <Bug className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (Ctrl/Cmd + /)"
          >
            <Keyboard className="w-5 h-5" />
          </button>
          <button
            onClick={handleOpenSettings}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Settings"
            title="Settings (Ctrl/Cmd + ,)"
          >
            <Settings className="w-5 h-5" />
          </button>
          <div data-theme-toggle>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-[57px] left-0 right-0 bg-card border-b shadow-lg z-20">
          <button
            className={`w-full px-6 py-3 text-left font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-muted text-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => handleTabChange('chat')}
          >
            Chat
          </button>
          <button
            className={`w-full px-6 py-3 text-left font-medium transition-colors ${
              activeTab === 'artifacts'
                ? 'bg-muted text-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => handleTabChange('artifacts')}
          >
            Artifacts
          </button>
          <button
            className={`w-full px-6 py-3 text-left font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'plugins'
                ? 'bg-muted text-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => handleTabChange('plugins')}
          >
            <Puzzle className="w-4 h-4" />
            Plugins
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-grow overflow-hidden">
        {activeTab === 'chat' ? (
          <LocalChatView />
        ) : activeTab === 'artifacts' ? (
          <LocalArtifactsView />
        ) : (
          <div className="h-full overflow-auto p-6">
            <PluginManager />
          </div>
        )}
      </div>

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        shortcuts={shortcuts}
      />

      {/* Settings Panel */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Onboarding Tutorial */}
      <OnboardingTutorial
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          setShowOnboarding(false);
          addToast({
            type: 'success',
            title: 'Tutorial completed!',
            message: 'You can always access help via the keyboard shortcuts.'
          });
        }}
      />

      {/* Debug Panel */}
      <DebugPanel isOpen={showDebugPanel} onClose={() => setShowDebugPanel(false)} />
    </div>
  );
};

// Wrap with ToastProvider and DebugProvider
const LocalGui = () => {
  return (
    <DebugProvider>
      <ToastProvider>
        <LocalGuiContent />
      </ToastProvider>
    </DebugProvider>
  );
};

export default LocalGui;