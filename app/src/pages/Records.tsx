import type { DateKey, Valence } from '@/features/db/localdb';
import { Award, CalendarDays, Flame, Skull, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BackToCalendarButton } from '@/components/BackToCalendarButton';
import { useAllDays } from '../features/db/useCalendarData';
import { useDatasets } from '../features/db/useDatasetData';
import { formatFriendlyDate, parseDateKey } from '../lib/friendly-date';
import { calculateRecordsForValence } from '../lib/records';



export function Records({ datasetId }: { datasetId: string }) {
  const { data: datasets = [] } = useDatasets();
  const dataset = datasets.find(d => d.id === datasetId);
  const { data: allDays, isLoading, error } = useAllDays(datasetId);
  const records = useMemo(() =>
    (dataset && allDays) ? calculateRecordsForValence(allDays, dataset.valence) : null,
    [allDays, dataset]
  );

  if (!dataset) return <div className="max-w-4xl mx-auto p-8">Dataset not found.</div>;
  if (isLoading) return <div className="max-w-4xl mx-auto p-8">Loading records…</div>;
  if (error) return <div className="max-w-4xl mx-auto p-8 text-red-500">Failed to load records.</div>;
  if (!records) return null;

  // Prepare all records as an array for sorting, based on tracking type
  let recordCards: RecordCardProps[] = [];
  const valence = dataset.valence
  if (dataset.tracking === 'series') {
    recordCards = [
      // Best
      { type: "best", label: `Day`, ...records.bestDay, valence },
      { type: "best", label: `Day Median`, ...records.bestDayMedian, valence },
      { type: "best", label: `Week`, ...records.bestWeek, valence },
      { type: "best", label: `Week Median`, ...records.bestWeekMedian, valence },
      { type: "best", label: `Month`, ...records.bestMonth, valence },
      { type: "best", label: `Monthly Median`, ...records.bestMonthMedian, valence },
      // Worst
      { type: "worst", label: `Day`, ...records.worstDay, valence },
      { type: "worst", label: `Day Median`, ...records.worstDayMedian, valence },
      { type: "worst", label: `Week`, ...records.worstWeek, valence },
      { type: "worst", label: `Week Median`, ...records.worstWeekMedian, valence },
      { type: "worst", label: `Month`, ...records.worstMonth, valence },
      { type: "worst", label: `Monthly Median`, ...records.worstMonthMedian, valence },
      // Streaks
      { type: "streak", label: 'Daily Streak', ...records.bestDailyStreak, date: records.bestDailyStreak.end, valence },
      { type: "streak", label: 'Weekly Streak', ...records.bestWeeklyStreak, date: records.bestWeeklyStreak.end, valence },
      { type: "streak", label: 'Monthly Streak', ...records.bestMonthlyStreak, date: records.bestMonthlyStreak.end, valence },
    ];
  } else if (dataset.tracking === 'trend') {
    recordCards = [
      // Best Medians
      { type: "best", label: `Day Median`, ...records.bestDayMedian, valence },
      { type: "best", label: `Week Median`, ...records.bestWeekMedian, valence },
      { type: "best", label: `Monthly Median`, ...records.bestMonthMedian, valence },
      // Worst Medians
      { type: "worst", label: `Day Median`, ...records.worstDayMedian, valence },
      { type: "worst", label: `Week Median`, ...records.worstWeekMedian, valence },
      { type: "worst", label: `Monthly Median`, ...records.worstMonthMedian, valence },
      // Streaks
      { type: "streak", label: 'Daily Trend Streak', ...records.bestDailyTrendStreak, date: records.bestDailyTrendStreak.end, valence },
      { type: "streak", label: 'Weekly Trend Streak', ...records.bestWeeklyTrendStreak, date: records.bestWeeklyTrendStreak.end, valence },
      { type: "streak", label: 'Monthly Trend Streak', ...records.bestMonthlyTrendStreak, date: records.bestMonthlyTrendStreak.end, valence },
    ];
  }

  // Sort by date descending (most recent first) using parseDateKey for proper comparison
  recordCards.sort((a, b) => {
    try {
      const da = parseDateKey(a.date);
      const db = parseDateKey(b.date);
      return db.getTime() - da.getTime();
    } catch {
      return String(b.date).localeCompare(String(a.date));
    }
  });

  // Group records by month/year (using end date for streaks, date for others)
  const recordsByMonth: { [month: string]: RecordCardProps[] } = {};
  recordCards.forEach((rec) => {
    const dateKey = rec.type === 'streak' ? rec.end : rec.date;
    let monthKey = '';
    try {
      const d = parseDateKey(dateKey);
      monthKey = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Unknown';
    } catch {
      monthKey = 'Unknown';
    }
    if (!recordsByMonth[monthKey]) recordsByMonth[monthKey] = [];
    recordsByMonth[monthKey].push(rec);
  });

  // Sort months descending (most recent first)
  const sortedMonthKeys = Object.keys(recordsByMonth).sort((a, b) => b.localeCompare(a));

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <BackToCalendarButton datasetId={dataset.id} />
      <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
        <Award className="w-7 h-7 md:w-8 md:h-8 text-yellow-400" /> Records
      </h2>
      <div className="space-y-8">
        {sortedMonthKeys.map((monthKey) => {
          const group = recordsByMonth[monthKey];
          // Format header as 'MMMM yyyy' using the first record's date
          let header = 'Unknown';
          try {
            const d = parseDateKey(group[0].type === 'streak' ? group[0].end : group[0].date);
            header = d ? d.toLocaleString('default', { month: 'long', year: 'numeric' }) : 'Unknown';
          } catch {}
          return (
            <div key={monthKey}>
              <div className="flex items-center gap-2 mb-4 mt-8">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  {header}
                  <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold align-middle border border-slate-200 dark:border-slate-700 ml-1">
                    {group.length}
                  </span>
                </span>
                <span className="flex-1"><span className="block h-[1px] w-full bg-slate-200 dark:bg-slate-800" /></span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.map((rec) => (
                  <li key={`${rec.type}-${rec.label}`}>
                    <RecordCard {...rec} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}


type RecordCardProps = {
  label: string;
  date: DateKey;
  valence: Valence;
  type: "best" | "worst" | "streak";
} & ({
  type: "best" | "worst";
  value: number;
} | {
  type: "streak";
  start: DateKey;
  end: DateKey;
  length: number;
});

function RecordCard(props: RecordCardProps) {
  const { label, valence, date, type } = props;
  let icon: React.ReactNode;
  let displayLabel = label;
  let iconBg = '';
  let valueColor = '';
  let badgeBg = '';
  let badgeText = '';
  let borderColor = '';
  let bgColor = '';
  let displayDate = '';
  let displayValue = '';

  if (type === "streak") {
    icon = <Flame className="w-6 h-6 text-amber-500" />;
    iconBg = 'bg-amber-100 dark:bg-amber-900';
    valueColor = 'text-amber-600 dark:text-amber-300';
    badgeBg = 'bg-amber-50 dark:bg-amber-900 border-amber-200 dark:border-amber-700';
    badgeText = 'text-amber-700 dark:text-amber-200';
    borderColor = 'border-amber-200 dark:border-amber-700';
    bgColor = 'bg-amber-50/50 dark:bg-amber-900/50';
    displayLabel = `Best ${label}`;
  } else if (type === "best") {
    if (valence === 'neutral') {
      icon = <TrendingUp className="w-6 h-6 text-blue-500" />;
      iconBg = 'bg-blue-100 dark:bg-blue-900';
      valueColor = 'text-blue-600 dark:text-blue-300';
      badgeBg = 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700';
      badgeText = 'text-blue-700 dark:text-blue-200';
      borderColor = 'border-blue-200 dark:border-blue-700';
      bgColor = 'bg-blue-50/50 dark:bg-blue-900/50';
      displayLabel = `Highest ${label}`;
    } else {
      icon = <Trophy className="w-6 h-6 text-green-500" />;
      iconBg = 'bg-green-100 dark:bg-green-900';
      valueColor = 'text-green-600 dark:text-green-300';
      badgeBg = 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700';
      badgeText = 'text-green-700 dark:text-green-200';
      borderColor = 'border-green-200 dark:border-green-700';
      bgColor = 'bg-green-50/50 dark:bg-green-900/50';
      displayLabel = `Best ${label}`;
    }
  } else if (type === "worst") {
    if (valence === 'neutral') {
      icon = <TrendingDown className="w-6 h-6 text-purple-500" />;
      iconBg = 'bg-purple-100 dark:bg-purple-900';
      valueColor = 'text-purple-600 dark:text-purple-300';
      badgeBg = 'bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-700';
      badgeText = 'text-purple-700 dark:text-purple-200';
      borderColor = 'border-purple-200 dark:border-purple-700';
      bgColor = 'bg-purple-50/50 dark:bg-purple-900/50';
      displayLabel = `Lowest ${label}`;
    } else {
      icon = <Skull className="w-6 h-6 text-red-400" />;
      iconBg = 'bg-red-100 dark:bg-red-900';
      valueColor = 'text-red-600 dark:text-red-300';
      badgeBg = 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700';
      badgeText = 'text-red-700 dark:text-red-200';
      borderColor = 'border-red-200 dark:border-red-700';
      bgColor = 'bg-red-50/50 dark:bg-red-900/50';
      displayLabel = `Worst ${label}`;
    }
  }

  if (!date) {
    displayDate = 'Never';
    displayValue = '—';
    iconBg = 'bg-slate-100 dark:bg-slate-900';
    valueColor = 'text-slate-400 dark:text-slate-500';
    badgeBg = 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700';
    badgeText = 'text-slate-400 dark:text-slate-500';
    borderColor = 'border-slate-200 dark:border-slate-700';
    bgColor = 'bg-slate-50/50 dark:bg-slate-900/50';
  } else {
    displayValue = Intl.NumberFormat().format(type == 'streak' ? props.length : props.value)
    displayDate = type === 'streak'
      ? formatFriendlyDate(props.start, props.end)
      : formatFriendlyDate(date);
  }

  return (
    <div className={`relative rounded-xl border ${bgColor} dark:bg-slate-900/80 shadow-sm group transition-all hover:scale-[1.012] hover:shadow-md h-full flex flex-col justify-center ${borderColor}`}>
      {/* Floating date badge */}
      <div className="absolute left-0 right-0 -top-3 z-10 flex justify-center px-4">
        <span className={`inline-flex items-center gap-1 px-4 py-1 rounded-full border text-xs font-medium shadow-md max-w-full ${badgeBg} ${badgeText}`} style={{maxWidth:'95%'}}>
          <CalendarDays className="w-4 h-4 opacity-70" />
          <span className="truncate">{displayDate}</span>
        </span>
      </div>
      <div className="flex items-center gap-4 px-4 py-4 md:py-5 md:px-6 h-full">
        {/* Icon */}
        <div className={`flex-shrink-0 rounded-lg p-2 border shadow-sm ${iconBg}`}>{icon}</div>
        {/* Main content: label and value */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="text-xs font-semibold truncate opacity-80 mb-1">{displayLabel}</div>
          <div className={`text-2xl md:text-3xl font-extrabold leading-tight ${valueColor}`}>{displayValue}</div>
        </div>
      </div>
    </div>
  );
}

export default Records;
