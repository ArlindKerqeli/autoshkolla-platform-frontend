const DB_NAME = 'askpro-offline';
const DB_VERSION = 1;
const STORE_NAME = 'apiCache';

interface CachedResponse {
  url: string;
  data: unknown;
  timestamp: number;
  ttl: number;
  tenantId: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('tenantId', 'tenantId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheResponse(
  url: string,
  data: unknown,
  tenantId: string,
  ttlSeconds: number = 3600
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put({
    url, data, timestamp: Date.now(), ttl: ttlSeconds * 1000, tenantId,
  } as CachedResponse);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCached(url: string, tenantId: string): Promise<unknown | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(STORE_NAME).get(url);
    request.onsuccess = () => {
      const entry = request.result as CachedResponse | undefined;
      if (!entry) return resolve(null);
      if (entry.tenantId !== tenantId) return resolve(null);
      if (Date.now() - entry.timestamp > entry.ttl) return resolve(null);
      resolve(entry.data);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllCache(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearTenantCache(tenantId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const index = tx.objectStore(STORE_NAME).index('tenantId');
  const request = index.openCursor(IDBKeyRange.only(tenantId));
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
      else resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearExpiredCache(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const request = tx.objectStore(STORE_NAME).openCursor();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const entry = cursor.value as CachedResponse;
        if (Date.now() - entry.timestamp > entry.ttl) cursor.delete();
        cursor.continue();
      } else resolve();
    };
    request.onerror = () => reject(request.error);
  });
}
