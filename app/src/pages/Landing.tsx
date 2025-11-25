import { Plus, TrendingUp } from 'lucide-react';
import LogoIcon from '@/assets/icon.svg?react';
import { getRelativeTime } from '@/lib/utils';
import { useMemo } from 'react';
import { BarChart as BarChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import { useMonth} from '@/features/db/useCalendarData';
import { getDatasetIcon } from '@/lib/dataset-icons';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { Dataset } from '@/features/db/localdb';

function DatasetCard({ dataset, year, month, onSelect }: { dataset: Dataset; year: number; month: number; onSelect: (id: string) => void }) {
  const { data: monthData = {} } = useMonth(dataset.id, year, month);
  const created = new Date(dataset.createdAt).toLocaleDateString();
  const updated = getRelativeTime(dataset.updatedAt);
  const IconComponent = getDatasetIcon(dataset.icon);

  // Memoized chart data (daily + cumulative)
  const { chartData, finalCumulative } = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const data: { day: number; dailyTotal: number; cumulativeTotal: number }[] = [];
    let running = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const numbers = monthData[dateKey] || [];
      const dailyTotal = numbers.reduce((sum, num) => sum + num, 0);
      running += dailyTotal;
      data.push({ day, dailyTotal, cumulativeTotal: running });
    }
    return {
      chartData: data,
      finalCumulative: data.length > 0 ? data[data.length - 1].cumulativeTotal : 0,
    };
  }, [monthData, year, month, dataset.id]);

  const lineColor = finalCumulative >= 0 ? 'rgb(34 197 94)' : 'rgb(239 68 68)'; // green-500 / red-500
  
  return (
    <button
      type="button"
      onClick={() => onSelect(dataset.id)}
      className="group w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-400 transition relative"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-md bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center border border-slate-300 dark:border-slate-600 group-hover:from-blue-100 group-hover:to-indigo-200 dark:group-hover:from-slate-600 dark:group-hover:to-slate-500 flex-shrink-0">
          <IconComponent className="w-6 h-6 text-slate-500 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-indigo-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-700 dark:text-slate-100 truncate group-hover:text-blue-700 dark:group-hover:text-indigo-200">{dataset.name}</h3>
            {(() => {
              const tracking = dataset.tracking; // 'trend' | 'series'
              const TagIcon = tracking === 'trend' ? TrendingUp : BarChartIcon;
              const label = tracking === 'trend' ? 'Trend' : 'Series';
              return (
                <span
                  className="flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 px-2 py-0.5 rounded flex-shrink-0"
                  title={`Tracking ${label}`}
                >
                  <TagIcon className="h-3 w-3" />
                  <span>{label}</span>
                </span>
              );
            })()}
          </div>
          {dataset.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">{dataset.description}</p>
          )}
          <div className="flex items-center gap-3 mb-3 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Line
                  type="monotone"
                  dataKey="cumulativeTotal"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">This month</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="opacity-60">Created:</span>
              <span className="font-medium text-slate-600 dark:text-slate-300">{created}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="opacity-60">Updated:</span>
              <span className="font-medium text-slate-600 dark:text-slate-300">{updated}</span>
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function Landing({ datasets, onSelectDataset, onOpenCreate }: { datasets: Dataset[]; onSelectDataset: (datasetId: string) => void; onOpenCreate: () => void }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-md w-full p-8 rounded-xl shadow-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <LogoIcon className="w-16 h-16 mb-6 mx-auto block" aria-label="Numbers Go Up" />
        <h2 className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Welcome to Numbers Go Up</h2>
        <p className="text-center text-slate-500 mb-6">Select a dataset to begin tracking your progress. Datasets let you organize your numbers for different goals, projects, or journeys.</p>
        <div className="space-y-4">
          {datasets.length === 0 ? (
            <button
              className="block w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-500 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition p-6 text-left"
              onClick={onOpenCreate}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-md bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center border border-blue-200 dark:border-slate-600">
                  <Plus className="w-6 h-6 text-blue-600 dark:text-indigo-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">Add your first dataset</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Start tracking your numbers by creating a dataset. You can have separate datasets for different goals.</p>
                  <div className="text-xs text-slate-400 dark:text-slate-500">No datasets yet.</div>
                </div>
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              {datasets.map(ds => <DatasetCard key={ds.id} dataset={ds} year={currentYear} month={currentMonth} onSelect={onSelectDataset} />)}
              <button
                className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-500 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition p-5 text-left"
                onClick={onOpenCreate}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-md bg-gradient-to-br from-green-100 to-emerald-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center border border-green-200 dark:border-slate-600">
                    <Plus className="w-6 h-6 text-green-600 dark:text-emerald-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">Add another dataset</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Create a new space for tracking a different goal or category.</p>
                    <div className="text-xs text-slate-400 dark:text-slate-500">You currently have {datasets.length} dataset{datasets.length === 1 ? '' : 's'}.</div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
