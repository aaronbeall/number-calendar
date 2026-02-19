import React from 'react';
import { Trophy, Skull, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Valence } from '@/features/db/localdb';
import { getValueForValence } from '@/lib/valence';
import { formatValue, type FormatValueOptions, type NumberDisplayOptions } from '@/lib/friendly-numbers';

export interface NumberTextProps extends FormatValueOptions, NumberDisplayOptions {
  value: number | null | undefined;
  valenceValue?: number | null | undefined;
  isHighest?: boolean;
  isLowest?: boolean;
  valence?: Valence;
  className?: string;
  goodClassName?: string;
  badClassName?: string;
  neutralClassName?: string;
  placeholder?: React.ReactNode;
}

export const NumberText: React.FC<NumberTextProps> = ({
  value,
  valenceValue,
  isHighest = false,
  isLowest = false,
  valence = 'positive',
  className = '',
  goodClassName = 'text-green-700 dark:text-green-300',
  badClassName = 'text-red-700 dark:text-red-300',
  neutralClassName = 'text-slate-700 dark:text-slate-200',
  placeholder = '-',
  short = false,
  percent = false,
  delta = false,
  decimals,
  currency
}) => {
  const isFiniteNumber = typeof value === 'number' && Number.isFinite(value);

  const textClass = getValueForValence(
    valenceValue ?? 0,
    valence,
    {
      good: goodClassName,
      bad: badClassName,
      neutral: neutralClassName,
    }
  );
  let formatted: React.ReactNode;
  if (isFiniteNumber) {
    formatted = formatValue(value, { short, percent, delta, decimals });
  } else {
    formatted = placeholder;
  }

  // If using currency, split the decimal part (cents) and render with smaller font size
  if (currency && isFiniteNumber) {
    const [integerPart, decimalPart] = String(formatted).split('.');
    formatted = (
      <>
        {integerPart}
        {decimalPart !== undefined && (
          <span className="text-xs align-top opacity-70">
            .{decimalPart}
          </span>
        )}
      </>
    );
  }

  const text = (
    <span className={cn(textClass, className)}>
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
        {text}
        {icon}
      </span>
    );
  }

  return text;
};

export default NumberText;
