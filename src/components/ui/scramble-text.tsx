"use client";

import React, { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
const PHASE_MS = 2000;

const STATIC_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
  "figure",
  "picture",
]);

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

/**
 * Scrambles `source` from both ends toward center.
 * progress=0: edges resolved, center scrambled.
 * progress=1: fully resolved.
 * Whitespace preserved so text wraps naturally.
 */
function buildFrame(source: string, progress: number): string {
  const len = source.length;
  const halfLen = Math.floor(len / 2);
  let result = "";
  for (let i = 0; i < len; i++) {
    const char = source[i];
    if (char === " " || char === "\n" || char === "\t") {
      result += char;
      continue;
    }
    const distFromEdge = Math.min(i, len - 1 - i);
    const resolved = halfLen === 0 || distFromEdge / halfLen <= progress;
    result += resolved ? char : randomChar();
  }
  return result;
}

type ChildInfo =
  | { kind: "static"; html: string }
  | { kind: "animated"; tag: string; text: string };

/** True for elements that should never scramble (headers, images, image-containing blocks). */
function isStaticElement(el: Element): boolean {
  return (
    STATIC_TAGS.has(el.tagName.toLowerCase()) ||
    el.querySelector("img") !== null
  );
}

/** Pre-compute per-element metadata once, not on every rAF frame. */
function parseChildInfo(div: HTMLElement): ChildInfo[] {
  return Array.from(div.children).map((child) => {
    if (isStaticElement(child))
      return { kind: "static", html: child.outerHTML };
    const tag = child.tagName.toLowerCase();
    return { kind: "animated", tag, text: child.textContent ?? "" };
  });
}

interface ScrambleTextProps {
  /** Pre-rendered HTML string — sanitized before use. */
  html: string;
  className?: string;
}

/** Render a fully-scrambled (progress=0) version of html for the initial paint. */
function scrambledInitialState(html: string): string {
  const cleanHtml = DOMPurify.sanitize(html);
  const div = document.createElement("div");
  // cleanHtml is DOMPurify-sanitized; div is detached
  div.innerHTML = cleanHtml; // safe: sanitized source, detached container
  const children = parseChildInfo(div);
  let result = "";
  for (const info of children) {
    if (info.kind === "static") {
      result += info.html;
    } else {
      result += `<${info.tag} style="word-break:break-word;white-space:normal">${buildFrame(info.text, 0)}</${info.tag}>`;
    }
  }
  return result || cleanHtml;
}

export default function ScrambleText({ html, className }: ScrambleTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [displayHtml, setDisplayHtml] = useState(() =>
    typeof window !== "undefined" ? scrambledInitialState(html) : html,
  );
  const rafRef = useRef<number | null>(null);

  // Viewport gate — only animate when visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 },
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

    if (!isVisible) return;

    // Parse target HTML once — DOM work happens here, not on every rAF frame
    const toDiv = document.createElement("div");
    // cleanHtml is already DOMPurify-sanitized; toDiv is detached (never inserted into the page)
    toDiv.innerHTML = cleanHtml; // safe: sanitized source, detached container
    const toChildInfo = parseChildInfo(toDiv);

    const el = containerRef.current;

    // Lock height before animation to prevent page reflow during scramble
    if (el) {
      el.style.height = `${el.offsetHeight}px`;
      el.style.overflow = "hidden";
    }

    let startTime: number | null = null;

    function step(ts: number) {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / PHASE_MS, 1);

      // Each child scrambles independently — first paragraph gets the full PHASE_MS
      let result = "";
      for (const info of toChildInfo) {
        if (info.kind === "static") {
          result += info.html;
        } else {
          const scrambled = buildFrame(info.text, progress);
          result += `<${info.tag} style="word-break:break-word;white-space:normal">${scrambled}</${info.tag}>`;
        }
      }
      setDisplayHtml(result || cleanHtml);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayHtml(cleanHtml);
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
