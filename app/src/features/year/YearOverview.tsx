import React from 'react';
import { getValueForValence } from '@/lib/valence';
import type { Valence } from '@/features/db/localdb';

export interface YearOverviewProps {
  year: number;
  data: Record<string, number[]>; // dateKey -> numbers
  currentMonth: number;
  onMonthClick: (month: number) => void;
  valence: Valence;
}

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const YearOverview: React.FC<YearOverviewProps> = ({ 
  year, 
  data, 
  currentMonth, 
  onMonthClick,
  valence
}) => {
  const today = new Date();

  const getDayColor = (date: Date): string => {
    const dateKey = date.toISOString().split('T')[0];
    const numbers = data[dateKey] || [];
    const total = numbers.reduce((a, b) => a + b, 0);
    const isFuture = date > today;
    if (isFuture) {
      return 'bg-slate-200 dark:bg-slate-700/40 opacity-40'; // Future days - faded
    } else if (numbers.length === 0) {
      return 'bg-slate-400 dark:bg-slate-700/40 opacity-40'; // No data - gray
    } else {
      // Valence-aware color, more opaque for days with data
      return getValueForValence(total, valence, {
        good: 'bg-green-500 dark:bg-green-800/70 opacity-90',
        bad: 'bg-red-500 dark:bg-red-800/70 opacity-90',
        neutral: 'bg-blue-500 dark:bg-blue-800/70 opacity-90',
      });
    }
  };

  const renderMonth = (month: number) => {
    const isCurrentMonth = month === currentMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: React.ReactElement[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const color = getDayColor(date);
      days.push(
        <div
          key={day}
          className={`w-1 h-1 rounded-full ${color} transition-all duration-200`}
          title={`${monthNames[month - 1]} ${day}, ${year}`}
        />
      );
    }

    // Pad the start and end so dots align with weekdays (Sun-Sat)
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun .. 6=Sat
    const lastDayOfWeek = new Date(year, month, 0).getDay();
    const padStart = firstDayOfWeek; // number of empty cells before day 1
    const padEnd = 6 - lastDayOfWeek; // number of empty cells after last day

    const paddedCells: React.ReactElement[] = [
      // Leading empty cells
      ...Array.from({ length: padStart }, (_, i) => (
        <div
          key={`pad-start-${month}-${i}`}
          className="w-1 h-1 rounded-full opacity-0"
          aria-hidden
        />
      )),
      // Actual day dots
      ...days,
      // Trailing empty cells
      ...Array.from({ length: padEnd }, (_, i) => (
        <div
          key={`pad-end-${month}-${i}`}
          className="w-1 h-1 rounded-full opacity-0"
          aria-hidden
        />
      )),
    ];

    return (
      <div
        key={month}
        className={`flex flex-col items-center space-y-1 cursor-pointer transition-all duration-200 p-2
          ${isCurrentMonth ? 'ring-2 ring-blue-400/80 ring-offset-1 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900 rounded-lg' : ''}
          hover:bg-slate-100 dark:hover:bg-slate-900 hover:shadow-sm dark:hover:shadow-md hover:scale-105 rounded-lg`}
        onClick={() => onMonthClick(month)}
      >
        <div className={`text-xs font-medium ${isCurrentMonth ? 'text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
          {monthNames[month - 1]}
        </div>
        <div className="grid grid-cols-7 gap-0.5 w-fit">
          {paddedCells}
        </div>
      </div>
    );
  };

  return (
  <div className="bg-white dark:bg-slate-900 rounded-lg p-4 mb-6 shadow-sm dark:shadow-md">
      <div className="grid grid-cols-12 gap-2 justify-items-center">
        {Array.from({ length: 12 }, (_, i) => renderMonth(i + 1))}
      </div>
    </div>
  );
};