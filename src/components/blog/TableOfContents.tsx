"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

type Heading = { id: string; text: string; depth: 2 | 3 };

function extractHeadings(contentId: string): Heading[] {
  const root = document.getElementById(contentId);
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>("h2, h3"))
    .filter((el) => el.id)
    .map((el) => ({
      id: el.id,
      text: el.textContent?.trim() ?? "",
      depth: parseInt(el.tagName[1]) as 2 | 3,
    }));
}

export function TableOfContents({ contentId }: { contentId: string }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setupObserver = useCallback((hs: Heading[]) => {
    observerRef.current?.disconnect();
    if (hs.length === 0) return;

    const visible = new Set<string>();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        // active = topmost currently intersecting heading
        const active = hs.find((h) => visible.has(h.id));
        if (active) setActiveId(active.id);
      },
      { rootMargin: "-80px 0px -66% 0px", threshold: 0 },
    );

    hs.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });
  }, []);

  const refresh = useCallback(() => {
    const hs = extractHeadings(contentId);
    setHeadings(hs);
    setupObserver(hs);
  }, [contentId, setupObserver]);

  useEffect(() => {
    // wait one frame for ScrambleText to paint static elements
    const t = setTimeout(refresh, 50);

    const onVariantChange = () => setTimeout(refresh, 100);
    window.addEventListener("variant-change", onVariantChange);

    return () => {
      clearTimeout(t);
      window.removeEventListener("variant-change", onVariantChange);
      observerRef.current?.disconnect();
    };
  }, [refresh]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        On this page
      </p>
      <ul className="space-y-0.5">
        {headings.map(({ id, text, depth }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                setActiveId(id);
              }}
              className={cn(
                "block text-sm leading-relaxed py-1 transition-colors border-l-2",
                depth === 2 ? "pl-3" : "pl-5",
                activeId === id
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
