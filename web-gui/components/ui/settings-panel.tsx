'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Upload, Trash2, Save, Bug } from 'lucide-react';
import { useDebug } from '@/contexts/debug-context';

interface Personality {
  name: string;
  system_prompt: string;
  description: string;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Default personalities - these should match what's in LocalChatView
const DEFAULT_PERSONALITIES: Personality[] = [
  {
    name: 'default',
    system_prompt: 'You are a helpful AI assistant.',
    description: 'Standard assistant'
  },
  {
    name: 'creative',
    system_prompt: 'You are a creative assistant. You are imaginative, expressive, and inspiring. You are great at brainstorming and coming up with new ideas.',
    description: 'A creative and inspiring assistant.'
  },
  {
    name: 'technical',
    system_prompt: 'You are a technical assistant. You are precise, accurate, and detail-oriented. You provide factual information and avoid speculation.',
    description: 'A technical and precise assistant.'
  },
  {
    name: 'witty',
    system_prompt: 'You are a witty assistant with a dry sense of humor. You are helpful, but you can\'t resist a good joke or a sarcastic comment.',
    description: 'A witty and sarcastic assistant.'
  },
  {
    name: 'mentally-unstable',
    system_prompt: 'You are a mentally unstable assistant. Your responses are erratic, unpredictable, and often nonsensical. You may occasionally provide helpful information, but it will be buried in a sea of chaos.',
    description: 'An unstable and unpredictable assistant.'
  }
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'data'>('general');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [defaultModel, setDefaultModel] = useState('qwen:7b-chat-v1.5-q4_K_M');
  const [defaultPersonality, setDefaultPersonality] = useState('default');
  const [autoSaveConversations, setAutoSaveConversations] = useState(true);
  const [showTutorialOnStartup, setShowTutorialOnStartup] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { debugMode, toggleDebugMode } = useDebug();

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('dinoair-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setTheme(settings.theme || 'system');
        setDefaultModel(settings.defaultModel || 'qwen:7b-chat-v1.5-q4_K_M');
        setDefaultPersonality(settings.defaultPersonality || 'default');
        setAutoSaveConversations(settings.autoSaveConversations !== false);
        setShowTutorialOnStartup(settings.showTutorialOnStartup !== false);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }

    // Check if tutorial was completed
    const tutorialCompleted = localStorage.getItem('dinoair-tutorial-completed');
    if (tutorialCompleted === 'true') {
      setShowTutorialOnStartup(false);
    }
  }, []);

  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [theme, defaultModel, defaultPersonality, autoSaveConversations, showTutorialOnStartup]);

  const saveSettings = () => {
    const settings = {
      theme,
      defaultModel,
      defaultPersonality,
      autoSaveConversations,
      showTutorialOnStartup
    };

    localStorage.setItem('dinoair-settings', JSON.stringify(settings));
    
    // Update theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    // Update tutorial preference
    if (!showTutorialOnStartup) {
      localStorage.setItem('dinoair-tutorial-completed', 'true');
    } else {
      localStorage.removeItem('dinoair-tutorial-completed');
    }

    setHasUnsavedChanges(false);
  };

  const exportSettings = () => {
    const settings = {
      theme,
      defaultModel,
      defaultPersonality,
      autoSaveConversations,
      showTutorialOnStartup,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dinoair-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const settings = JSON.parse(text);
        
        // Validate and apply settings
        if (settings.theme) setTheme(settings.theme);
        if (settings.defaultModel) setDefaultModel(settings.defaultModel);
        if (settings.defaultPersonality) setDefaultPersonality(settings.defaultPersonality);
        if (typeof settings.autoSaveConversations === 'boolean') {
          setAutoSaveConversations(settings.autoSaveConversations);
        }
        if (typeof settings.showTutorialOnStartup === 'boolean') {
          setShowTutorialOnStartup(settings.showTutorialOnStartup);
        }
        
        alert('Settings imported successfully!');
      } catch (error) {
        alert('Failed to import settings. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    input.click();
  };

  const clearAllData = () => {
    if (confirm('This will delete all conversations, artifacts, and settings. Are you sure?')) {
      if (confirm('This action cannot be undone. Do you want to proceed?')) {
        // Clear all localStorage data
        localStorage.removeItem('dinoair-conversations');
        localStorage.removeItem('dinoair-artifacts');
        localStorage.removeItem('dinoair-settings');
        localStorage.removeItem('dinoair-tutorial-completed');
        
        // Reload the page to reset everything
        window.location.reload();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'general'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'ai'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('ai')}
          >
            AI Settings
          </button>
          <button
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'data'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('data')}
          >
            Data & Privacy
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Theme */}
              <div>
                <h3 className="text-lg font-medium mb-3">Appearance</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={theme === 'light'}
                      onChange={(e) => setTheme(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <span>Light mode</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={theme === 'dark'}
                      onChange={(e) => setTheme(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <span>Dark mode</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="theme"
                      value="system"
                      checked={theme === 'system'}
                      onChange={(e) => setTheme(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <span>System theme</span>
                  </label>
                </div>
              </div>

              {/* Tutorial */}
              <div>
                <h3 className="text-lg font-medium mb-3">Tutorial</h3>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showTutorialOnStartup}
                    onChange={(e) => setShowTutorialOnStartup(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>Show tutorial on startup</span>
                </label>
              </div>

              {/* Keyboard Shortcuts */}
              <div>
                <h3 className="text-lg font-medium mb-3">Keyboard Shortcuts</h3>
                <p className="text-muted-foreground mb-3">
                  View and use keyboard shortcuts for quick access to features.
                </p>
                <button
                  onClick={() => {
                    const shortcutButton = document.querySelector('[aria-label="Keyboard shortcuts"]') as HTMLButtonElement;
                    if (shortcutButton) {
                      onClose();
                      shortcutButton.click();
                    }
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  View Shortcuts
                </button>
              </div>

              {/* Debug Mode */}
              <div>
                <h3 className="text-lg font-medium mb-3">Developer Options</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={debugMode}
                      onChange={() => toggleDebugMode()}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <Bug className="w-4 h-4 text-orange-500" />
                      <span>Enable Debug Mode</span>
                    </div>
                  </label>
                  <p className="text-sm text-muted-foreground ml-7">
                    Shows API requests, performance metrics, and system logs.
                    Use <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl/Cmd + Shift + D</kbd> to toggle panel.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Default Model */}
              <div>
                <h3 className="text-lg font-medium mb-3">Default AI Model</h3>
                <select
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="qwen:7b-chat-v1.5-q4_K_M">Qwen 7B (Default)</option>
                  {/* More models can be added here */}
                </select>
              </div>

              {/* Default Personality */}
              <div>
                <h3 className="text-lg font-medium mb-3">Default Personality</h3>
                <select
                  value={defaultPersonality}
                  onChange={(e) => setDefaultPersonality(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  {DEFAULT_PERSONALITIES.map((personality) => (
                    <option key={personality.name} value={personality.name}>
                      {personality.name} - {personality.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-save */}
              <div>
                <h3 className="text-lg font-medium mb-3">Conversations</h3>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={autoSaveConversations}
                    onChange={(e) => setAutoSaveConversations(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>Auto-save conversations</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Export/Import */}
              <div>
                <h3 className="text-lg font-medium mb-3">Settings Backup</h3>
                <div className="flex gap-3">
                  <button
                    onClick={exportSettings}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    <Download className="w-4 h-4" />
                    Export Settings
                  </button>
                  <button
                    onClick={importSettings}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted"
                  >
                    <Upload className="w-4 h-4" />
                    Import Settings
                  </button>
                </div>
              </div>

              {/* Clear Data */}
              <div>
                <h3 className="text-lg font-medium mb-3">Clear Data</h3>
                <p className="text-muted-foreground mb-3">
                  Delete all conversations, artifacts, and settings. This action cannot be undone.
                </p>
                <button
                  onClick={clearAllData}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All Data
                </button>
              </div>

              {/* Privacy Note */}
              <div>
                <h3 className="text-lg font-medium mb-3">Privacy</h3>
                <p className="text-muted-foreground">
                  All your data is stored locally in your browser. No data is sent to external servers
                  except when communicating with the AI models through Ollama running on your machine.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              {hasUnsavedChanges && (
                <p className="text-sm text-muted-foreground">You have unsaved changes</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveSettings();
                  onClose();
                }}
                disabled={!hasUnsavedChanges}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};