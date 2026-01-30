import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Sparkles, Target, Flag, Trophy, Check } from 'lucide-react';
import { generateGoals, type GoalBuilderInput, type GeneratedGoals } from '@/lib/goals-builder';
import { AchievementBadge } from './AchievementBadge';
import type { Dataset, Goal } from '@/features/db/localdb';
import { createGoal } from '@/features/db/localdb';

type GoalBuilderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: Dataset;
  onComplete: () => void;
};

type Step = 'period' | 'activity' | 'preview';

export function GoalBuilderDialog({ open, onOpenChange, dataset, onComplete }: GoalBuilderDialogProps) {
  const [step, setStep] = useState<Step>('period');
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [goodValue, setGoodValue] = useState<string>('');
  const [valueType, setValueType] = useState<'amount' | 'change'>(
    dataset.tracking === 'series' ? 'amount' : 'change'
  );
  const [activityDays, setActivityDays] = useState<string>('');
  const [generatedGoals, setGeneratedGoals] = useState<GeneratedGoals | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());

  const valenceTerm = dataset.valence === 'positive' ? 'good' : dataset.valence === 'negative' ? 'low' : 'consistent';

  const handleNext = () => {
    if (step === 'period') {
      setStep('activity');
    } else if (step === 'activity') {
      // Generate goals
      const input: GoalBuilderInput = {
        datasetId: dataset.id,
        tracking: dataset.tracking,
        valence: dataset.valence,
        period,
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
    setPeriod('day');
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
      return goodValue && parseFloat(goodValue) > 0;
    }
    if (step === 'activity') {
      return activityDays && parseFloat(activityDays) > 0;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Goal Builder
          </DialogTitle>
          <DialogDescription>
            Let's create personalized goals, targets, and milestones for your dataset
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'period' && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="period">What time period do you want to focus on?</Label>
                  <RadioGroup value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="day" id="day" />
                      <Label htmlFor="day" className="cursor-pointer font-normal">
                        Day
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="week" id="week" />
                      <Label htmlFor="week" className="cursor-pointer font-normal">
                        Week
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="month" id="month" />
                      <Label htmlFor="month" className="cursor-pointer font-normal">
                        Month
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valueType">How do you measure success?</Label>
                  <RadioGroup value={valueType} onValueChange={(v) => setValueType(v as 'amount' | 'change')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="amount" id="amount" />
                      <Label htmlFor="amount" className="cursor-pointer font-normal">
                        Total amount in the {period}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="change" id="change" />
                      <Label htmlFor="change" className="cursor-pointer font-normal">
                        Change/growth from previous {period}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goodValue">
                    What would you consider a {valenceTerm} {period}?
                  </Label>
                  <Input
                    id="goodValue"
                    type="number"
                    value={goodValue}
                    onChange={(e) => setGoodValue(e.target.value)}
                    placeholder={valueType === 'amount' ? 'e.g., 100' : 'e.g., +10'}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {valueType === 'amount'
                      ? `The total value you'd like to reach in a ${period}`
                      : `The amount of change from the previous ${period}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'activity' && (
            <div className="space-y-6 py-4">
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
                    • {valenceTerm.charAt(0).toUpperCase() + valenceTerm.slice(1)} {period}:{' '}
                    <strong>
                      {valueType === 'amount' ? goodValue : `+${goodValue}`}{' '}
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
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6 py-4">
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
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
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
