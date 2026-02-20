

import type { DateKey, DayKey, Tracking, Valence, WeekKey } from '@/features/db/localdb';
import { dateToWeekKey, formatDateAsKey } from '@/lib/friendly-date';
import type { CompletedAchievementResult } from '@/lib/goals';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import type { StatsExtremes } from '@/lib/stats';
import { useCallback, useMemo, memo } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { WeekSummary } from '../stats/WeekSummary';
import { DayCell } from './DayCell';

interface DailyGridProps {
  year: number;
  month: number;
  monthDays: { date: Date; data: PeriodAggregateData<'day'>; priorData?: PeriodAggregateData<'day'> }[];
  weekDataByKey: Record<WeekKey, PeriodAggregateData<'week'>>;
  priorWeekByKey: Record<WeekKey, PeriodAggregateData<'week'> | undefined>;
  showWeekends?: boolean;
  monthExtremes?: StatsExtremes;
  valence: Valence;
  tracking: Tracking;
  onSaveDay: (date: DayKey, numbers: number[]) => void;
  achievementResultsByDateKey: Record<DateKey, CompletedAchievementResult[]>;
}

const allWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface WeekdayHeadersProps {
  weekdays: string[];
}

const WeekdayHeaders = memo(({ weekdays }: WeekdayHeadersProps) => (
  <div className={`grid gap-1 md:gap-2 pb-1 md:pb-2 ${weekdays.length === 7 ? 'grid-cols-7' : 'grid-cols-5'}`}>
    {weekdays.map(day => (
      <div key={day} className="text-center text-[10px] md:text-sm font-medium text-slate-500 uppercase tracking-wide">
        {day}
      </div>
    ))}
  </div>
));
WeekdayHeaders.displayName = 'WeekdayHeaders';

interface DayCellWrapperProps {
  date: Date;
  dayData: { date: Date; data: PeriodAggregateData<'day'>; priorData?: PeriodAggregateData<'day'> };
  monthExtremes?: StatsExtremes;
  valence: Valence;
  tracking: Tracking;
  onSaveDay: (date: DayKey, numbers: number[]) => void;
  achievementResults: CompletedAchievementResult[];
}

const DayCellWrapper = memo(({
  date,
  dayData,
  monthExtremes,
  valence,
  tracking,
  onSaveDay,
  achievementResults,
}: DayCellWrapperProps) => {
  const key = formatDateAsKey(date, 'day');
  const handleSave = useCallback((nums: number[]) => {
    onSaveDay(key, nums);
  }, [onSaveDay, key]);

  return (
    <div className="transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-2xl">
      <DayCell
        date={date}
        data={dayData.data}
        priorData={dayData.priorData}
        onSave={handleSave}
        monthExtremes={monthExtremes}
        valence={valence}
        tracking={tracking}
        achievementResults={achievementResults}
      />
    </div>
  );
});
DayCellWrapper.displayName = 'DayCellWrapper';

interface WeekSummaryWrapperProps {
  weekData: PeriodAggregateData<'week'>;
  priorWeekData?: PeriodAggregateData<'week'>;
  monthExtremes?: StatsExtremes;
  weekNumber: number;
  isCurrentWeek: boolean;
  valence: Valence;
  tracking: Tracking;
  weekDateKey: WeekKey;
  achievementResults: CompletedAchievementResult[];
  colSpan: number;
}

const WeekSummaryWrapper = memo(({
  weekData,
  priorWeekData,
  monthExtremes,
  weekNumber,
  isCurrentWeek,
  valence,
  tracking,
  weekDateKey,
  achievementResults,
  colSpan,
}: WeekSummaryWrapperProps) => (
  <div className={colSpan === 7 ? 'col-span-7' : 'col-span-5'}>
    <WeekSummary
      data={weekData}
      priorData={priorWeekData}
      monthExtremes={monthExtremes}
      weekNumber={weekNumber}
      isCurrentWeek={isCurrentWeek}
      valence={valence}
      tracking={tracking}
      dateKey={weekDateKey}
      achievementResults={achievementResults}
    />
  </div>
));
WeekSummaryWrapper.displayName = 'WeekSummaryWrapper';


export const DailyGrid = memo(({
  year,
  month,
  monthDays,
  weekDataByKey,
  priorWeekByKey,
  showWeekends = true,
  monthExtremes,
  valence,
  tracking,
  onSaveDay,
  achievementResultsByDateKey,
}: DailyGridProps) => {
  const { firstDay, weekdays, gridDays } = useMemo(() => {
    // Calculdate days in month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const days: Date[] = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month - 1, d));
    }

    let weekdays = allWeekdays;
    let gridDays: (Date | null)[] = [];
    const cols = showWeekends ? 7 : 5;

    if (showWeekends) {
      const padStart = firstDay.getDay();
      const padEnd = 6 - lastDay.getDay();
      gridDays = [
        ...Array(padStart).fill(null),
        ...days,
        ...Array(padEnd).fill(null),
      ];
    } else {
      weekdays = allWeekdays.slice(1, 6);
      const firstDow = firstDay.getDay();
      const padStart = firstDow === 0 ? 0 : firstDow - 1;
      gridDays = [
        ...Array(padStart).fill(null),
        ...days.filter(d => d.getDay() !== 0 && d.getDay() !== 6),
      ];
      const remainder = gridDays.length % cols;
      if (remainder !== 0) {
        gridDays = [
          ...gridDays,
          ...Array(cols - remainder).fill(null),
        ];
      }
    }
    return { firstDay, lastDay, cols, weekdays, gridDays };
  }, [year, month, showWeekends]);

  const monthDayMap = useMemo(
    () => new Map(monthDays.map((day) => [formatDateAsKey(day.date, 'day'), day])),
    [monthDays]
  );

  const weeks = useMemo(() => {
    // Precompute weeks: each week is { days: (Date|null)[], weekNumbers: number[], weekNumber: number, isCurrentWeek: boolean }
    const today = new Date();
    const weeks = [] as Array<{
      days: (Date | null)[];
      weekData?: PeriodAggregateData<'week'>;
      priorWeekData?: PeriodAggregateData<'week'>;
      weekNumber: number;
      isCurrentWeek: boolean;
      weekDateKey?: WeekKey;
    }>;
    for (let i = 0; i < gridDays.length; i += weekdays.length) {
      const week = gridDays.slice(i, i + weekdays.length);
      const datesInWeek = week.filter((d): d is Date => d instanceof Date);
      // Calculate week number (same logic as before)
      const firstOfMonth = firstDay;
      const firstDayOfWeek = firstOfMonth.getDay();
      const firstSunday = firstDayOfWeek === 0 ? 1 : 8 - firstDayOfWeek;
      const datesInCurrentMonth = datesInWeek.filter(d => d.getMonth() === month - 1);
      const minDate = datesInCurrentMonth.length > 0 ? Math.min(...datesInCurrentMonth.map(d => d.getDate())) : 1;
      let weekNumber;
      if (minDate < firstSunday) {
        weekNumber = 1;
      } else {
        weekNumber = 1 + Math.floor((minDate - firstSunday) / 7) + 1;
      }
      const isCurrentWeek = datesInWeek.some(d =>
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
      const priorWeekKey = datesInWeek.length > 0 ? dateToWeekKey(datesInWeek[0]) : undefined;
      const weekData = priorWeekKey ? weekDataByKey[priorWeekKey] : undefined;
      const priorWeekData = priorWeekKey ? priorWeekByKey[priorWeekKey] : undefined;
      weeks.push({ days: week, weekData, priorWeekData, weekNumber, isCurrentWeek, weekDateKey: priorWeekKey });
    }
    return weeks;
  }, [weekDataByKey, priorWeekByKey, gridDays, firstDay, weekdays, month]);

  const handleSaveDay = useCallback((date: DayKey, numbers: number[]) => {
    onSaveDay(date, numbers);
  }, [onSaveDay]);

  return (
    <>
      {/* Weekday headers */}
      <WeekdayHeaders weekdays={weekdays} />

      {/* Calendar grid rendered by weeks with summary per week */}
      <div className={`grid gap-1 md:gap-2 ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
        {weeks.map((week, wi) => (
          <Fragment key={`week-${wi}`}>
            {week.days.map((date, di) => {
              if (!date) {
                return <div key={`empty-${wi}-${di}`} className="invisible" />;
              }
              const key = formatDateAsKey(date, 'day');
              const dayData = monthDayMap.get(key);
              if (!dayData) return null;
              return (
                <DayCellWrapper
                  key={key}
                  date={date}
                  dayData={dayData}
                  monthExtremes={monthExtremes}
                  valence={valence}
                  tracking={tracking}
                  onSaveDay={handleSaveDay}
                  achievementResults={achievementResultsByDateKey[key] ?? []}
                />
              );
            })}
            {/* Week summary below the week */}
            {week.weekData && week.weekData.numbers.length > 0 && week.weekDateKey && (
              <WeekSummaryWrapper
                key={`week-summary-${wi}`}
                weekData={week.weekData}
                priorWeekData={week.priorWeekData}
                monthExtremes={monthExtremes}
                weekNumber={week.weekNumber}
                isCurrentWeek={week.isCurrentWeek}
                valence={valence}
                tracking={tracking}
                weekDateKey={week.weekDateKey}
                achievementResults={achievementResultsByDateKey[week.weekDateKey] ?? []}
                colSpan={showWeekends ? 7 : 5}
              />
            )}
          </Fragment>
        ))}
      </div>
    </>
  );
}) as React.FC<DailyGridProps>;
DailyGrid.displayName = 'DailyGrid';
