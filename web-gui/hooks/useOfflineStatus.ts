import { useState, useEffect, useCallback, useRef } from 'react';

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  lastOnline: Date | null;
  queuedRequests: number;
  syncStatus: 'idle' | 'syncing' | 'failed';
  failedRequests: number;
}

export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastOnline, setLastOnline] = useState<Date | null>(null);
  const [queuedRequests, setQueuedRequests] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'failed'>('idle');
  const [failedRequests, setFailedRequests] = useState(0);

  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const dbRef = useRef<IDBDatabase | null>(null);

  // Initialize IndexedDB
  const initDB = useCallback(() => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      if (dbRef.current) {
        resolve(dbRef.current);
        return;
      }

      const request = indexedDB.open('dinoair-offline', 2);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('requests')) {
          const store = db.createObjectStore('requests', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('retries', 'retries');
        }

        if (!db.objectStoreNames.contains('failed_requests')) {
          const failedStore = db.createObjectStore('failed_requests', { keyPath: 'id' });
          failedStore.createIndex('timestamp', 'timestamp');
        }
      };

      request.onsuccess = (event) => {
        dbRef.current = (event.target as IDBOpenDBRequest).result;
        resolve(dbRef.current);
      };

      request.onerror = () => reject(request.error);
    });
  }, []);

  // Update request counts
  const updateCounts = useCallback(async () => {
    try {
      const db = await initDB();

      const queueTx = db.transaction(['requests'], 'readonly');
      const queueCount = queueTx.objectStore('requests').count();

      const failedTx = db.transaction(['failed_requests'], 'readonly');
      const failedCount = failedTx.objectStore('failed_requests').count();

      queueCount.onsuccess = () => setQueuedRequests(queueCount.result);
      failedCount.onsuccess = () => setFailedRequests(failedCount.result);
    } catch (error) {
      console.warn('Failed to update request counts:', error);
    }
  }, [initDB]);

  // Queue a request for later execution
  const queueRequest = useCallback(
    async (url: string, options: RequestInit = {}): Promise<void> => {
      try {
        const db = await initDB();

        const queuedRequest: QueuedRequest = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url,
          method: options.method || 'GET',
          body: options.body as string,
          headers: options.headers as Record<string, string>,
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
        };

        const tx = db.transaction(['requests'], 'readwrite');
        const store = tx.objectStore('requests');
        await store.add(queuedRequest);

        await updateCounts();
      } catch (error) {
        console.warn('Failed to queue request:', error);
      }
    },
    [initDB, updateCounts]
  );

  // Process queued requests
  const processQueue = useCallback(async (): Promise<void> => {
    if (!isOnline || syncStatus === 'syncing') return;

    try {
      setSyncStatus('syncing');
      const db = await initDB();

      const tx = db.transaction(['requests', 'failed_requests'], 'readwrite');
      const requestStore = tx.objectStore('requests');
      const failedStore = tx.objectStore('failed_requests');

      const requests = await new Promise<QueuedRequest[]>((resolve, reject) => {
        const getAllRequest = requestStore.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      });

      let processed = 0;
      let failed = 0;

      for (const request of requests) {
        try {
          const response = await fetch(request.url, {
            method: request.method,
            body: request.body,
            headers: request.headers,
          });

          if (response.ok) {
            // Successfully sent, remove from queue
            await requestStore.delete(request.id);
            processed++;
          } else {
            // Failed, increment retry count
            request.retries++;
            if (request.retries >= request.maxRetries) {
              // Move to failed requests
              await failedStore.put({ ...request, failedAt: Date.now() });
              await requestStore.delete(request.id);
              failed++;
            } else {
              // Update retry count
              await requestStore.put(request);
            }
          }
        } catch (error) {
          // Network error, increment retry count
          request.retries++;
          if (request.retries >= request.maxRetries) {
            await failedStore.put({ ...request, failedAt: Date.now(), error: error.message });
            await requestStore.delete(request.id);
            failed++;
          } else {
            await requestStore.put(request);
          }
        }
      }

      setSyncStatus(failed > 0 ? 'failed' : 'idle');
      await updateCounts();

      // Auto-retry failed requests after a delay
      if (failed === 0 && queuedRequests > 0) {
        syncTimeoutRef.current = setTimeout(() => {
          processQueue();
        }, 5000);
      }
    } catch (error) {
      console.warn('Failed to process queue:', error);
      setSyncStatus('failed');
    }
  }, [isOnline, syncStatus, initDB, updateCounts, queuedRequests]);

  // Clear all queued requests
  const clearQueue = useCallback(async () => {
    try {
      const db = await initDB();
      const tx = db.transaction(['requests', 'failed_requests'], 'readwrite');
      await tx.objectStore('requests').clear();
      await tx.objectStore('failed_requests').clear();

      setQueuedRequests(0);
      setFailedRequests(0);
      setSyncStatus('idle');
    } catch (error) {
      console.warn('Failed to clear queue:', error);
    }
  }, [initDB]);

  // Retry failed requests
  const retryFailed = useCallback(async () => {
    try {
      const db = await initDB();
      const tx = db.transaction(['requests', 'failed_requests'], 'readwrite');
      const failedStore = tx.objectStore('failed_requests');
      const requestStore = tx.objectStore('requests');

      const failedRequests = await new Promise<any[]>((resolve, reject) => {
        const getAllRequest = failedStore.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      });

      // Move failed requests back to queue with reset retry count
      for (const request of failedRequests) {
        const queuedRequest: QueuedRequest = {
          ...request,
          retries: 0,
          timestamp: Date.now(),
        };
        await requestStore.put(queuedRequest);
        await failedStore.delete(request.id);
      }

      await updateCounts();
      if (isOnline) {
        processQueue();
      }
    } catch (error) {
      console.warn('Failed to retry failed requests:', error);
    }
  }, [initDB, updateCounts, isOnline, processQueue]);

  // Enhanced online/offline detection
  useEffect(() => {
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      setLastOnline(new Date());
    }
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setLastOnline(new Date());

      // Clear any pending sync timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Start processing queue after a short delay to ensure connection is stable
      setTimeout(() => {
        processQueue();
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('idle');
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };

    // Additional connection checks using fetch
    const checkConnection = async () => {
      if (navigator.onLine) {
        try {
          await fetch('/api/health', {
            method: 'HEAD',
            cache: 'no-cache',
            signal: AbortSignal.timeout(5000),
          });
          if (!isOnline) {
            handleOnline();
          }
        } catch {
          if (isOnline) {
            handleOffline();
          }
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connection check
    const connectionCheckInterval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectionCheckInterval);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isOnline, processQueue]);

  // Initialize DB and update counts on mount
  useEffect(() => {
    updateCounts();
  }, [updateCounts]);

  return {
    isOnline,
    isOffline: !isOnline,
    lastOnline,
    queuedRequests,
    syncStatus,
    failedRequests,
    queueRequest,
    processQueue,
    clearQueue,
    retryFailed,
  };
};
