import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDataset,
  getDataset,
  updateDataset,
  deleteDataset,
  listDatasets,
  type Dataset,
} from './localdb';

// Hook to list all datasets
export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: () => listDatasets(),
  });
}

// Hook to get a single dataset
export function useDataset(id: string) {
  return useQuery({
    queryKey: ['dataset', id],
    queryFn: () => getDataset(id),
    enabled: !!id,
  });
}

// Hook to create a dataset
export function useCreateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
  });
}

// Hook to update a dataset
export function useUpdateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDataset,
    onSuccess: (_, updated) => {
      // Update list cache
      queryClient.setQueryData(['datasets'], (existing: Dataset[]) => {
        if (!Array.isArray(existing)) return existing;
        return existing.map(d => (d?.id === updated?.id ? updated : d));
      });
      // Update single item cache
      if (updated?.id) {
        queryClient.setQueryData(['dataset', updated.id], updated);
      }
    },
  });
}

// Hook to delete a dataset
export function useDeleteDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDataset,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['dataset', deletedId] });
    },
  });
}
