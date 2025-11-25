import React from 'react';
import { Trophy, Skull, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Valance as Valence } from '@/features/db/localdb';
import { getValueForValence } from '@/lib/valence';

export interface NumberTextProps {
  value: number | null | undefined;
  isHighest?: boolean;
  isLowest?: boolean;
  valence?: Valence;
  className?: string;
  positiveClassName?: string;
  negativeClassName?: string;
  neutralClassName?: string;
  placeholder?: React.ReactNode;
  formatOptions?: Intl.NumberFormatOptions;
}

export const NumberText: React.FC<NumberTextProps> = ({
  value,
  isHighest = false,
  isLowest = false,
  valence = 'positive',
  className = '',
  positiveClassName = 'text-green-700 dark:text-green-300',
  negativeClassName = 'text-red-700 dark:text-red-300',
  neutralClassName = 'text-slate-700 dark:text-slate-200',
  placeholder = '-',
  formatOptions,
}) => {
  const isFiniteNumber = typeof value === 'number' && Number.isFinite(value);

  // Default formatting: thousands separators, 0-2 fractional digits.
  const defaultNumberFormat: Intl.NumberFormatOptions = {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  };

  const signClass = getValueForValence(
    isFiniteNumber ? value : 0,
    valence,
    {
      good: positiveClassName,
      bad: negativeClassName,
      neutral: neutralClassName,
    }
  );
  let formatted: React.ReactNode;
  if (isFiniteNumber) {
    const merged = formatOptions ? { ...defaultNumberFormat, ...formatOptions } : defaultNumberFormat;
    formatted = new Intl.NumberFormat(undefined, merged).format(value);
  } else {
    formatted = placeholder;
  }

  const textEl = (
    <span className={cn(signClass, className)}>
      {formatted}
    </span>
  );

  if (isHighest || isLowest) {
    // Use getValueForValence to determine good/bad/neutral for highlight
    const direction = isHighest ? true : false;
    const wrapperClasses = getValueForValence(
      direction,
      valence,
      {
        good: 'bg-green-50/40 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40',
        bad: 'bg-red-50/40 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40',
        neutral: 'bg-slate-50/40 dark:bg-slate-900/30 border-slate-200/40 dark:border-slate-700/40',
      }
    );
    const icon = getValueForValence(
      direction,
      valence,
      {
        good: <Trophy className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />,
        bad: <Skull className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />,
        neutral: isHighest
          ? <TrendingUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
          : <TrendingDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />,
      }
    );

    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border', wrapperClasses)}>
        {textEl}
        {icon}
      </span>
    );
  }

  return textEl;
};

export default NumberText;
