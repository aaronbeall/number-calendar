import { formatFriendlyDate, parseDateKey } from '../lib/friendly-date';
import { Link } from 'react-router-dom';
import { useDatasets } from '../features/db/useDatasetData';
import { calculateRecordsForValence } from '../lib/records';
import { useAllDays } from '../features/db/useCalendarData';
import { CalendarDays, TrendingUp, TrendingDown, Award, Flame, Trophy, Skull } from 'lucide-react';
import { getValueForValence } from '../lib/valence';
import { useMemo } from 'react';
import type { DateKey, Valence } from '@/features/db/localdb';



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

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <nav className="mb-4 text-xs text-slate-500 flex items-center gap-2">
        <Link to={"/dataset/" + dataset.id} className="hover:underline text-blue-600">{dataset.name}</Link>
        <span className="mx-1">/</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">Records</span>
      </nav>
      <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
        <Award className="w-7 h-7 md:w-8 md:h-8 text-yellow-400" /> Records
      </h2>
      <ul className="flex flex-col gap-3 md:gap-4">
        {recordCards.map((rec) => (
          <li key={`${rec.type}-${rec.label}`}>
            <RecordCard {...rec} />
          </li>
        ))}
      </ul>
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
  // Grouped class names for container, date badge, icon, and text
  let icon: React.ReactNode;
  let displayLabel = label;
  let containerClass = '';
  let dateBadgeClass = '';
  let iconClass = '';
  let textClass = '';

  // Set icon and regular styles first
  if (type === "streak") {
    // Streak record
    icon = <Flame className="w-5 h-5 text-amber-500" />;
    containerClass = 'border-amber-200 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/60';
    dateBadgeClass = 'bg-amber-100/80 dark:bg-amber-900/80 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-200';
    iconClass = 'bg-amber-100/80 dark:bg-amber-900/80 border-amber-200 dark:border-amber-700';
    textClass = 'text-amber-600 dark:text-amber-300';
    displayLabel = `Best ${label}`;
  } else if (type === "best") {
    if (valence === 'neutral') {
      // Neutral valence uses trending icon
      icon = <TrendingUp className="w-5 h-5 text-blue-500" />;
      containerClass = 'border-blue-300 dark:border-blue-700 bg-blue-50/80 dark:bg-blue-900/60';
      dateBadgeClass = 'bg-blue-100/80 dark:bg-blue-900/80 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-200';
      iconClass = 'bg-blue-100/80 dark:bg-blue-900/80 border-blue-200 dark:border-blue-700';
      textClass = 'text-blue-600 dark:text-blue-300';
      displayLabel = `Highest ${label}`;
    } else {
      // Positive/Negative valence uses trophy icon
      icon = <Trophy className="w-5 h-5 text-green-500" />;
      containerClass = 'border-green-300 dark:border-green-700 bg-green-50/80 dark:bg-green-900/60';
      dateBadgeClass = 'bg-green-100/80 dark:bg-green-900/80 border-green-200 dark:border-green-700 text-green-700 dark:text-green-200';
      iconClass = 'bg-green-100/80 dark:bg-green-900/80 border-green-200 dark:border-green-700';
      textClass = 'text-green-600 dark:text-green-300';
      displayLabel = `Best ${label}`;
    }
  } else if (type === "worst") {
    if (valence === 'neutral') {
      // Neutral valence uses trending down icon
      icon = <TrendingDown className="w-5 h-5 text-purple-500" />;
      containerClass = 'border-purple-300 dark:border-purple-700 bg-purple-50/80 dark:bg-purple-900/60';
      dateBadgeClass = 'bg-purple-100/80 dark:bg-purple-900/80 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-200';
      iconClass = 'bg-purple-100/80 dark:bg-purple-900/80 border-purple-200 dark:border-purple-700';
      textClass = 'text-purple-600 dark:text-purple-300';
      displayLabel = `Lowest ${label}`;
    } else {
      // Positive/Negative valence uses skull icon
      icon = <Skull className="w-5 h-5 text-red-400" />;
      containerClass = 'border-red-300 dark:border-red-700 bg-red-50/80 dark:bg-red-900/60';
      dateBadgeClass = 'bg-red-100/80 dark:bg-red-900/80 border-red-200 dark:border-red-700 text-red-700 dark:text-red-200';
      iconClass = 'bg-red-100/80 dark:bg-red-900/80 border-red-200 dark:border-red-700';
      textClass = 'text-red-600 dark:text-red-300';
      displayLabel = `Worst ${label}`;
    }
  }
;
  let displayDate = '';
  let displayValue = '';

  if (!date) {
    // No record case
    displayDate = 'Never';
    displayValue = '—';
    containerClass = 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 opacity-60';
    dateBadgeClass = 'bg-slate-100/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500';
    iconClass = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700';
    textClass = 'text-slate-400 dark:text-slate-500';
  } else {
    // Normal record case
    displayValue = Intl.NumberFormat().format(type == 'streak' ? props.length : props.value)
    displayDate = type === 'streak'
      ? formatFriendlyDate(props.start, props.end)
      : formatFriendlyDate(date);
  }



  return (
    <div className={`rounded-xl border flex items-center px-4 py-3 md:py-4 md:px-6 shadow-sm hover:shadow-md transition-shadow ${containerClass}`}>
      {/* Left: icon, label, value */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`flex-shrink-0 rounded-full p-2 border shadow-sm ${iconClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold mb-0.5 truncate opacity-80">{displayLabel}</div>
          <div className={`text-xl md:text-2xl font-extrabold leading-tight ${textClass}`}>{displayValue}</div>
        </div>
      </div>
      {/* Right: date badge */}
      <div className="flex-shrink-0 pl-2 flex items-center h-full">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${dateBadgeClass}`}>
          <CalendarDays className="w-3.5 h-3.5 opacity-70" />
          {displayDate}
        </span>
      </div>
    </div>
  );
}

export default Records;
