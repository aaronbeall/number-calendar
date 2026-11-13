import { AppFooter } from '@/App';
import { ThemeToggle } from '@/AppHeader';
import LogoIcon from '@/assets/logo.png';
import { useTheme } from '@/components/ThemeProvider';
import { parseSeriesExpression } from '@/lib/expression';
import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowRight,
  Calculator,
  Check,
  Download,
  Flag,
  LineChart,
  Lock,
  Medal,
  PartyPopper,
  Plus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HeroHeatmap } from '@/features/landing/HeroHeatmap';
import { TemplateStrip } from '@/features/landing/TemplateStrip';

// Screenshots captured from the real app with sample data, in light and dark variants.
// See scripts/landing-screenshots to regenerate them.
const shotUrls = import.meta.glob('../assets/landing/*.webp', { eager: true, import: 'default' }) as Record<string, string>;

type ShotName =
  | 'calendar'
  | 'phone-calendar'
  | 'week-pnl'
  | 'week-weight'
  | 'm-week-pnl'
  | 'm-week-weight'
  | 'entry'
  | 'celebrate'
  | 'm-celebrate'
  | 'targets'
  | 'an-projections'
  | 'an-deviation'
  | 'an-momentum'
  | 'm-an-projections'
  | 'm-an-momentum';

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
    <div className={cn('rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-lg shadow-slate-900/5 dark:shadow-black/30', className)}>
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, icon, title, children, center }: { eyebrow: string; icon: ReactNode; title: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <div className={cn('max-w-2xl', center && 'mx-auto text-center')}>
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
        {icon}
        {eyebrow}
      </div>
      <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white text-balance" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{title}</h2>
      {children && <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300 text-pretty">{children}</p>}
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

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

const wins = [
  { Icon: Target, title: 'Targets', text: 'Daily, weekly and monthly goals, suggested from your own history.' },
  { Icon: Flag, title: 'Milestones', text: 'Big totals to reach, with a badge for each one along the way.' },
  { Icon: Medal, title: 'Records', text: 'Best days, weeks and months, marked right on the calendar.' },
  { Icon: Trophy, title: 'Achievements', text: 'Streaks and badges that unlock with a little celebration.' },
];

export function IntroLanding({ hasExistingData, onOpenCreate }: { hasExistingData: boolean; onOpenCreate: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const goToDashboard = () => {
    searchParams.delete('intro');
    setSearchParams(searchParams);
  };
  const ctaLabel = hasExistingData ? 'Create a new calendar' : 'Start tracking free';

  const primaryCta = (className?: string) => (
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
            <a href="#how" className="hover:text-slate-900 dark:hover:text-white">How it works</a>
            <a href="#wins" className="hover:text-slate-900 dark:hover:text-white">Wins</a>
            <a href="#insights" className="hover:text-slate-900 dark:hover:text-white">Insights</a>
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
          <HeroHeatmap />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 text-center">
            <p className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              A calendar for numberphiles
            </p>
            <h1 className="mt-3 mx-auto max-w-4xl text-[2.5rem] leading-[1.08] sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Every day's numbers, on a calendar that knows{' '}
              <span className="text-emerald-600 dark:text-emerald-400">good</span> from{' '}
              <span className="text-red-500 dark:text-red-400">bad</span>.
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-lg sm:text-xl leading-relaxed text-slate-600 dark:text-slate-300 text-pretty">
              All the power of a tracking spreadsheet with none of the setup: a free calendar for any number, with stats, goals and colours that know whether up or down is good.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              {primaryCta()}
              <a href="#how" className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
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

        {/* Any number + direction */}
        <section id="how" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32">
          <SectionHeading
            eyebrow="Any number"
            icon={<TrendingUp className="w-4 h-4" />}
            title="Track anything. It knows which way is up."
          >
            Tell each calendar whether higher or lower is better, and every day, week and record is coloured to match.
          </SectionHeading>

          <div className="mt-10 grid md:grid-cols-2 gap-6">
            <figure>
              <figcaption className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50"><TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /></span>
                Trading P&amp;L
                <span className="font-normal text-slate-500 dark:text-slate-400">higher is better</span>
              </figcaption>
              <ShotCard><Shot name="week-pnl" mobile="m-week-pnl" alt="One week of Trading P&L: profitable days in green, a losing day in red, and the weekly total" /></ShotCard>
            </figure>
            <figure>
              <figcaption className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50"><TrendingDown className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /></span>
                Weight
                <span className="font-normal text-slate-500 dark:text-slate-400">lower is better</span>
              </figcaption>
              <ShotCard><Shot name="week-weight" mobile="m-week-weight" alt="One week of weigh-ins: days the scale went down in green, days it went up in red" /></ShotCard>
            </figure>
          </div>

          <div className="mt-10 relative left-1/2 -translate-x-1/2 w-screen max-w-[1600px]">
            <TemplateStrip />
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">26 ready-made templates with the direction already set, or make your own.</p>
        </section>

        {/* Expression entry */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <SectionHeading
                eyebrow="Fast entry"
                icon={<Calculator className="w-4 h-4" />}
                title="Type a day the way you'd say it."
              >
                Plain math, as many numbers as you like. Every stat updates as you type.
              </SectionHeading>
              <div className="mt-8">
                <ExpressionDemo />
              </div>
            </div>
            <figure className="flex justify-center lg:justify-end">
              <ShotCard className="w-full max-w-[380px]">
                <Shot name="entry" alt="The day editor: an expression, the entries it produced, that day's total, mean, median, min and max, and the achievements it earned" />
              </ShotCard>
            </figure>
          </div>
        </section>

        {/* Celebrating wins */}
        <section id="wins" className="scroll-mt-20 mt-24 sm:mt-32 py-20 sm:py-28 bg-gradient-to-b from-amber-50/70 via-white to-white dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950 border-t border-amber-100 dark:border-amber-900/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionHeading
              center
              eyebrow="Wins worth chasing"
              icon={<PartyPopper className="w-4 h-4 text-amber-500" />}
              title="Every good day gets a celebration."
            >
              Hit a target, pass a milestone or set a record, and Numbers Go Up makes a moment of it.
            </SectionHeading>

            <figure className="mt-10 mx-auto max-w-4xl">
              <ShotCard className="shadow-2xl shadow-amber-900/10 dark:shadow-black/50 border-amber-200/70 dark:border-slate-700">
                <Shot name="celebrate" mobile="m-celebrate" alt="Achievement unlocked: the Seeker badge for reaching a 47,000 total, with four more new badges lined up and a 10 Weekly Targets toast" />
              </ShotCard>
            </figure>

            <div className="mt-12 grid lg:grid-cols-5 gap-8 lg:gap-12 items-center">
              <ul className="lg:col-span-2 grid sm:grid-cols-2 lg:grid-cols-1 gap-5">
                {wins.map(({ Icon, title, text }) => (
                  <li key={title} className="flex gap-3">
                    <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{title}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{text}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <figure className="hidden sm:block lg:col-span-3">
                <ShotCard><Shot name="targets" alt="Daily, weekly and monthly target badges, completed 102, 19 and 4 times" /></ShotCard>
              </figure>
            </div>
          </div>
        </section>

        {/* Analysis */}
        <section id="insights" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
          <SectionHeading
            eyebrow="Insights"
            icon={<LineChart className="w-4 h-4" />}
            title="See where your numbers are heading."
          >
            When you want to dig in, the analysis page has projections, momentum, deviation and more for any time range.
          </SectionHeading>

          <div className="mt-10 grid lg:grid-cols-2 gap-5">
            <figure className="lg:row-span-2">
              <ShotCard><Shot name="an-projections" mobile="m-an-projections" alt="Projections chart: the running total so far and projected high, low and expected totals for the next 12 months, with milestones marked" /></ShotCard>
              <figcaption className="mt-2 text-sm text-slate-600 dark:text-slate-400">Projections show when you'll hit your next milestone.</figcaption>
            </figure>
            <figure>
              <ShotCard><Shot name="an-momentum" mobile="m-an-momentum" alt="Momentum quadrant: each month plotted by level and change, grouped into growth, peak, decline and trough" /></ShotCard>
              <figcaption className="mt-2 text-sm text-slate-600 dark:text-slate-400">Momentum sorts every month into growth, peak, decline or trough.</figcaption>
            </figure>
            <figure className="hidden sm:block">
              <ShotCard><Shot name="an-deviation" alt="Monthly deviation chart: how far each month landed above or below its six-month average" /></ShotCard>
              <figcaption className="mt-2 text-sm text-slate-600 dark:text-slate-400">Deviation shows which months beat your average.</figcaption>
            </figure>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 px-6 py-14 sm:px-12 sm:py-16 text-center">
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
            <Sparkles className="relative mx-auto w-8 h-8 text-purple-300" />
            <h2 className="relative mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-white text-balance" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Your numbers are going somewhere. <span className="text-emerald-400">See where.</span>
            </h2>
            <div className="relative mt-8 flex justify-center">
              {primaryCta('w-full sm:w-auto')}
            </div>
            <ul className="relative mt-8 flex flex-col sm:flex-row flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-slate-300">
              <li className="inline-flex items-center justify-center gap-2"><Check className="w-4 h-4 text-emerald-400" />Free, no limits</li>
              <li className="inline-flex items-center justify-center gap-2"><Lock className="w-4 h-4 text-emerald-400" />No account, data stays in your browser</li>
              <li className="inline-flex items-center justify-center gap-2"><Download className="w-4 h-4 text-emerald-400" />CSV and JSON import and export</li>
            </ul>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
