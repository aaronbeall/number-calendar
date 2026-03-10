import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  /** Only trigger once when element enters viewport */
  once?: boolean;
  /** Root margin for intersection observer (e.g., '100px' to trigger 100px before element is visible) */
  rootMargin?: string;
  /** Threshold for intersection (0 to 1) */
  threshold?: number;
}

/**
 * Hook to detect when an element is visible in the viewport
 * @param options Configuration for intersection observer
 * @returns [ref, isInView] - Ref to attach to element and boolean indicating visibility
 */
export function useInView<T extends Element = HTMLDivElement>(
  options: UseInViewOptions = {}
): [React.RefObject<T>, boolean] {
  const { once = false, rootMargin = '100px', threshold = 0 } = options;
  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);
  const hasBeenInView = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If once=true and already been in view, don't set up observer
    if (once && hasBeenInView.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        setIsInView(inView);
        
        if (inView && once) {
          hasBeenInView.current = true;
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [once, rootMargin, threshold]);

  return [ref, isInView];
}
