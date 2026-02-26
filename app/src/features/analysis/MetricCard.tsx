import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NumberText } from '@/components/ui/number-text';
import { PopoverTip, PopoverTipTrigger, PopoverTipContent } from '@/components/ui/popover-tip';
import type { NumberMetric } from '@/lib/stats';
import type { Tracking, Valence } from '@/features/db/localdb';
import { METRIC_DISPLAY_INFO, getMetricDescription } from '@/lib/stats';
import { getValenceSource } from '@/lib/tracking';
import { getValueForSign, getValueForValence } from '@/lib/valence';
import {
  Settings,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Star,
} from 'lucide-react';
import React, { useState } from 'react';

interface MetricCardProps {
  metric: NumberMetric;
  value: number | null;
  label: string;
  valence: Valence;
  tracking: Tracking;
  variant: 'primary' | 'normal';
  showConfigButton?: boolean;
  onConfigClick?: () => void;
  deltaValue?: number | null;
  deltaPercent?: number;
  cumulativeValue?: number | null;
  cumulativePercent?: number;
  high?: number | null;
  low?: number | null;
}

export function MetricCard({
  metric,
  value,
  label,
  valence,
  tracking,
  variant = 'normal',
  showConfigButton,
  onConfigClick,
  deltaValue,
  deltaPercent,
  cumulativeValue,
  cumulativePercent,
  high,
  low,
}: MetricCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigHovered, setIsConfigHovered] = useState(false);
  const valenceToneClasses = {
    good: 'text-green-600 dark:text-green-400',
    bad: 'text-red-600 dark:text-red-400',
    neutral: 'text-slate-500 dark:text-slate-400',
  };
  const isValenceless = METRIC_DISPLAY_INFO[metric].valenceless ?? false;
  const valenceSource = getValenceSource(tracking);
  const getValenceValue = (value: number | null | undefined, delta: number | null | undefined) => {
    if (isValenceless) return value ?? 0;
    if (valenceSource === 'deltas') return delta ?? 0;
    return value ?? 0;
  };
  const getValenceTone = (value: number | null | undefined, delta: number | null | undefined) => {
    if (isValenceless) return valenceToneClasses.neutral;
    return getValueForValence(getValenceValue(value, delta), valence, valenceToneClasses);
  };
  const metricValence = isValenceless ? 'neutral' : valence;

  // For high/low deltas, we don't have priors so instead compare high/low to current value to determine valence
  const highValenceDelta = (high ?? 0) - (value ?? 0) || deltaValue;
  const lowValenceDelta = (low ?? 0) - (value ?? 0) || deltaValue;
  
  // Determine card background color based on value and valenceless flag
  const cardBg = isValenceless || value === null
    ? 'bg-slate-50 dark:bg-slate-800/50'
    : getValueForValence(getValenceValue(value, deltaValue), valence, {
        good: 'bg-green-50 dark:bg-green-900/20',
        bad: 'bg-red-50 dark:bg-red-900/20',
        neutral: 'bg-slate-50 dark:bg-slate-800/50',
      })
  const CumulativePercentIcon = getValueForSign(cumulativePercent, {
    positive: ArrowUpRight,
    negative: ArrowDownRight,
    zero: null,
  });
  
  const DeltaIcon = getValueForSign(deltaValue, {
    positive: ArrowUpRight,
    negative: ArrowDownRight,
    zero: null,
  });

  const isPrimary = variant === 'primary';
  const cardPadding = isPrimary ? 'p-4' : 'p-3';
  const cardScale = !isPrimary && isHovered ? 'scale-105' : '';
  const labelClass = isPrimary
    ? 'text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium mb-1 flex items-center gap-1.5'
    : 'text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1';
  const valueClass = isPrimary ? 'text-3xl font-bold' : 'text-lg font-bold truncate';
  
  // Build description content for the help popover
  const buildHelpDescription = (): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const supportsCumulatives = METRIC_DISPLAY_INFO[metric].cumulatives !== false;
    const metricInfo = METRIC_DISPLAY_INFO[metric];
    
    // Main metric description
    parts.push(
      <div key="metric" className="mb-2">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{metricInfo.label}</div>
        <div className="text-xs text-slate-600 dark:text-slate-400">{getMetricDescription(metric)}</div>
      </div>
    );
    
    // Delta description
    if (deltaValue !== undefined) {
      parts.push(
        <div key="delta" className="mb-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Change</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Difference from the prior period</div>
        </div>
      );
    }
    
    // Cumulative description
    if (cumulativeValue !== undefined && supportsCumulatives) {
      parts.push(
        <div key="cumulative" className="mb-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cumulative</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Running total up to this period</div>
        </div>
      );
    }
    
    // Extremes description
    if (high !== undefined || low !== undefined) {
      parts.push(
        <div key="extremes" className="mb-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Extremes</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Highest and lowest values across the range</div>
        </div>
      );
    }
    
    // Primary tracking note
    if (metricInfo.primary === tracking) {
      parts.push(
        <div key="primary" className="mb-2 flex items-start gap-2">
          <Star className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Primary metric for {metricInfo.primary} tracking — used as the basis for aggregate statistics
          </div>
        </div>
      );
    }
    
    // Note about no cumulative support
    if (!supportsCumulatives) {
      parts.push(
        <div key="no-cumulative" className="text-xs text-slate-500 dark:text-slate-500 italic">
          This metric doesn't support cumulative calculations
        </div>
      );
    }
    
    return parts;
  };
  const deltaWrapperClass = isPrimary ? 'flex gap-2 mt-2 text-xs' : 'flex gap-1 mt-0.5 text-[10px]';
  const deltaChipClass = isPrimary
    ? 'flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 opacity-70'
    : 'inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 opacity-70';
  const extremesWrapperClass = isPrimary ? 'flex gap-2 mt-2 text-xs' : 'flex gap-1 mt-0.5 text-[10px]';
  const extremesChipClass = isPrimary
    ? 'flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800'
    : 'inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800';
  const deltaIconClass = isPrimary ? 'w-3 h-3' : 'w-2.5 h-2.5';

  return (
    <Card
      className={`${cardPadding} transition-all ${cardBg} ${cardScale}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={isPrimary ? 'flex items-start justify-between gap-2' : 'flex items-start gap-2'}>
        {!isPrimary && (
          <div className="text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0 opacity-60">
            {React.createElement(METRIC_DISPLAY_INFO[metric].icon, { className: 'w-4 h-4' })}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={labelClass}>
            <span>{label}</span>
            <PopoverTip>
              <PopoverTipTrigger asChild>
                <button className="inline-flex items-center justify-center flex-shrink-0 text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400 opacity-50 hover:opacity-100 transition-all" title="Show stat description">
                  <HelpCircle className="w-3 h-3" />
                </button>
              </PopoverTipTrigger>
              <PopoverTipContent side="right" align="start" className="text-xs">
                {buildHelpDescription()}
              </PopoverTipContent>
            </PopoverTip>
          </div>
          <div className={valueClass}>
            <NumberText 
              value={value} 
              valenceValue={getValenceValue(value, deltaValue)} 
              valence={metricValence} 
              short={!isHovered}
              animated 
              delta={METRIC_DISPLAY_INFO[metric].delta}
              percent={METRIC_DISPLAY_INFO[metric].percent}
            />
          </div>
          {deltaValue !== undefined && (
            <div className={deltaWrapperClass}>
              <span className={deltaChipClass}>
                {DeltaIcon && <DeltaIcon className={`${deltaIconClass} ${getValenceTone(deltaValue, deltaValue)}`} />}
                <NumberText 
                  value={deltaValue} 
                  valenceValue={getValenceValue(deltaValue, deltaValue)} 
                  valence={metricValence} 
                  short={!isHovered}
                  animated 
                  delta 
                />
                {deltaPercent !== undefined && (
                  <span className={`inline-flex items-center whitespace-nowrap ${getValenceTone(deltaPercent, deltaPercent)}`}>
                    (
                    <NumberText
                      value={deltaPercent}
                      valenceValue={getValenceValue(deltaPercent, deltaPercent)}
                      valence={metricValence}
                      short={!isHovered}
                      percent
                      absolute
                      decimals={1}
                      className="text-inherit"
                      goodClassName={valenceToneClasses.good}
                      badClassName={valenceToneClasses.bad}
                      neutralClassName={valenceToneClasses.neutral}
                    />
                    )
                  </span>
                )}
              </span>
            </div>
          )}
          {cumulativeValue !== undefined && METRIC_DISPLAY_INFO[metric].cumulatives !== false && (
            <div className={deltaWrapperClass}>
              <span className={deltaChipClass}>
                <NumberText 
                  value={cumulativeValue} 
                  valenceValue={getValenceValue(cumulativeValue, deltaValue)} 
                  valence={metricValence} 
                  short={!isHovered}
                  animated 
                  delta={METRIC_DISPLAY_INFO[metric].delta}
                  percent={METRIC_DISPLAY_INFO[metric].percent}
                />
                {cumulativePercent !== undefined && (
                  <span className={`inline-flex items-center whitespace-nowrap ${getValenceTone(cumulativePercent, cumulativePercent)}`}>
                    (
                    {CumulativePercentIcon && (
                      <CumulativePercentIcon className={`${deltaIconClass} ${getValenceTone(cumulativePercent, cumulativePercent)}`} />
                    )}
                    <NumberText
                      value={cumulativePercent}
                      valenceValue={getValenceValue(cumulativePercent, cumulativePercent)}
                      valence={metricValence}
                      short={!isHovered}
                      percent
                      absolute
                      decimals={1}
                      className="text-inherit"
                      goodClassName={valenceToneClasses.good}
                      badClassName={valenceToneClasses.bad}
                      neutralClassName={valenceToneClasses.neutral}
                    />
                    )
                  </span>
                )}
              </span>
            </div>
          )}
          {(high !== undefined || low !== undefined) && (
            <div className={extremesWrapperClass}>
              {high != undefined && (
                <span className={extremesChipClass}>
                  <ArrowUpToLine className={`${deltaIconClass} ${getValenceTone(high, highValenceDelta)}`} />
                  <NumberText 
                    value={high} 
                    valenceValue={getValenceValue(high, highValenceDelta)} 
                    valence={metricValence} 
                    short={!isHovered}
                    animated 
                    delta={METRIC_DISPLAY_INFO[metric].delta}
                    percent={METRIC_DISPLAY_INFO[metric].percent}
                  />
                </span>
              )}
              {low != undefined && (
                <span className={extremesChipClass}>
                  <ArrowDownToLine className={`${deltaIconClass} ${getValenceTone(low, lowValenceDelta)}`} />
                  <NumberText 
                    value={low} 
                    valenceValue={getValenceValue(low, lowValenceDelta)} 
                    valence={metricValence} 
                    short={!isHovered}
                    animated 
                    delta={METRIC_DISPLAY_INFO[metric].delta}
                    percent={METRIC_DISPLAY_INFO[metric].percent}
                  />
                </span>
              )}
            </div>
          )}
        </div>
        {isPrimary && showConfigButton && onConfigClick && (
          <Button
            variant="outline"
            size="icon"
            className={`h-9 w-9 flex-shrink-0 transition-all rounded-lg border-slate-300 dark:border-slate-600 ${isConfigHovered ? 'bg-slate-100 dark:bg-slate-700 scale-110' : 'bg-white dark:bg-slate-800'}`}
            onClick={onConfigClick}
            onMouseEnter={() => setIsConfigHovered(true)}
            onMouseLeave={() => setIsConfigHovered(false)}
            title="Configure stats display"
          >
            <Settings className={`h-5 w-5 transition-colors ${isConfigHovered ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`} />
          </Button>
        )}
      </div>
    </Card>
  );
}
