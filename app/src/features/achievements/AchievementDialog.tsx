import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type GoalAttributes, type GoalBadge, type GoalType } from '@/features/db/localdb';
import { achievementBadgeColors, achievementBadgeIcons, achievementBadgeStyles } from '@/lib/achievements';
import { getSuggestedGoalContent, isValidGoalAttributes } from '@/lib/goals';
import { randomKeyOf } from '@/lib/utils';
import { Dices, Palette } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import AchievementBadge from './AchievementBadge';
import { BadgeEditDialog } from './BadgeEditDialog';
import { GoalBuilder } from './GoalBuilder';

interface AchievementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: AchievementDialogData) => void;
  initialData?: AchievementDialogData;
  type: GoalType; 
}

export interface AchievementDialogData {
  title: string;
  description: string;
  badge: GoalBadge;
  goal: GoalAttributes;
}

export function AchievementDialog({ open, onOpenChange, onSubmit, initialData, type }: AchievementDialogProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [badge, setBadge] = useState<GoalBadge>(initialData?.badge ?? { style: 'badge', color: 'gold', icon: 'star', label: undefined });
  const [goal, setGoal] = useState<Partial<GoalAttributes>>(initialData?.goal ?? { count: 1 });
  const [badgeEditOpen, setBadgeEditOpen] = useState(false);

  const sugggested = getSuggestedGoalContent({ title, description, badge, ...goal });

  const previewBadge = useMemo(() => ({
    ...badge,
    label: badge.label ?? sugggested.label,
  }), [badge, sugggested.label]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isValidGoalAttributes(goal) && onSubmit?.({ 
      title: title || sugggested.title, 
      description: description || sugggested.description, 
      badge: {
        ...badge,
        label: badge.label ?? sugggested.label,
      }, 
      goal
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] p-0 gap-0 w-full sm:max-w-2xl flex flex-col">
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle>{type === 'milestone' ? 'Add Milestone' : 'Add Target'}</DialogTitle>
          <DialogDescription>
            {type === 'milestone' ? 'Create a new milestone with a title, description, badge, and goal.' : 'Create a new target with a title, description, badge, and goal.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 max-h-[90vh]">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-6 md:flex-row md:gap-8">
              {/* Left Column: Goal Builder */}
              <div className="flex flex-col gap-2 md:w-1/2">
                <label className="block text-sm font-medium">Goal</label>
                <GoalBuilder value={goal} onChange={setGoal} />
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
                  <AchievementBadge badge={previewBadge} size="large" />
                  <Input 
                    value={title} 
                    placeholder={sugggested.title} 
                    onChange={e => setTitle(e.target.value)} 
                    maxLength={64}
                    className="font-bold text-lg text-center border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 px-2 py-1"
                  />
                  <Textarea 
                    value={description} 
                    placeholder={sugggested.description} 
                    onChange={e => setDescription(e.target.value)} 
                    maxLength={256} 
                    rows={3}
                    className="text-xs text-slate-500 text-center border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 resize-none px-2 py-1"
                  />
                  <BadgeEditDialog
                    open={badgeEditOpen}
                    onOpenChange={setBadgeEditOpen}
                    badge={previewBadge}
                    onChange={setBadge}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Footer always visible */}
          <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!isValid}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default AchievementDialog;
