let db;
let dbPromise;
const DB_NAME = 'HarnessDB';
const STORE_NAME = 'settings';

export function initStore() {
  if (db) return Promise.resolve(db);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('This browser does not support IndexedDB, so settings cannot be saved.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error || new Error('Could not open settings storage.'));
    request.onblocked = () => reject(new Error('Settings storage is blocked by another open app tab. Close other HARNESS tabs and retry.'));
    request.onsuccess = () => {
      db = request.result;
      db.onversionchange = () => {
        db.close();
        db = undefined;
        dbPromise = undefined;
      };
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  }).catch(error => {
    dbPromise = undefined;
    throw error;
  });

  return dbPromise;
}

export async function getSetting(key, defaultValue = null) {
  const database = db || await initStore();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result ? request.result.value : defaultValue);
    request.onerror = () => reject(request.error || new Error(`Could not read setting: ${key}`));
  });
}

export async function setSetting(key, value) {
  const database = db || await initStore();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({ key, value });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error(`Could not save setting: ${key}`));
    transaction.onabort = () => reject(transaction.error || new Error(`Saving setting was aborted: ${key}`));
  });
}
