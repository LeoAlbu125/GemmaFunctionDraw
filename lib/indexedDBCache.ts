/**
 * IndexedDB-backed cache implementing the Cache API interface (match + put)
 * so that @huggingface/transformers persists downloaded model files across
 * sessions. Uses a dedicated DB so downloads are saved and the next session
 * continues from cache (no re-download until cache is cleared).
 */

const DB_NAME = "gemma-function-model-cache";
const STORE_NAME = "responses";
const DB_VERSION = 1;

export type CacheLike = {
  match(key: Request | string): Promise<Response | undefined>;
  put(key: Request | string, value: Response, progressCallback?: (data: { progress: number; loaded: number; total: number }) => void): Promise<void>;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

function getStore(db: IDBDatabase, mode: IDBTransactionMode = "readonly"): IDBObjectStore {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

function getAsPromise<T>(store: IDBObjectStore, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result ?? undefined);
  });
}

function putAsPromise(store: IDBObjectStore, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = store.put(value, key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

function keyString(key: Request | string): string {
  if (typeof key === "string") return key;
  return key.url;
}

/** Cached entry: body as ArrayBuffer and headers as a plain object. */
interface CachedEntry {
  body: ArrayBuffer;
  headers: Record<string, string>;
}

/**
 * Creates a custom cache that stores responses in IndexedDB.
 * Use with env.useCustomCache = true and env.customCache = await createIndexedDBCache().
 */
export function createIndexedDBCache(): Promise<CacheLike> {
  let db: IDBDatabase | null = null;

  const ensureDb = async (): Promise<IDBDatabase> => {
    if (db) return db;
    db = await openDB();
    return db;
  };

  const cache: CacheLike = {
    async match(key: Request | string): Promise<Response | undefined> {
      const k = keyString(key);
      const database = await ensureDb();
      const store = getStore(database);
      const entry = await getAsPromise<CachedEntry>(store, k);
      if (!entry) return undefined;
      return new Response(entry.body, { headers: new Headers(entry.headers) });
    },

    async put(
      key: Request | string,
      value: Response,
      _progressCallback?: (data: { progress: number; loaded: number; total: number }) => void
    ): Promise<void> {
      const k = keyString(key);
      const headers: Record<string, string> = {};
      value.headers.forEach((v, name) => {
        headers[name] = v;
      });
      const body = await value.arrayBuffer();
      const entry: CachedEntry = { body, headers };
      const database = await ensureDb();
      const store = getStore(database, "readwrite");
      await putAsPromise(store, k, entry);
    },
  };

  return Promise.resolve(cache);
}
