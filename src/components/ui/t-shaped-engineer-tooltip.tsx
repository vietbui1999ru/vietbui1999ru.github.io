"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import tShapedDiagram from "@/assets/images/t-shaped.png";
import { useIsMobileOrTouch } from "@/hooks/useIsMobileOrTouch";

type TShapedEngineerTooltipProps = {
  children: React.ReactNode;
  className?: string;
};

export function TShapedEngineerTooltip({
  children,
  className,
}: TShapedEngineerTooltipProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [open, setOpen] = React.useState(false);
  const isTouchDevice = useIsMobileOrTouch();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // The useTransform hooks below create animated rotation values for the tooltip card.
  // The input range [-0.5, 0.5] means: when the mouse is at the far left/top edge of the element, value is -0.5;
  // at the center, value is 0; at the far right/bottom, value is 0.5.
  // For rotateX:
  //    y=-0.5 (top) maps to +12 degrees: tooltip tilts "back" (away from user).
  //    y=0.5  (bottom) maps to -12 degrees: tooltip tilts "forward" (towards user).
  // For rotateY:
  //    x=-0.5 (left edge) maps to -12 deg: tooltip tilts left.
  //    x=0.5  (right edge) maps to +12 deg: tooltip tilts right.
  const rotateX = useTransform(y, [-0.5, 0.5], [20, -20]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-20, 20]);

  // handleMouseMove calculates the mouse position relative to the span (from -0.5 to 0.5, where 0 is center)
  // These values are then used to set the motion values `x` and `y`, which drive the rotations above.
  function handleMouseMove(event: React.MouseEvent<HTMLSpanElement>) {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;

    // Calculate horizontal mouse position: -0.5 at left edge, +0.5 at right edge
    const relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
    // Calculate vertical mouse position: -0.5 at top edge, +0.5 at bottom edge
    const relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;

    x.set(relativeX);
    y.set(relativeY);
  }

  // On touch devices, use a simple click-to-toggle tooltip without 3D motion.
  if (isTouchDevice) {
    return (
      <span
        ref={ref}
        className={cn(
          "relative inline-flex align-baseline underline decoration-orange-400/80 underline-offset-4 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-200 bg-clip-text text-transparent",
          className,
        )}
      >
        <button
          type="button"
          className="inline-flex items-baseline gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={() => setOpen((prev) => !prev)}
        >
          {children}
        </button>
        {open && (
          <div className="absolute left-1/2 top-full z-20 mt-3 -translate-x-1/2 w-72 max-w-[90vw] rounded-xl bg-background/95 p-4 text-left text-xs text-muted-foreground shadow-xl ring-1 ring-border backdrop-blur">
            <div className="mb-3 flex justify-center">
              <img
                src={tShapedDiagram.src}
                alt="T-shaped engineer diagram"
                className="w-full max-w-[14rem] h-auto rounded-lg object-contain ring-1 ring-border/60"
                loading="lazy"
                decoding="async"
              />
            </div>
            <p className="mb-1 text-sm font-semibold text-foreground">
              T-shaped engineer
            </p>
            <p>
              Broad curiosity across disciplines with deep expertise in one core
              craft.
            </p>
          </div>
        )}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className={cn(
        "relative inline-flex align-baseline underline decoration-orange-400/80 underline-offset-4 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-200 bg-clip-text text-transparent",
        className,
      )}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onMouseMove={handleMouseMove}
    >
      {children}
      {open && (
        <motion.div
          style={{ rotateX, rotateY }}
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-4 -translate-x-1/2"
        >
          <div className="overflow-hidden rounded-2xl bg-background/95 shadow-xl ring-1 ring-border backdrop-blur w-140 sm:w-96">
            <div className="flex flex-col items-center gap-4 p-5 text-center">
              <img
                src={tShapedDiagram.src}
                alt="T-shaped engineer diagram"
                className="h-65 w-auto max-w-full rounded-xl object-contain ring-1 ring-border/60"
                loading="lazy"
                decoding="async"
              />
              <div className="space-y-1">
                <p className="text-xs font-semibold leading-tight">
                  T-shaped engineer
                </p>
                <p className="text-sm text-muted-foreground leading-snug max-w-[22rem] mx-auto">
                  Broad curiosity across disciplines, with deep expertise in one
                  core craft.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </span>
  );
}
