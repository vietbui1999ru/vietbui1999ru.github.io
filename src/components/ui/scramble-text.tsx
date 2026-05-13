"use client";

import React, { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
const PHASE_MS = 900; // 900ms out + 900ms in = 1800ms total

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

function extractText(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const div = document.createElement("div");
  div.innerHTML = DOMPurify.sanitize(html);
  return div.textContent ?? "";
}

/**
 * Build a scrambled string that resolves from both ends toward the center.
 * Whitespace characters are always preserved so the text wraps naturally.
 */
function buildFrame(source: string, maxLen: number, progress: number): string {
  const halfLen = Math.floor(maxLen / 2);
  let result = "";
  for (let i = 0; i < maxLen; i++) {
    const char = source[i] ?? " ";
    // Always preserve whitespace — keeps word-level wrapping intact
    if (char === " " || char === "\n" || char === "\t") {
      result += char;
      continue;
    }
    // Distance from the nearest edge (0 = outermost, halfLen = center)
    const distFromEdge = Math.min(i, maxLen - 1 - i);
    const resolved = halfLen === 0 || distFromEdge / halfLen <= progress;
    result += resolved ? char : randomChar();
  }
  return result;
}

interface ScrambleTextProps {
  /** Pre-rendered HTML string — sanitized before use. */
  html: string;
  className?: string;
}

export default function ScrambleText({ html, className }: ScrambleTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [displayHtml, setDisplayHtml] = useState(() =>
    typeof window !== "undefined" ? DOMPurify.sanitize(html) : html
  );
  const prevHtmlRef = useRef(html);
  const rafRef = useRef<number | null>(null);

  // Viewport gate — only animate when visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const cleanHtml = DOMPurify.sanitize(html);

    if (!isVisible) {
      setDisplayHtml(cleanHtml);
      prevHtmlRef.current = html;
      return;
    }

    const fromText = extractText(prevHtmlRef.current);
    const toText = extractText(html);
    const maxLen = Math.max(fromText.length, toText.length);

    const el = containerRef.current;

    // Lock container height before swapping content to prevent page reflow
    if (el) {
      el.style.height = `${el.offsetHeight}px`;
      el.style.overflow = "hidden";
    }

    let phase: "out" | "in" = "out";
    let startTime: number | null = null;

    function step(ts: number) {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / PHASE_MS, 1);
      const source = phase === "out" ? fromText : toText;
      const scrambled = buildFrame(source, maxLen, progress);

      // Block display + word wrapping keeps scrambled text inside the locked container
      setDisplayHtml(
        `<span style="display:block;word-break:break-word;white-space:normal">${scrambled}</span>`
      );

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else if (phase === "out") {
        phase = "in";
        startTime = null;
        rafRef.current = requestAnimationFrame(step);
      } else {
        // Animation done — restore real HTML and release height lock
        setDisplayHtml(cleanHtml);
        prevHtmlRef.current = html;
        if (el) {
          el.style.height = "";
          el.style.overflow = "";
        }
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        if (el) {
          el.style.height = "";
          el.style.overflow = "";
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, isVisible]);

  return (
    <div
      ref={containerRef}
      className={cn(className)}
      dangerouslySetInnerHTML={{ __html: displayHtml }}
    />
  );
}
