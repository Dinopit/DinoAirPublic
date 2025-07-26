import { useState, useEffect, useCallback } from 'react';

export interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  lastOnline: Date | null;
  queuedRequests: number;
}

export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastOnline, setLastOnline] = useState<Date | null>(null);
  const [queuedRequests, setQueuedRequests] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      setLastOnline(new Date());
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnline(new Date());
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          return (registration as any).sync.register('background-sync');
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkQueuedRequests = async () => {
      if ('indexedDB' in window) {
        try {
          const request = indexedDB.open('dinoair-offline', 1);
          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('requests')) {
              const store = db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
              store.createIndex('timestamp', 'timestamp');
            }
          };
          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (db.objectStoreNames.contains('requests')) {
              const tx = db.transaction(['requests'], 'readonly');
              const countRequest = tx.objectStore('requests').count();
              countRequest.onsuccess = () => {
                setQueuedRequests(countRequest.result);
              };
            } else {
              setQueuedRequests(0);
            }
          };
        } catch (error) {
          console.log('Failed to check queued requests:', error);
        }
      }
    };

    checkQueuedRequests();
    const interval = setInterval(checkQueuedRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const clearQueue = useCallback(async () => {
    if ('indexedDB' in window) {
      try {
        const request = indexedDB.open('dinoair-offline', 1);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('requests')) {
            const store = db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
            store.createIndex('timestamp', 'timestamp');
          }
        };
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (db.objectStoreNames.contains('requests')) {
            const tx = db.transaction(['requests'], 'readwrite');
            tx.objectStore('requests').clear();
          }
          setQueuedRequests(0);
        };
      } catch (error) {
        console.log('Failed to clear queue:', error);
      }
    }
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    lastOnline,
    queuedRequests,
    clearQueue
  };
};
