import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type PageHeaderVariant = 'achievements' | 'targets' | 'milestones' | 'records';

type HeaderAction = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
  iconOnly?: boolean;
  tooltip?: string;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  backTo: string;
  backLabel?: string;
  icon: LucideIcon;
  variant: PageHeaderVariant;
  actions?: HeaderAction[];
};

const variantStyles: Record<PageHeaderVariant, {
  gradient: string;
  iconBg: string;
  iconColor: string;
  primaryButton: string;
}> = {
  achievements: {
    gradient: 'from-blue-600 to-purple-600',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-500',
    primaryButton: 'bg-yellow-600 hover:bg-yellow-700',
  },
  targets: {
    gradient: 'from-blue-600 to-purple-600',
    iconBg: 'bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800',
    iconColor: 'text-green-500',
    primaryButton: 'bg-green-600 hover:bg-green-700',
  },
  milestones: {
    gradient: 'from-blue-600 to-purple-600',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-500',
    primaryButton: 'bg-blue-600 hover:bg-blue-700',
  },
  records: {
    gradient: 'from-blue-600 to-purple-600',
    iconBg: 'bg-slate-50 dark:bg-slate-900/60 border-slate-300/70 dark:border-slate-700',
    iconColor: 'text-slate-600 dark:text-slate-300',
    primaryButton: 'bg-slate-700 hover:bg-slate-800',
  },
};

export function PageHeader({
  title,
  description,
  backTo,
  backLabel = 'Back to calendar',
  icon: Icon,
  variant,
  actions = [],
}: PageHeaderProps) {
  const styles = variantStyles[variant];

  return (
    <div className="mb-6 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-gradient-to-br from-white via-white to-slate-50/60 dark:from-slate-900/80 dark:via-slate-900/70 dark:to-slate-950/80 shadow-sm">
      <div className="flex flex-col gap-5 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </Link>
          {actions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {actions.map((action) => (
                <ActionButton key={action.label} action={action} styles={styles} />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className={`h-12 w-12 rounded-xl border flex items-center justify-center ${styles.iconBg}`}>
            <Icon className={`h-6 w-6 ${styles.iconColor}`} aria-hidden="true" />
          </div>
          <div>
            <h2 className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${styles.gradient} bg-clip-text text-transparent`}>
              {title}
            </h2>
            {description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type ActionButtonProps = {
  action: HeaderAction;
  styles: {
    primaryButton: string;
  };
};

function ActionButton({ action, styles }: ActionButtonProps) {
  const ActionIcon = action.icon;
  const isSecondary = action.variant === 'secondary';
  const baseButtonClasses = action.iconOnly
    ? isSecondary
      ? 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800'
      : `inline-flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-md ${styles.primaryButton}`
    : isSecondary
      ? 'inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800'
      : `inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold text-sm shadow-md ${styles.primaryButton}`;

  const button = (
    <button
      onClick={action.onClick}
      className={baseButtonClasses}
      aria-label={action.iconOnly ? action.label : undefined}
    >
      {ActionIcon && <ActionIcon className="h-4 w-4" aria-hidden="true" />}
      {!action.iconOnly && action.label}
    </button>
  );

  if (action.iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {action.tooltip ?? action.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
