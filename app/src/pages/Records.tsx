import { Link } from 'react-router-dom';
import { useDatasets } from '../features/db/useDatasetData';
import { calculateRecords } from '../lib/records';
import { useAllDays } from '../features/db/useCalendarData';
import { CalendarDays, TrendingUp, TrendingDown, Award, Flame, Trophy, Skull } from 'lucide-react';
import { getValueForValence } from '../lib/valence';
import { useMemo } from 'react';
import type { Valence } from '@/features/db/localdb';



export function Records({ datasetId }: { datasetId: string }) {
  const { data: datasets = [] } = useDatasets();
  const dataset = datasets.find(d => d.id === datasetId);
  const { data: allDays, isLoading, error } = useAllDays(datasetId);
  const records = useMemo(() =>
    allDays ? calculateRecords(allDays) : null,
    [allDays]
  );

  if (!dataset) return <div className="max-w-4xl mx-auto p-8">Dataset not found.</div>;
  if (isLoading) return <div className="max-w-4xl mx-auto p-8">Loading records…</div>;
  if (error) return <div className="max-w-4xl mx-auto p-8 text-red-500">Failed to load records.</div>;
  if (!records) return null;

  // Prepare all records as an array for sorting
  const recordCards = [
    // Highest
    { label: `Day`, value: records.highestDay.value, date: records.highestDay.date, valence: dataset.valence, type: "highest", sortDate: records.highestDay.date },
    { label: `Day Median`, value: records.highestDayMedian.value, date: records.highestDayMedian.date, valence: dataset.valence, type: "highest", sortDate: records.highestDayMedian.date },
    { label: `Week`, value: records.highestWeek.value, date: records.highestWeek.date, valence: dataset.valence, type: "highest", sortDate: records.highestWeek.date },
    { label: `Week Median`, value: records.highestWeekMedian.value, date: records.highestWeekMedian.date, valence: dataset.valence, type: "highest", sortDate: records.highestWeekMedian.date },
    { label: `Month`, value: records.highestMonth.value, date: records.highestMonth.date, valence: dataset.valence, type: "highest", sortDate: records.highestMonth.date },
    { label: `Monthly Median`, value: records.highestMonthMedian.value, date: records.highestMonthMedian.date, valence: dataset.valence, type: "highest", sortDate: records.highestMonthMedian.date },
    // Streaks
    { label: 'Daily Streak', value: records.longestDailyStreak.length, date: records.longestDailyStreak.start + (records.longestDailyStreak.length > 1 ? ' → ' + records.longestDailyStreak.end : ''), valence: 'neutral', type: "streak", sortDate: records.longestDailyStreak.end || records.longestDailyStreak.start },
    { label: 'Weekly Streak', value: records.longestWeeklyStreak.length, date: records.longestWeeklyStreak.start + (records.longestWeeklyStreak.length > 1 ? ' → ' + records.longestWeeklyStreak.end : ''), valence: 'neutral', type: "streak", sortDate: records.longestWeeklyStreak.end || records.longestWeeklyStreak.start },
    { label: 'Monthly Streak', value: records.longestMonthlyStreak.length, date: records.longestMonthlyStreak.start + (records.longestMonthlyStreak.length > 1 ? ' → ' + records.longestMonthlyStreak.end : ''), valence: 'neutral', type: "streak", sortDate: records.longestMonthlyStreak.end || records.longestMonthlyStreak.start },
    // Lowest
    { label: `Day`, value: records.lowestDay.value, date: records.lowestDay.date, valence: dataset.valence, type: "lowest", sortDate: records.lowestDay.date },
    { label: `Day Median`, value: records.lowestDayMedian.value, date: records.lowestDayMedian.date, valence: dataset.valence, type: "lowest", sortDate: records.lowestDayMedian.date },
    { label: `Week`, value: records.lowestWeek.value, date: records.lowestWeek.date, valence: dataset.valence, type: "lowest", sortDate: records.lowestWeek.date },
    { label: `Week Median`, value: records.lowestWeekMedian.value, date: records.lowestWeekMedian.date, valence: dataset.valence, type: "lowest", sortDate: records.lowestWeekMedian.date },
    { label: `Month`, value: records.lowestMonth.value, date: records.lowestMonth.date, valence: dataset.valence, type: "lowest", sortDate: records.lowestMonth.date },
    { label: `Monthly Median`, value: records.lowestMonthMedian.value, date: records.lowestMonthMedian.date, valence: dataset.valence, type: "lowest", sortDate: records.lowestMonthMedian.date },
  ] as (RecordCardProps & { sortDate: string } )[];

  // Sort by sortDate descending (most recent first)
  recordCards.sort((a, b) => {
    // Try to parse as date, fallback to string compare
    const da = Date.parse(a.sortDate.replace('→', '').trim()) || a.sortDate;
    const db = Date.parse(b.sortDate.replace('→', '').trim()) || b.sortDate;
    if (typeof da === 'number' && typeof db === 'number') return db - da;
    return String(db).localeCompare(String(da));
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
        {recordCards.map(({ sortDate, ...rec }) => (
          <li key={rec.label }>
            <RecordCard {...rec} />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface RecordCardProps {
  label: string;
  value: number;
  date: string;
  valence: Valence;
  type: "highest" | "lowest" | "streak";
}

function RecordCard({ label, value, date, valence, type }: RecordCardProps) {
  // Polished, modern color and style choices
    let textColor = '';
    let bgColor = '';
    let borderColor = '';
    let iconBg = '';
    let iconBorder = '';
    let icon: React.ReactNode;
    let displayLabel = label;
    if (type === "streak") {
      icon = <Flame className="w-5 h-5 text-amber-500" />;
      textColor = 'text-amber-600 dark:text-amber-300';
      bgColor = 'bg-amber-50/80 dark:bg-amber-900/60';
      borderColor = 'border-amber-200 dark:border-amber-700';
      iconBg = 'bg-amber-100/80 dark:bg-amber-900/80';
      iconBorder = 'border-amber-200 dark:border-amber-700';
      displayLabel = `Best ${label}`;
    } else {
      const isHighest = type === "highest";
      icon = getValueForValence(isHighest, valence, {
        good: <Trophy className="w-5 h-5 text-green-500" />,
        bad: <Skull className="w-5 h-5 text-red-400" />,
        neutral: isHighest
          ? <TrendingUp className="w-5 h-5 text-blue-500" />
          : <TrendingDown className="w-5 h-5 text-blue-400" />,
      });
      textColor = getValueForValence(isHighest, valence, {
        good: 'text-green-600 dark:text-green-300',
        bad: 'text-red-600 dark:text-red-300',
        neutral: 'text-blue-600 dark:text-blue-300',
      });
      bgColor = getValueForValence(isHighest, valence, {
        good: 'bg-green-50/80 dark:bg-green-900/60',
        bad: 'bg-red-50/80 dark:bg-red-900/60',
        neutral: 'bg-blue-50/80 dark:bg-blue-900/60',
      });
      borderColor = getValueForValence(isHighest, valence, {
        good: 'border-green-300 dark:border-green-700',
        bad: 'border-red-300 dark:border-red-700',
        neutral: 'border-blue-300 dark:border-blue-700',
      });
      iconBg = getValueForValence(isHighest, valence, {
        good: 'bg-green-100/80 dark:bg-green-900/80',
        bad: 'bg-red-100/80 dark:bg-red-900/80',
        neutral: 'bg-blue-100/80 dark:bg-blue-900/80',
      });
      iconBorder = getValueForValence(isHighest, valence, {
        good: 'border-green-200 dark:border-green-700',
        bad: 'border-red-200 dark:border-red-700',
        neutral: 'border-blue-200 dark:border-blue-700',
      });
      displayLabel = getValueForValence(isHighest, valence, {
        good: `Best ${label}`,
        bad: `Worst ${label}`,
        neutral: isHighest ? `Highest ${label}` : `Lowest ${label}`,
      });
    }
  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} flex items-center px-4 py-3 md:py-4 md:px-6 shadow-sm hover:shadow-md transition-shadow`}>
      {/* Left: icon, label, value */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`flex-shrink-0 rounded-full p-2 ${iconBg} ${iconBorder} border shadow-sm`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold mb-0.5 truncate opacity-80">{displayLabel}</div>
          <div className={`text-xl md:text-2xl font-extrabold leading-tight ${textColor}`}>{Intl.NumberFormat().format(value)}</div>
        </div>
      </div>
      {/* Right: date badge */}
      <div className="flex-shrink-0 pl-2 flex items-center h-full">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <CalendarDays className="w-3.5 h-3.5 opacity-70" />
          {date}
        </span>
      </div>
    </div>
  );
}

export default Records;
