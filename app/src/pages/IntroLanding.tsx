import { AppFooter } from '@/App';
import { ThemeToggle } from '@/AppHeader';
import LogoIcon from '@/assets/logo.png';
import { useTheme } from '@/components/ThemeProvider';
import { parseSeriesExpression } from '@/lib/expression';
import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Calculator,
  CalendarDays,
  Check,
  Download,
  Lock,
  Minus,
  Plus,
  Smartphone,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

// Screenshots captured from the real app with sample data, in light and dark variants.
const shotUrls = import.meta.glob('../assets/landing/*.webp', { eager: true, import: 'default' }) as Record<string, string>;

type ShotName =
  | 'calendar'
  | 'valence-pnl'
  | 'valence-weight'
  | 'chart'
  | 'month-summary'
  | 'year'
  | 'entry'
  | 'achievements'
  | 'dashboard'
  | 'phone-calendar'
  | 'phone-weight'
  | 'phone-entry'
  | 'phone-dashboard'
  | 'm-valence-pnl'
  | 'm-valence-weight'
  | 'm-report'
  | 'm-year';

function shotUrl(name: ShotName, dark: boolean) {
  return shotUrls[`../assets/landing/${name}-${dark ? 'dark' : 'light'}.webp`];
}

/**
 * A screenshot that follows the current theme, so dark-mode visitors see the dark app.
 * Pass `mobile` to swap in a phone-sized capture below the sm breakpoint (lazy images that are
 * display:none are not fetched, so each visitor only downloads one of the two).
 */
function Shot({ name, mobile, alt, className, eager }: { name: ShotName; mobile?: ShotName; alt: string; className?: string; eager?: boolean }) {
  const { isDark } = useTheme();
  const img = (shot: ShotName, extra?: string) => (
    <img
      src={shotUrl(shot, isDark)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('w-full h-auto', extra, className)}
    />
  );
  if (!mobile) return img(name, 'block');
  return (
    <>
      {img(mobile, 'block sm:hidden')}
      {img(name, 'hidden sm:block')}
    </>
  );
}

function BrowserFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10 dark:shadow-black/40', className)}>
      <div className="flex items-center gap-1.5 px-3 sm:px-4 h-7 sm:h-9 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80">
        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        <span className="ml-3 hidden sm:block text-[11px] text-slate-400 dark:text-slate-500 truncate">numbers.metamodernmonkey.com</span>
      </div>
      {children}
    </div>
  );
}

function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[2rem] p-[7px] bg-slate-900 dark:bg-slate-700 shadow-2xl shadow-slate-900/25 dark:shadow-black/50 ring-1 ring-slate-900/10', className)}>
      <div className="rounded-[1.6rem] overflow-hidden bg-white dark:bg-slate-900">{children}</div>
    </div>
  );
}

/** Rounded card for a cropped piece of the UI. */
function ShotCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-lg shadow-slate-900/5 dark:shadow-black/30', className)}>
      {children}
    </div>
  );
}

function Eyebrow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
      {icon}
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, icon, title, children }: { eyebrow: string; icon: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <Eyebrow icon={icon}>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">{title}</h2>
      {children && <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">{children}</p>}
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const fmtSigned = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));

/** Live demo: the same week of numbers, coloured by which direction is good. */
function ValenceDemo() {
  const [lowerIsBetter, setLowerIsBetter] = useState(true);
  const days = [
    { day: 'Mon', value: 184.2 },
    { day: 'Tue', value: 183.6 },
    { day: 'Wed', value: 184.1 },
    { day: 'Thu', value: 183.2 },
    { day: 'Fri', value: 182.8 },
    { day: 'Sat', value: 183.3 },
    { day: 'Sun', value: 182.4 },
  ];
  const prior = 184.6;
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-lg shadow-slate-900/5 dark:shadow-black/30">
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">One week of weigh-ins</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Same numbers. Flip what counts as good.</div>
        </div>
        <div role="radiogroup" aria-label="Which direction is good" className="inline-flex p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium self-start">
          {[
            { label: 'Higher is better', value: false, Icon: TrendingUp },
            { label: 'Lower is better', value: true, Icon: TrendingDown },
          ].map(({ label, value, Icon }) => (
            <button
              key={label}
              role="radio"
              aria-checked={lowerIsBetter === value}
              onClick={() => setLowerIsBetter(value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer',
                lowerIsBetter === value
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-1 sm:gap-2">
        {days.map(({ day, value }, i) => {
          const delta = Math.round((value - (i === 0 ? prior : days[i - 1].value)) * 10) / 10;
          const good = lowerIsBetter ? delta < 0 : delta > 0;
          return (
            <div
              key={day}
              className={cn(
                'rounded-lg px-0.5 py-2 sm:py-3 text-center border transition-colors duration-300',
                good
                  ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800/70'
                  : 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800/60'
              )}
            >
              <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{day}</div>
              <div className={cn('mt-1 font-mono font-bold text-[11px] sm:text-base transition-colors duration-300', good ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                {value.toFixed(1)}
              </div>
              <div className={cn('font-mono text-[9px] sm:text-[11px] transition-colors duration-300', good ? 'text-emerald-600/80 dark:text-emerald-500' : 'text-red-500/80 dark:text-red-400/80')}>
                {fmtSigned(delta)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
        Week: <span className={cn('font-mono font-semibold', lowerIsBetter ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>−2.2 lb</span>{' '}
        {lowerIsBetter ? 'is a great week if you are cutting.' : 'is a bad week if you are bulking.'}
      </div>
    </div>
  );
}

/** Live demo: type a day as math and watch it become entries and stats. */
function ExpressionDemo() {
  const [expr, setExpr] = useState('420+440-315+145');
  const numbers = useMemo(() => parseSeriesExpression(expr) ?? [], [expr]);
  const total = numbers.reduce((a, b) => a + b, 0);
  const examples = ['420+440-315+145', '1200-85-40', '3500+2800+4100'];
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-lg shadow-slate-900/5 dark:shadow-black/30">
      <label htmlFor="expression-demo" className="text-sm font-semibold text-slate-900 dark:text-white">Try it: type a day</label>
      <input
        id="expression-demo"
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        className="mt-2 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-4 py-3 font-mono text-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
      />
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => setExpr(ex)}
            className="px-2 py-1 rounded-md font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {ex}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5 min-h-8" aria-live="polite">
        {numbers.map((n, i) => (
          <span
            key={`${i}-${n}`}
            className={cn(
              'px-2.5 py-1 rounded-full font-mono text-sm font-semibold text-white',
              n > 0 ? 'bg-emerald-600' : n < 0 ? 'bg-red-600' : 'bg-slate-500'
            )}
          >
            {fmt(n)}
          </span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Entries', value: String(numbers.length), tone: 'neutral' },
          { label: 'Total', value: numbers.length ? fmt(total) : '–', tone: total > 0 ? 'good' : total < 0 ? 'bad' : 'neutral' },
          { label: 'Best', value: numbers.length ? fmt(Math.max(...numbers)) : '–', tone: 'neutral' },
        ].map(({ label, value, tone }) => (
          <div key={label} className="rounded-lg bg-slate-50 dark:bg-slate-800/70 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
            <div className={cn(
              'font-mono text-lg font-bold',
              tone === 'good' && 'text-emerald-700 dark:text-emerald-400',
              tone === 'bad' && 'text-red-600 dark:text-red-400',
              tone === 'neutral' && 'text-slate-900 dark:text-white'
            )}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Cell = true | false | string;

const comparisonRows: { label: string; cells: [Cell, Cell, Cell, Cell] }[] = [
  { label: 'Any number, as many per day as you like', cells: [true, 'Mostly yes/no', 'Trades only', true] },
  { label: 'Week, month and year stats out of the box', cells: ['You build them', 'Streaks', true, true] },
  { label: 'Knows whether up or down is good', cells: ['You write colour rules', false, 'Assumes profit', true] },
  { label: 'Calendar view with charts', cells: ['You build it', true, true, true] },
  { label: 'Free, with no caps', cells: [true, 'About 3 habits free', '$30–$99 a month', true] },
  { label: 'No account needed', cells: ['Depends', 'Usually needs one', false, true] },
];

const comparisonColumns = ['Spreadsheet', 'Habit tracker', 'Trading journal', 'Numbers Go Up'];

function ComparisonCell({ value, highlight, compact }: { value: Cell; highlight?: boolean; compact?: boolean }) {
  if (value === true) {
    return (
      <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full', highlight ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400')}>
        <Check className="w-3.5 h-3.5" strokeWidth={3} aria-label="Yes" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <X className="w-3.5 h-3.5" strokeWidth={3} aria-label="No" />
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-start gap-1 text-slate-500 dark:text-slate-400', compact ? 'text-xs' : 'text-sm')}>
      <Minus className="w-3 h-3 mt-1 shrink-0 text-amber-500" aria-hidden />
      {value}
    </span>
  );
}

const useCases = [
  { name: 'Trading P&L', note: 'higher is better' },
  { name: 'Weight loss', note: 'lower is better' },
  { name: 'Steps', note: 'higher is better' },
  { name: 'Sleep hours', note: 'higher is better' },
  { name: 'Revenue', note: 'higher is better' },
  { name: 'Expenses', note: 'lower is better' },
  { name: 'Screen time', note: 'lower is better' },
  { name: 'Running distance', note: 'higher is better' },
  { name: 'Savings', note: 'higher is better' },
  { name: 'Debt payoff', note: 'lower is better' },
  { name: 'Study time', note: 'higher is better' },
  { name: 'Mood', note: 'higher is better' },
];

export function IntroLanding({ hasExistingData, onOpenCreate }: { hasExistingData: boolean; onOpenCreate: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const goToDashboard = () => {
    searchParams.delete('intro');
    setSearchParams(searchParams);
  };
  const ctaLabel = hasExistingData ? 'Create a new calendar' : 'Start tracking free';

  const PrimaryCta = ({ className }: { className?: string }) => (
    <button
      onClick={onOpenCreate}
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-emerald-950 font-semibold px-6 py-3.5 shadow-lg shadow-emerald-600/25 transition-colors cursor-pointer',
        className
      )}
    >
      <Plus className="w-5 h-5" />
      {ctaLabel}
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <a href="#top" className="flex items-center gap-2 min-w-0">
            <img src={LogoIcon} alt="" className="w-8 h-8 shrink-0" />
            <span className="font-bold text-base sm:text-lg truncate" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Numbers Go Up</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 ml-8 text-sm text-slate-600 dark:text-slate-300">
            <a href="#direction" className="hover:text-slate-900 dark:hover:text-white">How it works</a>
            <a href="#why" className="hover:text-slate-900 dark:hover:text-white">Why it exists</a>
            <a href="#mobile" className="hover:text-slate-900 dark:hover:text-white">On your phone</a>
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {hasExistingData && (
              <button onClick={goToDashboard} className="hidden sm:inline-flex text-sm font-medium px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                Your dashboard
              </button>
            )}
            <button onClick={onOpenCreate} className="text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 cursor-pointer whitespace-nowrap">
              {hasExistingData ? 'New calendar' : 'Start free'}
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero */}
        <section className="relative">
          <div className="absolute inset-x-0 top-0 h-[640px] bg-gradient-to-b from-emerald-50/80 via-white to-white dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 px-3 py-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              A calendar for numberphiles
            </div>
            <h1 className="mt-5 mx-auto max-w-4xl text-[2.5rem] leading-[1.08] sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Every day's numbers, on a calendar that knows{' '}
              <span className="text-emerald-600 dark:text-emerald-400">good</span> from{' '}
              <span className="text-red-500 dark:text-red-400">bad</span>.
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-lg sm:text-xl leading-relaxed text-slate-600 dark:text-slate-300 text-pretty">
              Log your P&amp;L, your weight, your steps or any number you care about. Numbers Go Up totals every week, month and year, and colours each day by whether it moved the right way.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <PrimaryCta />
              <a href="#direction" className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                See how it works
                <ArrowDown className="w-4 h-4" />
              </a>
            </div>
            {hasExistingData && (
              <button onClick={goToDashboard} className="sm:hidden mt-4 text-sm text-slate-600 dark:text-slate-400 underline cursor-pointer">
                Continue to your data
              </button>
            )}
            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              {['Free, no caps', 'No account', 'Your data stays in your browser'].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero visual: desktop app with phone alongside; phone only on small screens */}
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 mt-12 sm:mt-16">
            <div className="hidden sm:block relative pr-0 md:pr-24 lg:pr-32">
              <BrowserFrame>
                <div className="relative max-h-[560px] lg:max-h-[640px] overflow-hidden">
                  <Shot name="calendar" eager alt="Numbers Go Up month calendar for a Trading P&L dataset: green and red days, weekly totals and a month heatmap" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
                </div>
              </BrowserFrame>
              <PhoneFrame className="hidden md:block absolute right-0 -bottom-10 w-[200px] lg:w-[240px]">
                <Shot name="phone-calendar" eager alt="The same calendar on a phone" />
              </PhoneFrame>
            </div>
            <div className="sm:hidden flex justify-center">
              <PhoneFrame className="w-[78%] max-w-[300px]">
                <Shot name="phone-calendar" eager alt="Numbers Go Up month calendar on a phone, with green and red days and weekly totals" />
              </PhoneFrame>
            </div>
          </div>
        </section>

        {/* Direction / valence: the unique bit */}
        <section id="direction" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32">
          <SectionHeading
            eyebrow="The part nobody else does"
            icon={<TrendingUp className="w-4 h-4" />}
            title={<>Up isn't always good. Numbers Go Up knows the difference.</>}
          >
            Every calendar knows its direction: higher is better, lower is better, or neutral. The colours, records and goals all follow from it, so a $300 day is green on your trading calendar and a 1 lb drop is green on your scale.
          </SectionHeading>

          <div className="mt-10 grid lg:grid-cols-5 gap-6 lg:gap-10 items-start">
            <div className="lg:col-span-2 lg:sticky lg:top-24">
              <ValenceDemo />
            </div>
            <div className="lg:col-span-3 grid gap-5">
              <figure>
                <ShotCard><Shot name="valence-pnl" mobile="m-valence-pnl" alt="Trading P&L weeks: profitable days in green, losing days in red" /></ShotCard>
                <figcaption className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span><span className="font-semibold text-slate-900 dark:text-white">Trading P&amp;L</span>, higher is better. Weekly totals add up on every row.</span>
                </figcaption>
              </figure>
              <figure>
                <ShotCard><Shot name="valence-weight" mobile="m-valence-weight" alt="Weight weeks: days the scale went down in green, days it went up in red" /></ShotCard>
                <figcaption className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span><span className="font-semibold text-slate-900 dark:text-white">Weight</span>, lower is better. The scale going down is the green day.</span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* Expression entry */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <SectionHeading
                eyebrow="Fast entry"
                icon={<Calculator className="w-4 h-4" />}
                title="Type a day the way you'd say it."
              >
                Enter a day as plain math. Four trades become <code className="font-mono text-[0.9em] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">420+440-315+145</code>, three walks become one line, and every stat updates as you type. No cell per value, no formulas.
              </SectionHeading>
              <div className="mt-8">
                <ExpressionDemo />
              </div>
            </div>
            <figure className="flex justify-center lg:justify-end lg:pt-10">
              <ShotCard className="w-full max-w-[380px]">
                <Shot name="entry" alt="The day editor: an expression input, the entries it produced, and that day's total, mean, median, min, max and achievements" />
              </ShotCard>
            </figure>
          </div>
        </section>

        {/* The calendar is the report */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32">
          <SectionHeading
            eyebrow="Zero setup"
            icon={<BarChart3 className="w-4 h-4" />}
            title="The calendar is the report."
          >
            Totals, averages, medians, best and worst days for every week, month and year, with a chart under every month. The analysis you'd build in a spreadsheet is already there on day one.
          </SectionHeading>

          <div className="mt-10 grid lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 grid gap-5 content-start">
              <figure className="sm:hidden">
                <ShotCard><Shot name="m-report" alt="Month summary with mean, median, min, max and total, above a bar chart of each day" /></ShotCard>
                <figcaption className="mt-2 text-sm text-slate-600 dark:text-slate-400">A summary for every month, and every day as a bar.</figcaption>
              </figure>
              <figure className="hidden sm:block">
                <ShotCard><Shot name="month-summary" alt="Month summary bar: mean, median, min, max and total for October" /></ShotCard>
                <figcaption className="mt-2 text-sm text-slate-600 dark:text-slate-400">A summary for every month, with the change from last month.</figcaption>
              </figure>
              <figure className="hidden sm:block">
                <ShotCard><Shot name="chart" alt="Bar chart of each day in the month, green above zero and red below" /></ShotCard>
                <figcaption className="mt-2 text-sm text-slate-600 dark:text-slate-400">Every day as a bar, or switch to the running total.</figcaption>
              </figure>
              <figure>
                <ShotCard className="max-h-[520px] sm:max-h-none"><Shot name="dashboard" mobile="phone-dashboard" alt="Dashboard with cards for Trading P&L, Sleep and Steps, each showing totals and a trend line" /></ShotCard>
                <figcaption className="mt-2 text-sm text-slate-600 dark:text-slate-400">All your numbers side by side on one dashboard.</figcaption>
              </figure>
            </div>
            <figure className="lg:col-span-2">
              <ShotCard><Shot name="year" mobile="m-year" alt="Year view: a card per month with totals, mini heatmaps and stats, and the year total" /></ShotCard>
              <figcaption className="mt-2 text-sm text-slate-600 dark:text-slate-400">The whole year at a glance, with records marked.</figcaption>
            </figure>
          </div>
        </section>

        {/* Why it exists: soft comparison */}
        <section id="why" className="scroll-mt-20 mt-24 sm:mt-32 bg-slate-50 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
            <SectionHeading
              eyebrow="Why this exists"
              icon={<CalendarDays className="w-4 h-4" />}
              title="You could keep using a spreadsheet."
            />
            <div className="mt-4 max-w-3xl space-y-4 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                Most people who track a number every day already do, and spreadsheets can do anything. But you build the calendar, the weekly totals, the colour rules and the charts yourself, and they're a pain on a phone.
              </p>
              <p>
                Habit apps are lovely if the answer is yes or no. Trading journals are great if you want trade-by-trade analytics and are happy to pay for them. Numbers Go Up sits in between: <span className="font-semibold text-slate-900 dark:text-white">the spreadsheet you wish you'd built</span>, ready the moment you open it.
              </p>
            </div>

            {/* Phones: one card per question */}
            <ul className="mt-8 grid gap-3 sm:hidden">
              {comparisonRows.map((row) => (
                <li key={row.label} className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{row.label}</div>
                    <ComparisonCell value={row.cells[3]} highlight />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2">
                    {comparisonColumns.slice(0, 3).map((col, i) => (
                      <div key={col} className="min-w-0">
                        <dt className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">{col}</dt>
                        <dd className="mt-1"><ComparisonCell value={row.cells[i]} compact /></dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>

            <div className="mt-10 hidden sm:block">
              <div>
                <table className="w-full text-left border-separate border-spacing-0 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900">
                  <thead>
                    <tr>
                      <th className="p-3 sm:p-4 text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/80 w-[30%]"><span className="sr-only">Feature</span></th>
                      {comparisonColumns.map((c, i) => (
                        <th
                          key={c}
                          className={cn(
                            'p-3 sm:p-4 text-sm font-semibold border-b border-slate-200 dark:border-slate-700/80',
                            i === 3 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'
                          )}
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, r) => (
                      <tr key={row.label}>
                        <th scope="row" className={cn('p-3 sm:p-4 text-sm font-medium text-slate-800 dark:text-slate-200', r < comparisonRows.length - 1 && 'border-b border-slate-100 dark:border-slate-800')}>
                          {row.label}
                        </th>
                        {row.cells.map((cell, i) => (
                          <td
                            key={i}
                            className={cn(
                              'p-3 sm:p-4 align-middle',
                              r < comparisonRows.length - 1 && 'border-b border-slate-100 dark:border-slate-800',
                              i === 3 && 'bg-emerald-50/70 dark:bg-emerald-950/30'
                            )}
                          >
                            <ComparisonCell value={cell} highlight={i === 3} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Typical of each kind of tool; individual apps vary. If you want data pulled in automatically from devices or a broker, those tools do that better.
            </p>
          </div>
        </section>

        {/* Use cases */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32">
          <SectionHeading
            eyebrow="Whatever you count"
            icon={<Sparkles className="w-4 h-4" />}
            title="If it's a number, track it here."
          >
            Start from one of 26 ready-made templates, each with the right direction already set, or make your own. Keep as many calendars as you like.
          </SectionHeading>
          <ul className="mt-8 flex flex-wrap gap-2">
            {useCases.map(({ name, note }) => {
              const lower = note.startsWith('lower');
              return (
                <li key={name} className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3 pr-3.5 py-1.5 text-sm">
                  {lower
                    ? <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    : <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  <span className="font-medium text-slate-800 dark:text-slate-100">{name}</span>
                  <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">{note}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Goals */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="lg:order-2">
              <SectionHeading
                eyebrow="Wins worth chasing"
                icon={<Trophy className="w-4 h-4" />}
                title="Set targets, hit milestones, break records."
              >
                The goal builder looks at your history and suggests targets you can actually hit. Records and achievements unlock as you go, so a chore you'd log in a spreadsheet starts to feel like a game.
              </SectionHeading>
              <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-300">
                {['Daily, weekly and monthly targets', 'One-time milestones', 'Best and worst day records', 'Badges with an unlock celebration'].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <figure className="lg:order-1">
              <ShotCard className="relative max-h-[520px]">
                <Shot name="achievements" alt="Achievements page with earned badges like Positive Week, 5 Positive Months and 2-Month Streak" />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
              </ShotCard>
            </figure>
          </div>
        </section>

        {/* Mobile */}
        <section id="mobile" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32">
          <SectionHeading
            eyebrow="On your phone"
            icon={<Smartphone className="w-4 h-4" />}
            title="Log it in seconds, wherever you are."
          >
            Numbers Go Up works in your phone's browser with nothing to install. Swipe between months, tap a day, type the number.
          </SectionHeading>
          <div className="mt-10 -mx-4 px-4 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-3 gap-5 sm:gap-8 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pt-2 pb-8">
            {([
              { name: 'phone-calendar', caption: 'Trading P&L by the month', alt: 'Trading P&L calendar on a phone' },
              { name: 'phone-entry', caption: 'Type a day, see its stats', alt: 'Day editor on a phone with entries and stats' },
              { name: 'phone-weight', caption: 'Weight, where down is green', alt: 'Weight calendar on a phone, with lower days in green' },
            ] as { name: ShotName; caption: string; alt: string }[]).map(({ name, caption, alt }) => (
              <figure key={name} className="snap-center shrink-0 w-[68%] sm:w-auto max-w-[300px] mx-auto">
                <PhoneFrame><Shot name={name} alt={alt} /></PhoneFrame>
                <figcaption className="mt-3 text-center text-sm text-slate-600 dark:text-slate-400">{caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-slate-900 border border-slate-800 px-6 py-14 sm:px-12 sm:py-16 text-center">
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
            <h2 className="relative text-3xl sm:text-5xl font-bold tracking-tight text-white text-balance" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Your numbers are going somewhere. <span className="text-emerald-400">See where.</span>
            </h2>
            <p className="relative mt-4 mx-auto max-w-xl text-slate-300">
              Pick a template, type today's number, and the calendar does the rest.
            </p>
            <div className="relative mt-8 flex justify-center">
              <PrimaryCta className="w-full sm:w-auto" />
            </div>
            <ul className="relative mt-8 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-sm text-slate-300 text-left sm:text-center">
              <li className="flex sm:flex-col items-center gap-2"><Check className="w-5 h-5 text-emerald-400 shrink-0" />Free, no limits on calendars or history</li>
              <li className="flex sm:flex-col items-center gap-2"><Lock className="w-5 h-5 text-emerald-400 shrink-0" />No account; your data stays in your browser</li>
              <li className="flex sm:flex-col items-center gap-2"><Download className="w-5 h-5 text-emerald-400 shrink-0" />Import and export CSV or JSON any time</li>
            </ul>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
