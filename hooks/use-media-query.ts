"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

export function useMediaQuery(query: string): boolean {
  const mediaQuery = useMemo(() => window.matchMedia(query), [query]);
  const [matches, setMatches] = useState(mediaQuery.matches);

  const handleChange = useCallback((e: MediaQueryListEvent) => {
    setMatches(e.matches);
  }, []);

  useEffect(() => {
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mediaQuery, handleChange]);

  return matches;
}
