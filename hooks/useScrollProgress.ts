"use client";

import { useEffect, useState } from "react";

/**
 * Returns scroll progress (0-1) through a section as the user scrolls.
 * Progress 0 = section just entered viewport (top at top).
 * Progress 1 = section fully scrolled through (bottom at top of viewport).
 */
export function useScrollProgress(sectionRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollRange = el.offsetHeight - vh;
      if (scrollRange <= 0) {
        setProgress(rect.top <= vh ? 1 : 0);
        return;
      }
      // progress 0 = section top at viewport top
      // progress 1 = section bottom at viewport top (scrolled through)
      const clamped = Math.max(0, Math.min(1, -rect.top / scrollRange));
      setProgress(clamped);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sectionRef]);

  return progress;
}
