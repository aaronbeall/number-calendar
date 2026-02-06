import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export type PageStateAction = {
  label: string;
  to: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
};

interface LoadingStateProps {
  title?: string;
  message?: string;
  className?: string;
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  details?: string;
  actions?: PageStateAction[];
  className?: string;
}

export function LoadingState({
  title = 'Preparing your view',
  message,
  className,
}: LoadingStateProps) {
  return (
    <div className={cn('min-h-[60vh] flex items-center justify-center px-6', className)}>
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <Spinner className="size-4" />
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {message}
        </p>
      </div>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not find what you were looking for.',
  details,
  actions = [{ label: 'Back to home', to: '/', variant: 'default' }],
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('min-h-[60vh] flex items-center justify-center px-6', className)}>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 shadow-sm dark:bg-rose-950/60 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {message}
        </p>
        {details && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
            {details}
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {actions.map((action) => (
            <Button key={action.label} asChild variant={action.variant ?? 'default'}>
              <Link to={action.to}>{action.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
