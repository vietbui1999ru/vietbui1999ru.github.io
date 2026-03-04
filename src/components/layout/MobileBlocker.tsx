"use client";

import * as React from "react";
import { useIsMobileOrTouch } from "@/hooks/useIsMobileOrTouch";

export function MobileBlocker() {
  const isMobile = useIsMobileOrTouch();
  const [dismissed, setDismissed] = React.useState(false);

  if (!isMobile || dismissed) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 md:hidden px-3 pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex max-w-[var(--content-max)] items-start gap-3 rounded-b-2xl border border-border/80 bg-background/95 px-4 py-2 text-xs text-muted-foreground shadow-md backdrop-blur">
        <p className="flex-1 leading-snug">
          Best experienced on desktop, but mobile is fully supported.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full border border-border/80 bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

