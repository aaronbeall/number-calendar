import type { DatasetIconName } from '@/lib/dataset-icons';
import { openDB } from 'idb';

// Dataset entity
export interface Dataset {
  id: string;
  name: string;
  description?: string;
  icon?: DatasetIconName;
  tracking: Tracking;
  valence: Valence;
  createdAt: number;
  updatedAt: number;
}

export type Tracking = 'trend' | 'series'; // tracking semantics
export type Valence = 'positive' | 'negative' | 'neutral'; // unified valence semantics

export type DayNumbers = number[];
export type DayEntry = {
  date: DayKey; // YYYY-MM-DD
  numbers: DayNumbers;
  datasetId: string;
};

// Date/Week/Month/Year key types
export type DayKey = `${number}-${number}-${number}`;  // YYYY-MM-DD
export type WeekKey = `${number}-W${number}`;          // YYYY-Www
export type MonthKey = `${number}-${number}`;          // YYYY-MM
export type YearKey = `${number}`;                     // YYYY

// Unified time key type
export type DateKey = DayKey | WeekKey | MonthKey | YearKey;

// Note type
export interface Note {
  datasetId: string;
  date: DateKey;
  text: string;
  createdAt: number;
  updatedAt: number;
}

// ImageAttachment type
export interface ImageAttachment {
  id: string;
  datasetId: string;
  date: DateKey;
  imageData: string; // base64 or Blob string
  mimeType: string;
  createdAt: number;
  updatedAt: number;
}

// Main DB structure
export interface LocalDB {
  datasets: Dataset[];
  entries: DayEntry[];
  notes: Note[];
  images: ImageAttachment[];
}

const DB_NAME = 'number-calendar';
const STORE_DEFS = [
  { name: 'datasets', keyPath: 'id', indexes: [] },
  { name: 'entries', keyPath: 'date', indexes: ['datasetId', ['datasetId', 'date']] },
  { name: 'notes', keyPath: 'date', indexes: ['datasetId', ['datasetId', 'date']] },
  { name: 'images', keyPath: 'id', indexes: ['datasetId', ['datasetId', 'date']] }
];
const DB_VERSION = 7;

function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, transaction) {
      // Migration from old 'calendar' object store structure
      if (oldVersion < 4 && db.objectStoreNames.contains('calendar')) {
        // Get all old calendar entries
        const calendarStore = transaction.objectStore('calendar');
        const oldEntries = await calendarStore.getAll();
        
        // Create default dataset for migrated data if it doesn't exist
        let datasetsStore;
        if (!db.objectStoreNames.contains('datasets')) {
          datasetsStore = db.createObjectStore('datasets', { keyPath: 'id' });
        } else {
          datasetsStore = transaction.objectStore('datasets');
        }
        
        const defaultDataset: Dataset = {
          id: 'migrated-default',
          name: 'My Numbers',
          description: 'Migrated from previous version',
          icon: 'database',
          tracking: 'series',
          valence: 'positive',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        await datasetsStore.put(defaultDataset);
        
        // Create entries store with new structure
        let entriesStore;
        if (!db.objectStoreNames.contains('entries')) {
          entriesStore = db.createObjectStore('entries', { keyPath: 'date' });
          entriesStore.createIndex('datasetId', 'datasetId');
          entriesStore.createIndex('datasetId_date', ['datasetId', 'date']);
        } else {
          entriesStore = transaction.objectStore('entries');
        }
        
        // Migrate old entries to new format
        for (const oldEntry of oldEntries) {
          if (oldEntry.date && Array.isArray(oldEntry.numbers)) {
            await entriesStore.put({
              date: oldEntry.date as DayKey,
              numbers: oldEntry.numbers,
              datasetId: defaultDataset.id,
            });
          }
        }
        
        // Delete old calendar store
        db.deleteObjectStore('calendar');
        
        console.log(`Migrated ${oldEntries.length} entries from calendar store`);
      }
      
      // Create/update all stores and indexes
      for (const def of STORE_DEFS) {
        let store;
        if (!db.objectStoreNames.contains(def.name)) {
          store = db.createObjectStore(def.name, { keyPath: def.keyPath });
        } else {
          store = transaction.objectStore(def.name);
        }
        for (const idx of def.indexes) {
          const idxName = Array.isArray(idx) ? idx.join('_') : idx;
          if (!store.indexNames.contains(idxName)) {
            store.createIndex(idxName, idx);
          }
        }
      }

      // Migration for adding icon/tracking fields to datasets (version < 5)
      if (oldVersion < 5) {
        if (db.objectStoreNames.contains('datasets')) {
          const dsStore = transaction.objectStore('datasets');
          const existing = await dsStore.getAll();
          for (const ds of existing) {
            // Only modify if missing tracking (new field)
            if (!('tracking' in ds)) {
              ds.tracking = 'series';
            }
            if (!('icon' in ds)) {
              ds.icon = 'database';
            }
            await dsStore.put(ds);
          }
          console.log(`Migrated ${existing.length} datasets to add icon/tracking fields`);
        }
      }

      // Migration for adding unified valence field directly (version < 6)
      // Note: legacy expanded valence values were never deployed, so we assign
      // the unified semantics immediately.
      if (oldVersion < 6) {
        if (db.objectStoreNames.contains('datasets')) {
          const dsStore = transaction.objectStore('datasets');
          const existing = await dsStore.getAll();
          for (const ds of existing) {
            if (!('valence' in ds)) {
              // Default to positive; callers may edit later.
              ds.valence = 'positive';
            }
            await dsStore.put(ds);
          }
          console.log(`Migrated ${existing.length} datasets to unified valence field`);
        }
      }
    },
  });
}

// Dataset CRUD
export async function createDataset(dataset: Dataset): Promise<void> {
  const db = await getDb();
  await db.add('datasets', dataset);
}

export async function getDataset(id: string): Promise<Dataset | undefined> {
  const db = await getDb();
  return await db.get('datasets', id);
}

export async function updateDataset(dataset: Dataset): Promise<void> {
  const db = await getDb();
  await db.put('datasets', dataset);
}

export async function deleteDataset(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('datasets', id);
}

export async function listDatasets(): Promise<Dataset[]> {
  const db = await getDb();
  return await db.getAll('datasets');
}

export async function saveDay(datasetId: string, date: DayKey, numbers: number[]) {
  const db = await getDb();
  await db.put('entries', { datasetId, date, numbers });
}

export async function loadDay(datasetId: string, date: DayKey): Promise<number[]> {
  const db = await getDb();
  // Use the composite index [datasetId, date]
  const index = db.transaction('entries').store.index('datasetId_date');
  const entry = await index.get([datasetId, date]);
  return entry?.numbers || [];
}

export async function loadMonth(datasetId: string, year: number, month: number): Promise<Record<string, number[]>> {
  const db = await getDb();
  const index = db.transaction('entries').store.index('datasetId_date');
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  // Get all entries for this datasetId
  const range = IDBKeyRange.bound([datasetId, monthStr], [datasetId, monthStr + '\uffff']);
  const all: DayEntry[] = await index.getAll(range);
  return Object.fromEntries(all.map(entry => [entry.date, entry.numbers]));
}

export async function loadYear(datasetId: string, year: number): Promise<Record<string, number[]>> {
  const db = await getDb();
  const index = db.transaction('entries').store.index('datasetId_date');
  const yearStr = `${year}`;
  // Range: all dates starting with year (e.g., 2025-)
  const range = IDBKeyRange.bound([datasetId, yearStr], [datasetId, yearStr + '\uffff']);
  const all: DayEntry[] = await index.getAll(range);
  return Object.fromEntries(all.map(entry => [entry.date, entry.numbers]));
}

export async function loadAllDays(datasetId: string): Promise<DayEntry[]> {
  const db = await getDb();
  const index = db.transaction('entries').store.index('datasetId');
  // Get all entries for this datasetId
  const range = IDBKeyRange.only(datasetId);
  const all: DayEntry[] = await index.getAll(range);
  return all;
}