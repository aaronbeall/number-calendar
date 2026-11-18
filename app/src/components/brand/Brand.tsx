import { cn } from '@/lib/utils';

/**
 * Numbers Go Up brand mark: a red down arrow and a green up arrow joined by a folded
 * ribbon into an "N". Geometry and colours match the artwork in app/art/brand/.
 *
 * - `color` (default): red and green, reads on light and dark backgrounds alike.
 * - `mono`: single colour from `currentColor`, with the folds slightly dimmed.
 */
export function BrandMark({
  variant = 'color',
  className,
  title,
}: {
  variant?: 'color' | 'mono';
  className?: string;
  title?: string;
}) {
  const mono = variant === 'mono';
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <polygon fill={mono ? 'currentColor' : '#a11f23'} fillOpacity={mono ? 0.75 : undefined} points="29,0 58,41 58,50 29,12" />
      <polygon fill={mono ? 'currentColor' : '#40a160'} fillOpacity={mono ? 0.75 : undefined} points="71,100 42,59 42,50 71,88" />
      <polygon fill={mono ? 'currentColor' : '#d42627'} points="11,0 29,0 29,66 40,66 20,100 0,66 11,66" />
      <polygon fill={mono ? 'currentColor' : '#397c47'} points="80,0 100,34 89,34 89,100 71,100 71,34 60,34" />
    </svg>
  );
}

/** The lowercase "numbers go up" wordmark, navy on light and near-white on dark. */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-brand font-extrabold lowercase tracking-[-0.01em] text-brand-navy dark:text-slate-50 whitespace-nowrap', className)}>
      numbers go up
    </span>
  );
}

/** Mark and wordmark side by side. Size it with a text size class; the mark follows. */
export function BrandLogo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-[0.4em] leading-none', className)}>
      <BrandMark className={cn('h-[1.15em] w-[1.15em]', markClassName)} />
      <BrandWordmark />
    </span>
  );
}
