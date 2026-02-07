import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { achievementBadgeColors, achievementBadgeIcons, achievementBadgeStyles } from '@/lib/achievements';
import { cn, keysOf, titleCase } from '@/lib/utils';
import { Dices } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { GoalBadge } from '../db/localdb';
import AchievementBadge from './AchievementBadge';

// BadgeEditDialog: for editing badge label, icon, style, color
export function BadgeEditDialog({ open, onOpenChange, badge, onSave, saveLabel = 'Save' }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badge: GoalBadge;
  onSave(v: GoalBadge): void;
  saveLabel?: string;
}) {
  const [draftBadge, setDraftBadge] = useState<GoalBadge>(badge);

  useEffect(() => {
    if (open) {
      setDraftBadge(badge);
    }
  }, [open, badge]);

  // Dice icon from lucide-react
  // Import at top: import { Dice5 } from 'lucide-react';
  // Randomize function
  function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function handleRandomize() {
    setDraftBadge({
      ...draftBadge,
      color: randomItem(keysOf(achievementBadgeColors)),
      icon: randomItem(keysOf(achievementBadgeIcons)),
      style: randomItem(keysOf(achievementBadgeStyles)),
    });
  }
  function handleUpdateBadgeField<K extends keyof GoalBadge>(field: K, value: GoalBadge[K]) {
    setDraftBadge({
      ...draftBadge,
      [field]: value,
    });
  }

  function handleSave() {
    onSave(draftBadge);
    onOpenChange(false);
  }

  function handleCancel() {
    setDraftBadge(badge);
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Badge</DialogTitle>
          <DialogDescription>Customize the badge appearance and label.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-row gap-6 py-2">
          {/* Badge Preview (left) */}
          <div className="flex flex-col items-center gap-2 min-w-[140px]">
            <AchievementBadge badge={draftBadge} size="large" />
            <div className="text-xs text-slate-500">Preview</div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 mt-1 mb-1"
              onClick={handleRandomize}
              title="Randomize badge appearance"
            >
              <Dices className="w-4 h-4" /> Random
            </button>
          </div>
          {/* Options (right) */}
          <div className="flex-1 grid grid-cols-1 gap-4 min-w-0">
            <div>
              <label className="block text-sm font-medium mb-1">Label</label>
              <Input value={draftBadge.label} onChange={e => handleUpdateBadgeField('label', e.target.value)} maxLength={32} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {keysOf(achievementBadgeColors).map(color => {
                  const colors = achievementBadgeColors[color];
                  const isSelected = draftBadge.color === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'w-9 h-9 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500 dark:focus-visible:ring-slate-400',
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-slate-100 ring-offset-white dark:ring-offset-slate-950 shadow-md scale-110'
                          : 'border-transparent',
                      )}
                      style={{
                        background: colors.bg,
                        borderColor: colors.border,
                      }}
                      aria-label={color}
                      aria-pressed={isSelected}
                      onClick={() => handleUpdateBadgeField('color', color)}
                      title={titleCase(color)}
                    >
                      <div
                        className="w-4 h-2 rounded-full"
                        style={{ background: colors.bg == colors.accent ? colors.label : colors.accent }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            <IconSelector
              options={achievementBadgeIcons}
              value={draftBadge.icon}
              onChange={val => handleUpdateBadgeField('icon', val)}
              label="Icon"
            />
            <IconSelector
              options={achievementBadgeStyles}
              value={draftBadge.style}
              onChange={val => handleUpdateBadgeField('style', val)}
              label="Graphic"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button type="button" onClick={handleSave}>{saveLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Reusable icon selector
type IconSelectorProps<T extends string> = {
  options: Record<T, any>;
  value: T | undefined;
  onChange: (val: T) => void;
  label?: string;
  className?: string;
};

function IconSelector<T extends string>({ options, value, onChange, label, className }: IconSelectorProps<T>) {
  const [search, setSearch] = useState('');
  const filtered = keysOf(options).filter(k => !search || k.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between mb-1">
        {label && <div className="font-medium text-sm">{label}</div>}
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-xs h-7 w-32 px-2 border rounded ml-2"
        />
      </div>
      <div className="grid grid-cols-8 gap-1.5 md:grid-cols-6 max-h-28 overflow-y-auto p-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
        {filtered.map(k => {
          const Icon = options[k];
          const selected = value === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k)}
              className={cn(
                'flex items-center justify-center rounded border p-1.5 transition',
                selected
                  ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
              aria-pressed={selected}
              aria-label={k}
              title={titleCase(k)}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}