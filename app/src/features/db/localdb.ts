import { openDB } from 'idb';

export type DayNumbers = number[];
export type CalendarEntry = {
  date: string; // YYYY-MM-DD
  numbers: DayNumbers;
};

const DB_NAME = 'number-calendar';
const STORE_NAME = 'calendar';
const DB_VERSION = 1;

function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'date' });
      }
    },
  });
}

export async function saveDay(date: string, numbers: number[]) {
  const db = await getDb();
  await db.put(STORE_NAME, { date, numbers });
}

export async function loadDay(date: string): Promise<number[]> {
  const db = await getDb();
  const entry = await db.get(STORE_NAME, date);
  return entry?.numbers || [];
}

export async function loadMonth(year: number, month: number): Promise<Record<string, number[]>> {
  const db = await getDb();
  const all: CalendarEntry[] = await db.getAll(STORE_NAME);
  const result: Record<string, number[]> = {};
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  for (const entry of all) {
    if (entry.date.startsWith(monthStr)) {
      result[entry.date] = entry.numbers;
    }
  }
  return result;
}
