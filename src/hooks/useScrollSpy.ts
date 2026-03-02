import { useEffect, useState } from "react";
import { SECTION_IDS, SCROLL_ACTIVE_THRESHOLD } from "@/data/navigationData";

/**
 * Tracks which section is currently in view based on scroll position.
 * Returns the active href (e.g. "#home", "#about").
 */
export function useScrollSpy(defaultHash = "#home") {
  const [activeHash, setActiveHash] = useState(defaultHash);

  useEffect(() => {
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
