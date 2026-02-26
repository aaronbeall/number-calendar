import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NumberText } from '@/components/ui/number-text';
import type { NumberMetric } from '@/lib/stats';
import type { Valence } from '@/features/db/localdb';
import { METRIC_DISPLAY_INFO } from '@/lib/stats';
import {
  Settings,
  ArrowUpToLine,
  ArrowDownToLine,
  TrendingUp,
} from 'lucide-react';
import React, { useState } from 'react';

interface MetricCardProps {
  metric: NumberMetric;
  value: number | null;
  label: string;
  valence: Valence;
  variant: 'primary' | 'normal';
  colors: {
    bg: string;
    icon: string;
    text: string;
  };
  showConfigButton?: boolean;
  onConfigClick?: () => void;
  deltaValue?: number | null;
  cumulativeValue?: number | null;
  high?: number | null;
  low?: number | null;
}

export function MetricCard({
  metric,
  value,
  label,
  valence,
  variant = 'normal',
  colors,
  showConfigButton,
  onConfigClick,
  deltaValue,
  cumulativeValue,
  high,
  low,
}: MetricCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigHovered, setIsConfigHovered] = useState(false);

  if (variant === 'primary') {
    return (
      <Card
        className={`p-4 transition-all ${colors.bg} ${isHovered && variant !== 'primary' ? 'scale-105' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium mb-1">
              {label}
            </div>
            <div className="text-3xl font-bold">
              <NumberText 
                value={value} 
                valenceValue={value} 
                valence={valence} 
                short={!isHovered}
                animated 
              />
            </div>
            {deltaValue !== undefined && (
              <div className="flex gap-2 mt-2 text-xs">
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 opacity-70">
                  <TrendingUp className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  <NumberText 
                    value={deltaValue} 
                    valenceValue={deltaValue} 
                    valence={valence} 
                    short={!isHovered}
                    animated 
                    delta 
                  />
                </div>
              </div>
            )}
            {cumulativeValue !== undefined && (
              <div className="flex gap-2 mt-2 text-xs">
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 opacity-70">
                  <NumberText 
                    value={cumulativeValue} 
                    valenceValue={cumulativeValue} 
                    valence={valence} 
                    short={!isHovered}
                    animated 
                  />
                </div>
              </div>
            )}
            {(high !== undefined || low !== undefined) && (
              <div className="flex gap-2 mt-2 text-xs">
                {high !== undefined && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                    <ArrowUpToLine className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    <NumberText 
                      value={high} 
                      valenceValue={high} 
                      valence={valence} 
                      short={!isHovered}
                      animated 
                    />
                  </div>
                )}
                {low !== undefined && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                    <ArrowDownToLine className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    <NumberText 
                      value={low} 
                      valenceValue={low} 
                      valence={valence} 
                      short={!isHovered}
                      animated 
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          {showConfigButton && onConfigClick && (
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

  // Secondary variant
  return (
    <Card
      className={`p-3 transition-all ${colors.bg} ${isHovered ? 'scale-105' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-2">
        <div className="text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0 opacity-60">
          {React.createElement(METRIC_DISPLAY_INFO[metric].icon, { className: 'w-4 h-4' })}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">
            {label}
          </div>
          <div className="text-lg font-bold truncate">
            <NumberText 
              value={value} 
              valenceValue={value} 
              valence={valence} 
              short={!isHovered}
              animated 
            />
          </div>
          {deltaValue !== undefined && (
            <div className="flex gap-1 mt-0.5 text-[10px]">
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 opacity-70">
                <TrendingUp className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
                <NumberText 
                  value={deltaValue} 
                  valenceValue={deltaValue} 
                  valence={valence} 
                  short={!isHovered}
                  animated 
                  delta 
                />
              </span>
            </div>
          )}
          {cumulativeValue !== undefined && (
            <div className="flex gap-1 mt-0.5 text-[10px]">
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 opacity-70">
                <NumberText 
                  value={cumulativeValue} 
                  valenceValue={cumulativeValue} 
                  valence={valence} 
                  short={!isHovered}
                  animated 
                />
              </span>
            </div>
          )}
          {(high !== undefined || low !== undefined) && (
            <div className="flex gap-1 mt-0.5 text-[10px]">
              {high !== undefined && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  <ArrowUpToLine className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
                  <NumberText 
                    value={high} 
                    valenceValue={high} 
                    valence={valence} 
                    short={!isHovered}
                    animated 
                  />
                </span>
              )}
              {low !== undefined && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  <ArrowDownToLine className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
                  <NumberText 
                    value={low} 
                    valenceValue={low} 
                    valence={valence} 
                    short={!isHovered}
                    animated 
                  />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
