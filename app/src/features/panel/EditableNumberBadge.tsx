import React, { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getValueForValence } from '@/lib/valence';
import type { Valence } from '@/features/db/localdb';

export interface EditableNumberBadgeProps {
  value: number;
  valenceValue?: number;
  editable?: boolean; // default true
  onCommit?: (nextValue: number | null) => void; // null indicates delete
  valence: Valence;
}

export const EditableNumberBadge: React.FC<EditableNumberBadgeProps> = ({ value, valenceValue, editable = true, onCommit, valence }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>('');
  // Track whether blur should auto-commit or if we've already handled via Enter/Escape
  const handledRef = useRef<'none' | 'commit' | 'cancel'>('none');

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



  // Use valenceValue for coloring
  const displayClasses = getValueForValence(valenceValue ?? 0, valence, {
    good: 'bg-green-500 text-white border-green-600 dark:bg-green-700 dark:text-green-100 dark:border-green-500',
    bad: 'bg-red-500 text-white border-red-600 dark:bg-red-700 dark:text-red-100 dark:border-red-500',
    neutral: 'bg-blue-500 text-white border-blue-600 dark:bg-blue-700 dark:text-blue-100 dark:border-blue-500',
  });
  const displayHoverClasses = getValueForValence(valenceValue ?? 0, valence, {
    good: 'hover:bg-green-600 hover:border-green-700 dark:hover:bg-green-800 dark:hover:border-green-400',
    bad: 'hover:bg-red-600 hover:border-red-700 dark:hover:bg-red-800 dark:hover:border-red-400',
    neutral: 'hover:bg-blue-600 hover:border-blue-700 dark:hover:bg-blue-800 dark:hover:border-blue-400',
  });

  const computeEditClasses = () => {
    const raw = draft.trim();
    if (raw === '') return displayClasses;
    const n = Number(raw);
    if (Number.isNaN(n)) return displayClasses;
    // Use n for valenceValue in edit mode
    return getValueForValence(n, valence, {
      good: 'bg-green-500 text-white border-green-600 dark:bg-green-700 dark:text-green-100 dark:border-green-500',
      bad: 'bg-red-500 text-white border-red-600 dark:bg-red-700 dark:text-red-100 dark:border-red-500',
      neutral: 'bg-blue-500 text-white border-blue-600 dark:bg-blue-700 dark:text-blue-100 dark:border-blue-500',
    });
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
