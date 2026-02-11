import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Tracking, Valence } from '@/features/db/localdb';
import { useDatasets } from '@/features/db/useDatasetData';
import { getChartData, type NumbersChartDataPoint } from '@/lib/charts';
import { getColorTheme } from '@/lib/colors';
import { DATASET_TEMPLATES, type DatasetTemplate } from '@/lib/dataset-builder';
import { getDatasetIcon } from '@/lib/dataset-icons';
import { formatRange, formatValue } from '@/lib/friendly-numbers';
import { computeNumberStats } from '@/lib/stats';
import { getPrimaryMetricFromStats, getPrimaryMetricLabel } from '@/lib/tracking';
import { cn, isNameTaken } from '@/lib/utils';
import { getValueForGood, getValueForValence, getValueForValenceWithCondition } from '@/lib/valence';
import { Activity, ArrowDown, ArrowDownFromLine, ArrowLeft, ArrowRight, ArrowRightLeft, ArrowUp, ArrowUpFromLine, ChartNoAxesColumn, ChartNoAxesColumnDecreasing, ChartNoAxesColumnIncreasing, Diff, FoldVertical, Minus, Plus, Search, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';

export type DatasetBuilderProps = {
  onSelectTemplate: (template: DatasetTemplate, datasetName: string) => void;
  onManualMode: () => void;
};

const getValenceBadgeMeta = (template: DatasetTemplate) => {
  const { tracking, valence, suggestedTarget: target } = template;
  if (tracking === 'trend') {
    return getValueForGood(valence, {
      positive: { label: 'Higher is better', Icon: ArrowUp },
      negative: { label: 'Lower is better', Icon: ArrowDown },
      neutral: target?.condition
        ? 'range' in target.condition
          ? { label: 'Target range', Icon: FoldVertical }
          : target?.condition?.condition == 'above'
            ? { label: 'High target', Icon: ArrowUpFromLine }
            : { label: 'Low target', Icon: ArrowDownFromLine }
        : { label: 'Direction neutral', Icon: ArrowRightLeft }
    });
  } else {
    return getValueForGood(valence, {
      positive: { label: 'Positive is good', Icon: Plus },
      negative: { label: 'Negative is good', Icon: Minus },
      neutral: target?.condition
         ? 'range' in target.condition
          ? { label: 'Target range', Icon: FoldVertical }
          : target?.condition?.condition == 'above'
            ? { label: 'High target', Icon: ArrowUpFromLine }
            : { label: 'Low target', Icon: ArrowDownFromLine }
        : { label: 'Sign neutral', Icon: Diff }
    });
  }
};

const getValenceTrackingIcon = (tracking: Tracking, valence: Valence) => {
  if (tracking === 'trend') {
    return getValueForGood(valence, {
      positive: TrendingUp,
      negative: TrendingDown,
      neutral: Activity,
    });
  } else {
    return getValueForGood(valence, {
      positive: ChartNoAxesColumnIncreasing,
      negative: ChartNoAxesColumnDecreasing,
      neutral: ChartNoAxesColumn,
    });
  }
}

export function DatasetBuilder({ onSelectTemplate, onManualMode }: DatasetBuilderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<DatasetTemplate | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const { data: existingDatasets = [] } = useDatasets();

  const getUniqueDatasetName = (baseName: string) => {
    const trimmed = baseName.trim() || 'Untitled Dataset';
    let candidate = trimmed;
    let suffix = 2;

    while (isNameTaken({ name: candidate }, existingDatasets, 'name', 'id')) {
      candidate = `${trimmed} (${suffix})`;
      suffix += 1;
    }

    return candidate;
  };

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return DATASET_TEMPLATES;

    return DATASET_TEMPLATES.filter((template) => {
      if (template.name.toLowerCase().includes(query)) return true;
      return template.searchTerms.some((term) => term.toLowerCase().includes(query));
    });
  }, [searchQuery]);

  const nameExists = isNameTaken({ name: datasetName }, existingDatasets, 'name', 'id');
  const isNameValid = datasetName.trim().length > 0 && !nameExists;

  const handleSelectTemplate = (template: DatasetTemplate) => {
    setSelectedTemplate(template);
    setDatasetName(getUniqueDatasetName(template.name));
  };

  const handleCreateDataset = () => {
    if (!selectedTemplate || !isNameValid) return;
    onSelectTemplate(selectedTemplate, datasetName.trim());
  };

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
    setDatasetName('');
  };

  return (
    <div className="flex max-h-[90vh] flex-col">
      <DialogHeader className="px-6 pt-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {selectedTemplate ? 'Confirm your dataset' : 'What do you want to track?'}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? 'Review the template and give your dataset a unique name.'
                : 'Pick a starting point and we will prefill the setup for you.'}
            </DialogDescription>
          </div>
        </div>
        {selectedTemplate ? (
          <div className="mt-3">
            <Button
              type="button"
              variant="link"
              className="h-auto px-0 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              onClick={handleBackToTemplates}
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Choose different template
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search templates"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {filteredTemplates.length} templates
            </div>
          </>
        )}
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
        {selectedTemplate ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="dataset-template-name">Dataset name</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <Input
                    id="dataset-template-name"
                    autoFocus
                    value={datasetName}
                    onChange={(event) => setDatasetName(event.target.value)}
                    placeholder="e.g. Fitness Journey"
                  />
                </div>
              </div>
              {datasetName.trim().length > 0 && nameExists && (
                <p className="text-xs text-red-600 dark:text-red-400">Dataset name already exists</p>
              )}
            </div>

            <div
              className={cn(
                'relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-5 text-left shadow-sm',
                'dark:border-slate-700 dark:bg-slate-900/60'
              )}
            >
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-blue-50/40 via-transparent to-transparent dark:from-blue-900/20" />
              <div className="flex items-center gap-4">
                {(() => {
                  const Icon = getDatasetIcon(selectedTemplate.icon);
                  const { bg: iconBg, text: iconText } = getColorTheme(selectedTemplate.theme);
                  return (
                    <div
                      className={cn(
                        'relative flex h-12 w-12 items-center justify-center rounded-full shadow-sm ring-1 ring-white/70',
                        'before:absolute before:inset-1 before:rounded-full before:bg-white/40 before:mix-blend-soft-light',
                        iconBg
                      )}
                    >
                      <Icon className={cn('relative h-5 w-5 drop-shadow-sm', iconText)} />
                    </div>
                  );
                })()}
                <div>
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {selectedTemplate.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {selectedTemplate.description}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(() => {
                  const unitsLabel = selectedTemplate.units.length > 0 ? selectedTemplate.units.join(', ') : null;
                  const isTrend = selectedTemplate.tracking === 'trend';
                  const TrackingIcon = getValenceTrackingIcon(selectedTemplate.tracking, selectedTemplate.valence);
                  return (
                    <>
                      <Badge variant="outline" className="gap-1 text-[10px] uppercase tracking-wide">
                        <TrackingIcon className="h-3.5 w-3.5" />
                        {isTrend ? 'Trend' : 'Series'}
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-[10px] uppercase tracking-wide">
                        {(() => {
                          const { label, Icon } = getValenceBadgeMeta(selectedTemplate);
                          return (
                            <>
                              <Icon className="h-3.5 w-3.5" />
                              {label}
                            </>
                          );
                        })()}
                      </Badge>
                      {unitsLabel && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          Units: {unitsLabel}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
              <SampleDataPreview
                tracking={selectedTemplate.tracking}
                valence={selectedTemplate.valence}
                period={selectedTemplate.suggestedTarget?.period ?? 'day'}
                sampleData={selectedTemplate.sampleData}
                target={selectedTemplate.suggestedTarget}
              />
            </div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-12 text-center">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              No templates found
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try a different keyword or switch to manual setup.
            </div>
            <Button
              type="button"
              variant="ghost"
              className="mt-4"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => {
              const Icon = getDatasetIcon(template.icon);
              const { bg: iconBg, text: iconText } = getColorTheme(template.theme);
              const unitsLabel = template.units.length > 0 ? template.units.join(', ') : null;
              const isTrend = template.tracking === 'trend';
              const TrackingIcon = getValenceTrackingIcon(template.tracking, template.valence);

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template)}
                  className={cn(
                    'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-4 text-left shadow-sm transition-all',
                    'hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg',
                    'dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-blue-500'
                  )}
                >
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-blue-50/40 via-transparent to-transparent dark:from-blue-900/20" />
                  <div className="flex items-center justify-center">
                    <div
                      className={cn(
                        'relative flex h-11 w-11 items-center justify-center rounded-full shadow-sm ring-1 ring-white/70 transition-transform',
                        'before:absolute before:inset-1 before:rounded-full before:bg-white/40 before:mix-blend-soft-light',
                        'after:absolute after:-inset-1 after:rounded-full after:border after:border-white/60 after:opacity-80',
                        'group-hover:-translate-y-0.5 group-hover:scale-105 dark:ring-slate-900/60',
                        iconBg
                      )}
                    >
                      <Icon className={cn('relative h-5 w-5 drop-shadow-sm', iconText)} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {template.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {template.description}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-[10px] uppercase tracking-wide">
                      <TrackingIcon className="h-3.5 w-3.5" />
                      {isTrend ? 'Trend' : 'Series'}
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-[10px] uppercase tracking-wide">
                      {(() => {
                        const { label, Icon } = getValenceBadgeMeta(template);
                        return (
                          <>
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </>
                        );
                      })()}
                    </Badge>
                    {unitsLabel && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Units: {unitsLabel}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 transition-colors group-hover:text-blue-700 dark:text-blue-400">
                    Use this template
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!selectedTemplate ? (
        <div className="border-t border-slate-200/70 px-6 py-4 dark:border-slate-700/70">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Want full control?</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Start from a blank dataset and customize every detail.
              </div>
            </div>
            <Button type="button" onClick={onManualMode} className="gap-2">
              Build from scratch
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-200/70 px-6 py-4 dark:border-slate-700/70">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-4 text-sm shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40">
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Ready to build this dataset?</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                We will create it and open the goal builder next.
              </div>
            </div>
            <Button
              type="button"
              onClick={handleCreateDataset}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              disabled={!isNameValid}
            >
              Create dataset & set goals
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

type SampleDataPreviewProps = {
  tracking: Tracking;
  valence: Valence;
  period: NonNullable<DatasetTemplate['suggestedTarget']>['period'];
  sampleData: DatasetTemplate['sampleData'];
  target?: NonNullable<DatasetTemplate['suggestedTarget']>;
};

function SampleDataPreview({ tracking, valence, period, sampleData, target }: SampleDataPreviewProps) {
  const label = period === 'day' ? 'Day' : period === 'week' ? 'Week' : 'Month';
  const formatSignedValue = (value: number) => (value > 0 ? `+${formatValue(value)}` : formatValue(value));
  const stats = sampleData
    .map((entry) => computeNumberStats(entry))
    .filter((entry): entry is NonNullable<ReturnType<typeof computeNumberStats>> => !!entry);
  const primaryValues = stats.map((entry) => getPrimaryMetricFromStats(entry, tracking));
  const chartData = getChartData(primaryValues, tracking);
  const previewValues = chartData.slice(-12);
  const metricLabel = getPrimaryMetricLabel(tracking);

  const yValues = previewValues.map((entry) => entry.value ?? entry.y ?? 0);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yRange = Math.max(1, yMax - yMin);
  const yDomain: [number, number] = [yMin - yRange * 0.1, yMax + yRange * 0.1];
  const overallChange = tracking === 'trend' && previewValues.length > 1
    ? (previewValues[previewValues.length - 1]?.value ?? 0) - (previewValues[0]?.value ?? 0)
    : 0;
  const condition = valence === 'neutral' ? target?.condition : undefined
  const targetLabel = condition && (
    'range' in condition 
    ? formatRange(condition.range) 
    : formatValue(condition.value)
  );
  const lineColor = getValueForValence(overallChange, valence, {
    good: 'rgb(34 197 94)',
    bad: 'rgb(239 68 68)',
    neutral: 'rgb(59 130 246)',
  });
  const getValenceColorClass = (value: number, valenceValue: number) => {
    if (condition) {
      return getValueForValenceWithCondition(value, valenceValue, valence, condition, {
        good: 'text-green-600 dark:text-green-400',
        bad: 'text-red-600 dark:text-red-400',
        neutral: 'text-blue-600 dark:text-blue-300',
      });
    }
    return getValueForValence(valenceValue, valence, {
      good: 'text-green-600 dark:text-green-400',
      bad: 'text-red-600 dark:text-red-400',
      neutral: 'text-blue-600 dark:text-blue-300',
    });
  };
  const renderTooltip = ({ active, payload }: { active?: boolean; payload?: { payload?: NumbersChartDataPoint }[] }) => {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;
    const valueColor = getValenceColorClass(point.value ?? 0, point.valenceValue ?? 0);
    const deltaValue = point.secondaryValue;
    const deltaLabel = point.secondaryLabel;

    return (
      <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-[11px] shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-1 text-[10px] text-gray-500 dark:text-gray-400">
          {label} {point.x + 1}
        </div>
        <div className={cn('text-sm font-semibold', valueColor)}>{formatValue(point.value)}</div>
        {deltaValue !== undefined && deltaLabel && (
          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {formatSignedValue(deltaValue)} {deltaLabel.toLowerCase()}
          </div>
        )}
      </div>
    );
  };

  const displayRows = previewValues.map((entry, idx) => {
    const index = chartData.length - previewValues.length + idx;
    const colorClass = getValueForValenceWithCondition(entry.value, entry.valenceValue, valence, condition, {
      good: 'text-green-600 dark:text-green-400',
      bad: 'text-red-600 dark:text-red-400',
      neutral: 'text-blue-600 dark:text-blue-300',
    });

    return {
      periodLabel: `${label} ${index + 1}`,
      valueLabel: formatValue(entry.value),
      deltaLabel: tracking === 'trend' && entry.secondaryValue !== undefined
        ? formatSignedValue(entry.secondaryValue)
        : null,
      colorClass,
    };
  });

  return (
    <div className="mt-4 grid gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-3 text-xs text-slate-600 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/50 dark:text-slate-400">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-700 dark:text-slate-200">Example {tracking === 'trend' ? 'trend' : 'series'}</span>
        <span className="text-[10px] text-slate-500 dark:text-slate-500">
          {metricLabel} per {period}
          {targetLabel ? ` • Target ${targetLabel}` : ''}
        </span>
      </div>
      <div className="grid grid-flow-col auto-cols-[minmax(72px,1fr)] gap-1.5 overflow-x-auto text-[11px]">
        {displayRows.map((row) => (
          <div key={row.periodLabel} className="rounded-lg border border-slate-200/60 bg-white/60 px-1.5 py-1 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{row.periodLabel}</div>
            <div className={cn('font-mono text-sm', row.colorClass)}>{row.valueLabel}</div>
            {row.deltaLabel && (
              <div className={cn('text-[10px] font-medium', row.colorClass)}>{row.deltaLabel}</div>
            )}
          </div>
        ))}
      </div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          {tracking === 'trend' ? (
            <LineChart data={previewValues} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <YAxis hide domain={yDomain} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Tooltip cursor={false} content={renderTooltip} />
            </LineChart>
          ) : (
            <BarChart data={previewValues} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <YAxis hide domain={yDomain} />
              <Bar dataKey="value" isAnimationActive={false} fill="rgb(59 130 246)">
                {previewValues.map((entry, index) => {
                  const valenceValue = entry.valenceValue ?? 0;
                  const fill = condition
                    ? getValueForValenceWithCondition(entry.value, valenceValue, valence, condition, {
                        good: 'rgb(34 197 94)',
                        bad: 'rgb(239 68 68)',
                        neutral: 'rgb(59 130 246)',
                      })
                    : valence === 'positive'
                      ? valenceValue >= 0 ? 'rgb(34 197 94)' : 'rgb(239 68 68)'
                      : valence === 'negative'
                        ? valenceValue <= 0 ? 'rgb(34 197 94)' : 'rgb(239 68 68)'
                        : 'rgb(59 130 246)';
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
              <Tooltip cursor={false} content={renderTooltip} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
