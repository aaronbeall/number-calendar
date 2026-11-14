import { cn } from '@/lib/utils';
import { isGood, ruleIcon, ruleLabel, type GoodRule } from './goodRules';
import {
  Activity,
  BookOpen,
  Brain,
  CreditCard,
  DollarSign,
  Droplet,
  Footprints,
  Moon,
  PiggyBank,
  Receipt,
  Smartphone,
  Smile,
  Store,
  Timer,
  type LucideIcon,
} from 'lucide-react';

type Example = {
  name: string;
  Icon: LucideIcon;
  /** What counts as a good day for this tracker. */
  good: GoodRule;
  /** bars: daily amounts; line: a level that moves day to day. */
  kind: 'bars' | 'line';
  values: number[];
  stat: string;
  statLabel: string;
  /** Tailwind classes for the icon tile. */
  tint: string;
};

// Sample shapes only: two weeks of believable numbers for each kind of tracker.
const examples: Example[] = [
  { name: 'Trading P&L', Icon: DollarSign, good: { kind: 'positive' }, kind: 'bars', values: [420, -180, 310, 95, -60, 690, 240, -315, 170, 330, -45, 290, 150, 265], stat: '+$2,360', statLabel: 'last 2 weeks', tint: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { name: 'Weight loss', Icon: Activity, good: { kind: 'lower' }, kind: 'line', values: [186.2, 185.8, 186.1, 185.4, 185.0, 185.3, 184.6, 184.9, 184.2, 183.8, 184.1, 183.5, 183.2, 182.8], stat: '−3.4 lb', statLabel: 'since start', tint: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  { name: 'Steps', Icon: Footprints, good: { kind: 'atLeast', value: 8000, label: '8,000+ is good' }, kind: 'bars', values: [7200, 9100, 6400, 11200, 8300, 12500, 5100, 8800, 9400, 7600, 10300, 6900, 13100, 9800], stat: '8,980', statLabel: 'daily average', tint: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  { name: 'Sleep', Icon: Moon, good: { kind: 'range', min: 7, max: 9, label: '7 to 9 h is good' }, kind: 'line', values: [6.5, 7.2, 6.8, 7.5, 7.0, 8.1, 7.6, 6.2, 7.4, 7.8, 7.1, 8.0, 7.7, 7.9], stat: '7.3 h', statLabel: 'average night', tint: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { name: 'Revenue', Icon: Store, good: { kind: 'higher' }, kind: 'bars', values: [820, 1150, 640, 980, 1420, 760, 1310, 890, 1240, 1580, 700, 1350, 1100, 1690], stat: '$15.6K', statLabel: 'this month', tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { name: 'Expenses', Icon: Receipt, good: { kind: 'atMost', value: 60, label: 'under $60 a day' }, kind: 'bars', values: [45, 120, 32, 18, 210, 64, 28, 90, 15, 58, 140, 22, 40, 35], stat: '$917', statLabel: 'this month', tint: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  { name: 'Screen time', Icon: Smartphone, good: { kind: 'atMost', value: 3, label: 'under 3 h is good' }, kind: 'bars', values: [4.2, 3.8, 5.1, 3.2, 2.9, 4.6, 3.5, 3.1, 2.7, 3.9, 2.5, 2.8, 2.2, 2.4], stat: '−1.8 h', statLabel: 'per day vs. last week', tint: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { name: 'Running', Icon: Timer, good: { kind: 'higher' }, kind: 'bars', values: [3.1, 0, 5.2, 0, 4.0, 8.5, 0, 3.4, 0, 6.1, 0, 4.2, 10.0, 0], stat: '52.5 mi', statLabel: 'this month', tint: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300' },
  { name: 'Savings', Icon: PiggyBank, good: { kind: 'higher' }, kind: 'line', values: [7820, 7860, 7900, 7850, 7980, 8020, 8050, 8010, 8150, 8200, 8240, 8180, 8320, 8450], stat: '$8,450', statLabel: 'balance', tint: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
  { name: 'Debt payoff', Icon: CreditCard, good: { kind: 'lower' }, kind: 'line', values: [6400, 6400, 6250, 6250, 6280, 6100, 6100, 5950, 5950, 5980, 5800, 5800, 5650, 5200], stat: '−$1,200', statLabel: 'paid off', tint: 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200' },
  { name: 'Study time', Icon: BookOpen, good: { kind: 'atLeast', value: 1.5, label: '1.5 h+ is good' }, kind: 'bars', values: [1.5, 2.0, 0.5, 1.0, 2.5, 3.0, 0, 1.5, 2.0, 1.0, 1.5, 2.5, 3.5, 0.5], stat: '23 h', statLabel: 'last 2 weeks', tint: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  { name: 'Mood', Icon: Smile, good: { kind: 'range', min: 7, max: 10, label: '7 or more is good' }, kind: 'line', values: [6, 7, 7, 5, 6, 8, 8, 7, 6, 7, 8, 9, 8, 8], stat: '7.1 / 10', statLabel: 'average', tint: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { name: 'Water', Icon: Droplet, good: { kind: 'atLeast', value: 2, label: '2 L+ is good' }, kind: 'bars', values: [1.8, 2.2, 2.5, 1.6, 2.0, 2.8, 2.4, 2.1, 1.9, 2.6, 2.3, 2.9, 2.0, 2.5], stat: '2.3 L', statLabel: 'daily average', tint: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  { name: 'Meditation', Icon: Brain, good: { kind: 'atLeast', value: 10, label: '10 min+ is good' }, kind: 'bars', values: [10, 15, 0, 10, 20, 15, 10, 0, 15, 20, 10, 25, 15, 20], stat: '13 min', statLabel: 'daily average', tint: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
];

const GOOD = 'fill-emerald-500 stroke-emerald-500 dark:fill-emerald-400 dark:stroke-emerald-400';
const BAD = 'fill-red-500 stroke-red-500 dark:fill-red-400 dark:stroke-red-400';

/**
 * Mini chart coloured by whether each value is good for this tracker. Thresholds and ranges are
 * drawn as a dashed line or a shaded band so the rule is visible.
 */
function MiniChart({ example }: { example: Example }) {
  const { values, kind, good: rule } = example;
  const W = 140;
  const H = 44;
  const pad = 3;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // Value-to-y scale, including the rule's reference values so lines and bands stay in view.
  const refs = rule.kind === 'range' ? [rule.min, rule.max] : rule.kind === 'atLeast' || rule.kind === 'atMost' ? [rule.value] : [];
  const lo = kind === 'bars' ? Math.min(0, ...values) : Math.min(...values, ...refs);
  const hi = Math.max(...values, ...refs);
  const y = (v: number) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - pad * 2);

  const reference = (() => {
    if (rule.kind === 'range') {
      const top = y(Math.min(rule.max, hi));
      return <rect x={0} y={top} width={W} height={Math.max(2, y(Math.max(rule.min, lo)) - top)} className="fill-emerald-500/10 dark:fill-emerald-400/10" />;
    }
    if (rule.kind === 'atLeast' || rule.kind === 'atMost') {
      return <line x1={0} x2={W} y1={y(rule.value)} y2={y(rule.value)} strokeDasharray="3 3" strokeWidth={1} className="stroke-slate-400 dark:stroke-slate-500" />;
    }
    return null;
  })();

  if (kind === 'bars') {
    const zeroY = y(0);
    const slot = W / values.length;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-11" aria-hidden>
        {reference}
        <line x1={0} x2={W} y1={zeroY} y2={zeroY} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={1} />
        {values.map((v, i) => {
          if (v === 0) return null;
          const good = isGood(rule, v, { avg, line: false });
          const top = Math.min(y(v), zeroY);
          const h = Math.max(1.5, Math.abs(y(v) - zeroY));
          return <rect key={i} x={i * slot + slot * 0.18} y={top} width={slot * 0.64} height={h} rx={1.5} className={cn(good ? GOOD : BAD, 'stroke-0')} />;
        })}
      </svg>
    );
  }

  const x = (i: number) => pad + (i * (W - pad * 2)) / (values.length - 1);
  const last = values[values.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-11" aria-hidden>
      {reference}
      {values.slice(1).map((v, i) => {
        const prev = values[i];
        const good = isGood(rule, v, { prev, avg, line: true });
        return <line key={i} x1={x(i)} y1={y(prev)} x2={x(i + 1)} y2={y(v)} strokeWidth={2} strokeLinecap="round" className={good ? GOOD : BAD} />;
      })}
      <circle cx={x(values.length - 1)} cy={y(last)} r={3} className={isGood(rule, last, { prev: values[values.length - 2], avg, line: true }) ? GOOD : BAD} />
    </svg>
  );
}

function ExampleCard({ example }: { example: Example }) {
  const { name, Icon, good, stat, statLabel, tint } = example;
  const RuleIcon = ruleIcon(good);
  return (
    <div className="w-[220px] shrink-0 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className={cn('inline-flex items-center justify-center w-9 h-9 rounded-xl', tint)}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{name}</div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <RuleIcon className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="truncate">{ruleLabel(good)}</span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <MiniChart example={example} />
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400">{stat}</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{statLabel}</span>
      </div>
    </div>
  );
}

/**
 * An endlessly scrolling strip of example trackers. Hovering pauses it; with reduced motion
 * it becomes a plain horizontally scrollable row.
 */
export function TemplateStrip() {
  return (
    <div
      className="group relative overflow-x-auto motion-safe:overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      aria-label="Example trackers from the 26 ready-made templates"
      role="region"
    >
      <style>{`
        @keyframes template-strip-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
      <div className="flex w-max gap-4 py-2 motion-safe:animate-[template-strip-scroll_70s_linear_infinite] group-hover:[animation-play-state:paused]">
        {[...examples, ...examples].map((example, i) => (
          <div key={i} aria-hidden={i >= examples.length || undefined}>
            <ExampleCard example={example} />
          </div>
        ))}
      </div>
    </div>
  );
}
