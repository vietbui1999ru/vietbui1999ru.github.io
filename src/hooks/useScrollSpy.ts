import { useEffect, useLayoutEffect, useState } from "react";
import { SECTION_IDS, SCROLL_ACTIVE_THRESHOLD } from "@/data/navigationData";

// Map URL path prefixes to nav hrefs for multi-page routes
const PATH_TO_HASH: Array<[string, string]> = [
  ["/blog", "#blog"],
  ["/gallery", "#gallery"],
];

function hashFromPathname(): string | null {
  if (typeof window === "undefined") return null;
  const { pathname } = window.location;
  for (const [prefix, hash] of PATH_TO_HASH) {
    if (pathname.startsWith(prefix)) return hash;
  }
  return null;
}

/**
 * Tracks which section is currently in view based on scroll position.
 * On multi-page routes (e.g. /blog/*), derives active item from pathname instead.
 * Returns the active href (e.g. "#home", "#blog").
 */
export function useScrollSpy(defaultHash = "#home") {
  const [activeHash, setActiveHash] = useState(defaultHash);

  // useLayoutEffect runs before paint — avoids a one-frame flash of the wrong icon.
  // SSR renders defaultHash; this corrects it client-side before the browser paints.
  useLayoutEffect(() => {
    const fromPath = hashFromPathname();
    if (fromPath !== null) setActiveHash(fromPath);
  }, []);

  useEffect(() => {
    if (hashFromPathname() !== null) return;

    const handleScroll = () => {
      for (let i = SECTION_IDS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTION_IDS[i]);
        if (el && el.getBoundingClientRect().top <= SCROLL_ACTIVE_THRESHOLD) {
          setActiveHash(`#${SECTION_IDS[i]}`);
          return;
        }
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return activeHash;
}
