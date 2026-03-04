"use client";

import { cn } from "@/lib/utils";
import { useCallback, type ReactNode, useRef, useState } from "react";
import { useIsMobileOrTouch } from "@/hooks/useIsMobileOrTouch";

export interface Card3DProps {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees (default 12) */
  maxTilt?: number;
  /** When false, 3D tilt is disabled (no mouse tracking). Use for collapsed/small cards. */
  active?: boolean;
}

export function Card3D({
  children,
  className,
  maxTilt = 12,
  active = true,
}: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });
  const isMobileOrTouch = useIsMobileOrTouch();

  const resolvedActive = active && !isMobileOrTouch;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!resolvedActive) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTransform({
        rotateY: x * maxTilt,
        rotateX: -y * maxTilt,
      });
    },
    [resolvedActive, maxTilt],
  );

  const handleMouseLeave = useCallback(() => {
    if (resolvedActive) setTransform({ rotateX: 0, rotateY: 0 });
  }, [resolvedActive]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-transform duration-150 ease-out",
        !resolvedActive && "transition-none",
        className,
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        resolvedActive
          ? {
              transform: `perspective(1000px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
              transformStyle: "preserve-3d",
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
