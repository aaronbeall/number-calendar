import { Database, Target, Flame, Activity, BarChart2, type LucideIcon } from 'lucide-react';

export interface DatasetIconOption {
  name: string;
  label: string;
  Icon: LucideIcon;
}

export const DATASET_ICON_OPTIONS = [
  { name: 'database', label: 'Database', Icon: Database },
  { name: 'target', label: 'Target', Icon: Target },
  { name: 'flame', label: 'Flame', Icon: Flame },
  { name: 'activity', label: 'Activity', Icon: Activity },
  { name: 'barchart', label: 'Chart', Icon: BarChart2 },
] as const satisfies readonly DatasetIconOption[];

export type DatasetIconName = (typeof DATASET_ICON_OPTIONS)[number]['name'];

export function getDatasetIcon(name?: DatasetIconName): LucideIcon {
  return DATASET_ICON_OPTIONS.find(o => o.name === name)?.Icon || Database;
}
