"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type MarqueeProps = {
  children: React.ReactNode;
  className?: string;
  /** When true, scrolls right instead of left. */
  reverse?: boolean;
  /** Duration in seconds for one full loop. */
  duration?: number;
};

export function Marquee({
  children,
  className,
  reverse = false,
  duration = 15,
}: MarqueeProps) {
  const animationName = reverse ? "marquee-horizontal-right" : "marquee-horizontal-left";

  return (
    <div className={cn("relative flex overflow-hidden", className)}>
      <div
        className="marquee-track flex min-w-full shrink-0 items-center gap-3"
        style={{
          animation: `${animationName} ${duration}s linear infinite`,
        }}
      >
        <div className="flex items-center gap-3">{children}</div>
        <div className="flex items-center gap-3" aria-hidden="true">
          {children}
        </div>
      </div>

      <style>{`
        .marquee-track:hover {
          animation-play-state: paused;
        }
        @keyframes marquee-horizontal-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-horizontal-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

