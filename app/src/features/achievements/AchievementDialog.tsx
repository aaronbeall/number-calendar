import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type Dataset, type Goal, type GoalBadge, type GoalRequirements, type GoalType } from '@/features/db/localdb';
import { useCreateGoal, useUpdateGoal } from '@/features/db/useGoalsData';
import { achievementBadgeColors, achievementBadgeIcons, achievementBadgeStyles } from '@/lib/achievements';
import { formatGoalTargetValue, getSuggestedGoalContent, isValidGoalAttributes } from '@/lib/goals';
import { getPrimaryMetric, getValenceSource } from '@/lib/tracking';
import { capitalize, randomKeyOf } from '@/lib/utils';
import { AlertTriangle, Award, Dices, Palette, Undo2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import AchievementBadge from './AchievementBadge';
import { BadgeEditDialog } from './BadgeEditDialog';
import { GoalBuilder } from './GoalBuilder';
import { MilestoneBuilder } from './MilestoneBuilder';
import { TargetBuilder } from './TargetBuilder';

interface AchievementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: AchievementDialogData;
  initialGoal?: Goal;
  completionCount?: number;
  type: GoalType;
  dataset: Dataset;
}

export interface AchievementDialogData {
  title: string;
  description: string;
  badge: GoalBadge;
  goal: GoalRequirements;
}

export function AchievementDialog({ open, onOpenChange, initialData, initialGoal, completionCount = 0, type, dataset }: AchievementDialogProps) {
  const isEditMode = !!initialGoal;
  const [title, setTitle] = useState(initialGoal?.title ?? initialData?.title ?? '');
  const [description, setDescription] = useState(initialGoal?.description ?? initialData?.description ?? '');
  const [badge, setBadge] = useState<GoalBadge>(initialGoal?.badge ?? initialData?.badge ?? { style: 'badge', color: 'gold', icon: 'star', label: undefined });
  const [animateBadge, setAnimateBadge] = useState(false);
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const datasetId = dataset.id;

  const {tracking, valence} = dataset;
  
  // Create sensible defaults based on goal type and dataset
  const getDefaultGoal = (): Partial<GoalRequirements> => {
    const primaryMetric = getPrimaryMetric(tracking);
    const defaultCondition = valence === 'negative' ? 'below' : 'above';
    const defaultSource = type == 'milestone' ? 'stats' : getValenceSource(tracking);
    
    if (type === 'milestone') {
      return {
        target: {
          metric: primaryMetric,
          source: defaultSource,
          condition: defaultCondition,
          value: undefined,
        } as any,
        timePeriod: 'anytime',
        count: 1,
      };
    } else if (type === 'target') {
      return {
        target: {
          metric: primaryMetric,
          source: defaultSource,
          condition: defaultCondition,
          value: undefined,
        } as any,
        timePeriod: 'week',
        count: 1,
      };
    } else {
      // goal type
      return {
        target: {
          metric: primaryMetric,
          source: defaultSource,
          condition: defaultCondition,
          value: undefined,
        } as any,
        count: 1,
      };
    }
  };
  
  const [goal, setGoal] = useState<Partial<GoalRequirements>>(
    initialGoal
      ? {
          target: initialGoal.target,
          targetDate: initialGoal.targetDate,
          timePeriod: initialGoal.timePeriod,
          count: initialGoal.count,
          consecutive: initialGoal.consecutive,
        }
      : (initialData?.goal ?? getDefaultGoal())
  );
  const [badgeEditOpen, setBadgeEditOpen] = useState(false);
  const prevTargetRef = useRef<Goal['target'] | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initialGoal) {
      setTitle(initialGoal.title ?? '');
      setDescription(initialGoal.description ?? '');
      setBadge(initialGoal.badge);
      setGoal({
        target: initialGoal.target,
        targetDate: initialGoal.targetDate,
        timePeriod: initialGoal.timePeriod,
        count: initialGoal.count,
        consecutive: initialGoal.consecutive,
      });
      prevTargetRef.current = initialGoal.target;
      return;
    }
    setTitle(initialData?.title ?? '');
    setDescription(initialData?.description ?? '');
    setBadge(initialData?.badge ?? { style: 'badge', color: 'gold', icon: 'star', label: undefined });
    setGoal(initialData?.goal ?? getDefaultGoal());
    prevTargetRef.current = (initialData?.goal ?? getDefaultGoal())?.target ?? null;
  }, [open, initialGoal, initialData, type, tracking, valence]);

  const handleGoalChange = (nextGoal: Partial<GoalRequirements>) => {
    if (!isEditMode || !nextGoal.target) {
      setGoal(nextGoal);
      prevTargetRef.current = nextGoal.target ?? null;
      return;
    }

    const prevTarget = prevTargetRef.current;
    const nextTarget = nextGoal.target;
    if (prevTarget) {
      const prevLong = formatGoalTargetValue(prevTarget);
      const prevShort = formatGoalTargetValue(prevTarget, { short: true });
      const nextLong = formatGoalTargetValue(nextTarget);
      const nextShort = formatGoalTargetValue(nextTarget, { short: true });

      setTitle(current => current.replace(prevShort, nextShort).replace(prevLong, nextLong));
      setDescription(current => current.replace(prevShort, nextShort).replace(prevLong, nextLong));
      setBadge(current => {
        if (!current.label) return current;
        const updatedLabel = current.label.replace(prevShort, nextShort).replace(prevLong, nextLong);
        if (updatedLabel === current.label) return current;
        return { ...current, label: updatedLabel };
      });
    }

    setGoal(nextGoal);
    prevTargetRef.current = nextTarget;
  };

  const sugggested = getSuggestedGoalContent({ type, title, description, badge, ...goal });

  const previewBadge = useMemo(() => ({
    ...badge,
    label: badge.label ?? sugggested.label,
  }), [badge, sugggested.label]);

  const requirementsChanged = useMemo(() => {
    if (!isEditMode || !initialGoal) return false;
    const initialKey = JSON.stringify({
      target: initialGoal.target,
      targetDate: initialGoal.targetDate ?? null,
      timePeriod: initialGoal.timePeriod,
      count: initialGoal.count,
      consecutive: initialGoal.consecutive ?? false,
    });
    const currentKey = JSON.stringify({
      target: goal.target,
      targetDate: goal.targetDate ?? null,
      timePeriod: goal.timePeriod,
      count: goal.count,
      consecutive: goal.consecutive ?? false,
    });
    return initialKey !== currentKey;
  }, [goal, initialGoal, isEditMode]);

  const handleRevertRequirements = () => {
    if (!initialGoal) return;
    setGoal({
      target: initialGoal.target,
      targetDate: initialGoal.targetDate,
      timePeriod: initialGoal.timePeriod,
      count: initialGoal.count,
      consecutive: initialGoal.consecutive,
    });
  };

  const hasChanges = useMemo(() => {
    if (!isEditMode || !initialGoal) return true;
    const titleChanged = (title || '') !== (initialGoal.title || '');
    const descriptionChanged = (description || '') !== (initialGoal.description || '');
    const badgeChanged = JSON.stringify(badge) !== JSON.stringify(initialGoal.badge);
    return titleChanged || descriptionChanged || badgeChanged || requirementsChanged;
  }, [badge, description, initialGoal, isEditMode, requirementsChanged, title]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidGoalAttributes(goal)) return;

    const normalizedBadge = {
      ...badge,
      label: badge.label ?? sugggested.label,
    };

    if (isEditMode && initialGoal) {
      updateGoalMutation.mutate({
        ...initialGoal,
        title: title || sugggested.title,
        description: description || sugggested.description,
        badge: normalizedBadge,
        ...goal,
      }, {
        onSuccess: () => onOpenChange(false),
      });
      return;
    }

    // Create Goal in DB
    createGoalMutation.mutate({ 
      title: title || sugggested.title,
      description: description || sugggested.description,
      badge: normalizedBadge,
      type,
      datasetId,
      createdAt: Date.now(),
      id: crypto.randomUUID(),
      ...goal
    });

    onOpenChange(false);
  };

  const handleRandomizeBadge = () => {
    setBadge(prev => ({
      ...prev,
      color: randomKeyOf(achievementBadgeColors),
      style: randomKeyOf(achievementBadgeStyles),
      icon: randomKeyOf(achievementBadgeIcons),
    }));
  }

  const isValid = isValidGoalAttributes(goal);
  const showCompletionNotice = isEditMode && completionCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] p-0 gap-0 w-full sm:max-w-2xl flex flex-col">
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle>{isEditMode ? `Edit ${capitalize(type)}` : `Add ${capitalize(type)}`}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Edit this ${type} by updating its conditions, badge, title, and description.`
              : `Create a new ${type} by defining its conditions, badge, title, and description.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 max-h-[90vh]">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-6 md:flex-row md:gap-8">
              {/* Left Column: Goal Builder */}
              <div className="flex flex-col gap-2 md:w-1/2">
                {type === 'milestone' && (
                  <MilestoneBuilder value={goal} onChange={handleGoalChange} tracking={tracking} valence={valence} />
                )}
                {type === 'target' && (
                  <TargetBuilder value={goal} onChange={handleGoalChange} tracking={tracking} valence={valence} />
                )}
                {type === 'goal' && (
                  <GoalBuilder value={goal} onChange={handleGoalChange} tracking={tracking} valence={valence} />
                )}
              </div>
              {/* Right Column: Badge, Title, Description */}
              <div className="flex flex-col gap-4 md:w-1/2">
                <div className="rounded-xl border bg-slate-50/50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col gap-3 items-center">
                  <div className="flex gap-2 items-center">
                    <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setBadgeEditOpen(true)}>
                      <Palette className="w-4 h-4" />
                      <span className="text-xs">Edit Badge</span>
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Randomize badge" onClick={handleRandomizeBadge} title="Randomize badge appearance">
                      <Dices className="w-4 h-4" />
                    </Button>
                  </div>
                  <div 
                    onMouseEnter={() => setAnimateBadge(true)} 
                    onMouseLeave={() => setAnimateBadge(false)}
                    onTouchEnd={() => setAnimateBadge(animated => !animated)}
                  >
                    <AchievementBadge badge={previewBadge} size="large" animate={animateBadge} />
                  </div>
                  <Input 
                    value={title} 
                    placeholder={sugggested.title} 
                    onChange={e => setTitle(e.target.value)} 
                    maxLength={64}
                    className="font-bold text-lg text-center border-0 bg-slate-100 dark:bg-slate-950/50 shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 px-2 py-1"
                  />
                  <Textarea 
                    value={description} 
                    placeholder={sugggested.description} 
                    onChange={e => setDescription(e.target.value)} 
                    maxLength={256} 
                    rows={3}
                    className="text-xs text-slate-500 text-center border-0 bg-slate-100 dark:bg-slate-950/50 shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 resize-none px-2 py-1"
                  />
                  <BadgeEditDialog
                    open={badgeEditOpen}
                    onOpenChange={setBadgeEditOpen}
                    badge={previewBadge}
                    onSave={setBadge}
                    saveLabel="Done"
                  />
                  {showCompletionNotice && (
                    <div className="mt-1 flex items-center justify-center">
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                        <Award className="h-3.5 w-3.5" />
                        {completionCount} completions recorded
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {showCompletionNotice && requirementsChanged && (
            <div className="px-6 pb-3">
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 shadow-sm dark:border-red-900/70 dark:bg-red-950/60 dark:text-red-200">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-500">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1">
                    Changing goal conditions can alter or remove existing completions. Proceed only if you are confident. We recommend creating new goals instead.
                  </span>
                  <button
                    type="button"
                    onClick={handleRevertRequirements}
                    className="inline-flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-red-200 bg-white/70 px-2.5 py-1 text-[11px] font-semibold leading-none text-red-700 shadow-sm hover:border-red-300 hover:bg-white hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100 dark:hover:border-red-700 dark:hover:bg-red-950/60 dark:focus-visible:ring-red-900/70"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Undo
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Footer always visible */}
          <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={!isValid || !hasChanges || createGoalMutation.isPending || updateGoalMutation.isPending}
            >
              {isEditMode
                ? (updateGoalMutation.isPending ? 'Updating…' : 'Update')
                : (createGoalMutation.isPending ? 'Creating…' : `Create ${capitalize(type)}`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default AchievementDialog;
