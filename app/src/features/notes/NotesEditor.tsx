import { Button } from '@/components/ui/button';
import { Confirmation } from '@/components/ui/confirmation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useDatasetContext } from '@/context/DatasetContext';
import type { DateKey } from '@/features/db/localdb';
import { useNote, useSaveNote } from '@/features/db/useNotesData';
import { getPlainText } from '@/features/notes/NotesDisplay';
import { cn } from '@/lib/utils';
import { Copy, CopyCheck, MoreHorizontal, PlusSquare, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface NotesEditorProps {
  dateKey: DateKey;
  className?: string;
}

export function NotesEditor({ dateKey, className }: NotesEditorProps) {
  const { dataset } = useDatasetContext();
  const datasetId = dataset.id;
  const { data: note } = useNote(datasetId, dateKey);
  const saveNoteMutation = useSaveNote();
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const ignoreBlurRef = useRef(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

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

  const handleCopyPlainText = () => {
    const text = getPlainText(draft);
    if (!navigator?.clipboard?.writeText) return;
    void navigator.clipboard.writeText(text);
  };

  const handleCopyHtml = () => {
    if (!navigator?.clipboard?.writeText) return;
    void navigator.clipboard.writeText(draft);
  };

  const handleDelete = async () => {
    await saveNoteMutation.mutateAsync({ datasetId, date: dateKey, text: '' });
    setDraft('');
    setIsEditing(false);
    setIsFocused(false);
  };

  const showEditor = hasNote || isEditing;
  const showHeader = hasNote || isFocused;

  return (
    <div className={cn('min-h-[28px]', className)}>
      {showHeader && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Notes
          </div>
          {(hasNote || isFocused) && (
            <DropdownMenu open={menuOpen} onOpenChange={(open) => {
              setMenuOpen(open);
              if (open) setIsFocused(true);
              if (!open) {
                const editable = editorContainerRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
                if (document.activeElement !== editable) {
                  setIsFocused(false);
                  void handleSave();
                }
              }
            }}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-500 hover:text-slate-700"
                  onMouseDown={() => {
                    ignoreBlurRef.current = true;
                  }}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem className="gap-2" onClick={handleCopyPlainText}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy as Plain Text
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={handleCopyHtml}>
                  <CopyCheck className="h-3.5 w-3.5" />
                  Copy as HTML
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <Confirmation
                  title="Delete note?"
                  description="This clears the note for this day."
                  confirmLabel="Delete"
                  tone="destructive"
                >
                  {(confirm) => (
                    <DropdownMenuItem
                      className="gap-2 text-rose-600 focus:text-rose-700 dark:text-rose-400 dark:focus:text-rose-300 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                      onClick={confirm(handleDelete)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </Confirmation>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
                if (menuOpen) return;
                if (ignoreBlurRef.current) {
                  ignoreBlurRef.current = false;
                  return;
                }
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
