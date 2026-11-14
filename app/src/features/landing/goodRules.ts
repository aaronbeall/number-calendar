import { ArrowDownToLine, ArrowUpToLine, Crosshair, PlusCircle, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';

/** The different ways a tracker can define a good day, used by the landing page illustrations. */
export type GoodRule =
  | { kind: 'higher' }
  | { kind: 'lower' }
  | { kind: 'positive' }
  | { kind: 'range'; min: number; max: number; label: string }
  | { kind: 'atLeast'; value: number; label: string }
  | { kind: 'atMost'; value: number; label: string };

/**
 * Whether a value is good under a rule. `prev` is the day before (for lines) and `avg` is the
 * period average (for bars), which is how "higher" and "lower" are judged.
 */
export function isGood(rule: GoodRule, value: number, { prev, avg, line }: { prev?: number; avg: number; line: boolean }): boolean {
  const ref = line ? (prev ?? value) : avg;
  switch (rule.kind) {
    case 'higher': return value >= ref;
    case 'lower': return value <= ref;
    case 'positive': return value > 0;
    case 'range': return value >= rule.min && value <= rule.max;
    case 'atLeast': return value >= rule.value;
    case 'atMost': return value <= rule.value;
  }
}

export function ruleLabel(rule: GoodRule): string {
  switch (rule.kind) {
    case 'higher': return 'higher is better';
    case 'lower': return 'lower is better';
    case 'positive': return 'above zero is good';
    default: return rule.label;
  }
}

export function ruleIcon(rule: GoodRule): LucideIcon {
  switch (rule.kind) {
    case 'higher': return TrendingUp;
    case 'lower': return TrendingDown;
    case 'positive': return PlusCircle;
    case 'range': return Crosshair;
    case 'atLeast': return ArrowUpToLine;
    case 'atMost': return ArrowDownToLine;
  }
}
