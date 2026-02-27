"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedCursorProps {
  /** Size of the cursor dot in px */
  size?: number;
  /** Color - uses CSS variable or fallback */
  color?: string;
  /** Show only on desktop (hide on touch devices) */
  desktopOnly?: boolean;
}

export function AnimatedCursor({
  size = 12,
  color = "var(--primary)",
  desktopOnly = true,
}: AnimatedCursorProps) {
  const dotRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (desktopOnly && typeof window !== "undefined") {
      const isTouch =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia("(pointer: coarse)").matches;
      if (isTouch) return;
    }

    document.documentElement.classList.add("custom-cursor-active");

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!isVisible) {
        currentX = targetX;
        currentY = targetY;
        setIsVisible(true);
      }
    };

    const handleMouseLeave = () => setIsVisible(false);

    const updateCursor = () => {
      currentX += (targetX - currentX) * 0.2;
      currentY += (targetY - currentY) * 0.2;

      const dot = dotRef.current;
      if (dot) {
        dot.style.left = `${currentX}px`;
        dot.style.top = `${currentY}px`;
      }

      rafRef.current = requestAnimationFrame(updateCursor);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive =
        target.closest("a, button, [role='button'], input, select, textarea");
      setIsPointer(!!interactive);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("mouseover", handleMouseOver);
    rafRef.current = requestAnimationFrame(updateCursor);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("mouseover", handleMouseOver);
      cancelAnimationFrame(rafRef.current);
    };
  }, [desktopOnly, isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[9999]"
      aria-hidden
    >
      <div
        ref={dotRef}
        className={cn(
          "absolute rounded-full bg-primary will-change-[left,top]",
          isPointer && "scale-150 opacity-80"
        )}
        style={{
          width: size,
          height: size,
          left: 0,
          top: 0,
          transform: "translate(-50%, -50%)",
          backgroundColor: color,
        }}
      />
    </div>
  );
}

export default AnimatedCursor;
