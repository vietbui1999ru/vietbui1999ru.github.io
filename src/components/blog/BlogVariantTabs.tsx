"use client";

import React, { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import ScrambleText from "@/components/ui/scramble-text";

interface TabData {
  label: string;
  html: string;
}

interface BlogVariantTabsProps {
  /** DOM id of the hidden div containing pre-rendered variant HTML nodes. */
  storageId: string;
  proseClass?: string;
}

export default function BlogVariantTabs({ storageId, proseClass }: BlogVariantTabsProps) {
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  // Read pre-rendered HTML from hidden storage div (Astro renders it at build time)
  useEffect(() => {
    const storage = document.getElementById(storageId);
    if (!storage) return;
    const nodes = Array.from(storage.querySelectorAll<HTMLElement>("[data-variant-label]"));
    const parsed: TabData[] = nodes.map((node) => ({
      label: node.dataset.variantLabel ?? "",
      html: node.innerHTML,
    }));
    setTabs(parsed);
    storage.setAttribute("aria-hidden", "true");
    storage.style.display = "none";
    window.dispatchEvent(new CustomEvent("variant-change"));
  }, [storageId]);

  const handleTabClick = useCallback(
    (idx: number) => {
      if (idx === activeIdx) return;
      setActiveIdx(idx);
      window.dispatchEvent(new CustomEvent("variant-change"));
    },
    [activeIdx]
  );

  // Pre-hydration placeholder — will be replaced after useEffect runs
  if (tabs.length === 0) {
    return <div className={cn(proseClass)} />;
  }

  if (tabs.length === 1) {
    return <ScrambleText html={tabs[0].html} className={proseClass} />;
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-border" role="tablist">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            role="tab"
            aria-selected={idx === activeIdx}
            onClick={() => handleTabClick(idx)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t transition-colors -mb-px border-b-2",
              idx === activeIdx
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ScrambleText
        html={tabs[activeIdx].html}
        className={proseClass}
      />
    </div>
  );
}
