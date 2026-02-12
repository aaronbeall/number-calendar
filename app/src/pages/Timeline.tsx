import { NumberText, shortNumberFormat } from '@/components/ui/number-text';
import { NotesEditor } from '@/features/notes/NotesEditor';
import type { DateKey, DayKey, MonthKey, Tracking, Valence, WeekKey } from '@/features/db/localdb';
import { useAllDays } from '@/features/db/useDayEntryData';
import { useNotes } from '@/features/db/useNotesData';
import { getMonthDays, getMonthWeeks, getWeekDays, getYearDays, getYearMonths } from '@/lib/calendar';
import { formatFriendlyDate, isDayKey, parseDateKey, parseMonthKey, parseWeekKey, toMonthKey, toYearKey } from '@/lib/friendly-date';
import { computeNumberStats } from '@/lib/stats';
import { getPrimaryMetric, getPrimaryMetricLabel, getValenceValueForNumber } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { cn } from '@/lib/utils';
import { CalendarRange, CalendarSearch, Calendar, Dot } from 'lucide-react';
import React, { useMemo } from 'react';
import { useDatasetContext } from '@/context/DatasetContext';

type TimelineEntryKind = 'year' | 'month' | 'week' | 'day';

type TimelineEntry = {
  kind: TimelineEntryKind;
  dateKey: DateKey;
  title: string;
  subtitle?: string;
  numbers: number[];
  dayCount: number;
};

const kindIcon = {
  year: CalendarRange,
  month: CalendarSearch,
  week: Calendar,
  day: Dot,
} satisfies Record<TimelineEntryKind, React.ComponentType<{ className?: string }>>;

const TimelineEntryCard = ({
  entry,
  valence,
  tracking,
}: {
  entry: TimelineEntry;
  valence: Valence;
  tracking: Tracking;
}) => {
  const stats = useMemo(() => computeNumberStats(entry.numbers), [entry.numbers]);
  const primaryMetricLabel = getPrimaryMetricLabel(tracking);
  const primaryMetric = stats ? stats[getPrimaryMetric(tracking)] : undefined;
  const primaryValenceMetric = stats
    ? getValenceValueForNumber(primaryMetric ?? 0, undefined, tracking)
    : 0;
  const accentClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'border-emerald-300 dark:border-emerald-800',
    bad: 'border-rose-300 dark:border-rose-800',
    neutral: 'border-slate-300 dark:border-slate-700',
  });
  const Icon = kindIcon[entry.kind];

  return (
    <div className={cn('rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-950', accentClasses)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-600 dark:bg-slate-900 dark:text-slate-200">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            {entry.subtitle && (
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {entry.subtitle}
              </div>
            )}
            <div className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {entry.title}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {entry.dayCount} entries
            </div>
          </div>
        </div>
        {stats && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {primaryMetricLabel}
            </div>
            <NumberText
              value={primaryMetric ?? null}
              valenceValue={primaryValenceMetric}
              valence={valence}
              className="text-lg font-mono font-bold"
              formatOptions={shortNumberFormat}
            />
          </div>
        )}
      </div>

      {stats ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Mean', value: stats.mean },
            { label: 'Median', value: stats.median },
            { label: 'Min', value: stats.min },
            { label: 'Max', value: stats.max },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {stat.label}
              </div>
              <NumberText
                value={stat.value}
                valenceValue={primaryValenceMetric}
                valence={valence}
                className="text-sm font-mono font-semibold"
                formatOptions={shortNumberFormat}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-400">No data</div>
      )}

      <div className="mt-3">
        <NotesEditor dateKey={entry.dateKey} />
      </div>
    </div>
  );
};

const buildEntry = (
  kind: TimelineEntryKind,
  dateKey: DateKey,
  numbers: number[],
  dayCount: number,
  title: string,
  subtitle?: string
): TimelineEntry => ({
  kind,
  dateKey,
  numbers,
  dayCount,
  title,
  subtitle,
});

export function Timeline() {
  const { dataset } = useDatasetContext();
  const { data: allDays = [] } = useAllDays(dataset.id);
  const { data: notes = [] } = useNotes(dataset.id);

  const dayMap = useMemo(() => {
    const map = new Map<DayKey, number[]>();
    allDays.forEach((entry) => {
      map.set(entry.date, entry.numbers);
    });
    return map;
  }, [allDays]);

  const noteDaySet = useMemo(() => {
    const set = new Set<DayKey>();
    notes.forEach((note) => {
      if (isDayKey(note.date)) {
        set.add(note.date);
      }
    });
    return set;
  }, [notes]);

  const years = useMemo(() => {
    const yearSet = new Set<number>();
    allDays.forEach((entry) => {
      yearSet.add(parseDateKey(entry.date).getFullYear());
    });
    notes.forEach((note) => {
      yearSet.add(parseDateKey(note.date).getFullYear());
    });
    if (yearSet.size === 0) {
      yearSet.add(new Date().getFullYear());
    }
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [allDays, notes]);

  const entriesByYear = useMemo(() => {
    return years.map((year) => {
      const yearKey = toYearKey(year);
      const yearDayKeys = getYearDays(year);
      const yearNumbers = yearDayKeys.flatMap((day) => dayMap.get(day) ?? []);
      const yearEntry = buildEntry(
        'year',
        yearKey,
        yearNumbers,
        yearNumbers.length,
        `${year}`,
        'Year'
      );

      const monthEntries = getYearMonths(year)
        .slice()
        .reverse()
        .map((monthKey) => {
          const { month: monthNumber } = parseMonthKey(monthKey);
          const monthDayKeys = getMonthDays(year, monthNumber);
          const monthNumbers = monthDayKeys.flatMap((day) => dayMap.get(day) ?? []);
          const monthEntry = buildEntry(
            'month',
            monthKey as MonthKey,
            monthNumbers,
            monthNumbers.length,
            formatFriendlyDate(monthKey as MonthKey),
            'Month'
          );

          const weekEntries = getMonthWeeks(year, monthNumber)
            .slice()
            .reverse()
            .map((weekKey) => {
              const { week } = parseWeekKey(weekKey);
              const weekDays = getWeekDays(year, week);
              const weekNumbers = weekDays.flatMap((day) => dayMap.get(day) ?? []);
              const weekEntry = buildEntry(
                'week',
                weekKey as WeekKey,
                weekNumbers,
                weekNumbers.length,
                formatFriendlyDate(weekKey as WeekKey),
                'Week'
              );

              const dayEntries = weekDays
                .filter((dayKey) => dayKey.startsWith(toMonthKey(year, monthNumber)))
                .filter((dayKey) => (dayMap.get(dayKey)?.length ?? 0) > 0 || noteDaySet.has(dayKey))
                .slice()
                .reverse()
                .map((dayKey) => {
                  const dayNumbers = dayMap.get(dayKey) ?? [];
                  return buildEntry(
                    'day',
                    dayKey,
                    dayNumbers,
                    dayNumbers.length,
                    formatFriendlyDate(dayKey),
                    'Day'
                  );
                });

              return { weekEntry, dayEntries };
            });

          return { monthEntry, weekEntries };
        });

      return { yearEntry, monthEntries };
    });
  }, [dayMap, noteDaySet, years]);

  return (
    <div className="min-h-screen bg-slate-50 py-6 dark:bg-slate-900/80">
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Timeline
            </div>
            {entriesByYear.map(({ yearEntry }) => {
              const stats = computeNumberStats(yearEntry.numbers);
              const primaryMetric = stats ? stats[getPrimaryMetric(dataset.tracking)] : 0;
              const primaryValenceMetric = stats
                ? getValenceValueForNumber(primaryMetric ?? 0, undefined, dataset.tracking)
                : 0;
              const badgeClasses = getValueForValence(primaryValenceMetric, dataset.valence, {
                good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
                bad: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
                neutral: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
              });

              return (
                <a
                  key={yearEntry.dateKey}
                  href={`#year-${yearEntry.dateKey}`}
                  className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                >
                  <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Year</div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-semibold text-slate-700 dark:text-slate-100">
                      {yearEntry.title}
                    </div>
                    <div className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', badgeClasses)}>
                      <NumberText
                        value={primaryMetric}
                        valenceValue={primaryValenceMetric}
                        valence={dataset.valence}
                        formatOptions={shortNumberFormat}
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">{yearEntry.dayCount} entries</div>
                </a>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 space-y-10">
          {entriesByYear.map(({ yearEntry, monthEntries }) => (
            <section key={yearEntry.dateKey} id={`year-${yearEntry.dateKey}`} className="space-y-6">
              <TimelineEntryCard entry={yearEntry} valence={dataset.valence} tracking={dataset.tracking} />
              {monthEntries.map(({ monthEntry, weekEntries }) => (
                <div key={monthEntry.dateKey} className="space-y-5">
                  <TimelineEntryCard entry={monthEntry} valence={dataset.valence} tracking={dataset.tracking} />
                  {weekEntries.map(({ weekEntry, dayEntries }) => (
                    <div key={weekEntry.dateKey} className="space-y-4">
                      <TimelineEntryCard entry={weekEntry} valence={dataset.valence} tracking={dataset.tracking} />
                      {dayEntries.map((dayEntry) => (
                        <TimelineEntryCard
                          key={dayEntry.dateKey}
                          entry={dayEntry}
                          valence={dataset.valence}
                          tracking={dataset.tracking}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
