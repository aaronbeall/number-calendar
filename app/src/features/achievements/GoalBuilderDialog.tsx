import { useState } from 'react';
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, Sparkles, Target, Flag, Trophy, Check, Calendar, TrendingUp, Hash, Info, ArrowUp, ArrowDown } from 'lucide-react';
import { generateGoals, type GoalBuilderInput, type GeneratedGoals } from '@/lib/goals-builder';
import { formatValue } from '@/lib/goals';
import { AchievementBadge } from './AchievementBadge';
import type { Dataset, Goal } from '@/features/db/localdb';
import { createGoal } from '@/features/db/localdb';
import { useAllDays } from '@/features/db/useCalendarData';
import { cn } from '@/lib/utils';
import { capitalize, adjectivize } from '@/lib/utils';
import { getValueForValence, isBad } from '@/lib/valence';

type GoalBuilderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: Dataset;
  onComplete: () => void;
};

type Step = 'period' | 'activity' | 'preview';

export function GoalBuilderDialog({ open, onOpenChange, dataset, onComplete }: GoalBuilderDialogProps) {
  const [step, setStep] = useState<Step>('period');
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | ''>('');
  const [goodValue, setGoodValue] = useState<string>('');
  const [startingValue, setStartingValue] = useState<string>('');
  const [valueType, setValueType] = useState<'' | 'period-total' | 'alltime-total' | 'period-change' | 'alltime-target'>('');
  const [targetDays, setTargetDays] = useState<string>(''); // Stored in days
  const [timePeriodUnit, setTimePeriodUnit] = useState<'days' | 'weeks' | 'months'>('days');
  const [activePeriods, setActivePeriods] = useState<string>('');
  const [activityDraft, setActivityDraft] = useState<number | null>(null);
  const [generatedGoals, setGeneratedGoals] = useState<GeneratedGoals | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());

  // Load all days to calculate current total/last value
  const { data: allDays = [] } = useAllDays(dataset.id);
  
  // Calculate current value based on tracking type
  const currentValue = React.useMemo(() => {
    if (allDays.length === 0) return 0;
    if (dataset.tracking === 'series') {
      // Sum all numbers for total
      return allDays.reduce((sum, day) => sum + day.numbers.reduce((s, n) => s + n, 0), 0);
    } else {
      // Get last close value for trend
      const lastDay = allDays[allDays.length - 1];
      return lastDay?.numbers[lastDay.numbers.length - 1] ?? 0;
    }
  }, [allDays, dataset.tracking]);

  const exampleAmount = getValueForValence(1, dataset.valence, {
    good: 100,
    bad: -100,
    neutral: 100,
  });
  const exampleChange = getValueForValence(1, dataset.valence, {
    good: 10,
    bad: -10,
    neutral: 10,
  });
  const exampleAmountLabel = formatValue(exampleAmount);
  const exampleChangeLabel = formatValue(exampleChange, { delta: true });
  const parsedStartingValue = Number.isFinite(parseFloat(startingValue)) ? parseFloat(startingValue) : undefined;
  const allTimePriorValue = parsedStartingValue ?? currentValue;
  
  // Convert time period for display
  const timePeriodDisplayValue = React.useMemo(() => {
    const days = parseFloat(targetDays);
    if (!days || isNaN(days)) return '';
    if (timePeriodUnit === 'days') return String(Math.round(days));
    if (timePeriodUnit === 'weeks') return String(Math.round(days / 7));
    if (timePeriodUnit === 'months') return String(Math.round(days / 30));
    return '';
  }, [targetDays, timePeriodUnit]);
  
  const handleTimePeriodDisplayChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!numValue || isNaN(numValue)) {
      setTargetDays('');
      return;
    }
    if (timePeriodUnit === 'days') setTargetDays(String(Math.round(numValue)));
    if (timePeriodUnit === 'weeks') setTargetDays(String(Math.round(numValue * 7)));
    if (timePeriodUnit === 'months') setTargetDays(String(Math.round(numValue * 30)));
  };
  const allTimeTotalExample = allTimePriorValue + exampleAmount;
  const allTimeTargetExample = allTimePriorValue + exampleChange;
  const activityPrompt =
    period === 'day'
      ? 'How many days per week will you typically record data?'
      : period === 'week'
        ? 'How many weeks per month will you typically record data?'
        : period === 'month'
          ? 'How many months per year will you typically record data?'
          : '';
  const activitySummaryLabel =
    period === 'day'
      ? 'days per week'
      : period === 'week'
        ? 'weeks per month'
        : period === 'month'
          ? 'months per year'
          : '';
  const activityDefaultValue =
    period === 'day'
      ? 5
      : period === 'week'
        ? 3
        : period === 'month'
          ? 10
          : 1;
  const activityMax =
    period === 'day'
      ? 7
      : period === 'week'
        ? 4
        : period === 'month'
          ? 12
          : 0;
  const activityValue = activePeriods
    ? Math.max(1, Math.min(activityMax, parseInt(activePeriods, 10) || activityDefaultValue))
    : activityDefaultValue;
  const activitySliderValue = activityDraft ?? activityValue;
  const activityDisplayValue = Math.max(1, Math.min(activityMax, Math.round(activitySliderValue)));
  const activitySummaryValue = activePeriods
    ? Math.max(1, Math.min(activityMax, parseInt(activePeriods, 10) || activityDisplayValue))
    : activityDisplayValue;

  const handlePeriodSelect = (value: 'day' | 'week' | 'month') => {
    setPeriod(value);
    // Reset defaults when period changes
    setValueType('');
    setActivePeriods(value === 'day' ? '5' : value === 'week' ? '3' : '10');
    
    // Set time period unit and default targetDays to match period
    if (value === 'day') {
      setTimePeriodUnit('days');
      setTargetDays('90'); // 90 days
    } else if (value === 'week') {
      setTimePeriodUnit('weeks');
      setTargetDays('91'); // 13 weeks * 7 days
    } else {
      setTimePeriodUnit('months');
      setTargetDays('90'); // 3 months * 30 days
    }
  };

  const handleNext = () => {
    if (step === 'period') {
      setStep('activity');
    } else if (step === 'activity') {
      // Generate goals
      if (!period || !valueType) return; // Type guard
      
      const input: GoalBuilderInput = {
        datasetId: dataset.id,
        tracking: dataset.tracking,
        valence: dataset.valence,
        period: period as 'day' | 'week' | 'month',
        value: parseFloat(goodValue) || 0,
        valueType,
        activePeriods: parseFloat(activePeriods) || 1,
        startingValue: startingValue.trim() ? parseFloat(startingValue) || currentValue : currentValue,
        targetDays: targetDays ? parseFloat(targetDays) : undefined,
      };
      const goals = generateGoals(input);
      setGeneratedGoals(goals);
      // Select all goals by default
      const allGoalIds = new Set([
        ...goals.milestones.map((g) => g.id),
        ...goals.targets.map((g) => g.id),
        ...goals.achievements.map((g) => g.id),
      ]);
      setSelectedGoals(allGoalIds);
      setStep('preview');
    }
  };

  const handleBack = () => {
    if (step === 'activity') {
      setStep('period');
    } else if (step === 'preview') {
      setStep('activity');
    }
  };

  const handleCreate = async () => {
    if (!generatedGoals) return;

    const allGoals = [...generatedGoals.milestones, ...generatedGoals.targets, ...generatedGoals.achievements];
    const goalsToCreate = allGoals.filter((g) => selectedGoals.has(g.id));

    // Create all selected goals
    for (const goal of goalsToCreate) {
      await createGoal(goal);
    }

    onComplete();
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setStep('period');
    setPeriod('');
    setGoodValue('');
    setStartingValue('');
    setValueType('');
    setTargetDays('');
    setTimePeriodUnit('weeks');
    setActivePeriods('');
    setGeneratedGoals(null);
    setSelectedGoals(new Set());
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  const toggleCategory = (goals: Goal[]) => {
    const categoryIds = goals.map((g) => g.id);
    const allSelected = categoryIds.every((id) => selectedGoals.has(id));
    setSelectedGoals((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        categoryIds.forEach((id) => next.delete(id));
      } else {
        categoryIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Consolidated validation and feedback logic
  const getPeriodStepValidation = () => {
    if (step !== 'period') return { canProceed: false, feedbackMessage: null };
    
    // Check basic requirements
    if (!period || !valueType || !goodValue) return { canProceed: false, feedbackMessage: null };
    
    const numValue = parseFloat(goodValue);
    if (numValue === 0 || isNaN(numValue)) return { canProceed: false, feedbackMessage: null };
    
    // Calculate valence-adjusted value
    const isAllTime = valueType === 'alltime-total' || valueType === 'alltime-target';
    
    // For alltime goals, require targetDays
    if (isAllTime && (!targetDays || parseFloat(targetDays) <= 0)) {
      const feedbackMessage = (
        <div className="flex-1 px-4 animate-in fade-in duration-300">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Please specify how long you want to reach this goal ⏱️
            </p>
          </div>
        </div>
      );
      return { canProceed: false, feedbackMessage };
    }
    
    const valenceValue = isAllTime ? numValue - allTimePriorValue : numValue;
    const isWrongSign = isBad(valenceValue, dataset.valence);
    const isValid = !isWrongSign;
    
    // Generate feedback message
    let feedbackMessage: React.ReactNode = null;
    
    if (isWrongSign) {
      const expectation = getValueForValence(1, dataset.valence, {
        good: valueType.startsWith('alltime') ? 'a higher number than the starting point (higher is better)' : 'positive numbers (higher is better)',
        bad: valueType.startsWith('alltime') ? 'a lower number than the starting point (lower is better)' : 'negative numbers (lower is better)',
        neutral: 'steady numbers',
      });
      
      feedbackMessage = (
        <div className="flex-1 px-4 animate-in fade-in duration-300">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              For this dataset, we expect {expectation}.
              {!isAllTime && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => setGoodValue(String(-numValue))}
                    className="underline hover:no-underline font-medium"
                  >
                    Use {formatValue(-numValue, { delta: valueType === 'period-change' })} instead?
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      );
    } else if (isValid) {
      feedbackMessage = (
        <div className="flex-1 px-4 animate-in fade-in duration-300">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-300">
              Great! We'll create goals based on this target 🎯
            </p>
          </div>
        </div>
      );
    }
    
    return { canProceed: isValid, feedbackMessage };
  };

  const canProceed = () => {
    if (step === 'period') {
      return getPeriodStepValidation().canProceed;
    }
    if (step === 'activity') {
      return activePeriods && parseFloat(activePeriods) > 0;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] p-0 gap-0 max-w-3xl">
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0 px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Goal Builder
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {step === 'period' && (
            <div className="space-y-8 py-6 px-4">
              {/* Step 1: Period Selection */}
              {!period ? (
                // Initial large card selection
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="text-center space-y-2">
                    <h3 className="font-bold text-xl text-slate-900 dark:text-slate-50 flex items-center justify-center gap-2">
                      <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      What time period are you focused on?
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Choose how often you'll track your progress
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                    {/* Day Option */}
                    <button
                      onClick={() => handlePeriodSelect('day')}
                      className={cn(
                        'group relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200',
                        'hover:scale-105 active:scale-95',
                        'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'
                      )}
                    >
                      <AchievementBadge
                        badge={{ style: 'circle', color: 'sapphire', icon: 'calendar', label: '' }}
                        size="small"
                      />
                      <div className="text-center space-y-1">
                        <div className="font-bold text-slate-900 dark:text-slate-50">Daily</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          Day-by-day progress
                        </div>
                      </div>
                    </button>

                    {/* Week Option */}
                    <button
                      onClick={() => handlePeriodSelect('week')}
                      className={cn(
                        'group relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200',
                        'hover:scale-105 active:scale-95',
                        'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'
                      )}
                    >
                      <AchievementBadge
                        badge={{ style: 'ribbon', color: 'emerald', icon: 'calendar', label: '' }}
                        size="small"
                      />
                      <div className="text-center space-y-1">
                        <div className="font-bold text-slate-900 dark:text-slate-50">Weekly</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          Week-by-week wins
                        </div>
                      </div>
                    </button>

                    {/* Month Option */}
                    <button
                      onClick={() => handlePeriodSelect('month')}
                      className={cn(
                        'group relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200',
                        'hover:scale-105 active:scale-95',
                        'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'
                      )}
                    >
                      <AchievementBadge
                        badge={{ style: 'star', color: 'amethyst', icon: 'calendar', label: '' }}
                        size="small"
                      />
                      <div className="text-center space-y-1">
                        <div className="font-bold text-slate-900 dark:text-slate-50">Monthly</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          Month-by-month goals
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                // Compact toggle buttons after selection
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="text-center">
                    <h3 className="font-semibold text-base text-slate-900/50 dark:text-slate-50/50 flex items-center justify-center gap-2 transition-all duration-300">
                      <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      What time period are you focused on?
                    </h3>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-900/50">
                    <button
                      onClick={() => setPeriod('day')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                        period === 'day'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Daily
                    </button>
                    <button
                      onClick={() => setPeriod('week')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                        period === 'week'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Weekly
                    </button>
                    <button
                      onClick={() => setPeriod('month')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                        period === 'month'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Monthly
                    </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 & 3: Value Type and Good Value (fade in after period selection) */}
              {period && (
                <div className="space-y-6 animate-in fade-in duration-500">

                  {/* Value Type Selection - different for series vs trend */}
                  <div className="space-y-4">
                    <div className="text-center space-y-2">
                      <h3
                        className={cn(
                          'font-bold flex items-center justify-center gap-2 transition-all duration-300',
                          valueType ? 'text-base text-slate-900/50 dark:text-slate-50/50' : 'text-lg text-slate-900 dark:text-slate-50'
                        )}
                      >
                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        How will you measure success?
                      </h3>
                      {!valueType && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {dataset.tracking === 'series'
                            ? `Focus on ${adjectivize(period)} totals or all-time milestones`
                            : `Track ${adjectivize(period)} changes or overall progress`}
                        </p>
                      )}
                    </div>

                    {!valueType ? (
                      <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
                        {dataset.tracking === 'series' ? (
                          <>
                            {/* Series: Period Total */}
                            <button
                              onClick={() => setValueType('period-total')}
                              className={cn(
                                'relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 transition-all duration-200',
                                'hover:scale-105 active:scale-95 text-left',
                                'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <span className="font-bold text-slate-900 dark:text-slate-50">{capitalize(adjectivize(period))} Total</span>
                                <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                  <Info className="w-3 h-3" />
                                  Typical
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Set targets for total value each {period}
                              </p>
                            </button>

                            {/* Series: All Time Total */}
                            <button
                              onClick={() => setValueType('alltime-total')}
                              className={cn(
                                'relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 transition-all duration-200',
                                'hover:scale-105 active:scale-95 text-left',
                                'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <span className="font-bold text-slate-900 dark:text-slate-50">All Time Total</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Build toward cumulative milestones
                              </p>
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Trend: Period Change */}
                            <button
                              onClick={() => setValueType('period-change')}
                              className={cn(
                                'relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 transition-all duration-200',
                                'hover:scale-105 active:scale-95 text-left',
                                'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <span className="font-bold text-slate-900 dark:text-slate-50">{capitalize(adjectivize(period))} Change</span>
                                <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                  <Info className="w-3 h-3" />
                                  Typical
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Target improvement each {period}
                              </p>
                            </button>

                            {/* Trend: All Time Target */}
                            <button
                              onClick={() => setValueType('alltime-target')}
                              className={cn(
                                'relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 transition-all duration-200',
                                'hover:scale-105 active:scale-95 text-left',
                                'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <span className="font-bold text-slate-900 dark:text-slate-50">All Time Target</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Reach a specific overall value
                              </p>
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 animate-in fade-in duration-300">
                        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-900/50">
                          {dataset.tracking === 'series' ? (
                            <>
                              <button
                                onClick={() => setValueType('period-total')}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                                  valueType === 'period-total'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                )}
                              >
                                {capitalize(adjectivize(period))} Total
                              </button>
                              <button
                                onClick={() => setValueType('alltime-total')}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                                  valueType === 'alltime-total'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                )}
                              >
                                All Time Total
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setValueType('period-change')}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                                  valueType === 'period-change'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                )}
                              >
                                {capitalize(adjectivize(period))} Change
                              </button>
                              <button
                                onClick={() => setValueType('alltime-target')}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                                  valueType === 'alltime-target'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                )}
                              >
                                All Time Target
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {valueType && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Good Value Input */}
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center justify-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        {valueType === 'period-total' && `What's a good ${period}?`}
                        {valueType === 'alltime-total' && 'What total do you want to reach?'}
                        {valueType === 'period-change' && `What's good progress?`}
                        {valueType === 'alltime-target' && 'What value are you aiming for?'}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {valueType === 'period-total' && `Enter the target total for each ${period}`}
                        {valueType === 'alltime-total' && 'Enter a milestone total you want to achieve'}
                        {valueType === 'period-change' && `Enter the ${period}ly improvement that would make you proud`}
                        {valueType === 'alltime-target' && 'Enter the overall target value'}
                      </p>
                    </div>

                    <div className="relative">
                      <Input
                        id="goodValue"
                        type="number"
                        value={goodValue}
                        onChange={(e) => setGoodValue(e.target.value)}
                        placeholder={
                          valueType === 'period-total'
                            ? `e.g., ${exampleAmountLabel}`
                            : valueType === 'period-change'
                              ? `e.g., ${exampleChangeLabel}`
                              : valueType === 'alltime-total'
                                ? `e.g., ${formatValue(allTimeTotalExample)}`
                                : `e.g., ${formatValue(allTimeTargetExample)}`
                        }
                        hideStepperButtons
                        className="text-center !text-2xl font-bold h-16 pr-12"
                      />
                      {(valueType === 'period-change' || valueType === 'alltime-target') && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {getValueForValence(1, dataset.valence, {
                            good: <ArrowUp className="w-6 h-6 text-green-600 dark:text-green-400" />,
                            bad: <ArrowDown className="w-6 h-6 text-green-600 dark:text-green-400" />,
                            neutral: null,
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Starting Value and Time Period Inputs - only show after value is entered */}
                  {goodValue && (() => {
                    const numValue = parseFloat(goodValue);
                    if (numValue === 0 || isNaN(numValue)) return null;
                    
                    return (
                      <div className={cn(
                        "p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 mx-auto animate-in fade-in duration-500",
                        valueType.startsWith('alltime') ? "max-w-2xl" : "max-w-md"
                      )}>
                        <div className={cn(
                          "grid gap-6",
                          valueType.startsWith('alltime') ? "grid-cols-2" : "grid-cols-1"
                        )}>
                          {/* Starting Value Input */}
                          <div className="space-y-3">
                            <div className="text-center space-y-1">
                              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2">
                                <Flag className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                Starting point
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {dataset.tracking === 'series'
                                  ? 'Current total (optional)'
                                  : 'Current value (optional)'}
                              </p>
                            </div>

                            <div className="relative">
                              <Input
                                id="startingValue"
                                type="number"
                                value={startingValue}
                                onChange={(e) => setStartingValue(e.target.value)}
                                placeholder={currentValue !== 0 ? formatValue(currentValue) : 'e.g., 0'}
                                hideStepperButtons
                                className="text-center !text-base font-medium h-10"
                              />
                            </div>
                          </div>
                          
                          {/* Time Period Input (only for alltime options) */}
                          {valueType.startsWith('alltime') && (
                            <div className="space-y-3">
                              <div className="text-center space-y-1">
                                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2">
                                  <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                  How long?
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Time to reach goal
                                </p>
                              </div>

                              <div className="flex items-center">
                                <Input
                                  id="timePeriod"
                                  type="number"
                                  value={timePeriodDisplayValue}
                                  onChange={(e) => handleTimePeriodDisplayChange(e.target.value)}
                                  placeholder="e.g., 12"
                                  className="text-center !text-base font-medium h-10 flex-1 !rounded-r-none border-r-0"
                                />
                                
                                <div className="inline-flex rounded-r-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 h-10">
                                  <button
                                    type="button"
                                    onClick={() => setTimePeriodUnit('days')}
                                    className={cn(
                                      'px-3 text-xs font-medium transition-all duration-200',
                                      timePeriodUnit === 'days'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                    )}
                                  >
                                    days
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTimePeriodUnit('weeks')}
                                    className={cn(
                                      'px-3 text-xs font-medium transition-all duration-200 border-x border-slate-200 dark:border-slate-700',
                                      timePeriodUnit === 'weeks'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                    )}
                                  >
                                    weeks
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTimePeriodUnit('months')}
                                    className={cn(
                                      'px-3 rounded-r-lg text-xs font-medium transition-all duration-200',
                                      timePeriodUnit === 'months'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                    )}
                                  >
                                    months
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 'activity' && (
            <div className="space-y-8 py-6 px-4">
              <div className="text-center space-y-2">
                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-50 flex items-center justify-center gap-2">
                  <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                  How actively will you make progress?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {activityPrompt}
                </p>
              </div>

              <div className="space-y-4 max-w-2xl mx-auto">
                <Slider
                  value={[activitySliderValue]}
                  min={1}
                  max={activityMax}
                  step={0.01}
                  onValueChange={(value) => setActivityDraft(value[0])}
                  onValueCommit={(value) => {
                    setActivePeriods(String(Math.round(value[0])));
                    setActivityDraft(null);
                  }}
                  className="w-full"
                />

                <div className="flex items-center justify-center">
                  <span className="px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 text-sm font-semibold">
                    {activityDisplayValue} {activitySummaryLabel}
                  </span>
                </div>

                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Drag the slider to pick a number — this will be used to calculate achievable targets.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/40 backdrop-blur px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Summary</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      A quick recap before continuing
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Step 2
                  </span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      Period
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {capitalize(adjectivize(period))}
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Trophy className="w-3.5 h-3.5" />
                      Target
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatValue(parseFloat(goodValue), { 
                        delta: valueType === 'period-change'
                      })}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {valueType === 'period-total' && `${capitalize(adjectivize(period))} total`}
                      {valueType === 'alltime-total' && 'All-time total'}
                      {valueType === 'period-change' && `${capitalize(adjectivize(period))} change`}
                      {valueType === 'alltime-target' && 'All-time target'}
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Target className="w-3.5 h-3.5" />
                      Activity
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {activitySummaryValue} {activitySummaryLabel}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Typical cadence
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && generatedGoals && (
            <div className="space-y-6 py-4 px-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                We've generated {generatedGoals.milestones.length + generatedGoals.targets.length + generatedGoals.achievements.length} personalized goals for you.
                Select which ones you'd like to create.
              </p>

                {/* Milestones */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <h3 className="font-semibold">Milestones ({generatedGoals.milestones.length})</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategory(generatedGoals.milestones)}
                    >
                      {generatedGoals.milestones.every((g) => selectedGoals.has(g.id))
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {generatedGoals.milestones.map((goal) => (
                      <GoalPreviewItem
                        key={goal.id}
                        goal={goal}
                        selected={selectedGoals.has(goal.id)}
                        onToggle={() => toggleGoal(goal.id)}
                        desaturateUnselected
                      />
                    ))}
                  </div>
                </div>

                {/* Targets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <h3 className="font-semibold">Targets ({generatedGoals.targets.length})</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategory(generatedGoals.targets)}
                    >
                      {generatedGoals.targets.every((g) => selectedGoals.has(g.id))
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {generatedGoals.targets.map((goal) => (
                      <GoalPreviewItem
                        key={goal.id}
                        goal={goal}
                        selected={selectedGoals.has(goal.id)}
                        onToggle={() => toggleGoal(goal.id)}
                        desaturateUnselected
                      />
                    ))}
                  </div>
                </div>

                {/* Achievements */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      <h3 className="font-semibold">Achievements ({generatedGoals.achievements.length})</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategory(generatedGoals.achievements)}
                    >
                      {generatedGoals.achievements.every((g) => selectedGoals.has(g.id))
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {generatedGoals.achievements.map((goal) => (
                      <GoalPreviewItem
                        key={goal.id}
                        goal={goal}
                        selected={selectedGoals.has(goal.id)}
                        onToggle={() => toggleGoal(goal.id)}
                        desaturateUnselected
                      />
                    ))}
                  </div>
                </div>
              </div>
          )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 pb-6 px-6 border-t flex-shrink-0">
            <Button variant="ghost" onClick={handleBack} className={step === 'period' ? 'invisible pointer-events-none' : ''}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {/* Feedback messages */}
            {step === 'period' && goodValue && getPeriodStepValidation().feedbackMessage}

            <div className="flex items-center gap-2">
              {step === 'preview' ? (
                <>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedGoals.size} selected
                  </span>
                  <Button onClick={handleCreate} disabled={selectedGoals.size === 0}>
                    <Check className="w-4 h-4 mr-2" />
                    Create Goals
                  </Button>
                </>
              ) : (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Goal preview item component
function GoalPreviewItem({
  goal,
  selected,
  onToggle,
  desaturateUnselected = false,
}: {
  goal: Goal;
  selected: boolean;
  onToggle: () => void;
  desaturateUnselected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'relative text-left w-full h-full p-4 rounded-xl border transition-all',
        'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-700',
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
        !selected && desaturateUnselected && 'saturate-0 opacity-70'
      )}
    >
      {selected && (
        <span className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white">
          <Check className="w-4 h-4" />
        </span>
      )}
      <div className="flex items-start gap-3">
        <AchievementBadge badge={goal.badge} size="small" />
        <div className="min-w-0">
          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
            {goal.title}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
            {goal.description}
          </p>
        </div>
      </div>
    </button>
  );
}
