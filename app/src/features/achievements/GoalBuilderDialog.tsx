import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Sparkles, Target, Flag, Trophy, Check, Calendar, TrendingUp, Hash, Info, ArrowUp, ArrowDown } from 'lucide-react';
import { generateGoals, type GoalBuilderInput, type GeneratedGoals } from '@/lib/goals-builder';
import { formatValue } from '@/lib/goals';
import { AchievementBadge } from './AchievementBadge';
import type { Dataset, Goal } from '@/features/db/localdb';
import { createGoal } from '@/features/db/localdb';
import { cn } from '@/lib/utils';
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
  const [valueType, setValueType] = useState<'amount' | 'change'>(
    dataset.tracking === 'series' ? 'amount' : 'change'
  );
  const [activityDays, setActivityDays] = useState<string>('');
  const [generatedGoals, setGeneratedGoals] = useState<GeneratedGoals | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());

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

  const handlePeriodSelect = (value: 'day' | 'week' | 'month') => {
    setPeriod(value);
    // Reset defaults when period changes
    setValueType(dataset.tracking === 'series' ? 'amount' : 'change');
  };

  const handleNext = () => {
    if (step === 'period') {
      setStep('activity');
    } else if (step === 'activity') {
      // Generate goals
      if (!period) return; // Type guard
      
      const input: GoalBuilderInput = {
        datasetId: dataset.id,
        tracking: dataset.tracking,
        valence: dataset.valence,
        period: period as 'day' | 'week' | 'month',
        goodValue: parseFloat(goodValue) || 0,
        valueType,
        activityDays: parseFloat(activityDays) || 1,
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
    setValueType(dataset.tracking === 'series' ? 'amount' : 'change');
    setActivityDays('');
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

  const canProceed = () => {
    if (step === 'period') {
      const numValue = parseFloat(goodValue);
      if (!period || !goodValue || numValue === 0 || isNaN(numValue)) return false;
      // Check valence alignment
      const isWrongSign = isBad(numValue, dataset.valence);
      return !isWrongSign;
    }
    if (step === 'activity') {
      return activityDays && parseFloat(activityDays) > 0;
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
            <DialogDescription>
              Let's create personalized goals, targets, and milestones for your dataset
            </DialogDescription>
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
                      Choose Your Focus Period
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      What time period would you like to focus on tracking and celebrating?
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
                        badge={{ style: 'circle', color: 'blue', icon: 'calendar', label: '' }}
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
                        badge={{ style: 'ribbon', color: 'green', icon: 'calendar', label: '' }}
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
                        badge={{ style: 'star', color: 'purple', icon: 'calendar', label: '' }}
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
                <div className="flex items-center justify-center gap-2 animate-in fade-in duration-300">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Period:</Label>
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
              )}

              {/* Step 2 & 3: Value Type and Good Value (fade in after period selection) */}
              {period && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <Separator />

                  {/* Value Type Selection - only show for series tracking */}
                  {dataset.tracking === 'series' && (
                    <div className="space-y-4">
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center justify-center gap-2">
                          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          How Do You Measure Success?
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Choose what matters most for your {period}ly goals
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
                        {/* Amount Option */}
                        <button
                          onClick={() => setValueType('amount')}
                          className={cn(
                            'relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 transition-all duration-200',
                            'hover:scale-105 active:scale-95 text-left',
                            valueType === 'amount'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg shadow-blue-500/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span className="font-bold text-slate-900 dark:text-slate-50">Total Amount</span>
                            <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              Typical
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            The total value you want to reach in a {period}
                          </p>
                          {valueType === 'amount' && (
                            <Check className="absolute top-3 right-3 w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </button>

                        {/* Change Option */}
                        <button
                          onClick={() => setValueType('change')}
                          className={cn(
                            'relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 transition-all duration-200',
                            'hover:scale-105 active:scale-95 text-left',
                            valueType === 'change'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg shadow-blue-500/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span className="font-bold text-slate-900 dark:text-slate-50">Change/Growth</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            How much change from the previous {period}
                          </p>
                          {valueType === 'change' && (
                            <Check className="absolute top-3 right-3 w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Good Value Input */}
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center justify-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        What's a good {period}?
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {valueType === 'amount'
                          ? `Enter the target ${valueType} you'd like to reach`
                          : `Enter the ${valueType} that would make you proud`}
                      </p>
                    </div>

                    <div className="relative">
                      <Input
                        id="goodValue"
                        type="number"
                        value={goodValue}
                        onChange={(e) => setGoodValue(e.target.value)}
                        placeholder={
                          valueType === 'amount'
                            ? `e.g., ${exampleAmountLabel}`
                            : `e.g., ${exampleChangeLabel}`
                        }
                        hideStepperButtons
                        className="text-center !text-2xl font-bold h-16 pr-12"
                      />
                      {valueType === 'change' && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {getValueForValence(1, dataset.valence, {
                            good: <ArrowUp className="w-6 h-6 text-green-600 dark:text-green-400" />,
                            bad: <ArrowDown className="w-6 h-6 text-green-600 dark:text-green-400" />,
                            neutral: null,
                          })}
                        </div>
                      )}
                    </div>

                    {goodValue && (() => {
                      const numValue = parseFloat(goodValue);
                      const isWrongSign = isBad(numValue, dataset.valence);
                      const isValid = numValue !== 0 && !isNaN(numValue) && !isWrongSign;
                      
                      if (isWrongSign) {
                        const expectation = dataset.tracking === 'series'
                          ? getValueForValence(1, dataset.valence, {
                              good: 'positive numbers (where positive is good)',
                              bad: 'negative numbers (where negative is good)',
                              neutral: 'consistent numbers',
                            })
                          : getValueForValence(1, dataset.valence, {
                              good: 'positive numbers (higher is better)',
                              bad: 'negative numbers (lower is better)',
                              neutral: 'steady numbers',
                            });
                        
                        return (
                          <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 animate-in fade-in duration-300">
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              For this dataset, we expect {expectation}.{' '}
                              <button
                                type="button"
                                onClick={() => setGoodValue(String(-numValue))}
                                className="underline hover:no-underline font-medium"
                              >
                                Use {formatValue(-numValue, { delta: valueType === 'change' })} instead?
                              </button>
                            </p>
                          </div>
                        );
                      }
                      
                      if (isValid) {
                        return (
                          <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 animate-in fade-in duration-300">
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Great! We'll create goals based on this target 🎯
                            </p>
                          </div>
                        );
                      }
                      
                      return null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'activity' && (
            <div className="space-y-6 py-4 px-4">
              <div className="space-y-2">
                <Label htmlFor="activityDays">How many days per {period} will you typically record data?</Label>
                <Input
                  id="activityDays"
                  type="number"
                  min="1"
                  max={period === 'day' ? 1 : period === 'week' ? 7 : 30}
                  value={activityDays}
                  onChange={(e) => setActivityDays(e.target.value)}
                  placeholder={period === 'week' ? 'e.g., 5' : period === 'month' ? 'e.g., 20' : '1'}
                  hideStepperButtons
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This helps us create realistic targets based on your activity level
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 space-y-2">
                <h4 className="font-semibold text-sm">Summary</h4>
                <div className="text-sm space-y-1 text-slate-600 dark:text-slate-300">
                  <p>
                    • Focus period: <strong>{period}</strong>
                  </p>
                  <p>
                    • Good {period}:{' '}
                    <strong>
                      {formatValue(parseFloat(goodValue), { delta: valueType === 'change' })}{' '}
                      {valueType === 'change' ? 'change' : ''}
                    </strong>
                  </p>
                  <p>
                    • Activity: <strong>{activityDays} days per {period}</strong>
                  </p>
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
                  <div className="grid grid-cols-1 gap-2">
                    {generatedGoals.milestones.map((goal) => (
                      <GoalPreviewItem
                        key={goal.id}
                        goal={goal}
                        selected={selectedGoals.has(goal.id)}
                        onToggle={() => toggleGoal(goal.id)}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

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
                  <div className="grid grid-cols-1 gap-2">
                    {generatedGoals.targets.map((goal) => (
                      <GoalPreviewItem
                        key={goal.id}
                        goal={goal}
                        selected={selectedGoals.has(goal.id)}
                        onToggle={() => toggleGoal(goal.id)}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

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
                  <div className="grid grid-cols-1 gap-2">
                    {generatedGoals.achievements.map((goal) => (
                      <GoalPreviewItem
                        key={goal.id}
                        goal={goal}
                        selected={selectedGoals.has(goal.id)}
                        onToggle={() => toggleGoal(goal.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
          )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 pb-6 px-6 border-t flex-shrink-0">
            <Button variant="ghost" onClick={handleBack} disabled={step === 'period'}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

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
}: {
  goal: Goal;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
      onClick={onToggle}
    >
      <Checkbox checked={selected} onCheckedChange={onToggle} />
      <AchievementBadge badge={goal.badge} size="small" />
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm truncate">{goal.title}</h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{goal.description}</p>
      </div>
      {/* Stub for edit button */}
      {/* <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); }} disabled>
        <Edit className="w-3 h-3" />
      </Button> */}
    </div>
  );
}
