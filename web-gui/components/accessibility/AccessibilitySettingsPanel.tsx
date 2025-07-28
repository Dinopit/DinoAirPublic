/**
 * Accessibility Settings Panel
 * Component for managing accessibility preferences
 */

'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../../contexts/accessibility-context';
import { Settings, Eye, Keyboard, Volume2, Type } from 'lucide-react';

interface AccessibilitySettingsPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AccessibilitySettingsPanel({
  isOpen = false,
  onClose,
}: AccessibilitySettingsPanelProps) {
  const { t } = useTranslation();
  const { preferences, updatePreferences, resetPreferences, announce } = useAccessibility();

  const handleToggle = (key: keyof typeof preferences) => {
    const newValue = !preferences[key];
    updatePreferences({ [key]: newValue });

    const settingName = t(`settings.${key}`);
    announce(`${settingName} ${newValue ? t('general.enabled') : t('general.disabled')}`);
  };

  const handleFontSizeChange = (fontSize: typeof preferences.fontSize) => {
    updatePreferences({ fontSize });
    announce(`${t('settings.fontSize')} ${t(`settings.${fontSize}`)}`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-labelledby="accessibility-settings-title"
      aria-modal="true"
    >
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id="accessibility-settings-title"
            className="text-lg font-semibold flex items-center gap-2"
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
            {t('settings.accessibility')}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              aria-label={t('accessibility.closeDialog')}
            >
              <span className="sr-only">{t('accessibility.closeDialog')}</span>×
            </button>
          )}
        </div>

        <div className="p-4 space-y-6">
          {/* Visual Preferences */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" aria-hidden="true" />
              {t('settings.appearance')}
            </h3>

            <div className="space-y-3">
              {/* High Contrast */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="high-contrast-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  {t('settings.highContrastMode')}
                </label>
                <button
                  id="high-contrast-toggle"
                  role="switch"
                  aria-checked={preferences.highContrast}
                  onClick={() => handleToggle('highContrast')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    ${preferences.highContrast ? 'bg-primary' : 'bg-muted'}
                  `}
                >
                  <span className="sr-only">{t('settings.highContrastMode')}</span>
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${preferences.highContrast ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Type className="w-4 h-4" aria-hidden="true" />
                  {t('settings.fontSize')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => handleFontSizeChange(size)}
                      className={`
                        px-3 py-2 text-xs rounded-md border transition-colors
                        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                        ${
                          preferences.fontSize === size
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:bg-muted'
                        }
                      `}
                      aria-pressed={preferences.fontSize === size}
                    >
                      {t(`settings.${size}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reduce Motion */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="reduce-motion-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  {t('settings.reduceMotion')}
                </label>
                <button
                  id="reduce-motion-toggle"
                  role="switch"
                  aria-checked={preferences.reduceMotion}
                  onClick={() => handleToggle('reduceMotion')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    ${preferences.reduceMotion ? 'bg-primary' : 'bg-muted'}
                  `}
                >
                  <span className="sr-only">{t('settings.reduceMotion')}</span>
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${preferences.reduceMotion ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Interaction Preferences */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Keyboard className="w-4 h-4" aria-hidden="true" />
              {t('settings.interaction')}
            </h3>

            <div className="space-y-3">
              {/* Keyboard Navigation */}
              <div className="flex items-center justify-between">
                <label htmlFor="keyboard-nav-toggle" className="text-sm font-medium cursor-pointer">
                  {t('settings.keyboardNavigation')}
                </label>
                <button
                  id="keyboard-nav-toggle"
                  role="switch"
                  aria-checked={preferences.keyboardNavigation}
                  onClick={() => handleToggle('keyboardNavigation')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    ${preferences.keyboardNavigation ? 'bg-primary' : 'bg-muted'}
                  `}
                >
                  <span className="sr-only">{t('settings.keyboardNavigation')}</span>
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${preferences.keyboardNavigation ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Screen Reader Preferences */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              {t('accessibility.screenReader')}
            </h3>

            <div className="space-y-3">
              {/* Announce Changes */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="announce-changes-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  {t('settings.announceChanges')}
                </label>
                <button
                  id="announce-changes-toggle"
                  role="switch"
                  aria-checked={preferences.announceChanges}
                  onClick={() => handleToggle('announceChanges')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    ${preferences.announceChanges ? 'bg-primary' : 'bg-muted'}
                  `}
                >
                  <span className="sr-only">{t('settings.announceChanges')}</span>
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${preferences.announceChanges ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Screen Reader Optimized */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="screen-reader-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  {t('accessibility.screenReader')}
                </label>
                <button
                  id="screen-reader-toggle"
                  role="switch"
                  aria-checked={preferences.screenReaderOptimized}
                  onClick={() => handleToggle('screenReaderOptimized')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    ${preferences.screenReaderOptimized ? 'bg-primary' : 'bg-muted'}
                  `}
                >
                  <span className="sr-only">{t('accessibility.screenReader')}</span>
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${preferences.screenReaderOptimized ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <button
              onClick={resetPreferences}
              className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {t('settings.reset')}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {t('settings.save')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
