"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

type TShapedEngineerTooltipProps = {
  children: React.ReactNode;
  className?: string;
};

export function TShapedEngineerTooltip({ children, className }: TShapedEngineerTooltipProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [open, setOpen] = React.useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-12, 12]);

  function handleMouseMove(event: React.MouseEvent<HTMLSpanElement>) {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;

    const relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;

    x.set(relativeX);
    y.set(relativeY);
  }

  return (
    <span
      ref={ref}
      className={cn(
        "relative inline-flex cursor-pointer align-baseline bg-gradient-to-r from-orange-500 via-orange-400 to-orange-200 bg-clip-text text-transparent",
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
          <div className="overflow-hidden rounded-2xl bg-background/95 shadow-xl ring-1 ring-border backdrop-blur w-80 sm:w-96">
            <div className="flex flex-col items-center gap-4 p-5 text-center">
              <img
                src="/t-shaped.png"
                alt="T-shaped engineer diagram"
                className="h-40 w-auto max-w-full rounded-xl object-contain ring-1 ring-border/60"
                loading="lazy"
                decoding="async"
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-tight">T-shaped engineer</p>
                <p className="text-xs text-muted-foreground leading-snug max-w-[22rem] mx-auto">
                  Broad curiosity across disciplines, with deep expertise in one core craft.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </span>
  );
}

