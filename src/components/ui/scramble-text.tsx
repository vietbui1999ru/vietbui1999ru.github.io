"use client";

import React, { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
const PHASE_MS = 900; // 900ms out + 900ms in = 1800ms total

// These element types are never scrambled — they snap to the new value at phase boundary
const STATIC_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "img", "figure", "picture"]);

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
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
    if (char === " " || char === "\n" || char === "\t") {
      result += char;
      continue;
    }
    const distFromEdge = Math.min(i, maxLen - 1 - i);
    const resolved = halfLen === 0 || distFromEdge / halfLen <= progress;
    result += resolved ? char : randomChar();
  }
  return result;
}

type ChildInfo =
  | { kind: "static"; html: string }
  | { kind: "animated"; tag: string; textLen: number };

/** True for elements that should never scramble (headers, images, image-containing blocks). */
function isStaticElement(el: Element): boolean {
  return STATIC_TAGS.has(el.tagName.toLowerCase()) || el.querySelector("img") !== null;
}

/** Pre-compute per-element animation metadata once, not on every frame. */
function parseChildInfo(div: HTMLElement): ChildInfo[] {
  return Array.from(div.children).map((child) => {
    if (isStaticElement(child)) return { kind: "static", html: child.outerHTML };
    const tag = child.tagName.toLowerCase();
    return { kind: "animated", tag, textLen: (child.textContent ?? "").length };
  });
}

/** Concatenate text content of all non-static top-level children. */
function collectAnimatableText(div: HTMLElement): string {
  return Array.from(div.children)
    .filter((el) => !isStaticElement(el))
    .map((el) => el.textContent ?? "")
    .join("");
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
      { threshold: 0 }
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

    // Parse both sides once — DOMPurify + DOM walk happen here, not on every frame
    const fromDiv = document.createElement("div");
    fromDiv.innerHTML = DOMPurify.sanitize(prevHtmlRef.current);
    const toDiv = document.createElement("div");
    toDiv.innerHTML = cleanHtml;

    const fromText = collectAnimatableText(fromDiv);
    const toText = collectAnimatableText(toDiv);
    const maxLen = Math.max(fromText.length, toText.length);
    const toChildInfo = parseChildInfo(toDiv);

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

      // Static elements render verbatim; animated elements get scrambled plain text
      let animOffset = 0;
      let result = "";
      for (const info of toChildInfo) {
        if (info.kind === "static") {
          result += info.html;
        } else {
          const chunk = scrambled.slice(animOffset, animOffset + info.textLen);
          animOffset += info.textLen;
          result += `<${info.tag} style="word-break:break-word;white-space:normal">${chunk}</${info.tag}>`;
        }
      }
      setDisplayHtml(result || cleanHtml);

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
