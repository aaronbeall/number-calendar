import {
  Database,
  Target,
  Flame,
  Activity,
  BarChart2,
  TrendingUp,
  TrendingDown,
  LineChart,
  PieChart,
  Clock,
  Calendar,
  Trophy,
  Zap,
  DollarSign,
  type LucideIcon
} from 'lucide-react';

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
  { name: 'linechart', label: 'Line', Icon: LineChart },
  { name: 'piechart', label: 'Pie', Icon: PieChart },
  { name: 'trendingup', label: 'Up', Icon: TrendingUp },
  { name: 'trendingdown', label: 'Down', Icon: TrendingDown },
  { name: 'clock', label: 'Clock', Icon: Clock },
  { name: 'calendar', label: 'Calendar', Icon: Calendar },
  { name: 'trophy', label: 'Trophy', Icon: Trophy },
  { name: 'zap', label: 'Zap', Icon: Zap },
  { name: 'dollar', label: 'Money', Icon: DollarSign },
] as const satisfies readonly DatasetIconOption[];

export type DatasetIconName = (typeof DATASET_ICON_OPTIONS)[number]['name'];

export function getDatasetIcon(name?: DatasetIconName): LucideIcon {
  return DATASET_ICON_OPTIONS.find(o => o.name === name)?.Icon || Database;
}
