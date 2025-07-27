'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, AlertCircle, Clock } from 'lucide-react';
import {
  checkForUpdates,
  getChangelog,
  shouldCheckForUpdates,
  markUpdateChecked,
  dismissUpdate,
  isUpdateDismissed,
  getUpdatePreferences,
  saveUpdatePreferences,
  UpdateInfo,
  ChangelogEntry,
  CURRENT_VERSION
} from '@/lib/utils/update-checker';
import { useToast } from './toast';

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [checking, setChecking] = useState(false);
  const [fullChangelog, setFullChangelog] = useState<ChangelogEntry[]>([]);
  const { addToast } = useToast();

  // Check for updates on mount
  useEffect(() => {
    const checkUpdates = async () => {
      if (shouldCheckForUpdates()) {
        setChecking(true);
        const info = await checkForUpdates();
        markUpdateChecked();
        
        if (info && !isUpdateDismissed(info.version)) {
          setUpdateInfo(info);
        }
        setChecking(false);
      }
    };

    checkUpdates();
  }, []);

  // Manual check for updates
  const handleCheckForUpdates = async () => {
    setChecking(true);
    const info = await checkForUpdates();
    markUpdateChecked();
    
    if (info) {
      setUpdateInfo(info);
      // Reset dismissed version if manually checking
      const prefs = getUpdatePreferences();
      prefs.dismissedVersion = null;
      saveUpdatePreferences(prefs);
    } else {
      addToast({
        type: 'info',
        title: 'No updates available',
        message: `You're running the latest version (${CURRENT_VERSION})`
      });
    }
    setChecking(false);
  };

  // Load full changelog
  const handleShowChangelog = async () => {
    if (fullChangelog.length === 0) {
      const changelog = await getChangelog();
      setFullChangelog(changelog);
    }
    setShowChangelog(true);
  };

  const handleDismiss = () => {
    if (updateInfo) {
      dismissUpdate(updateInfo.version);
      setUpdateInfo(null);
    }
  };

  const formatChangelogSection = (title: string, items?: string[]) => {
    if (!items || items.length === 0) return null;
    
    return (
      <div className="mb-4">
        <h5 className="font-semibold mb-2">{title}:</h5>
        <ul className="list-disc list-inside space-y-1">
          {items.map((item, index) => (
            <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  };


  // Update banner
  if (updateInfo && !showChangelog) {
    return (
      <div className={`fixed bottom-4 right-4 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg border ${
        updateInfo.urgent ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
      } p-4 z-50`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Download className={`w-5 h-5 mt-0.5 ${updateInfo.urgent ? 'text-red-500' : 'text-blue-500'}`} />
            <div>
              <h4 className="font-semibold">Update Available!</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Version {updateInfo.version} is now available (current: {CURRENT_VERSION})
              </p>
              {updateInfo.urgent && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 font-medium">
                  This is an urgent security update
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-3 flex gap-2">
          <a
            href={updateInfo.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm"
          >
            <Download className="w-3 h-3" />
            Download
          </a>
          <button
            onClick={handleShowChangelog}
            className="flex-1 px-3 py-1.5 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            View Changes
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm"
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  // Changelog modal
  if (showChangelog) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowChangelog(false)} />
        <div className="fixed inset-x-4 top-[10%] max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
            <h3 className="text-xl font-semibold">Changelog</h3>
            <button
              onClick={() => setShowChangelog(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {updateInfo && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-lg">Version {updateInfo.version}</h4>
                  <span className="text-sm text-gray-500">{updateInfo.releaseDate}</span>
                </div>
                <a
                  href={updateInfo.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <Download className="w-4 h-4" />
                  Download Update
                </a>
              </div>
            )}
            
            {(fullChangelog.length > 0 ? fullChangelog : updateInfo?.changelog || []).map((entry) => (
              <div key={entry.version} className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold">Version {entry.version}</h4>
                  <span className="text-sm text-gray-500">{entry.date}</span>
                </div>
                
                {entry.changes.security && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <h5 className="font-semibold text-red-700 dark:text-red-300">Security Updates</h5>
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {entry.changes.security.map((item, index) => (
                        <li key={index} className="text-sm text-red-600 dark:text-red-400">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {formatChangelogSection('Added', entry.changes.added)}
                {formatChangelogSection('Changed', entry.changes.changed)}
                {formatChangelogSection('Fixed', entry.changes.fixed)}
                {formatChangelogSection('Removed', entry.changes.removed)}
              </div>
            ))}
          </div>
          
          <div className="p-6 border-t dark:border-gray-700">
            <button
              onClick={() => setShowChangelog(false)}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </>
    );
  }

  // Check for updates button (shown in settings or help menu)
  return (
    <button
      onClick={handleCheckForUpdates}
      disabled={checking}
      className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
    >
      {checking ? (
        <>
          <Clock className="w-4 h-4 animate-spin" />
          Checking...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Check for Updates
        </>
      )}
    </button>
  );
}

// Settings component for update preferences
export function UpdateSettings() {
  const [prefs, setPrefs] = useState(getUpdatePreferences());

  const handleSave = () => {
    saveUpdatePreferences(prefs);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Update Settings</h3>
      
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={prefs.checkAutomatically}
          onChange={(e) => setPrefs({ ...prefs, checkAutomatically: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <span>Check for updates automatically</span>
      </label>
      
      {prefs.checkAutomatically && (
        <div>
          <label className="block text-sm font-medium mb-2">Check interval</label>
          <select
            value={prefs.checkInterval}
            onChange={(e) => setPrefs({ ...prefs, checkInterval: Number(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value={6}>Every 6 hours</option>
            <option value={12}>Every 12 hours</option>
            <option value={24}>Daily</option>
            <option value={168}>Weekly</option>
          </select>
        </div>
      )}
      
      <div className="flex items-center justify-between pt-4">
        <UpdateNotification />
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
