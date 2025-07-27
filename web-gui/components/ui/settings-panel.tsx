'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Download, Upload, Trash2, Save, Bug, Plus, Volume2 } from 'lucide-react';
import { useDebug } from '@/contexts/debug-context';
import { useThemeStore } from '@/lib/stores/theme-store';
import {
  usePersonalities,
  useCurrentPersonality,
  Personality,
} from '@/lib/stores/personality-store';
import { toast } from '@/lib/stores/toast-store';
import { PersonalityCard } from './personality-card';
import { PersonalityDetailsModal } from './personality-details-modal';
import { PersonalityImportModal } from './personality-import-modal';
import { VoiceSettings } from './voice-settings';
import { useFocusManagement } from '../../hooks/useFocusManagement';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Main component wrapped with React.memo for performance
export const SettingsPanel = React.memo<SettingsPanelProps>(
  ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'voice' | 'data'>('general');
    const { currentTheme, setTheme } = useThemeStore();

    const { containerRef } = useFocusManagement(isOpen, {
      restoreFocus: true,
      trapFocus: true,
      autoFocus: true,
    });
    const [defaultModel, setDefaultModel] = useState('qwen:7b-chat-v1.5-q4_K_M');

    useEffect(() => {
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
    const [autoSaveConversations, setAutoSaveConversations] = useState(true);
    const [showTutorialOnStartup, setShowTutorialOnStartup] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const { debugMode, toggleDebugMode } = useDebug();

    // Use centralized personality store
    const { personalities, loading: personalitiesLoading, fetchPersonalities } = usePersonalities();
    const { currentPersonality, setCurrentPersonality } = useCurrentPersonality();
    const [defaultPersonality, setDefaultPersonality] = useState(
      currentPersonality?.id || 'default'
    );

    // Load non-theme settings from localStorage on mount
    useEffect(() => {
      const savedSettings = localStorage.getItem('dinoair-settings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          setDefaultModel(settings.defaultModel || 'qwen:7b-chat-v1.5-q4_K_M');
          setDefaultPersonality(settings.defaultPersonality || currentPersonality?.id || 'default');
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
    }, [currentPersonality]);

    // Fetch personalities if not already loaded
    useEffect(() => {
      if (personalities.length === 0 && !personalitiesLoading) {
        fetchPersonalities();
      }
    }, [personalities.length, personalitiesLoading, fetchPersonalities]);

    // Track changes
    useEffect(() => {
      setHasUnsavedChanges(true);
    }, [defaultModel, defaultPersonality, autoSaveConversations, showTutorialOnStartup]);

    // Memoize save settings function
    const saveSettings = useCallback(() => {
      const settings = {
        defaultModel,
        defaultPersonality,
        autoSaveConversations,
        showTutorialOnStartup,
      };

      localStorage.setItem('dinoair-settings', JSON.stringify(settings));

      // Update personality in store
      const selectedPersonality = personalities.find((p) => p.id === defaultPersonality);
      if (selectedPersonality) {
        setCurrentPersonality(selectedPersonality);
      }

      // Update tutorial preference
      if (!showTutorialOnStartup) {
        localStorage.setItem('dinoair-tutorial-completed', 'true');
      } else {
        localStorage.removeItem('dinoair-tutorial-completed');
      }

      setHasUnsavedChanges(false);
    }, [
      defaultModel,
      defaultPersonality,
      autoSaveConversations,
      showTutorialOnStartup,
      personalities,
      setCurrentPersonality,
    ]);

    // Memoize export settings function
    const exportSettings = useCallback(() => {
      const settings = {
        theme: currentTheme,
        defaultModel,
        defaultPersonality,
        autoSaveConversations,
        showTutorialOnStartup,
        exportDate: new Date().toISOString(),
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
    }, [
      currentTheme,
      defaultModel,
      defaultPersonality,
      autoSaveConversations,
      showTutorialOnStartup,
    ]);

    // Memoize import settings function
    const importSettings = useCallback(() => {
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
          if (settings.theme && ['light', 'dark', 'system'].includes(settings.theme)) {
            setTheme(settings.theme as 'light' | 'dark' | 'system');
          }
          if (settings.defaultModel) setDefaultModel(settings.defaultModel);
          if (settings.defaultPersonality) setDefaultPersonality(settings.defaultPersonality);
          if (typeof settings.autoSaveConversations === 'boolean') {
            setAutoSaveConversations(settings.autoSaveConversations);
          }
          if (typeof settings.showTutorialOnStartup === 'boolean') {
            setShowTutorialOnStartup(settings.showTutorialOnStartup);
          }

          toast.success('Settings imported successfully!');
        } catch (error) {
          toast.error('Failed to import settings', 'Please check the file format and try again.');
          console.error('Import error:', error);
        }
      };
      input.click();
    }, [setTheme]);

    // Memoize clear data function
    const clearAllData = useCallback(() => {
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
    }, []);

    // Memoize tab props to prevent unnecessary re-renders
    const generalTabProps = useMemo(
      () => ({
        currentTheme,
        setTheme,
        showTutorialOnStartup,
        setShowTutorialOnStartup,
        debugMode,
        toggleDebugMode,
        onClose,
      }),
      [currentTheme, setTheme, showTutorialOnStartup, debugMode, toggleDebugMode, onClose]
    );

    const aiTabProps = useMemo(
      () => ({
        defaultModel,
        setDefaultModel,
        defaultPersonality,
        setDefaultPersonality,
        autoSaveConversations,
        setAutoSaveConversations,
        personalities,
        personalitiesLoading,
      }),
      [defaultModel, defaultPersonality, autoSaveConversations, personalities, personalitiesLoading]
    );

    const dataTabProps = useMemo(
      () => ({
        exportSettings,
        importSettings,
        clearAllData,
      }),
      [exportSettings, importSettings, clearAllData]
    );

    if (!isOpen) return null;

    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true" />

        {/* Panel */}
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card shadow-xl z-50 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          tabIndex={-1}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 id="settings-title" className="text-2xl font-semibold">
              Settings
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close settings panel"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b" role="tablist" aria-label="Settings categories">
            <button
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'general'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('general')}
              role="tab"
              aria-selected={activeTab === 'general'}
              aria-controls="general-panel"
              id="general-tab"
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
              role="tab"
              aria-selected={activeTab === 'ai'}
              aria-controls="ai-panel"
              id="ai-tab"
            >
              AI Settings
            </button>
            <button
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'voice'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('voice')}
              role="tab"
              aria-selected={activeTab === 'voice'}
              aria-controls="voice-panel"
              id="voice-tab"
            >
              <Volume2 className="inline w-4 h-4 mr-2" />
              Voice
            </button>
            <button
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'data'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('data')}
              role="tab"
              aria-selected={activeTab === 'data'}
              aria-controls="data-panel"
              id="data-tab"
            >
              Data & Privacy
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div
              role="tabpanel"
              id="general-panel"
              aria-labelledby="general-tab"
              hidden={activeTab !== 'general'}
            >
              {activeTab === 'general' && <GeneralTabImplementation {...generalTabProps} />}
            </div>
            <div role="tabpanel" id="ai-panel" aria-labelledby="ai-tab" hidden={activeTab !== 'ai'}>
              {activeTab === 'ai' && <AITabImplementation {...aiTabProps} />}
            </div>
            <div
              role="tabpanel"
              id="voice-panel"
              aria-labelledby="voice-tab"
              hidden={activeTab !== 'voice'}
            >
              {activeTab === 'voice' && <VoiceSettings />}
            </div>
            <div
              role="tabpanel"
              id="data-panel"
              aria-labelledby="data-tab"
              hidden={activeTab !== 'data'}
            >
              {activeTab === 'data' && <DataTabImplementation {...dataTabProps} />}
            </div>
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
                <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-muted">
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
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    return prevProps.isOpen === nextProps.isOpen && prevProps.onClose === nextProps.onClose;
  }
);

SettingsPanel.displayName = 'SettingsPanel';

// Implementation components (used as fallbacks if lazy loading fails)
const GeneralTabImplementation: React.FC<any> = ({
  currentTheme,
  setTheme,
  showTutorialOnStartup,
  setShowTutorialOnStartup,
  debugMode,
  toggleDebugMode,
  onClose,
}) => (
  <div className="space-y-6">
    {/* Theme */}
    <div>
      <h3 className="text-lg font-medium mb-3">Appearance</h3>
      <div className="space-y-3">
        <fieldset>
          <legend className="sr-only">Theme selection</legend>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={currentTheme === 'light'}
              onChange={(e) => setTheme(e.target.value as any)}
              className="w-4 h-4"
              aria-describedby="light-theme-desc"
            />
            <span>Light mode</span>
            <span id="light-theme-desc" className="sr-only">
              Use light theme for the interface
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={currentTheme === 'dark'}
              onChange={(e) => setTheme(e.target.value as any)}
              className="w-4 h-4"
              aria-describedby="dark-theme-desc"
            />
            <span>Dark mode</span>
            <span id="dark-theme-desc" className="sr-only">
              Use dark theme for the interface
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="theme"
              value="system"
              checked={currentTheme === 'system'}
              onChange={(e) => setTheme(e.target.value as any)}
              className="w-4 h-4"
              aria-describedby="system-theme-desc"
            />
            <span>System theme</span>
            <span id="system-theme-desc" className="sr-only">
              Use system theme preference
            </span>
          </label>
        </fieldset>
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
          const shortcutButton = document.querySelector(
            '[aria-label="Keyboard shortcuts"]'
          ) as HTMLButtonElement;
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
          Shows API requests, performance metrics, and system logs. Use{' '}
          <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl/Cmd + Shift + D</kbd> to toggle
          panel.
        </p>
      </div>
    </div>
  </div>
);

const AITabImplementation: React.FC<any> = ({
  defaultModel,
  setDefaultModel,
  defaultPersonality,
  setDefaultPersonality,
  autoSaveConversations,
  setAutoSaveConversations,
  personalities,
  personalitiesLoading,
}) => {
  const [selectedDetailsPersonality, setSelectedDetailsPersonality] = useState<Personality | null>(
    null
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const { refreshPersonalities } = usePersonalities();

  const handleViewDetails = (personality: Personality) => {
    setSelectedDetailsPersonality(personality);
    setShowDetailsModal(true);
  };

  const handleImportSuccess = async () => {
    // Refresh personalities list after successful import
    await refreshPersonalities();
  };

  return (
    <>
      <div className="space-y-6">
        {/* Default Model */}
        <div>
          <h3 className="text-lg font-medium mb-3">Default AI Model</h3>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background"
            aria-label="Select default AI model"
            aria-describedby="model-selection-desc"
          >
            <option value="qwen:7b-chat-v1.5-q4_K_M">Qwen 7B (Default)</option>
            {/* More models can be added here */}
          </select>
          <span id="model-selection-desc" className="sr-only">
            Choose the default AI model for conversations
          </span>
        </div>

        {/* Personality Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium">AI Personality</h3>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Import Personality
            </button>
          </div>

          {personalitiesLoading ? (
            <div className="w-full px-3 py-2 border rounded-lg bg-background text-muted-foreground">
              Loading personalities...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personalities.map((personality: Personality) => (
                <PersonalityCard
                  key={personality.id}
                  personality={personality}
                  isSelected={defaultPersonality === personality.id}
                  onSelect={() => setDefaultPersonality(personality.id)}
                  onViewDetails={() => handleViewDetails(personality)}
                />
              ))}
            </div>
          )}
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

      {/* Modals */}
      <PersonalityDetailsModal
        personality={selectedDetailsPersonality}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedDetailsPersonality(null);
        }}
      />

      <PersonalityImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
      />
    </>
  );
};

const DataTabImplementation: React.FC<any> = ({ exportSettings, importSettings, clearAllData }) => (
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
        All your data is stored locally in your browser. No data is sent to external servers except
        when communicating with the AI models through Ollama running on your machine.
      </p>
    </div>
  </div>
);
