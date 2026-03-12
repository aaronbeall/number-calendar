import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FlippableCard } from '@/components/ui/flippable-card';
import type { Tracking, Valence } from '@/features/db/localdb';
import type { AggregationType } from '@/lib/analysis';
import { getMetricAnalysisDescription } from '@/lib/analysis';
import { usePreference } from '@/hooks/usePreference';
import { METRIC_DISPLAY_INFO, type NumberMetric, type NumberStats, type StatsExtremes } from '@/lib/stats';
import { MetricCard } from './MetricCard';
import React, { useMemo, useState } from 'react';
import { getPrimaryMetric, getPrimaryMetricLabel } from '@/lib/tracking';
import { adjectivize } from '@/lib/utils';

interface StatsSummaryProps {
  stats: NumberStats | null;
  valence: Valence;
  tracking: Tracking;
  datasetId: string;
  aggregationType: AggregationType;
  timeFrameLabel: string;
  extremes?: StatsExtremes;
  cumulatives?: NumberStats;
  cumulativePercents?: Partial<NumberStats>;
  deltas?: NumberStats;
  percents?: Partial<NumberStats>;
  selectedMetrics: NumberMetric[];
  onSelectedMetricsChange: (metrics: NumberMetric[]) => void;
}

export function StatsSummary({ stats: fullStats, valence, tracking, datasetId, aggregationType, timeFrameLabel, extremes, cumulatives, cumulativePercents, deltas, percents, selectedMetrics, onSelectedMetricsChange }: StatsSummaryProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [draftSelectedMetrics, setDraftSelectedMetrics] = useState<NumberMetric[]>(selectedMetrics);
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
    setDraftSelectedMetrics(selectedMetrics);
    setOriginalShowDeltas(showDeltas);
    setOriginalShowExtremes(showExtremes);
    setOriginalShowCumulatives(showCumulatives);
    setIsConfigOpen(true);
  };

  const handleCancel = () => {
    setDraftSelectedMetrics(selectedMetrics);
    if (originalShowDeltas !== null) setShowDeltas(originalShowDeltas);
    if (originalShowExtremes !== null) setShowExtremes(originalShowExtremes);
    if (originalShowCumulatives !== null) setShowCumulatives(originalShowCumulatives);
    setIsConfigOpen(false);
  };

  const handleResetToDefault = () => {
    setDraftSelectedMetrics(defaultSelectedMetrics);
    setShowDeltas(defaultShowDeltas);
    setShowExtremes(false);
    setShowCumulatives(defaultShowCumulatives);
  };

  const handleDone = () => {
    onSelectedMetricsChange(draftSelectedMetrics);
    setIsConfigOpen(false);
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
        
        const deltaPercent = showDeltas && percents ? percents[metric] : undefined;
        const cumulativePercent = showCumulatives && cumulativePercents ? cumulativePercents[metric] : undefined;
        
        const isPrimary = metric === primaryMetric;
        const info = METRIC_DISPLAY_INFO[metric];

        return {
          metric,
          value,
          deltaValue,
          deltaPercent,
          cumulativeValue,
          cumulativePercent,
          high,
          low,
          isPrimary,
          label: info.label,
        };
      });
  }, [fullStats, selectedMetrics, showDeltas, showExtremes, showCumulatives, deltas, percents, extremes, cumulatives, cumulativePercents, primaryMetric, tracking]);

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
          onClick={handleDone}
          className="font-medium"
        >
          Done
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-start">
          {/* Left Column: Primary Metric + Secondary Stats Options */}
          <div className="space-y-4 lg:max-h-[24rem] lg:overflow-y-auto lg:pr-2">
            {/* Primary metric - highlighted */}
            <div className="rounded-md bg-slate-100 dark:bg-slate-800 p-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">PRIMARY METRIC</div>
              <div className="flex items-start gap-2 p-2 rounded transition-colors hover:bg-slate-300 dark:hover:bg-slate-700">
                <Checkbox
                  id={`metric-${primaryMetric}`}
                  checked={draftSelectedMetrics.includes(primaryMetric)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setDraftSelectedMetrics([...draftSelectedMetrics, primaryMetric].filter((m, i, arr) => arr.indexOf(m) === i));
                    } else {
                      setDraftSelectedMetrics(draftSelectedMetrics.filter(m => m !== primaryMetric));
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
                  <div className="text-xs text-slate-500 dark:text-slate-400">{getMetricAnalysisDescription(primaryMetric, aggregationType, timeFrameLabel, primaryMetric)}</div>
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
                      <div className="text-xs text-slate-500 dark:text-slate-400">Change in metric from the {aggregationType === 'none' ? 'value' : aggregationType} prior to the time frame</div>
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
                      <div className="text-xs text-slate-500 dark:text-slate-400">Accumulated metrics since the beginning</div>
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
                    <div className="text-xs text-slate-500 dark:text-slate-400">Highest and lowest {aggregationType === 'none' ? 'values' : `${adjectivize(aggregationType)} metrics`} in the time frame</div>
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Secondary Metrics */}
          <div className="lg:max-h-[24rem] lg:overflow-y-auto lg:pl-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">METRICS</div>
            <div className="space-y-2">
              {(Object.keys(METRIC_DISPLAY_INFO) as NumberMetric[])
                .filter(m => m !== primaryMetric && METRIC_DISPLAY_INFO[m].hide !== tracking)
                .map(metric => (
                  <div key={metric} className="flex items-start gap-2 p-2 rounded transition-colors hover:bg-slate-200 dark:hover:bg-slate-800">
                    <Checkbox
                      id={`metric-${metric}`}
                      checked={draftSelectedMetrics.includes(metric)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDraftSelectedMetrics([...draftSelectedMetrics, metric]);
                        } else {
                          setDraftSelectedMetrics(draftSelectedMetrics.filter(m => m !== metric));
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
                      <div className="text-xs text-slate-500 dark:text-slate-400">{getMetricAnalysisDescription(metric, aggregationType, 'time frame', primaryMetric)}</div>
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
              tracking={tracking}
              aggregationType={aggregationType}
              timeFrameLabel={timeFrameLabel}
              primaryMetric={primaryMetric}
              variant="primary"
              showConfigButton
              onConfigClick={handleConfigOpen}
              deltaValue={showDeltas ? item.deltaValue : undefined}
              deltaPercent={showDeltas ? item.deltaPercent : undefined}
              cumulativeValue={showCumulatives ? item.cumulativeValue : undefined}
              cumulativePercent={showCumulatives ? item.cumulativePercent : undefined}
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
              tracking={tracking}
              aggregationType={aggregationType}
              timeFrameLabel={timeFrameLabel}
              primaryMetric={primaryMetric}
              variant="normal"
              deltaValue={showDeltas ? item.deltaValue : undefined}
              deltaPercent={showDeltas ? item.deltaPercent : undefined}
              cumulativeValue={showCumulatives ? item.cumulativeValue : undefined}
              cumulativePercent={showCumulatives ? item.cumulativePercent : undefined}
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
