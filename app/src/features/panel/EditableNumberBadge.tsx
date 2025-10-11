import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export interface EditableNumberBadgeProps {
  value: number;
  editable?: boolean; // default true
  onCommit?: (nextValue: number | null) => void; // null indicates delete
}

export const EditableNumberBadge: React.FC<EditableNumberBadgeProps> = ({ value, editable = true, onCommit }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<string>('');
  // Track whether blur should auto-commit or if we've already handled via Enter/Escape
  const handledRef = React.useRef<'none' | 'commit' | 'cancel'>('none');

  const beginEdit = () => {
    if (!editable) return;
    setDraft(String(value));
    setIsEditing(true);
    handledRef.current = 'none';
  };

  const cancel = () => {
    handledRef.current = 'cancel';
    setIsEditing(false);
    setDraft('');
  };

  const commit = () => {
    handledRef.current = 'commit';
    const raw = draft.trim();
    if (raw === '') {
      onCommit && onCommit(null);
      cancel();
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) {
      // invalid -> revert
      cancel();
      return;
    }
    onCommit && onCommit(n);
    cancel();
  };


  // Color classes for light/dark mode
  const neutralClasses = 'bg-slate-500 text-white border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-500';
  const positiveClasses = 'bg-green-500 text-white border-green-600 dark:bg-green-700 dark:text-green-100 dark:border-green-500';
  const negativeClasses = 'bg-red-500 text-white border-red-600 dark:bg-red-700 dark:text-red-100 dark:border-red-500';

  const neutralHover = 'hover:bg-slate-600 hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-slate-400';
  const positiveHover = 'hover:bg-green-600 hover:border-green-700 dark:hover:bg-green-800 dark:hover:border-green-400';
  const negativeHover = 'hover:bg-red-600 hover:border-red-700 dark:hover:bg-red-800 dark:hover:border-red-400';

  const displayClasses =
    value > 0 ? positiveClasses : value < 0 ? negativeClasses : neutralClasses;

  const computeEditClasses = () => {
    const raw = draft.trim();
    if (raw === '') return neutralClasses;
    const n = Number(raw);
    if (Number.isNaN(n)) return neutralClasses;
    return n > 0 ? positiveClasses : n < 0 ? negativeClasses : neutralClasses;
  };

  if (editable && isEditing) {
    return (
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        onBlur={() => {
          // Only auto-commit on blur if Enter/Escape haven't already handled it
          if (handledRef.current === 'none') {
            commit();
          }
        }}
  className={`h-6 px-2 py-0.5 text-xs font-mono w-20 ${computeEditClasses()} border transition-colors`}
        aria-label={`Edit number`}
      />
    );
  }

  const displayHoverClasses = value > 0 ? positiveHover : value < 0 ? negativeHover : neutralHover;

  return (
    <Badge
      onClick={editable ? beginEdit : undefined}
      className={`${editable ? 'cursor-text' : 'cursor-default'} text-xs px-2 py-0.5 shadow-sm hover:shadow-md transition-colors ${displayClasses} ${displayHoverClasses}`}
      aria-label={`Number, click to edit`}
    >
      {value}
    </Badge>
  );
};
