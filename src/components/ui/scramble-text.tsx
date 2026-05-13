"use client";

import React, { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
// 700ms total: 350ms scramble-out + 350ms scramble-in
const PHASE_MS = 350;

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

// Strip tags to get plain text for scramble animation
function extractText(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const div = document.createElement("div");
  div.innerHTML = DOMPurify.sanitize(html);
  return div.textContent ?? "";
}

interface ScrambleTextProps {
  /** Pre-rendered HTML string — sanitized before rendering. */
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

  // Viewport gate: only animate content on screen
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

  // Scramble effect — triggered by html prop change (parent increments key)
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
    let phase: "out" | "in" = "out";
    let startTime: number | null = null;

    function step(ts: number) {
      if (startTime === null) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / PHASE_MS, 1);
      const resolved = Math.floor(progress * maxLen);
      const source = phase === "out" ? fromText : toText;

      // Resolve left-to-right; scramble the rest
      let scrambled = "";
      for (let i = 0; i < maxLen; i++) {
        scrambled += i < resolved ? (source[i] ?? "") : randomChar();
      }

      // Plain text scramble frame — no HTML injection risk
      setDisplayHtml(
        `<span aria-hidden="true" style="white-space:pre-wrap;font-family:inherit">${scrambled}</span>`
      );

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else if (phase === "out") {
        phase = "in";
        startTime = null;
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayHtml(cleanHtml);
        prevHtmlRef.current = html;
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
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
