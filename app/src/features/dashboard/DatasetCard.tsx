import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Dataset } from '@/features/db/localdb';
import { useMonth } from '@/features/db/useCalendarData';
import { getSeededColorTheme } from '@/lib/colors';
import { getDatasetIcon } from '@/lib/dataset-icons';
import { toDayKey } from '@/lib/friendly-date';
import { getRelativeTime } from '@/lib/utils';
import { BarChart as BarChartIcon, Copy, Download, MoreVertical, Settings, TrendingUp, Upload } from 'lucide-react';
import { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';

export function DatasetCard({ dataset, year, month, onSelect }: { dataset: Dataset; year: number; month: number; onSelect: (id: string) => void }) {
  const { data: monthData = {} } = useMonth(dataset.id, year, month);
  const updated = getRelativeTime(dataset.updatedAt);
  const IconComponent = getDatasetIcon(dataset.icon);
  const { bg: iconBg, text: iconText } = getSeededColorTheme(dataset.id);

  // Memoized chart data and stats
  const stats = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const data: { day: number; dailyTotal: number; cumulativeTotal: number }[] = [];
    let running = 0;
    let totalEntries = 0;
    let activeDays = 0;
    let maxDaily = 0;
    let minDaily = Number.POSITIVE_INFINITY;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = toDayKey(year, month, day);
      const numbers = monthData[dateKey] || [];
      const dailyTotal = numbers.reduce((sum, num) => sum + num, 0);
      
      if (numbers.length > 0) {
        activeDays++;
        totalEntries += numbers.length;
        if (dailyTotal > maxDaily) maxDaily = dailyTotal;
        if (dailyTotal < minDaily) minDaily = dailyTotal;
      }
      
      running += dailyTotal;
      data.push({ day, dailyTotal, cumulativeTotal: running });
    }

    return {
      chartData: data,
      total: running,
      activeDays,
      totalEntries,
      average: activeDays > 0 ? running / activeDays : 0,
      maxDaily: activeDays > 0 ? maxDaily : 0,
      minDaily: activeDays > 0 && minDaily !== Number.POSITIVE_INFINITY ? minDaily : 0,
    };
  }, [monthData, year, month]);

  const lineColor = stats.total >= 0 ? 'rgb(34 197 94)' : 'rgb(239 68 68)';
  const tracking = dataset.tracking;
  const TagIcon = tracking === 'trend' ? TrendingUp : BarChartIcon;
  const badgeColor = tracking === 'trend' 
    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm shadow-emerald-500/50'
    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/50';
  
  return (
    <div
      onClick={() => onSelect(dataset.id)}
      className="group relative w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-500 transition-all overflow-hidden cursor-pointer"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-indigo-50/0 to-purple-50/0 dark:from-slate-700/0 dark:via-slate-700/0 dark:to-slate-600/0 group-hover:from-blue-50/50 group-hover:via-indigo-50/30 group-hover:to-purple-50/50 dark:group-hover:from-slate-700/30 dark:group-hover:via-slate-700/20 dark:group-hover:to-slate-600/30 transition-all pointer-events-none" />
      
      <div className="relative p-5">
        {/* Header with icon, title, badge, and options */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center border-2 border-transparent bg-opacity-60 dark:bg-opacity-50 group-hover:scale-105 transition-all flex-shrink-0 ${iconBg}`}
          >
            <IconComponent className={`w-5 h-5 ${iconText} opacity-60`} style={{ filter: 'none' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-indigo-300 transition-colors flex-1">
                {dataset.name}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full ${badgeColor}`}>
                  <TagIcon className="h-3.5 w-3.5" />
                  <span>{tracking === 'trend' ? 'Trend' : 'Series'}</span>
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy As...
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {dataset.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{dataset.description}</p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Total</div>
            <div className={`text-2xl font-bold ${stats.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {stats.total.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Avg/Day</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.average.toFixed(1)}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Active</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.activeDays}d
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/30 dark:to-slate-800/30 rounded-xl p-3 border border-slate-200 dark:border-slate-600 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">This Month Trend</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{stats.totalEntries} entries</span>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <Line
                    type="monotone"
                    dataKey="cumulativeTotal"
                    stroke={lineColor}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Updated {updated}</span>
          <span className="font-medium text-blue-600 dark:text-indigo-400 group-hover:underline">
            View Details →
          </span>
        </div>
      </div>
    </div>
  );
}