import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  loadDay,
  loadMonth,
  loadYear,
  saveDay,
  type DateKey,
} from './localdb';

// Hook to load a day's numbers for a dataset
export function useDay(datasetId: string, date: DateKey) {
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


// Hook to save a day's numbers and invalidate queries
export function useSaveDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { datasetId: string; date: DateKey; numbers: number[] }) => {
      await saveDay(params.datasetId, params.date, params.numbers);
      return params;
    },
    onSuccess: ({ datasetId, date }) => {
      queryClient.invalidateQueries({ queryKey: ['day', datasetId, date] });
      // Optionally invalidate month
      const [year, month] = date.split('-');
      queryClient.invalidateQueries({ queryKey: ['month', datasetId, Number(year), Number(month)] });
    },
  });
}
