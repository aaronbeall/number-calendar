import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type BackToCalendarButtonProps = {
  datasetId?: string;
};

export function BackToCalendarButton({ datasetId }: BackToCalendarButtonProps) {
  return (
    <div className="mb-4">
      <Link
        to={`/dataset/${datasetId ?? ''}`}
        className="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to calendar
      </Link>
    </div>
  );
}
