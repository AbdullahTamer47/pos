import { useState, useEffect, useCallback, useRef } from 'react';
import { openDB, IDBPDatabase } from 'idb';

interface PendingOperation {
  id: string;
  type: string;
  endpoint: string;
  method: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
}

const DB_NAME = 'smart-pos-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-ops';

function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });
        store.createIndex('timestamp', 'timestamp');
      }
    },
  });
}

export function useOfflineSync() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updatePendingCount = useCallback(async () => {
    let offlineInvoices = 0;
    try {
      const raw = localStorage.getItem('smartpos_offline_pending_invoices');
      if (raw) offlineInvoices = JSON.parse(raw).length;
    } catch {
      // ignore
    }

    try {
      const db = await getDb();
      const count = await db.count(STORE_NAME);
      setPendingCount(count + offlineInvoices);
    } catch {
      setPendingCount(offlineInvoices);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleInvoicesUpdated = () => {
      updatePendingCount();
    };
    window.addEventListener('smartpos-offline-invoices-updated', handleInvoicesUpdated);

    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('smartpos-offline-invoices-updated', handleInvoicesUpdated);
    };
  }, [updatePendingCount]);

  const addPendingOp = useCallback(
    async (op: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>) => {
      try {
        const db = await getDb();
        const pendingOp: PendingOperation = {
          ...op,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          retryCount: 0,
        };
        await db.add(STORE_NAME, pendingOp);
        await updatePendingCount();
        return pendingOp.id;
      } catch {
        return null;
      }
    },
    [updatePendingCount]
  );

  const removePendingOp = useCallback(
    async (id: string) => {
      try {
        const db = await getDb();
        await db.delete(STORE_NAME, id);
        await updatePendingCount();
      } catch {
        // silently fail
      }
    },
    [updatePendingCount]
  );

  const syncNow = useCallback(async () => {
    if (isOffline || syncInProgress) {
      return;
    }

    setSyncInProgress(true);

    try {
      try {
        const { offlineService } = await import('@/services/offlineService');
        await offlineService.syncPendingInvoices();
      } catch (err) {
        console.warn('Failed to sync offline invoices:', err);
      }

      const db = await getDb();
      const ops = await db.getAll(STORE_NAME);
      const sortedOps = ops.sort((a, b) => a.timestamp - b.timestamp);

      for (const op of sortedOps) {
        try {
          const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
          const accessToken = (
            await import('@/stores/authStore')
          ).useAuthStore.getState().accessToken;

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
          }

          const response = await fetch(`${VITE_API_URL}${op.endpoint}`, {
            method: op.method,
            headers,
            body: op.method !== 'GET' && op.method !== 'HEAD' ? JSON.stringify(op.data) : undefined,
          });

          if (response.ok || response.status === 409) {
            await removePendingOp(op.id);
          } else if (op.retryCount >= 5) {
            await removePendingOp(op.id);
          } else {
            const updatedOp: PendingOperation = {
              ...op,
              retryCount: op.retryCount + 1,
            };
            await db.put(STORE_NAME, updatedOp);
          }
        } catch {
          if (op.retryCount >= 5) {
            await removePendingOp(op.id);
          } else {
            const db2 = await getDb();
            const updatedOp: PendingOperation = {
              ...op,
              retryCount: op.retryCount + 1,
            };
            await db2.put(STORE_NAME, updatedOp);
          }
        }
      }

      setLastSyncTime(new Date());
      await updatePendingCount();
    } catch {
      // sync failed
    } finally {
      setSyncInProgress(false);
    }
  }, [isOffline, syncInProgress, removePendingOp, updatePendingCount]);

  useEffect(() => {
    if (!isOffline && pendingCount > 0 && !syncInProgress) {
      syncNow();
    }
  }, [isOffline, pendingCount, syncInProgress, syncNow]);

  useEffect(() => {
    syncTimerRef.current = setInterval(() => {
      if (!isOffline) {
        syncNow();
      }
    }, 30000);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [isOffline, syncNow]);

  return {
    isOffline,
    pendingCount,
    syncInProgress,
    lastSyncTime,
    addPendingOp,
    syncNow,
  };
}