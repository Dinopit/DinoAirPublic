'use client';

import { Wifi, WifiOff, Clock, X } from 'lucide-react';
import React from 'react';

import { useOfflineStatus } from '../../hooks/useOfflineStatus';

import { useToast } from './toast';

export const OfflineIndicator = () => {
  const { isOnline, isOffline, lastOnline, queuedRequests, clearQueue } = useOfflineStatus();
  const { addToast } = useToast();

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-2 text-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>You're offline</span>
            {lastOnline && (
              <span className="text-red-200">
                • Last online: {lastOnline.toLocaleTimeString()}
              </span>
            )}
            {queuedRequests > 0 && (
              <span className="flex items-center gap-1 text-red-200">
                <Clock className="w-3 h-3" />
                {queuedRequests} queued
              </span>
            )}
          </div>
          {queuedRequests > 0 && (
            <button
              onClick={() => {
                clearQueue();
                addToast({
                  type: 'info',
                  title: 'Queue cleared',
                  message: 'Offline requests have been cleared'
                });
              }}
              className="text-red-200 hover:text-white"
              title="Clear queued requests"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isOnline && queuedRequests > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-2 text-sm">
        <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
          <Wifi className="w-4 h-4" />
          <span>Back online</span>
          <span className="text-green-200">• Syncing {queuedRequests} requests</span>
        </div>
      </div>
    );
  }

  return null;
};

export const ConnectionStatusBadge = () => {
  const { isOnline, queuedRequests } = useOfflineStatus();

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
      isOnline 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3" />
          Online
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          Offline
          {queuedRequests > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-200 dark:bg-red-800 rounded text-xs">
              {queuedRequests}
            </span>
          )}
        </>
      )}
    </div>
  );
};
