import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import React, { useState } from 'react';

interface AchievementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: AchievementDialogData) => void;
  initialData?: AchievementDialogData;
  type?: 'milestone' | 'target';
}

export interface AchievementDialogData {
  title: string;
  description: string;
  badgeColor: string;
  goal: string; // For now, just a string; replace with actual goal type as needed
}

const badgeColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-red-500',
  'bg-slate-500',
];

export function AchievementDialog({ open, onOpenChange, onSubmit, initialData, type }: AchievementDialogProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [badgeColor, setBadgeColor] = useState(initialData?.badgeColor || badgeColors[0]);
  const [goal, setGoal] = useState(initialData?.goal || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({ title, description, badgeColor, goal });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{type === 'milestone' ? 'Add Milestone' : 'Add Target'}</DialogTitle>
          <DialogDescription>
            {type === 'milestone' ? 'Create a new milestone with a title, description, badge, and goal.' : 'Create a new target with a title, description, badge, and goal.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required maxLength={64} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={256} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Badge Color</label>
            <div className="flex gap-2 mt-1">
              {badgeColors.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`w-7 h-7 rounded-full border-2 ${color} ${badgeColor === color ? 'border-black dark:border-white' : 'border-transparent'}`}
                  aria-label={color}
                  onClick={() => setBadgeColor(color)}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Goal</label>
            <Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Describe the goal (e.g. 100k total)" required />
            {/* Replace with a goal selector UI as needed */}
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AchievementDialog;
