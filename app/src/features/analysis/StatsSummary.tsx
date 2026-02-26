import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FlippableCard } from '@/components/ui/flippable-card';
import type { Tracking, Valence } from '@/features/db/localdb';
import { getValueForValence } from '@/lib/valence';
import { usePreference } from '@/hooks/usePreference';
import { METRIC_DISPLAY_INFO, type NumberMetric, type NumberStats, type StatsExtremes } from '@/lib/stats';
import { MetricCard } from './MetricCard';
import React, { useMemo, useState } from 'react';
import { getPrimaryMetric, getPrimaryMetricLabel } from '@/lib/tracking';

interface StatsSummaryProps {
  stats: NumberStats | null;
  valence: Valence;
  tracking: Tracking;
  datasetId: string;
  extremes?: StatsExtremes;
  cumulatives?: NumberStats;
  deltas?: NumberStats;
}

export function StatsSummary({ stats: fullStats, valence, tracking, datasetId, extremes, cumulatives, deltas }: StatsSummaryProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [originalMetrics, setOriginalMetrics] = useState<NumberMetric[] | null>(null);
  const [originalShowDeltas, setOriginalShowDeltas] = useState<boolean | null>(null);
  const [originalShowExtremes, setOriginalShowExtremes] = useState<boolean | null>(null);
  const [originalShowCumulatives, setOriginalShowCumulatives] = useState<boolean | null>(null);
  
  // Get primary metric
  const primaryMetric = getPrimaryMetric(tracking);
  const primaryMetricLabel = getPrimaryMetricLabel(tracking);
  const primaryMetricInfo = METRIC_DISPLAY_INFO[primaryMetric];
  
  // Stable initial value for preferences
  const defaultSelectedMetrics = useMemo(
    () => ['count', 'mean', 'median', 'min', 'max', primaryMetric] as NumberMetric[],
    [primaryMetric]
  );
  
  // Load configuration from preferences
  const [selectedMetrics, setSelectedMetrics] = usePreference<NumberMetric[]>(
    `statsSummary_metrics_${datasetId}`,
    defaultSelectedMetrics
  );

  const showDeltasOption = primaryMetricInfo.primary === 'trend';
  const showCumulativesOption = primaryMetricInfo.primary === 'series';
  const defaultShowDeltas = showDeltasOption;
  const defaultShowCumulatives = showCumulativesOption;
  
  const [showDeltas, setShowDeltas] = usePreference<boolean>(
    `statsSummary_deltas_${datasetId}`,
    defaultShowDeltas
  );
  
  const [showExtremes, setShowExtremes] = usePreference<boolean>(
    `statsSummary_extremes_${datasetId}`,
    false
  );
  
  const [showCumulatives, setShowCumulatives] = usePreference<boolean>(
    `statsSummary_cumulatives_${datasetId}`,
    defaultShowCumulatives
  );

  const handleConfigOpen = () => {
    setOriginalMetrics(selectedMetrics);
    setOriginalShowDeltas(showDeltas);
    setOriginalShowExtremes(showExtremes);
    setOriginalShowCumulatives(showCumulatives);
    setIsConfigOpen(true);
  };

  const handleCancel = () => {
    if (originalMetrics !== null) setSelectedMetrics(originalMetrics);
    if (originalShowDeltas !== null) setShowDeltas(originalShowDeltas);
    if (originalShowExtremes !== null) setShowExtremes(originalShowExtremes);
    if (originalShowCumulatives !== null) setShowCumulatives(originalShowCumulatives);
    setIsConfigOpen(false);
  };

  const handleResetToDefault = () => {
    setSelectedMetrics(defaultSelectedMetrics);
    setShowDeltas(defaultShowDeltas);
    setShowExtremes(false);
    setShowCumulatives(defaultShowCumulatives);
  };

  const getValueColors = (value: number | null) => {
    if (value === null) return { bg: 'bg-slate-50 dark:bg-slate-800/50', icon: 'text-slate-500 dark:text-slate-400', text: 'text-slate-500 dark:text-slate-400' };
    
    return getValueForValence(value, valence, {
      good: { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400', text: 'text-green-700 dark:text-green-400' },
      bad: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400', text: 'text-red-700 dark:text-red-400' },
      neutral: { bg: 'bg-slate-50 dark:bg-slate-800/50', icon: 'text-slate-500 dark:text-slate-400', text: 'text-slate-700 dark:text-slate-300' },
    });
  };

  const buildSummaryItems = useMemo(() => {
    if (!fullStats) return [];

    const visibleMetrics = selectedMetrics
      .filter(metric => METRIC_DISPLAY_INFO[metric].hide !== tracking);

    return visibleMetrics
      .map(metric => {
        const value = fullStats[metric];
        const deltaValue = showDeltas && deltas ? deltas[metric] : undefined;
        const cumulativeValue = showCumulatives && cumulatives ? cumulatives[metric] : undefined;
        const high = showExtremes && extremes ? extremes[`highest${metric.charAt(0).toUpperCase()}${metric.slice(1)}` as keyof StatsExtremes] : undefined;
        const low = showExtremes && extremes ? extremes[`lowest${metric.charAt(0).toUpperCase()}${metric.slice(1)}` as keyof StatsExtremes] : undefined;
        
        const isPrimary = metric === primaryMetric;
        const info = METRIC_DISPLAY_INFO[metric];

        return {
          metric,
          value,
          deltaValue,
          cumulativeValue,
          high,
          low,
          isPrimary,
          label: info.label,
          colors: getValueColors(value),
        };
      });
  }, [fullStats, selectedMetrics, showDeltas, showExtremes, showCumulatives, deltas, extremes, cumulatives, primaryMetric, tracking]);

  const primaryItems = buildSummaryItems.filter(item => item.isPrimary);
  const secondaryItems = buildSummaryItems.filter(item => !item.isPrimary);

  const backContent = (
    <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-4 max-h-120 flex flex-col">
      {/* Sticky button header */}
      <div className="sticky top-0 z-10 flex gap-2 pb-4 mb-4 border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 -mx-4 px-4 pt-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCancel}
          className="font-medium"
        >
          Cancel
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetToDefault}
          className="font-medium"
        >
          Reset to Default
        </Button>
        <div className="flex-1" />
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsConfigOpen(false)}
          className="font-medium"
        >
          Done
        </Button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Left Column: Primary Metric + Secondary Stats Options */}
          <div className="overflow-y-auto pr-2 space-y-4">
            {/* Primary metric - highlighted */}
            <div className="rounded-md bg-slate-100 dark:bg-slate-800 p-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">PRIMARY METRIC</div>
              <div className="flex items-start gap-2 p-2 rounded transition-colors hover:bg-slate-300 dark:hover:bg-slate-700">
                <Checkbox
                  id={`metric-${primaryMetric}`}
                  checked={selectedMetrics.includes(primaryMetric)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedMetrics([...selectedMetrics, primaryMetric].filter((m, i, arr) => arr.indexOf(m) === i));
                    } else {
                      setSelectedMetrics(selectedMetrics.filter(m => m !== primaryMetric));
                    }
                  }}
                  disabled
                />
                <Label htmlFor={`metric-${primaryMetric}`} className="text-sm cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 text-slate-400 dark:text-slate-500">
                      {React.createElement(METRIC_DISPLAY_INFO[primaryMetric].icon, { className: 'w-4 h-4' })}
                    </div>
                    <span className="font-medium">{primaryMetricLabel}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{METRIC_DISPLAY_INFO[primaryMetric]?.description}</div>
                </Label>
              </div>
            </div>

            {/* Secondary stats options */}
            <div className="border-t pt-3">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">SECONDARY STATS</div>
              <div className="space-y-2">
                {showDeltasOption && (
                  <div className="flex items-center gap-2 p-2 rounded transition-colors hover:bg-slate-200 dark:hover:bg-slate-800">
                    <Checkbox
                      id="show-deltas"
                      checked={showDeltas}
                      onCheckedChange={(checked) => setShowDeltas(!!checked)}
                    />
                    <Label htmlFor="show-deltas" className="text-sm cursor-pointer flex-1">
                      <div className="font-medium">Show Deltas</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Change from previous period for each metric</div>
                    </Label>
                  </div>
                )}
                {showCumulativesOption && (
                  <div className="flex items-center gap-2 p-2 rounded transition-colors hover:bg-slate-200 dark:hover:bg-slate-800">
                    <Checkbox
                      id="show-cumulatives"
                      checked={showCumulatives}
                      onCheckedChange={(checked) => setShowCumulatives(!!checked)}
                    />
                    <Label htmlFor="show-cumulatives" className="text-sm cursor-pointer flex-1">
                      <div className="font-medium">Show Cumulatives</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Cumulative values from beginning through selected time frame</div>
                    </Label>
                  </div>
                )}
                <div className="flex items-center gap-2 p-2 rounded transition-colors hover:bg-slate-200 dark:hover:bg-slate-800">
                  <Checkbox
                    id="show-extremes"
                    checked={showExtremes}
                    onCheckedChange={(checked) => setShowExtremes(!!checked)}
                  />
                  <Label htmlFor="show-extremes" className="text-sm cursor-pointer flex-1">
                    <div className="font-medium">Show Extremes</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Highest/lowest values for each metric</div>
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Secondary Metrics */}
          <div className="overflow-y-auto pl-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">METRICS</div>
            <div className="space-y-2">
              {(Object.keys(METRIC_DISPLAY_INFO) as NumberMetric[])
                .filter(m => m !== primaryMetric && METRIC_DISPLAY_INFO[m].hide !== tracking)
                .map(metric => (
                  <div key={metric} className="flex items-start gap-2 p-2 rounded transition-colors hover:bg-slate-200 dark:hover:bg-slate-800">
                    <Checkbox
                      id={`metric-${metric}`}
                      checked={selectedMetrics.includes(metric)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMetrics([...selectedMetrics, metric]);
                        } else {
                          setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
                        }
                      }}
                    />
                    <Label htmlFor={`metric-${metric}`} className="text-sm cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 text-slate-400 dark:text-slate-500">
                          {React.createElement(METRIC_DISPLAY_INFO[metric].icon, { className: 'w-4 h-4' })}
                        </div>
                        <span className="font-medium">{METRIC_DISPLAY_INFO[metric]?.label}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{METRIC_DISPLAY_INFO[metric]?.description}</div>
                    </Label>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const frontContent = (
    <div className="space-y-4">
      {/* Primary metric prominently displayed */}
      {primaryItems.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {primaryItems.map((item) => (
            <MetricCard
              key={item.metric}
              metric={item.metric}
              value={item.value}
              label={item.label}
              valence={valence}
              variant="primary"
              colors={item.colors}
              showConfigButton
              onConfigClick={handleConfigOpen}
              deltaValue={showDeltas ? item.deltaValue : undefined}
              cumulativeValue={showCumulatives ? item.cumulativeValue : undefined}
              high={showExtremes ? item.high : undefined}
              low={showExtremes ? item.low : undefined}
            />
          ))}
        </div>
      )}

      {/* Secondary metrics in grid */}
      {secondaryItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {secondaryItems.map((item) => (
            <MetricCard
              key={item.metric}
              metric={item.metric}
              value={item.value}
              label={item.label}
              valence={valence}
              variant="normal"
              colors={item.colors}
              deltaValue={showDeltas ? item.deltaValue : undefined}
              cumulativeValue={showCumulatives ? item.cumulativeValue : undefined}
              high={showExtremes ? item.high : undefined}
              low={showExtremes ? item.low : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <FlippableCard
      open={isConfigOpen}
      front={frontContent}
      back={backContent}
      duration={0.3}
    />
  );
}
