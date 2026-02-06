import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveGoal,
  createAchievement,
  createGoal,
  listAchievements,
  listGoals,
  updateAchievement,
  updateGoal
} from './localdb';

// Goals hooks
export function useGoals(datasetId: string) {
  return useQuery({
    queryKey: ['goals', datasetId],
    queryFn: () => listGoals(datasetId),
    enabled: !!datasetId,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGoal,
    onSuccess: (_, created) => {
      if (created?.datasetId) {
        queryClient.invalidateQueries({ queryKey: ['goals', created.datasetId] });
      }
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateGoal,
    onSuccess: (_, updated) => {
      if (updated?.datasetId) {
        queryClient.invalidateQueries({ queryKey: ['goals', updated.datasetId] });
      }
    },
  });
}

export function useArchiveGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveGoal,
    onSuccess: (_, archived) => {
      if (archived?.datasetId) {
        queryClient.invalidateQueries({ queryKey: ['goals', archived.datasetId] });
      }
    },
  });
}

// Achievements hooks
export function useAchievements(goalId: string) {
  return useQuery({
    queryKey: ['achievements', goalId],
    queryFn: () => listAchievements(goalId),
    enabled: !!goalId,
  });
}

export function useCreateAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAchievement,
    onSuccess: (_, created) => {
      if (created?.goalId) {
        queryClient.invalidateQueries({ queryKey: ['achievements', created.goalId] });
      }
    },
  });
}

export function useUpdateAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAchievement,
    onSuccess: (_, updated) => {
      if (updated?.goalId) {
        queryClient.invalidateQueries({ queryKey: ['achievements', updated.goalId] });
      }
    },
  });
}
