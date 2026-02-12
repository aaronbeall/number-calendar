import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useDatasetContext } from '@/context/DatasetContext';
import type { DateKey } from '@/features/db/localdb';
import { useNote, useSaveNote } from '@/features/db/useNotesData';
import { cn } from '@/lib/utils';
import { PlusSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface NotesEditorProps {
  dateKey: DateKey;
  className?: string;
}

const getPlainText = (value: string) => {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export function NotesEditor({ dateKey, className }: NotesEditorProps) {
  const { dataset } = useDatasetContext();
  const datasetId = dataset.id;
  const { data: note } = useNote(datasetId, dateKey);
  const saveNoteMutation = useSaveNote();
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!isEditing) {
      setDraft(note?.text ?? '');
    }
  }, [note?.text, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    requestAnimationFrame(() => {
      const editable = editorContainerRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
      editable?.focus();
    });
  }, [isEditing]);

  const hasNote = !!getPlainText(note?.text ?? '');

  const handleStartEditing = () => {
    setDraft(note?.text ?? '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    const textContent = getPlainText(draft);
    if (!textContent) {
      setIsEditing(false);
      setDraft(note?.text ?? '');
      return;
    }
    await saveNoteMutation.mutateAsync({ datasetId, date: dateKey, text: draft });
    setIsEditing(false);
  };

  const showEditor = hasNote || isEditing;

  return (
    <div className={cn('min-h-[28px]', className)}>
      {hasNote && (
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Notes
        </div>
      )}
      {!showEditor && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-slate-500"
          onClick={handleStartEditing}
        >
          <PlusSquare className="mr-1 h-3.5 w-3.5" />
          Add note...
        </Button>
      )}

      {showEditor && (
        <div className="space-y-3">
          <RichTextEditor
            value={draft}
            onChange={setDraft}
            hideToolbar={!isFocused}
            containerProps={{
              ref: editorContainerRef,
              onFocusCapture: () => setIsFocused(true),
              onBlurCapture: (event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setIsFocused(false);
                void handleSave();
              },
            }}
            className="min-h-[120px]"
          />
        </div>
      )}
    </div>
  );
}
