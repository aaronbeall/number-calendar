import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export interface EditableNumberBadgeProps {
  value: number;
  onCommit: (nextValue: number | null) => void; // null indicates delete
}

export const EditableNumberBadge: React.FC<EditableNumberBadgeProps> = ({ value, onCommit }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<string>('');
  // Track whether blur should auto-commit or if we've already handled via Enter/Escape
  const handledRef = React.useRef<'none' | 'commit' | 'cancel'>('none');

  const beginEdit = () => {
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
      onCommit(null);
      cancel();
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) {
      // invalid -> revert
      cancel();
      return;
    }
    onCommit(n);
    cancel();
  };

  const neutralClasses = 'bg-slate-500 text-white border-slate-600';
  const positiveClasses = 'bg-green-500 text-white border-green-600';
  const negativeClasses = 'bg-red-500 text-white border-red-600';

  const displayClasses =
    value > 0 ? positiveClasses : value < 0 ? negativeClasses : neutralClasses;

  const computeEditClasses = () => {
    const raw = draft.trim();
    if (raw === '') return neutralClasses;
    const n = Number(raw);
    if (Number.isNaN(n)) return neutralClasses;
    return n > 0 ? positiveClasses : n < 0 ? negativeClasses : neutralClasses;
  };

  if (isEditing) {
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
        className={`h-6 px-2 py-0.5 text-xs font-mono w-20 ${computeEditClasses()} border`}
        aria-label={`Edit number`}
      />
    );
  }

  return (
    <Badge
      onClick={beginEdit}
      className={`cursor-text text-xs px-2 py-0.5 shadow-sm transition-all ${displayClasses}`}
      aria-label={`Number, click to edit`}
    >
      {value}
    </Badge>
  );
};
