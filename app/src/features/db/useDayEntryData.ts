import { toDayKey } from '@/lib/friendly-date';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  findMostRecentPopulatedMonthBefore, loadAllDays, loadDay,
  loadMonth,
  loadYear, saveDay,
  type Dataset,
  type DayEntry,
  type DayKey
} from './localdb';

// Hook to load a day's numbers for a dataset
export function useDay(datasetId: string, date: DayKey) {
  return useQuery({
    queryKey: ['day', datasetId, date],
    queryFn: () => loadDay(datasetId, date),
  });
}

// Hook to load a month's numbers for a dataset
export function useMonth(datasetId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['month', datasetId, year, month],
    queryFn: () => loadMonth(datasetId, year, month),
  });
}

// Hook to load a year's numbers for a dataset
export function useYear(datasetId: string, year: number) {
  return useQuery({
    queryKey: ['year', datasetId, year],
    queryFn: () => loadYear(datasetId, year),
  });
}

// Hook to load all daily DayEntry[] for a dataset
export function useAllDays(datasetId: string) {
  return useQuery({
    queryKey: ['allDays', datasetId],
    queryFn: () => loadAllDays(datasetId),
  });
}

// Hook to save a day's numbers and update caches using DayEntry type
export function useSaveDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { datasetId: string; date: DayKey; numbers: number[] }) => {
      await saveDay(params.datasetId, params.date, params.numbers);
      return params;
    },
    onSuccess: ({ datasetId, date, numbers }) => {
      // Update 'day' cache
      queryClient.setQueryData(['day', datasetId, date], numbers);

      // Update 'allDays' cache using DayEntry type
      const allDaysKey = ['allDays', datasetId];
      const allDays = queryClient.getQueryData(allDaysKey) as DayEntry[] | undefined;
      if (allDays) {
        const nextAllDays = [...allDays];
        const idx = allDays.findIndex(d => d.date === date);
        if (idx !== -1) {
          // Update existing day
          nextAllDays[idx] = { ...allDays[idx], numbers };
        } else {
          // Add new day
          nextAllDays.push({ date, numbers, datasetId });
        }
        queryClient.setQueryData(allDaysKey, nextAllDays);
      }

      // Update 'month' cache
      const [year, month] = date.split('-');
      const monthKey = ['month', datasetId, Number(year), Number(month)];
      const monthData = queryClient.getQueryData(monthKey) as Record<DayKey, number[]> | undefined;
      if (monthData) {
        queryClient.setQueryData(monthKey, { ...monthData, [date]: numbers });
      }

      // Update 'year' cache
      const yearKey = ['year', datasetId, Number(year)];
      const yearData = queryClient.getQueryData(yearKey) as Record<DayKey, number[]> | undefined;
      if (yearData) {
        queryClient.setQueryData(yearKey, { ...yearData, [date]: numbers });
      }

      // Invalidate all 'mostRecentPopulatedMonthBefore' queries for this dataset except the current beforeDate (first day of the current month)
      const currentMonthFirstDay = toDayKey(Number(year), Number(month), 1);
      const queries = queryClient.getQueryCache().findAll({ queryKey: ['mostRecentPopulatedMonthBefore', datasetId] });
      for (const q of queries) {
        const [, , beforeDate] = q.queryKey as [string, string, string];
        if (beforeDate !== currentMonthFirstDay) {
          queryClient.invalidateQueries({ queryKey: ['mostRecentPopulatedMonthBefore', datasetId, beforeDate] });
        }
      }

        // Update dataset caches to reflect updatedAt touched during saveDay
        queryClient.setQueryData(['datasets'], (existing: Dataset[] | undefined) => {
          if (!Array.isArray(existing)) return existing;
          return existing.map((d: any) => (d?.id === datasetId ? { ...d, updatedAt: Date.now() } : d));
        });
        queryClient.setQueryData(['dataset', datasetId], (existing: Dataset | undefined) => {
          if (!existing) return existing;
          return { ...existing, id: datasetId, updatedAt: Date.now() };
        });
    },
  });
}

// Hook to find the most recent populated month before a given date
export function useMostRecentPopulatedMonthBefore(datasetId: string, beforeDate: DayKey) {
  return useQuery({
    queryKey: ['mostRecentPopulatedMonthBefore', datasetId, beforeDate],
    queryFn: () => findMostRecentPopulatedMonthBefore(datasetId, beforeDate),
    enabled: !!beforeDate,
  });
}