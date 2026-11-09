type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const namespaceStores = new Map<string, Map<string, CacheEntry<unknown>>>();
const defaultMaxEntries = 100;

function storeFor(namespace: string) {
  let store = namespaceStores.get(namespace);
  if (!store) {
    store = new Map();
    namespaceStores.set(namespace, store);
  }
  return store;
}

function pruneStore(store: Map<string, CacheEntry<unknown>>, maxEntries: number) {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }

  while (store.size > maxEntries) {
    const oldestKey = store.keys().next().value;
    if (!oldestKey) break;
    store.delete(oldestKey);
  }
}

export function readModelCacheGet<T>(namespace: string, key: string): T | null {
  const store = storeFor(namespace);
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function readModelCacheSet<T>(namespace: string, key: string, value: T, ttlMs: number, maxEntries = defaultMaxEntries) {
  const store = storeFor(namespace);
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  pruneStore(store, maxEntries);
  return value;
}
