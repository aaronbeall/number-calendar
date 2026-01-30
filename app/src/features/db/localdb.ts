import type { AchievementBadgeColor, AchievementBadgeIcon, AchievementBadgeStyle } from '@/lib/achievements';
import type { DatasetIconName } from '@/lib/dataset-icons';
import { toMonthKey, toYearKey, type DateKeyType } from '@/lib/friendly-date';
import type { NumberMetric, NumberSource } from '@/lib/stats';
import { openDB } from 'idb';
import { nanoid } from 'nanoid';

// Dataset entity
export interface Dataset {
  id: string;
  name: string;
  description?: string;
  icon?: DatasetIconName;
  tracking: Tracking;
  valence: Valence;
  createdAt: number | ISODateString;
  updatedAt: number | ISODateString;
}

export type ISODateString = `${number}-${number}-${number}T${number}:${number}:${number}Z`;

/**
 * Types of tracking:
 * - 'trend': daily values tracked as a time series (focus on deltas)
 * - 'series': daily values tracked as a cumulative series (focus on totals)
 */
export type Tracking = 'trend' | 'series';

/**
 * Valence types:
 * - 'positive': positive or higher values are better
 * - 'negative': negative or lower values are better
 * - 'neutral': all values are the same
 */
export type Valence = 'positive' | 'negative' | 'neutral';

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

// Generic metric goal type, can be used as a target (repeating), milestone (one-time), or achievement requirement
export type GoalTarget = {
  metric: NumberMetric;
  source: NumberSource;
  value?: number;
  range?: [number, number];
} & (
  | { condition: 'above' | 'below' | 'equal'; value: number; }
  | { condition: 'inside' | 'outside'; range: [number, number]; }
);

// Reward visuals for goals
export type GoalBadge = {
  style: AchievementBadgeStyle;
  color: AchievementBadgeColor;
  icon?: AchievementBadgeIcon;
  label?: string;
}

// Goal entity -- used for milestones, targets, and achievements
export type Goal = {
  id: string;
  datasetId: string;
  createdAt: number;
  title: string;
  description?: string;
  badge: GoalBadge;
  type: GoalType;

  target: GoalTarget;
  targetDate?: DayKey;
  timePeriod: TimePeriod; 
  count: number; // Used for streaks or multiple completions
  consecutive?: boolean; // Consecutive allows null gaps, but not failures
  // resets?: TimePeriod; // Used to reset counting at specific intervals -- TODO
  // repeatable?: boolean; // Whether the goal can be achieved multiple times -- TODO
}


export type GoalRequirements = Pick<Goal, 'target' | 'targetDate' | 'timePeriod' | 'count' | 'consecutive'>;

export type GoalType = 'milestone' | 'target' | 'goal';

// Goal time period types
export type TimePeriod = DateKeyType | 'anytime';

// Achievement -- tracks user progress on goals, each goal can potentially have multiple achievements
export interface Achievement {
  id: string;
  goalId: string;
  datasetId: string;
  progress: number; // For goals with count > 1
  startedAt?: DateKey; // corresponds to the goal.timePeriod type
  completedAt?: DateKey; // corresponds to the goal.timePeriod type
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
  { name: 'entries', keyPath: ['datasetId', 'date'], indexes: ['datasetId', 'date'] },
  { name: 'notes', keyPath: ['datasetId', 'date'], indexes: ['datasetId', 'date'] },
  { name: 'images', keyPath: 'id', indexes: ['datasetId', ['datasetId', 'date']] },
  { name: 'goals', keyPath: 'id', indexes: ['datasetId'] },
  { name: 'achievements', keyPath: 'id', indexes: ['goalId', 'datasetId'] },
];
const DB_VERSION = 9;

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
          id: nanoid(),
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

      // Migration for changing entries/notes keyPath to composite key (version < 8)
      if (oldVersion < 8) {
        // Migrate entries store
        if (db.objectStoreNames.contains('entries')) {
          const oldEntriesStore = transaction.objectStore('entries');
          const allEntries = await oldEntriesStore.getAll();
          
          // Delete and recreate the store with new keyPath
          db.deleteObjectStore('entries');
          const newEntriesStore = db.createObjectStore('entries', { keyPath: ['datasetId', 'date'] });
          newEntriesStore.createIndex('datasetId', 'datasetId');
          newEntriesStore.createIndex('date', 'date');
          
          // Re-add all entries
          for (const entry of allEntries) {
            await newEntriesStore.put(entry);
          }
          console.log(`Migrated ${allEntries.length} entries to composite key`);
        }

        // Migrate notes store
        if (db.objectStoreNames.contains('notes')) {
          const oldNotesStore = transaction.objectStore('notes');
          const allNotes = await oldNotesStore.getAll();
          
          // Delete and recreate the store with new keyPath
          db.deleteObjectStore('notes');
          const newNotesStore = db.createObjectStore('notes', { keyPath: ['datasetId', 'date'] });
          newNotesStore.createIndex('datasetId', 'datasetId');
          newNotesStore.createIndex('date', 'date');
          
          // Re-add all notes
          for (const note of allNotes) {
            await newNotesStore.put(note);
          }
          console.log(`Migrated ${allNotes.length} notes to composite key`);
        }
      }

      // Migration for adding goals and achievements stores (version < 9)
      if (oldVersion < 9) {
        if (!db.objectStoreNames.contains('goals')) {
          const goalsStore = db.createObjectStore('goals', { keyPath: 'id' });
          goalsStore.createIndex('datasetId', 'datasetId');
        }
        if (!db.objectStoreNames.contains('achievements')) {
          const achievementsStore = db.createObjectStore('achievements', { keyPath: 'id' });
          achievementsStore.createIndex('goalId', 'goalId');
          achievementsStore.createIndex('datasetId', 'datasetId');
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

export async function getDataset(id: string): Promise<Dataset | null> {
  const db = await getDb();
  return await db.get('datasets', id) ?? null;
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

// Goal CRUD
export async function listGoals(datasetId: string): Promise<Goal[]> {
  const db = await getDb();
  return await db.getAllFromIndex('goals', 'datasetId', datasetId);
}

export async function createGoal(goal: Goal): Promise<void> {
  const db = await getDb();
  await db.add('goals', goal);
}

export async function updateGoal(goal: Goal): Promise<void> {
  const db = await getDb();
  await db.put('goals', goal);
}

// Achievement CRUD
export async function listAchievements(goalId: string): Promise<Achievement[]> {
  const db = await getDb();
  return await db.getAllFromIndex('achievements', 'goalId', goalId);
}

export async function createAchievement(achievement: Achievement): Promise<void> {
  const db = await getDb();
  await db.add('achievements', achievement);
}

export async function updateAchievement(achievement: Achievement): Promise<void> {
  const db = await getDb();
  await db.put('achievements', achievement);
}

// Day Entry CRUD
export async function saveDay(datasetId: string, date: DayKey, numbers: number[]) {
  const db = await getDb();
  await db.put('entries', { datasetId, date, numbers });
  // Also update the dataset's updatedAt timestamp
  const ds = await db.get('datasets', datasetId) as Dataset | undefined;
  if (ds) {
    ds.updatedAt = new Date().toISOString() as ISODateString;
    await db.put('datasets', ds);
  }
}

export async function loadDay(datasetId: string, date: DayKey): Promise<number[]> {
  const db = await getDb();
  // Use the composite key directly
  const entry = await db.get('entries', [datasetId, date]);
  return entry?.numbers || [];
}

export async function loadMonth(datasetId: string, year: number, month: number): Promise<Record<DayKey, number[]>> {
  const db = await getDb();
  const monthStr = toMonthKey(year, month);
  // Get all entries for this datasetId and month using composite key range
  const range = IDBKeyRange.bound([datasetId, monthStr], [datasetId, monthStr + '\uffff']);
  const all: DayEntry[] = await db.getAll('entries', range);
  return Object.fromEntries(all.map(entry => [entry.date, entry.numbers]));
}

export async function loadYear(datasetId: string, year: number): Promise<Record<DayKey, number[]>> {
  const db = await getDb();
  const yearStr = toYearKey(year);
  // Range: all dates starting with year (e.g., 2025-) using composite key
  const range = IDBKeyRange.bound([datasetId, yearStr], [datasetId, yearStr + '\uffff']);
  const all: DayEntry[] = await db.getAll('entries', range);
  return Object.fromEntries(all.map(entry => [entry.date, entry.numbers]));
}

export async function loadAllDays(datasetId: string): Promise<DayEntry[]> {
  const db = await getDb();
  // Query using the datasetId index to get all entries for this dataset
  const all: DayEntry[] = await db.getAllFromIndex('entries', 'datasetId', datasetId);
  return all;
}


// Efficiently find the most recent populated entry before a given date for a dataset, then load the entire month for that entry
export async function findMostRecentPopulatedMonthBefore(datasetId: string, beforeDate: DayKey): Promise<Record<DayKey, number[]> | null> {
  const db = await getDb();
  const tx = db.transaction('entries', 'readonly');
  const store = tx.objectStore('entries');
  // Open a cursor in reverse order, ending before the target date
  const range = IDBKeyRange.bound([datasetId, '0000-00-00'], [datasetId, beforeDate], false, true);
  let cursor = await store.openCursor(range, 'prev');
  while (cursor) {
    if (cursor.value.numbers && cursor.value.numbers.length > 0) {
      // Found the most recent populated day
      const foundDate = cursor.value.date;
      const [year, month] = foundDate.split('-');
      // Load the entire month for that entry
      return await loadMonth(datasetId, Number(year), Number(month));
    }
    cursor = await cursor.continue();
  }
  return null;
}