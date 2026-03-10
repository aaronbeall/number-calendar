import { useInView } from '@/hooks/useInView';
import type { ReactNode } from 'react';

interface LazyChartProps {
  children: ReactNode;
  /** Minimum height to reserve space for the chart before it loads */
  minHeight?: string | number;
  /** Fallback content to show while not in view */
  fallback?: ReactNode;
}

/**
 * Wrapper component that only renders children when scrolled into viewport
 * Useful for expensive chart components to improve initial page load performance
 */
export function LazyChart({ children, minHeight = '400px', fallback }: LazyChartProps) {
  const [ref, isInView] = useInView({ once: true, rootMargin: '200px' });

  return (
    <div ref={ref} style={{ minHeight: isInView ? undefined : minHeight }}>
      {isInView ? children : (fallback || null)}
    </div>
  );
}
