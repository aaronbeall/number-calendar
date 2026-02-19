import { useSearchParamState } from '@/hooks/useSearchParamState';

/**
 * Hook to manage the side panel state via URL search params
 */
export function useSidePanelState() {
  return useSearchParamState<string>('panel', null);
}
