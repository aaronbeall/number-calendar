import React from 'react';
import { Trophy, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NumberTextProps {
  value: number | null | undefined;
  isHighest?: boolean;
  isLowest?: boolean;
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
  className = '',
  positiveClassName = 'text-green-700 dark:text-green-300',
  negativeClassName = 'text-red-700 dark:text-red-300',
  neutralClassName = 'text-slate-700 dark:text-slate-200',
  placeholder = '-',
  formatOptions,
}) => {
  const isFiniteNumber = typeof value === 'number' && Number.isFinite(value);
  const num = isFiniteNumber ? (value as number) : undefined;

  // Default formatting: thousands separators, 0-2 fractional digits.
  const defaultNumberFormat: Intl.NumberFormatOptions = {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  };

  const signClass = isFiniteNumber
    ? num! > 0
      ? positiveClassName
      : num! < 0
        ? negativeClassName
        : neutralClassName
    : neutralClassName;
  let formatted: React.ReactNode;
  if (isFiniteNumber) {
    const merged = formatOptions ? { ...defaultNumberFormat, ...formatOptions } : defaultNumberFormat;
    formatted = new Intl.NumberFormat(undefined, merged).format(num as number);
  } else {
    formatted = placeholder;
  }

  const textEl = (
    <span className={cn(signClass, className)}>
      {formatted}
    </span>
  );

  if (isHighest || isLowest) {
    const wrapperClasses = isHighest
      ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40'
      : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40';

    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border', wrapperClasses)}>
        {textEl}
        {isHighest ? (
          <Trophy className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
        ) : (
          <Skull className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
        )}
      </span>
    );
  }

  return textEl;
};

export default NumberText;
