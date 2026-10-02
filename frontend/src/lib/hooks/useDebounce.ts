import { useEffect, useState } from "react";

/**
 * Example cross-feature hook - anything shared by more than one feature belongs in
 * lib/hooks; anything specific to one feature belongs in features/<feature>/hooks
 * (CLAUDE.md section 46.2).
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
