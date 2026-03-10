import { useEffect, useState } from 'react';

/**
 * React hook to subscribe to a CSS media query.
 * Returns whether the query currently matches.
 */
export function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const onChange = () => setMatches(mediaQuery.matches);

    // Set initial value and subscribe.
    onChange();
    mediaQuery.addEventListener('change', onChange);

    return () => mediaQuery.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
