import { useDataset } from '@/features/db/useDatasetData';
import { METRIC_DISPLAY_INFO, METRIC_SOURCES_DISPLAY_INFO, type NumberMetric, type NumberSource } from '@/lib/stats';
import { entriesOf } from '@/lib/utils';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GoalAttributes, MetricGoal, TimePeriod, Tracking, Valence } from '../db/localdb';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';
import { isRangeCondition } from '@/lib/goals';
import { getPrimaryMetric } from '@/lib/tracking';

type GoalBuilderProps = {
  value: Partial<GoalAttributes>;
  onChange: (v: Partial<GoalAttributes>) => void;
  tracking?: Tracking;
  valence?: Valence;
};

const METRICS = METRIC_DISPLAY_INFO;

const SOURCES = METRIC_SOURCES_DISPLAY_INFO;

const CONDITIONS = {
  'above': 'Above',
  'below': 'Below',
  'equal': 'Equal To',
  'inside': 'Inside Range',
  'outside': 'Outside Range',
} as const satisfies Record<MetricGoal['condition'], string>;

const PERIODS = {
  day: 'In a Day',
  week: 'In a Week',
  month: 'In a Month',
  year: 'In a Year',
  anytime: 'All Time',
} as const satisfies Record<TimePeriod, string>;

const FREQUENCIES = {
  'once': 'Once',
  'times': 'Multiple Times',
};

export function GoalBuilder({ value, onChange, tracking: propTracking, valence: propValence }: GoalBuilderProps) {

  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get('datasetId');
  const { data: dataset } = useDataset(datasetId ?? '');
  const tracking = propTracking ?? dataset?.tracking;
  const valence = propValence ?? dataset?.valence;

  console.log("GoalBuilder", value)

  const { goal, timePeriod, count, consecutive } = value;
  const { condition, metric, source } = goal ?? {};
  const val = goal && 'value' in goal ? goal.value : undefined;
  const range = goal && 'range' in goal ? goal.range : undefined;

  const updateValueField = <K extends keyof GoalAttributes>(field: K, fieldValue: GoalAttributes[K]) => {
    onChange({ ...value, [field]: fieldValue });
  }

  const updateMetricGoalField = <K extends keyof MetricGoal>(field: K, fieldValue: MetricGoal[K]) => {
    onChange({ ...value, goal: { ...goal, [field]: fieldValue } as MetricGoal });
  }

  const [freq, setFreq] = useState<keyof typeof FREQUENCIES>(count && count > 1 ? 'times' : 'once');

  const handleFrequencyChange = (newFreq: keyof typeof FREQUENCIES) => {
    setFreq(newFreq);
    updateValueField('count', newFreq === 'once' ? 1 : 5);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1: Metric Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          Step 1: What to measure?
        </label>
        <Select value={metric || ''} onValueChange={v => updateMetricGoalField('metric', v as NumberMetric)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a metric…">
              {metric && (
                <div className="flex items-center gap-2">
                  <span>{METRICS[metric].label}</span>
                  {tracking && metric === getPrimaryMetric(tracking) && (
                    <Badge variant="secondary" className="text-xs">Primary</Badge>
                  )}
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {entriesOf(METRICS).map(([key, { label, description }]) => {
              const isPrimary = tracking && key === getPrimaryMetric(tracking);
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{label}</span>
                        {isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                      </div>
                      <span className="text-xs text-slate-500">{description}</span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2: Source Selection */}
      {metric && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Step 2: Which data point?
          </label>
          <Select value={source || ''} onValueChange={v => updateMetricGoalField('source', v as NumberSource)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a source…">
                {source && SOURCES[source].label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {entriesOf(SOURCES).map(([key, { label, description }]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex flex-col">
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-slate-500">{description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Step 3: Condition Selection */}
      {source && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Step 3: Set the condition
          </label>
          <Select value={condition || ''} onValueChange={v => updateMetricGoalField('condition', v as MetricGoal['condition'])}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a condition…" />
            </SelectTrigger>
            <SelectContent>
              {entriesOf(CONDITIONS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Step 4: Value Input */}
      {condition && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            {isRangeCondition(condition) ? 'Step 4: Target range' : 'Step 4: Target value'}
          </label>
          {isRangeCondition(condition) ? (
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                type="number"
                placeholder="From"
                value={range?.[0] ?? ''}
                onChange={e => {
                  const newRange = [parseFloat(e.target.value), range?.[1]] as [number, number];
                  updateMetricGoalField('range', newRange);
                }}
              />
              <span className="text-slate-500">-</span>
              <Input
                className="flex-1"
                type="number"
                placeholder="To"
                value={range?.[1] ?? ''}
                onChange={e => {
                  const newRange = [range?.[0], parseFloat(e.target.value)] as [number, number];
                  updateMetricGoalField('range', newRange);
                }}
              />
            </div>
          ) : (
            <Input
              className="w-full"
              type="number"
              placeholder="Enter target value"
              value={val}
              onChange={e => updateMetricGoalField('value', parseFloat(e.target.value))}
            />
          )}
        </div>
      )}

      {/* Step 5: Time Period */}
      {(isRangeCondition(condition)
        ? (!isNaN(range?.[0] ?? NaN) && !isNaN(range?.[1] ?? NaN))
        : !isNaN(val ?? NaN)) && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Step 5: Time period
          </label>
          <Select value={timePeriod || ''} onValueChange={v => updateValueField('timePeriod', v as TimePeriod)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a time period…" />
            </SelectTrigger>
            <SelectContent>
              {entriesOf(PERIODS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Step 6: Frequency */}
      {timePeriod && timePeriod !== 'anytime' && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Step 6: How often?
          </label>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 items-end">
              <Select value={freq} onValueChange={handleFrequencyChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose frequency…" />
                </SelectTrigger>
                <SelectContent>
                  {entriesOf(FREQUENCIES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {freq === 'times' && (
                <Input
                  className="flex-1"
                  type="number"
                  min={2}
                  placeholder="How many times?"
                  value={count}
                  onChange={e => updateValueField('count', parseInt(e.target.value))}
                />
              )}
            </div>
            {freq === 'times' && count !== undefined && count > 1 && (
              <label className="flex items-center gap-2 px-2 py-2 rounded-md bg-slate-100 dark:bg-slate-800/50">
                <Checkbox checked={!!consecutive} onCheckedChange={checked => updateValueField('consecutive', !!checked)} />
                <span className="text-sm">Must be in a row (empty gaps allowed)</span>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}