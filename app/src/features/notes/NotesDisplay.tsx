import { useDatasetContext } from '@/context/DatasetContext';
import type { DateKey } from '@/features/db/localdb';
import { useNote } from '@/features/db/useNotesData';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';


export const getPlainText = (value: string) => {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

interface NotesDisplayProps {
  text?: string;
  dateKey?: DateKey;
  className?: string;
}

export function NotesDisplay({ text, dateKey, className }: NotesDisplayProps) {
  const { dataset } = useDatasetContext();
  const datasetId = dataset.id;
  const { data: note } = useNote(datasetId, dateKey ?? ('' as DateKey));
  const noteText = text ?? note?.text ?? '';
  const hasNote = !!getPlainText(noteText);

  if (!hasNote) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border border-slate-200/60 bg-slate-50/60 px-2.5 py-2 text-sm text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.05)] backdrop-blur-[1px] dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-200',
        className
      )}
    >
      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center text-slate-400 dark:text-slate-500">
        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div
        className={cn(
          'flex-1',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
          '[&_a]:underline [&_a]:underline-offset-4'
        )}
        dangerouslySetInnerHTML={{ __html: noteText }}
      />
    </div>
  );
}

export default NotesDisplay;
