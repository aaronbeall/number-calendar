import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isRangeCondition } from '@/lib/goals';
import { METRIC_DISPLAY_INFO, METRIC_SOURCES_DISPLAY_INFO, type NumberMetric, type NumberSource } from '@/lib/stats';
import { getPrimaryMetric } from '@/lib/tracking';
import { entriesOf } from '@/lib/utils';
import type { GoalRequirements, GoalTarget, TimePeriod, Tracking, Valence } from '../db/localdb';
import { filterMetricsForTracking, filterSourcesForTracking } from './GoalBuilder';

type TargetBuilderProps = {
  value: Partial<GoalRequirements>;
  onChange: (v: Partial<GoalRequirements>) => void;
  tracking?: Tracking;
  valence?: Valence;
};

const METRICS = METRIC_DISPLAY_INFO;
const SOURCES = METRIC_SOURCES_DISPLAY_INFO;

// Target-specific conditions (includes range)
const CONDITIONS = {
  'above': 'Above',
  'below': 'Below',
  'equal': 'Equal To',
  'inside': 'Inside Range',
  'outside': 'Outside Range',
} as const;

const PERIODS = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
  year: 'Yearly',
} as const satisfies Record<Exclude<TimePeriod, 'anytime'>, string>;

export function TargetBuilder({ value, onChange, tracking, valence }: TargetBuilderProps) {
  const { target: goal, timePeriod } = value;
  const { condition, metric, source } = goal ?? {};
  const val = goal?.value;
  const rangeVal = goal?.range ? goal.range : [undefined, undefined];
  const isRange = isRangeCondition(condition);

  const updateValueField = <K extends keyof GoalRequirements>(field: K, fieldValue: GoalRequirements[K]) => {
    onChange({ ...value, [field]: fieldValue, count: 1 });
  }

  const updateMetricGoalField = <K extends keyof GoalTarget>(field: K, fieldValue: GoalTarget[K]) => {
    onChange({ 
      ...value, 
      target: { ...goal, [field]: fieldValue } as GoalTarget,
      count: 1,
    });
  }

  // Determine default condition based on valence
  const getDefaultCondition = () => {
    if (!valence) return 'above';
    return valence === 'negative' ? 'below' : 'above';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Value Section */}
      {source && (
        <div className="flex flex-col items-center gap-2 py-4 px-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest">Target {isRange ? 'Range' : 'Value'}</label>
          
          {/* Single Value Input */}
          {!isRange && (
            <Input
              type="number"
              placeholder="0"
              value={val ?? ''}
              onChange={e => updateMetricGoalField('value', parseFloat(e.target.value))}
              style={{ fontSize: '2rem', lineHeight: '1' }}
              className="text-center font-bold h-16 border-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          )}

          {/* Range Value Inputs */}
          {isRange && (
            <div className="w-full flex gap-2 items-center">
              <Input
                type="number"
                placeholder="0"
                value={rangeVal[0] ?? ''}
                onChange={e => updateMetricGoalField('range', [parseFloat(e.target.value), rangeVal[1]] as [number, number])}
                style={{ fontSize: '1.5rem', lineHeight: '1' }}
                className="text-center font-bold h-14 border-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <span className="text-slate-400">–</span>
              <Input
                type="number"
                placeholder="0"
                value={rangeVal[1] ?? ''}
                onChange={e => updateMetricGoalField('range', [rangeVal[0], parseFloat(e.target.value)] as [number, number])}
                style={{ fontSize: '1.5rem', lineHeight: '1' }}
                className="text-center font-bold h-14 border-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
          
          {/* Time Period - Always Visible */}
          <div className="w-full flex flex-col items-center gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest">Time Period</label>
            <Select value={timePeriod || ''} onValueChange={v => updateValueField('timePeriod', v as TimePeriod)}>
              <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-900">
                <SelectValue placeholder="Choose a time period…" />
              </SelectTrigger>
              <SelectContent>
                {entriesOf(PERIODS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Compact Supporting Fields */}
      <div className="flex flex-col gap-3">
        {/* Metric and Source in a grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest">Metric</label>
            <Select 
              value={metric || ''} 
              onValueChange={v => {
                updateMetricGoalField('metric', v as NumberMetric);
                if (!condition) {
                  updateMetricGoalField('condition', getDefaultCondition());
                }
              }}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Choose…">
                  {metric && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{METRICS[metric].label}</span>
                      {tracking && metric === getPrimaryMetric(tracking) && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">Primary</Badge>
                      )}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {entriesOf(METRICS)
                  .filter(([key]) => filterMetricsForTracking(key, tracking))
                  .map(([key, { label, description }]) => {
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

          {metric && (
            <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest">Data Point</label>
              <Select 
                value={source || ''} 
                onValueChange={v => updateMetricGoalField('source', v as NumberSource)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Choose…">
                    {source && <span className="text-sm">{SOURCES[source].label}</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {entriesOf(SOURCES)
                    .filter(([key]) => filterSourcesForTracking(key, tracking))
                    .map(([key, { label, description }]) => (
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
        </div>

        {/* Condition and Time Period in a grid */}
        {source && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest">Condition</label>
              <Select value={condition || ''} onValueChange={v => updateMetricGoalField('condition', v as GoalTarget['condition'])}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {entriesOf(CONDITIONS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        )}
      </div>
    </div>
  );
}
