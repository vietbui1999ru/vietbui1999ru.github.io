import React, { useState, useEffect } from "react";
import { Leva } from "leva";

// ---------------------------------------------------------------------------
// Extracted hook — unit-testable without Leva or WebGL
// ---------------------------------------------------------------------------

export interface LevaPanelVisibility {
  /** When true, the Leva panel is hidden (pass directly to <Leva hidden={...} />) */
  hidden: boolean;
}

/**
 * Manages Leva panel visibility with:
 * - Initial state: visible on desktop (≥768px), hidden on mobile (<768px).
 * - Keyboard `L` / `l`: toggles visibility, desktop only.
 *
 * Exported for unit testing. Consumed by `LevaPanel` component.
 */
export function useLevaPanelVisibility(): LevaPanelVisibility {
  const isMobile = (): boolean => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  };

  const [hidden, setHidden] = useState<boolean>(() => isMobile());

  useEffect(() => {
    const mobile = isMobile();

    function handleKeyDown(e: KeyboardEvent) {
      if (mobile) return;
      if (e.key === "l" || e.key === "L") {
        // Ignore if focus is inside an input/textarea/contenteditable
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        setHidden((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return { hidden };
}

// ---------------------------------------------------------------------------
// LevaPanel component
// ---------------------------------------------------------------------------

/**
 * Global Leva control panel.
 *
 * Mount this once in BaseLayout (alongside AppCanvasIsland). It renders the
 * global Leva panel whose schema is populated by whichever sim is active.
 * Schema composition (active sim → leva controls) is handled by calling
 * `useControls` inside each sim's Scene component; Leva merges them
 * automatically into this single panel via its internal store.
 *
 * Keyboard `L` toggles visibility. Hidden by default on mobile.
 */
export function LevaPanel(): React.ReactElement {
  const { hidden } = useLevaPanelVisibility();

  return (
    <Leva
      hidden={hidden}
      collapsed={false}
      theme={{
        sizes: { rootWidth: "280px" },
      }}
    />
  );
}

export default LevaPanel;
