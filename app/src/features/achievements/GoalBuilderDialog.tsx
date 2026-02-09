import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import type { Dataset, Goal } from '@/features/db/localdb';
import { useAllDays, useSaveDay } from '@/features/db/useCalendarData';
import { useCreateGoals } from '@/features/db/useGoalsData';
import { toDayKey } from '@/lib/friendly-date';
import { convertPeriodUnitWithRounding } from '@/lib/friendly-numbers';
import { formatValue } from '@/lib/friendly-numbers';
import { calculateBaselines, generateGoals, type GeneratedGoals, type GoalBuilderInput } from '@/lib/goals-builder';
import { getGoalCategory } from '@/lib/goals';
import { adjectivize, capitalize, cn } from '@/lib/utils';
import { getValueForGood, isBad } from '@/lib/valence';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Calendar, Check, Cog, Dices, Flag, Hash, Info, Sparkles, Target, TrendingUp, Trophy } from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';
import { AchievementBadge } from './AchievementBadge';

type GoalBuilderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: Dataset;
  onComplete?: () => void;
};

type Step = 'period' | 'activity' | 'preview' | 'starting-point';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Load all days to calculate current total/last value
  const { data: allDays = [] } = useAllDays(dataset.id);
  const saveDay = useSaveDay();
  const createGoals = useCreateGoals();
  
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

  const exampleAmount = getValueForGood(dataset.valence, {
    positive: 100,
    negative: -100,
    neutral: 100,
  });
  const exampleChange = getValueForGood(dataset.valence, {
    positive: 10,
    negative: -10,
    neutral: 10,
  });
  const exampleAmountLabel = formatValue(exampleAmount);
  const exampleChangeLabel = formatValue(exampleChange, { delta: true });
  const parsedStartingValue = Number.isFinite(parseFloat(startingValue)) ? parseFloat(startingValue) : undefined;
  const allTimePriorValue = parsedStartingValue ?? currentValue;
  const isAllTimeValueType = valueType === 'alltime-total' || valueType === 'alltime-target';
  const hasNonZeroStartingValue = typeof parsedStartingValue === 'number' && parsedStartingValue !== 0;
  const shouldPromptInitialData = isAllTimeValueType && hasNonZeroStartingValue && currentValue === 0;
  const todayLabel = React.useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }, []);
  
  // Convert time period for display
  const targetPeriodsDisplayValue = React.useMemo(() => {
    const days = parseFloat(targetDays);
    if (!days || isNaN(days)) return '';
    if (timePeriodUnit === 'days') return String(Math.round(days));
    if (timePeriodUnit === 'weeks') return String(Math.round(days / 7));
    if (timePeriodUnit === 'months') return String(Math.round(days / 30));
    return '';
  }, [targetDays, timePeriodUnit]);
  
  const handleTargetPeriodsChange = (value: string) => {
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
  const summaryDurationDays = targetDays && parseFloat(targetDays) > 0 ? parseFloat(targetDays) : 90;
  const summaryTargetDate = React.useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + summaryDurationDays);
    return now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }, [summaryDurationDays]);

  const summaryDurationLabel =
    timePeriodUnit === 'days'
      ? `In ${Math.round(summaryDurationDays)} days (${summaryTargetDate})`
      : timePeriodUnit === 'weeks'
        ? `In ${Math.round(summaryDurationDays / 7)} weeks (${summaryTargetDate})`
        : `In ${Math.round(summaryDurationDays / 30)} months (${summaryTargetDate})`;
  const isPeriodTarget = valueType === 'period-total' || valueType === 'period-change';
  const isAllTimeTarget = valueType === 'alltime-total' || valueType === 'alltime-target';
  
  // Consolidated GoalBuilderInput creation
  const builderInput = React.useMemo<GoalBuilderInput | null>(() => {
    if (!period || !valueType || !goodValue) return null;
    return {
      datasetId: dataset.id,
      tracking: dataset.tracking,
      valence: dataset.valence,
      period: period as 'day' | 'week' | 'month',
      value: parseFloat(goodValue) || 0,
      valueType,
      activePeriods: parseFloat(activePeriods) || 1,
      startingValue: startingValue.trim() ? parseFloat(startingValue) : currentValue,
      targetDays: summaryDurationDays,
    };
  }, [dataset.id, dataset.tracking, dataset.valence, period, valueType, goodValue, activePeriods, startingValue, currentValue, summaryDurationDays]);
  
  const summaryBaselines = builderInput ? calculateBaselines(builderInput) : null;
  const conversionLabel = (() => {
    if (!summaryBaselines || !period || !isPeriodTarget) return '';
    const delta = valueType === 'period-change';
    if (period === 'day') {
      const parts = [
        summaryBaselines.weekTarget ? `${formatValue(summaryBaselines.weekTarget, { delta })} weekly` : null,
        summaryBaselines.monthTarget ? `${formatValue(summaryBaselines.monthTarget, { delta })} monthly` : null,
      ].filter(Boolean);
      return `(${parts.join(', ')})`;
    }
    if (period === 'week') {
      return summaryBaselines.monthTarget
        ? `${formatValue(summaryBaselines.monthTarget, { delta })} / month`
        : '';
    }
    return '';
  })();
  const summary90DayTotal = (() => {
    if (!summaryBaselines || !isPeriodTarget) return '';
    const total = summaryBaselines.dayTarget * 90;
    return formatValue(total, { delta: valueType === 'period-change' });
  })();
  const perPeriodLabel = (() => {
    if (!summaryBaselines || !period || !isAllTimeTarget) return '';
    const perPeriodValue =
      period === 'day'
        ? summaryBaselines.dayTarget
        : period === 'week'
          ? summaryBaselines.weekTarget
          : summaryBaselines.monthTarget;
    return formatValue(perPeriodValue);
  })();

  const handlePeriodSelect = (value: 'day' | 'week' | 'month') => {
    if (period && period !== value && goodValue.trim() && !valueType.startsWith('alltime')) {
      const convertedValue = convertPeriodUnitWithRounding(goodValue, period, value);
      if (convertedValue !== null) setGoodValue(convertedValue);
    }
    setPeriod(value);
    // Reset defaults when period changes
    // setValueType('');
    setActivePeriods(value === 'day' ? '5' : value === 'week' ? '4' : '12');
    
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
      // Show loading animation first
      setStep('preview');
      setIsGenerating(true);
      setGeneratedGoals(null);
      
      // Generate goals after a delay for loading animation
      setTimeout(() => {
        if (!builderInput) return; // Type guard
        
        const goals = generateGoals(builderInput);
        setGeneratedGoals(goals);
        // Select all goals by default
        const allGoalIds = new Set([
          ...goals.milestones.map((g) => g.id),
          ...goals.targets.map((g) => g.id),
          ...goals.achievements.map((g) => g.id),
        ]);
        setSelectedGoals(allGoalIds);
        setIsGenerating(false);
      }, 2500); // 2.5 second delay
    }
  };

  const handleBack = () => {
    if (step === 'activity') {
      setStep('period');
    } else if (step === 'preview') {
      setStep('activity');
    } else if (step === 'starting-point') {
      setStep('preview');
    }
  };

  const handleRerollNames = () => {
    // Regenerate goals to get new random names for milestones
    if (!builderInput) return; // Type guard

    // Get all indexes of selected goals
    const selectedGoalIndexes = {
      milestones: new Set<number>(),
      targets: new Set<number>(),
      achievements: new Set<number>(),
    }
    selectedGoals.forEach((goalId) => {
      selectedGoalIndexes.milestones.add(generatedGoals?.milestones.findIndex((g) => g.id === goalId) ?? -1);
      selectedGoalIndexes.targets.add(generatedGoals?.targets.findIndex((g) => g.id === goalId) ?? -1);
      selectedGoalIndexes.achievements.add(generatedGoals?.achievements.findIndex((g) => g.id === goalId) ?? -1);
    });

    
    const goals = generateGoals(builderInput);
    setGeneratedGoals(goals);
    // Update selected goals to match previous selection index
    const allGoalIds = new Set<string>();
    selectedGoalIndexes.milestones.forEach(idx => idx != -1 && allGoalIds.add(goals.milestones[idx].id));
    selectedGoalIndexes.targets.forEach(idx => idx != -1 && allGoalIds.add(goals.targets[idx].id));
    selectedGoalIndexes.achievements.forEach(idx => idx != -1 && allGoalIds.add(goals.achievements[idx].id));
    setSelectedGoals(allGoalIds);
  };

  const createSelectedGoals = async () => {
    if (!generatedGoals) return;

    const allGoals = [...generatedGoals.milestones, ...generatedGoals.targets, ...generatedGoals.achievements];
    const goalsToCreate = allGoals.filter((g) => selectedGoals.has(g.id));

    if (goalsToCreate.length > 0) {
      await createGoals.mutateAsync(goalsToCreate);
    }
  };

  const handleCreate = async (includeInitialData: boolean) => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      if (includeInitialData && typeof parsedStartingValue === 'number') {
        const now = new Date();
        const dateKey = toDayKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
        await saveDay.mutateAsync({ datasetId: dataset.id, date: dateKey, numbers: [parsedStartingValue] });
      }

      await createSelectedGoals();
      onComplete?.();
      onOpenChange(false);
      resetState();
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateClick = () => {
    if (shouldPromptInitialData) {
      setStep('starting-point');
      return;
    }
    void handleCreate(false);
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
    setIsGenerating(false);
    setIsCreating(false);
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
    
    const valenceValue = isAllTime ? numValue - allTimePriorValue : numValue;
    const isWrongSign = isBad(valenceValue, dataset.valence);
    const isValid = !isWrongSign;
    
    // Generate feedback message
    let feedbackMessage: React.ReactNode = null;
    
    if (isWrongSign) {
      const expectation = getValueForGood(dataset.valence, {
        positive: valueType.startsWith('alltime') ? 'a higher number than the starting point (higher is better)' : 'positive numbers (higher is better)',
        negative: valueType.startsWith('alltime') ? 'a lower number than the starting point (lower is better)' : 'negative numbers (lower is better)',
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

          <div key={step} className="flex-1 overflow-y-auto px-6 py-4">
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
                      Choose how often you'd like to track your progress
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
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 whitespace-nowrap">
                        <Info className="w-3 h-3" />
                        Recommended
                      </span>
                      <AchievementBadge
                        badge={{ style: 'star_formation', color: 'sapphire', icon: 'calendar', label: '' }}
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
                        badge={{ style: 'star_stack', color: 'emerald', icon: 'calendar', label: '' }}
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
                      onClick={() => handlePeriodSelect('day')}
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
                      onClick={() => handlePeriodSelect('week')}
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
                      onClick={() => handlePeriodSelect('month')}
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
                        {valueType === 'period-change' && `Enter the ${adjectivize(period)} improvement that would make you proud`}
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
                          {getValueForGood(dataset.valence, {
                            positive: <ArrowUp className="w-6 h-6 text-green-600 dark:text-green-400" />,
                            negative: <ArrowDown className="w-6 h-6 text-green-600 dark:text-green-400" />,
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
                                  Time to reach goal (optional)
                                </p>
                              </div>

                              <div className="flex items-center">
                                <Input
                                  id="timePeriod"
                                  type="number"
                                  value={targetPeriodsDisplayValue}
                                  onChange={(e) => handleTargetPeriodsChange(e.target.value)}
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
                                    <span className="hidden sm:inline">days</span>
                                    <span className="sm:hidden">d</span>
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
                                    <span className="hidden sm:inline">weeks</span>
                                    <span className="sm:hidden">w</span>
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
                                    <span className="hidden sm:inline">months</span>
                                    <span className="sm:hidden">m</span>
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
            <div className="space-y-8 py-6 px-4 animate-in fade-in duration-300">
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
                    {isAllTimeTarget && perPeriodLabel && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {perPeriodLabel} per {period}
                      </div>
                    )}
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
                      {valueType === 'period-change' && `${capitalize(adjectivize(period))} change`}
                      {isAllTimeTarget && summaryDurationLabel}
                    </div>
                    {isPeriodTarget && conversionLabel && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {conversionLabel}
                      </div>
                    )}
                    {isPeriodTarget && summary90DayTotal && (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {summary90DayTotal} in 90 days
                      </div>
                    )}
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

          {step === 'preview' && isGenerating && (
            <div className="flex flex-col items-center justify-center py-20 px-4 space-y-6 animate-in fade-in duration-300">
              <div className="relative">
                {/* Animated circles */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-4 border-purple-200 dark:border-purple-900 animate-ping" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-4 border-blue-200 dark:border-blue-900 animate-pulse" />
                </div>
                {/* Center icon */}
                <div className="relative flex items-center justify-center w-24 h-24">
                  <Cog className="w-12 h-12 text-purple-600 dark:text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 animate-pulse">
                  Generating Your Personalized Goals
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
                  Analyzing your targets and creating customized milestones, targets, and achievements...
                </p>
              </div>
              
              {/* Progress dots */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {step === 'preview' && generatedGoals && (
            <div className="space-y-6 py-4 px-4 animate-in fade-in duration-300">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                We've generated {generatedGoals.milestones.length + generatedGoals.targets.length + generatedGoals.achievements.length} personalized goals for you.
                Select which ones you'd like to create.
              </p>

                {/* Milestones */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Flag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <h3 className="font-semibold">Milestones</h3>
                      <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                        {generatedGoals.milestones.filter((g) => selectedGoals.has(g.id)).length}
                      </Badge>
                    </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRerollNames}
                        title="Re-roll milestone names"
                        className="hover:bg-purple-100 dark:hover:bg-purple-950/50 text-purple-600 dark:text-purple-400"
                      >
                        <Dices className="w-4 h-4" /> Re-roll Names
                      </Button>
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Big, all-time achievements that celebrate major progress.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {generatedGoals.milestones.map((goal) => (
                      <GoalPreviewItem
                        key={goal.id}
                        goal={goal}
                        selected={selectedGoals.has(goal.id)}
                        onToggle={() => toggleGoal(goal.id)}
                        desaturateUnselected
                        animateIn
                      />
                    ))}
                  </div>
                </div>

                {/* Targets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <h3 className="font-semibold">Targets</h3>
                      <Badge variant="secondary" className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300">
                        {generatedGoals.targets.filter((g) => selectedGoals.has(g.id)).length}
                      </Badge>
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Repeatable period goals to keep you on pace.
                  </p>
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
                      <h3 className="font-semibold">Achievements</h3>
                      <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300">
                        {generatedGoals.achievements.filter((g) => selectedGoals.has(g.id)).length}
                      </Badge>
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Winning moments and streaks that highlight consistency.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(() => {
                      let lastCategory: string | null = null;
                      return generatedGoals.achievements.map((goal) => {
                        const category = getGoalCategory(goal);
                        const showHeading = category !== lastCategory;
                        lastCategory = category;

                        return (
                          <React.Fragment key={goal.id}>
                            {showHeading && (
                              <div className="col-span-full flex items-center gap-3 pt-2">
                                <div className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/70" />
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                  {category}
                                </span>
                                <div className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/70" />
                              </div>
                            )}
                            <GoalPreviewItem
                              goal={goal}
                              selected={selectedGoals.has(goal.id)}
                              onToggle={() => toggleGoal(goal.id)}
                              desaturateUnselected
                            />
                          </React.Fragment>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
          )}
          {step === 'starting-point' && (
            <div className="space-y-6 py-6 px-4 animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-50 flex items-center justify-center gap-2">
                  <Flag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  Add a starting point?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your all-time goal starts from {formatValue(parsedStartingValue ?? 0)}. Want us to add that as your first data point?
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/40 backdrop-blur px-4 py-4 max-w-xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Starting value</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      We will add it to your dataset for today
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                    {todayLabel}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Hash className="w-3.5 h-3.5" />
                      Initial value
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatValue(parsedStartingValue ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      Date
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {todayLabel}
                    </div>
                  </div>
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
              {step === 'starting-point' ? (
                <>
                  <Button variant="ghost" onClick={() => handleCreate(false)} disabled={isCreating}>
                    Skip for now
                  </Button>
                  <Button onClick={() => handleCreate(true)} disabled={isCreating}>
                    Add starting value
                  </Button>
                </>
              ) : step === 'preview' ? (
                <>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedGoals.size} selected
                  </span>
                  <Button onClick={handleCreateClick} disabled={selectedGoals.size === 0}>
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
  animateIn = false
}: {
  goal: Goal;
  selected: boolean;
  onToggle: () => void;
  desaturateUnselected?: boolean;
  animateIn?: boolean;
}) {
  const [isHovered, setIsHovered] = React.useState(false);

  const active = isHovered && selected;

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative text-left w-full h-full p-4 rounded-xl border transition-all duration-300 group',
        selected
          ? 'hover:scale-125 hover:shadow-lg hover:-translate-y-1 hover:z-10'
          : 'hover:scale-105 hover:shadow-md hover:-translate-y-0.5',
        'hover:bg-slate-50/90 dark:hover:bg-slate-900/90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-700',
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-blue-500/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
        !selected && desaturateUnselected && 'saturate-0 opacity-70',
        animateIn && 'animate-in fade-in zoom-in duration-300 fill-mode-forwards'
      )}
      style={ 
        animateIn ? { 
          animationDuration: `${200 + Math.random() * 300}ms`,
        } : undefined
      }
    >
      {selected && (
        <span className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white">
          <Check className="w-4 h-4" />
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className="group-hover:scale-145 group-hover:-translate-x-1 transition-transform duration-300">
          <AchievementBadge 
            badge={goal.badge} 
            size="small"
            animate={active}
          />
        </div>
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
