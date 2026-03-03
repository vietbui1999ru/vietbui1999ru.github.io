"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

type MagneticProps = {
  children: React.ReactNode;
  className?: string;
  strength?: number;
};

export function Magnetic({ children, className, strength = 20 }: MagneticProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 260, damping: 20, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 260, damping: 20, mass: 0.6 });

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;

    const relativeX =
      (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
    const relativeY =
      (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);

    x.set(relativeX * strength);
    y.set(relativeY * strength);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      className={cn("inline-block", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}

