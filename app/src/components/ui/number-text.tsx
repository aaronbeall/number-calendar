import React, { useState, useEffect, useRef } from 'react';
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
  animated?: boolean;
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
  absolute = false,
  decimals,
  currency,
  animated = false
}) => {
  const isFiniteNumber = typeof value === 'number' && Number.isFinite(value);
  
  // State for animated value
  const [displayValue, setDisplayValue] = useState(value);
  const animationFrameRef = useRef<number | undefined>(undefined);
  
  // Animate number changes when animated is true
  useEffect(() => {
    if (!animated || !isFiniteNumber) {
      setDisplayValue(value);
      return;
    }
    
    const startValue = typeof displayValue === 'number' && Number.isFinite(displayValue) 
      ? displayValue 
      : value;
    const endValue = value;
    
    if (startValue === endValue) {
      return;
    }
    
    const duration = 400; // Animation duration in ms
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out function for smoother animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = startValue + (endValue - startValue) * easeOutQuart;
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, animated, isFiniteNumber]);
  
  // Use displayValue for rendering when animated, otherwise use value
  const renderValue = animated ? displayValue : value;
  const isRenderFinite = typeof renderValue === 'number' && Number.isFinite(renderValue);

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
  if (isRenderFinite) {
    formatted = formatValue(renderValue, { short, percent, delta, absolute, decimals });
  } else {
    formatted = placeholder;
  }

  // If using currency, split the decimal part (cents) and render with smaller font size
  if (isRenderFinite && currency) {
    const formattedText = String(formatted);
    const match = formattedText.match(/^(.*?)(\.(\d+))(.*)$/);

    if (match) {
      const [, integerPart, , decimalDigits, decimalSuffix] = match;
      formatted = (
        <>
          {integerPart}
          <span className="text-[0.7em] align-text-top opacity-70">
            .{decimalDigits}
          </span>
          {decimalSuffix}
        </>
      );
    }
  }

  const text = (
    <span className={cn(textClass, animated && 'transition-all duration-200', className)}>
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
