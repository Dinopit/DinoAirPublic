'use client';

import React from 'react';
import { Wifi, WifiOff, Clock, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';

// Import the actual toast hook from the toast notification library
import { useToast } from '../../components/ui/toast';

export const OfflineIndicator = () => {
  const {
    isOnline,
    isOffline,
    lastOnline,
    queuedRequests,
    syncStatus,
    failedRequests,
    clearQueue,
    retryFailed,
    processQueue,
  } = useOfflineStatus();
  const { addToast } = useToast();

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-2 text-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>You're offline</span>
            {lastOnline && (
              <span className="text-red-200">• Last online: {lastOnline.toLocaleTimeString()}</span>
            )}
            {queuedRequests > 0 && (
              <span className="flex items-center gap-1 text-red-200">
                <Clock className="w-3 h-3" />
                {queuedRequests} queued
              </span>
            )}
            {failedRequests > 0 && (
              <span className="flex items-center gap-1 text-red-200">
                <AlertTriangle className="w-3 h-3" />
                {failedRequests} failed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {failedRequests > 0 && (
              <button
                onClick={() => {
                  retryFailed();
                  addToast({
                    type: 'info',
                    title: 'Retrying failed requests',
                    message: `${failedRequests} requests will be retried when online`,
                  });
                }}
                className="text-red-200 hover:text-white flex items-center gap-1 px-2 py-1 rounded text-xs"
                title="Retry failed requests"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
            {(queuedRequests > 0 || failedRequests > 0) && (
              <button
                onClick={() => {
                  clearQueue();
                  addToast({
                    type: 'info',
                    title: 'Queue cleared',
                    message: 'All offline requests have been cleared',
                  });
                }}
                className="text-red-200 hover:text-white"
                title="Clear all queued requests"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isOnline && (queuedRequests > 0 || syncStatus === 'syncing')) {
    return (
      <div
        className={`fixed top-0 left-0 right-0 z-50 text-white px-4 py-2 text-sm ${
          syncStatus === 'failed' ? 'bg-orange-500' : 'bg-green-500'
        }`}
      >
        <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
          <Wifi className="w-4 h-4" />
          <span>Back online</span>
          {syncStatus === 'syncing' && (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span className="text-green-200">Syncing {queuedRequests} requests...</span>
            </>
          )}
          {syncStatus === 'failed' && failedRequests > 0 && (
            <>
              <AlertTriangle className="w-3 h-3" />
              <span className="text-orange-200">
                {failedRequests} requests failed • {queuedRequests} remaining
              </span>
              <button
                onClick={() => {
                  processQueue();
                  addToast({
                    type: 'info',
                    title: 'Retrying sync',
                    message: 'Attempting to sync pending requests',
                  });
                }}
                className="text-orange-200 hover:text-white flex items-center gap-1 px-2 py-1 rounded text-xs"
              >
                <RefreshCw className="w-3 h-3" />
                Retry Sync
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export const ConnectionStatusBadge = () => {
  const { isOnline, queuedRequests, syncStatus, failedRequests } = useOfflineStatus();

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
        isOnline
          ? syncStatus === 'failed'
            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>Online</span>
          {syncStatus === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin" />}
          {syncStatus === 'failed' && failedRequests > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-orange-200 dark:bg-orange-800 rounded text-xs">
              {failedRequests} failed
            </span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
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

export const OfflineQueueStatus = () => {
  const { queuedRequests, failedRequests, syncStatus, isOnline, processQueue, retryFailed } =
    useOfflineStatus();

  if (!queuedRequests && !failedRequests) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Offline Queue Status
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {queuedRequests > 0 && `${queuedRequests} pending`}
              {queuedRequests > 0 && failedRequests > 0 && ' • '}
              {failedRequests > 0 && `${failedRequests} failed`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {failedRequests > 0 && (
            <button
              onClick={retryFailed}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Failed
            </button>
          )}
          {isOnline && queuedRequests > 0 && syncStatus === 'idle' && (
            <button
              onClick={processQueue}
              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
            >
              <Wifi className="w-3 h-3" />
              Sync Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
