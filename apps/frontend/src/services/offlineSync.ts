import { openDB, type IDBPDatabase } from 'idb';
import type { ProductResponse, CustomerResponse, PriceListResponse, InvoiceResponse, CreateInvoiceRequest } from '../api/endpoints';

const DB_NAME = 'smart-pos-offline';
const DB_VERSION = 2;

const STORES = {
  PRODUCTS: 'products',
  PENDING_INVOICES: 'pending-invoices',
  CUSTOMERS: 'customers',
  PRICE_LISTS: 'price-lists',
  SETTINGS: 'settings',
  LAST_SYNC: 'last-sync',
} as const;

interface PendingInvoice {
  id: string;
  invoiceNumber: string;
  data: CreateInvoiceRequest;
  createdAt: string;
  retryCount: number;
  lastAttempt?: string;
}

interface SyncTimestamp {
  store: string;
  lastSync: string;
  count: number;
}

interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

interface CacheStats {
  store: string;
  count: number;
  lastSync: string | null;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
          productStore.createIndex('sku', 'sku', { unique: true });
          productStore.createIndex('barcode', 'barcode');
          productStore.createIndex('categoryId', 'categoryId');
          productStore.createIndex('isActive', 'isActive');
        }
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORES.PENDING_INVOICES)) {
          const invoiceStore = db.createObjectStore(STORES.PENDING_INVOICES, { keyPath: 'id' });
          invoiceStore.createIndex('createdAt', 'createdAt');
          invoiceStore.createIndex('retryCount', 'retryCount');
        }

        if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
          const customerStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
          customerStore.createIndex('phone', 'phone');
          customerStore.createIndex('isActive', 'isActive');
        }

        if (!db.objectStoreNames.contains(STORES.PRICE_LISTS)) {
          db.createObjectStore(STORES.PRICE_LISTS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.LAST_SYNC)) {
          db.createObjectStore(STORES.LAST_SYNC, { keyPath: 'store' });
        }
      }
    },
  });

  return dbPromise;
}

export async function initOfflineDB(): Promise<void> {
  await getDb();
}

export async function isOnline(): Promise<boolean> {
  if (!navigator.onLine) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('/api/health', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

export async function cacheProducts(products: ProductResponse[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
  const store = tx.objectStore(STORES.PRODUCTS);

  await Promise.all([
    ...products.map((product) => store.put(product)),
    db.put(STORES.LAST_SYNC, {
      store: STORES.PRODUCTS,
      lastSync: new Date().toISOString(),
      count: products.length,
    }),
  ]);

  await tx.done;
}

export async function getCachedProducts(): Promise<ProductResponse[]> {
  const db = await getDb();
  const products = await db.getAll(STORES.PRODUCTS);
  return products;
}

export async function getCachedProductById(id: string): Promise<ProductResponse | undefined> {
  const db = await getDb();
  return db.get(STORES.PRODUCTS, id);
}

export async function getCachedProductByBarcode(barcode: string): Promise<ProductResponse | undefined> {
  const db = await getDb();
  const index = db.transaction(STORES.PRODUCTS, 'readonly').store.index('barcode');
  return index.get(barcode);
}

export async function getCachedProductBySku(sku: string): Promise<ProductResponse | undefined> {
  const db = await getDb();
  const index = db.transaction(STORES.PRODUCTS, 'readonly').store.index('sku');
  return index.get(sku);
}

export async function searchCachedProducts(query: string): Promise<ProductResponse[]> {
  const db = await getDb();
  const all = await db.getAll(STORES.PRODUCTS);
  const lowerQuery = query.toLowerCase();
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.nameAr && p.nameAr.includes(query)) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(lowerQuery)) ||
      p.sku.toLowerCase().includes(lowerQuery) ||
      (p.barcode && p.barcode.includes(query))
  );
}

export async function cacheCustomers(customers: CustomerResponse[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORES.CUSTOMERS, 'readwrite');
  const store = tx.objectStore(STORES.CUSTOMERS);

  await Promise.all([
    ...customers.map((customer) => store.put(customer)),
    db.put(STORES.LAST_SYNC, {
      store: STORES.CUSTOMERS,
      lastSync: new Date().toISOString(),
      count: customers.length,
    }),
  ]);

  await tx.done;
}

export async function getCachedCustomers(): Promise<CustomerResponse[]> {
  const db = await getDb();
  return db.getAll(STORES.CUSTOMERS);
}

export async function getCachedCustomerById(id: string): Promise<CustomerResponse | undefined> {
  const db = await getDb();
  return db.get(STORES.CUSTOMERS, id);
}

export async function searchCachedCustomers(query: string): Promise<CustomerResponse[]> {
  const db = await getDb();
  const all = await db.getAll(STORES.CUSTOMERS);
  const lowerQuery = query.toLowerCase();
  return all.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      (c.phone && c.phone.includes(query)) ||
      (c.email && c.email.toLowerCase().includes(lowerQuery))
  );
}

export async function cachePriceLists(priceLists: PriceListResponse[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORES.PRICE_LISTS, 'readwrite');
  const store = tx.objectStore(STORES.PRICE_LISTS);

  await Promise.all([
    ...priceLists.map((pl) => store.put(pl)),
    db.put(STORES.LAST_SYNC, {
      store: STORES.PRICE_LISTS,
      lastSync: new Date().toISOString(),
      count: priceLists.length,
    }),
  ]);

  await tx.done;
}

export async function getCachedPriceLists(): Promise<PriceListResponse[]> {
  const db = await getDb();
  return db.getAll(STORES.PRICE_LISTS);
}

export async function getCachedPriceListById(id: string): Promise<PriceListResponse | undefined> {
  const db = await getDb();
  return db.get(STORES.PRICE_LISTS, id);
}

export async function queueInvoice(invoice: CreateInvoiceRequest): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const pendingInvoice: PendingInvoice = {
    id,
    invoiceNumber: `PENDING-${Date.now().toString(36).toUpperCase()}`,
    data: invoice,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  await db.add(STORES.PENDING_INVOICES, pendingInvoice);

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'GET_PENDING_COUNT',
    });
  }

  return id;
}

export async function getPendingInvoices(): Promise<PendingInvoice[]> {
  const db = await getDb();
  const invoices = await db.getAll(STORES.PENDING_INVOICES);
  return invoices.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function getPendingInvoicesCount(): Promise<number> {
  const db = await getDb();
  return db.count(STORES.PENDING_INVOICES);
}

export async function removePendingInvoice(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORES.PENDING_INVOICES, id);

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'GET_PENDING_COUNT',
    });
  }
}

export async function syncPendingInvoices(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  const online = await isOnline();
  if (!online) {
    result.errors.push('Device is offline');
    return result;
  }

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const pendingInvoices = await getPendingInvoices();

  for (const pending of pendingInvoices) {
    if (pending.retryCount >= 5) {
      result.failed++;
      result.errors.push(
        `Invoice ${pending.invoiceNumber}: max retries exceeded`
      );
      continue;
    }

    try {
      const { useAuthStore } = await import('../stores/authStore');
      const accessToken = useAuthStore.getState().accessToken;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers,
        body: JSON.stringify(pending.data),
      });

      if (response.ok || response.status === 409) {
        await removePendingInvoice(pending.id);
        result.synced++;
      } else {
        const db = await getDb();
        const updated: PendingInvoice = {
          ...pending,
          retryCount: pending.retryCount + 1,
          lastAttempt: new Date().toISOString(),
        };
        await db.put(STORES.PENDING_INVOICES, updated);
        result.failed++;
        result.errors.push(
          `Invoice ${pending.invoiceNumber}: HTTP ${response.status}`
        );
      }
    } catch (error) {
      const db = await getDb();
      const updated: PendingInvoice = {
        ...pending,
        retryCount: pending.retryCount + 1,
        lastAttempt: new Date().toISOString(),
      };
      await db.put(STORES.PENDING_INVOICES, updated);
      result.failed++;
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Invoice ${pending.invoiceNumber}: ${message}`);
    }
  }

  return result;
}

export async function syncProducts(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  const online = await isOnline();
  if (!online) {
    result.errors.push('Device is offline');
    return result;
  }

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  try {
    const { useAuthStore } = await import('../stores/authStore');
    const accessToken = useAuthStore.getState().accessToken;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_URL}/products?limit=10000`, {
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      const products: ProductResponse[] = data.data || data;
      if (Array.isArray(products) && products.length > 0) {
        await cacheProducts(products);
        result.synced = products.length;
      }
    } else {
      result.failed++;
      result.errors.push(`Products fetch failed: HTTP ${response.status}`);
    }
  } catch (error) {
    result.failed++;
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Products sync: ${message}`);
  }

  return result;
}

export async function syncCustomers(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  const online = await isOnline();
  if (!online) {
    result.errors.push('Device is offline');
    return result;
  }

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  try {
    const { useAuthStore } = await import('../stores/authStore');
    const accessToken = useAuthStore.getState().accessToken;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_URL}/customers?limit=10000`, {
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      const customers: CustomerResponse[] = data.data || data;
      if (Array.isArray(customers) && customers.length > 0) {
        await cacheCustomers(customers);
        result.synced = customers.length;
      }
    } else {
      result.failed++;
      result.errors.push(`Customers fetch failed: HTTP ${response.status}`);
    }
  } catch (error) {
    result.failed++;
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Customers sync: ${message}`);
  }

  return result;
}

export async function syncPriceLists(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  const online = await isOnline();
  if (!online) {
    result.errors.push('Device is offline');
    return result;
  }

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  try {
    const { useAuthStore } = await import('../stores/authStore');
    const accessToken = useAuthStore.getState().accessToken;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_URL}/price-lists?limit=100`, {
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      const priceLists: PriceListResponse[] = data.data || data;
      if (Array.isArray(priceLists) && priceLists.length > 0) {
        await cachePriceLists(priceLists);
        result.synced = priceLists.length;
      }
    } else {
      result.failed++;
      result.errors.push(`Price lists fetch failed: HTTP ${response.status}`);
    }
  } catch (error) {
    result.failed++;
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Price lists sync: ${message}`);
  }

  return result;
}

export async function syncAll(): Promise<Record<string, SyncResult>> {
  const results: Record<string, SyncResult> = {};

  results.products = await syncProducts();
  results.customers = await syncCustomers();
  results.priceLists = await syncPriceLists();
  results.invoices = await syncPendingInvoices();

  return results;
}

export async function getSyncTimestamps(): Promise<SyncTimestamp[]> {
  const db = await getDb();
  return db.getAll(STORES.LAST_SYNC);
}

export async function getCacheStats(): Promise<CacheStats[]> {
  const db = await getDb();
  const stores = [STORES.PRODUCTS, STORES.CUSTOMERS, STORES.PRICE_LISTS, STORES.PENDING_INVOICES];

  const stats: CacheStats[] = [];

  for (const storeName of stores) {
    const count = await db.count(storeName);
    const lastSync = await db.get(STORES.LAST_SYNC, storeName);
    stats.push({
      store: storeName,
      count,
      lastSync: lastSync?.lastSync || null,
    });
  }

  return stats;
}

export async function clearAllCaches(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    [STORES.PRODUCTS, STORES.CUSTOMERS, STORES.PRICE_LISTS, STORES.PENDING_INVOICES, STORES.LAST_SYNC],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore(STORES.PRODUCTS).clear(),
    tx.objectStore(STORES.CUSTOMERS).clear(),
    tx.objectStore(STORES.PRICE_LISTS).clear(),
    tx.objectStore(STORES.PENDING_INVOICES).clear(),
    tx.objectStore(STORES.LAST_SYNC).clear(),
  ]);

  await tx.done;
}

export async function registerSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;

  if ('sync' in registration) {
    try {
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-offline-mutations');
    } catch {
      // Periodic sync not supported or registration failed
    }
  }

  if ('periodicSync' in registration) {
    try {
      await (registration as ServiceWorkerRegistration & {
        periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
      }).periodicSync.register('sync-data', {
        minInterval: 60 * 60 * 1000,
      });
    } catch {
      // Periodic sync not supported
    }
  }
}

export async function subscribeToPushNotifications(
  applicationServerKey: string
): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;

  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    return existingSubscription;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(applicationServerKey) as unknown as ArrayBuffer,
  });

  return subscription;
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    const unsubscribed = await subscription.unsubscribe();
    return unsubscribed;
  }

  return false;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}