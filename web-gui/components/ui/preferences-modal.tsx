'use client';

import React, { useState } from 'react';

import type { BaseModalProps } from '@/types';

import { useUserPreferences } from '@/lib/contexts/UserPreferencesContext';

interface PreferencesModalProps extends BaseModalProps {
  isOpen: boolean;
}

export function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const { preferences, updatePreferences, resetPreferences, exportPreferences, importPreferences } = useUserPreferences();
  const [activeTab, setActiveTab] = useState('appearance');

  if (!isOpen) return null;

  const handleThemeChange = (themeMode: 'light' | 'dark' | 'auto') => {
    updatePreferences({ themeMode });
  };

  const handleLanguageChange = (language: string) => {
    updatePreferences({ language: language as any });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold">Preferences</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close preferences"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row h-[calc(95vh-8rem)] sm:h-[600px]">
          {/* Mobile Tab Navigation */}
          <div className="sm:hidden border-b bg-gray-50 dark:bg-gray-900">
            <div className="flex overflow-x-auto">
              {[
                { id: 'appearance', label: 'Appearance', icon: '🎨' },
                { id: 'accessibility', label: 'Accessibility', icon: '♿' },
                { id: 'notifications', label: 'Notifications', icon: '🔔' },
                { id: 'chat', label: 'Chat', icon: '💬' },
                { id: 'advanced', label: 'Advanced', icon: '⚙️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 px-4 py-3 flex flex-col items-center space-y-1 min-w-[80px] ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-b-2 border-blue-500'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden sm:block w-64 bg-gray-50 dark:bg-gray-900 border-r">
            <nav className="p-4 space-y-2">
              {[
                { id: 'appearance', label: 'Appearance', icon: '🎨' },
                { id: 'accessibility', label: 'Accessibility', icon: '♿' },
                { id: 'notifications', label: 'Notifications', icon: '🔔' },
                { id: 'chat', label: 'Chat', icon: '💬' },
                { id: 'advanced', label: 'Advanced', icon: '⚙️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Appearance</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Theme</label>
                  <div className="space-y-2">
                    {[
                      { value: 'light', label: 'Light' },
                      { value: 'dark', label: 'Dark' },
                      { value: 'auto', label: 'Auto (System)' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="radio"
                          name="theme"
                          value={option.value}
                          checked={preferences.themeMode === option.value}
                          onChange={() => handleThemeChange(option.value as any)}
                          className="mr-2"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Language</label>
                  <select
                    value={preferences.language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ja">日本語</option>
                    <option value="zh">中文</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'accessibility' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Accessibility</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.accessibility.highContrast}
                      onChange={(e) => updatePreferences({
                        accessibility: { highContrast: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    High contrast mode
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.accessibility.reducedMotion}
                      onChange={(e) => updatePreferences({
                        accessibility: { reducedMotion: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Reduce motion
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.accessibility.keyboardNavigation}
                      onChange={(e) => updatePreferences({
                        accessibility: { keyboardNavigation: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Enhanced keyboard navigation
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Font Size</label>
                  <select
                    value={preferences.accessibility.fontSize}
                    onChange={(e) => updatePreferences({
                      accessibility: { fontSize: e.target.value as any }
                    })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra-large">Extra Large</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Notifications</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.notifications.desktop}
                      onChange={(e) => updatePreferences({
                        notifications: { desktop: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Desktop notifications
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.notifications.sound}
                      onChange={(e) => updatePreferences({
                        notifications: { sound: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Sound notifications
                  </label>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Notification Types</h4>
                  <div className="space-y-2">
                    {Object.entries(preferences.notifications.types).map(([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => updatePreferences({
                            notifications: {
                              types: { [key]: e.target.checked }
                            }
                          })}
                          className="mr-2"
                        />
                        {key.charAt(0).toUpperCase() + key.slice(1)} notifications
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Chat Settings</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.chat.autoSave}
                      onChange={(e) => updatePreferences({
                        chat: { autoSave: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Auto-save conversations
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.chat.showTimestamps}
                      onChange={(e) => updatePreferences({
                        chat: { showTimestamps: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Show timestamps
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.chat.enterToSend}
                      onChange={(e) => updatePreferences({
                        chat: { enterToSend: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Press Enter to send (Shift+Enter for new line)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max History Length: {preferences.chat.maxHistoryLength}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={preferences.chat.maxHistoryLength}
                    onChange={(e) => updatePreferences({
                      chat: { maxHistoryLength: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Advanced Settings</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.advanced.debugMode}
                      onChange={(e) => updatePreferences({
                        advanced: { debugMode: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Debug mode
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.advanced.experimentalFeatures}
                      onChange={(e) => updatePreferences({
                        advanced: { experimentalFeatures: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Enable experimental features
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.advanced.telemetryEnabled}
                      onChange={(e) => updatePreferences({
                        advanced: { telemetryEnabled: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Send usage analytics
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.syncEnabled}
                      onChange={(e) => updatePreferences({
                        syncEnabled: e.target.checked
                      })}
                      className="mr-2"
                    />
                    Sync preferences across devices
                  </label>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Import/Export</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const data = exportPreferences();
                        const blob = new Blob([data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'dinoair-preferences.json';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Export Preferences
                    </button>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const data = event.target?.result as string;
                              importPreferences(data);
                            } catch (error) {
                              alert('Invalid preferences file');
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between p-6 border-t">
          <div className="space-x-2">
            <button
              onClick={() => resetPreferences()}
              className="px-4 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50"
            >
              Reset to Defaults
            </button>
          </div>
          <div className="space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
