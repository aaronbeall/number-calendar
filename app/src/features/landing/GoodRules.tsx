import { cn } from '@/lib/utils';
import { isGood, ruleIcon, type GoodRule } from './goodRules';

type RuleExample = {
  title: string;
  example: string;
  rule: GoodRule;
  values: number[];
  /** Value before the first day, for rules judged against the day before. */
  start?: number;
  format: (v: number) => string;
};

const k = (v: number) => `${Math.round(v / 1000)}k`;

const ruleExamples: RuleExample[] = [
  { title: 'More is better', example: 'Steps, revenue, savings', rule: { kind: 'higher' }, values: [6000, 7000, 6000, 8000, 9000, 8000, 10000], start: 7000, format: k },
  { title: 'Less is better', example: 'Weight, expenses, debt', rule: { kind: 'lower' }, values: [184, 183, 184, 182, 181, 182, 180], start: 185, format: String },
  { title: 'Above zero', example: 'Profit beats a loss', rule: { kind: 'positive' }, values: [420, -180, 310, 95, -60, 690, 240], format: (v) => (Math.abs(v) >= 1000 ? k(v) : String(v)) },
  { title: 'In the zone', example: 'Sleep between 7 and 9 h', rule: { kind: 'range', min: 7, max: 9, label: '7 to 9 h' }, values: [6.5, 7.2, 8.1, 9.4, 7.6, 6.8, 8.0], format: (v) => v.toFixed(1) },
  { title: 'Hit the target', example: '10,000 steps or more', rule: { kind: 'atLeast', value: 10000, label: '10k+' }, values: [8000, 10000, 12000, 9000, 11000, 10000, 7000], format: k },
];

/**
 * A row of tiles showing the different ways "good" can be defined, each with a week of
 * sample days coloured by that rule.
 */
export function GoodRules() {
  return (
    <ul className="-mx-4 px-4 sm:mx-0 sm:px-0 flex lg:grid lg:grid-cols-5 gap-3 overflow-x-auto lg:overflow-visible snap-x snap-mandatory pb-2 lg:pb-0">
      {ruleExamples.map(({ title, example, rule, values, start, format }) => {
        const Icon = ruleIcon(rule);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return (
          <li key={title} className="snap-start shrink-0 w-[240px] lg:w-auto rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{example}</div>
            <div className="mt-3 grid grid-cols-7 gap-1" aria-hidden>
              {values.map((v, i) => {
                const good = isGood(rule, v, { prev: i === 0 ? start : values[i - 1], avg, line: true });
                return (
                  <span
                    key={i}
                    className={cn(
                      'flex items-center justify-center aspect-square rounded-md font-mono text-[9px] font-semibold leading-none',
                      good
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                    )}
                  >
                    {format(v)}
                  </span>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
