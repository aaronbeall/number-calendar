/** Must match DB_NAME in src/features/db/localdb.ts. */
const DB_NAME = 'number-calendar';

/**
 * Counts the calendars saved in this browser without loading the app's database layer, so the
 * homepage bundle stays small.
 *
 * It never creates or upgrades the database: opening an IndexedDB database that doesn't exist yet
 * would create an empty version 1, and the app's migrations would then skip creating its stores.
 * So it only opens the database once `indexedDB.databases()` says it exists, and answers 0 when it
 * can't tell.
 */
export async function countSavedCalendars(): Promise<number> {
  try {
    if (typeof indexedDB === 'undefined' || !indexedDB.databases) return 0;
    const dbs = await indexedDB.databases();
    if (!dbs.some(d => d.name === DB_NAME)) return 0;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      // Only reached if the database vanished in between: don't leave an empty one behind.
      req.onupgradeneeded = () => req.transaction?.abort();
    });
    try {
      if (!db.objectStoreNames.contains('datasets')) return 0;
      return await new Promise<number>((resolve, reject) => {
        const req = db.transaction('datasets', 'readonly').objectStore('datasets').count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  } catch {
    return 0;
  }
}
