import { useEffect, useState } from "react";

/**
 * Shared hook to detect mobile / touch / small-view devices.
 * Uses pointer, touch support, and viewport width heuristics.
 */
export function useIsMobileOrTouch(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = () => {
      const hasCoarsePointer =
        typeof window.matchMedia !== "undefined"
          ? window.matchMedia("(pointer: coarse)").matches
          : false;
      const hasTouchSupport =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallViewport = window.innerWidth < breakpoint;

      setIsMobile(hasCoarsePointer || hasTouchSupport || isSmallViewport);
    };

    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);

    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, [breakpoint]);

  return isMobile;
}

