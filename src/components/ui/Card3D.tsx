"use client";

import { cn } from "@/lib/utils";
import {
  useCallback,
  type ReactNode,
  useRef,
  useState,
} from "react";

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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!active) return;
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
    [active, maxTilt]
  );

  const handleMouseLeave = useCallback(() => {
    if (active) setTransform({ rotateX: 0, rotateY: 0 });
  }, [active]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-transform duration-150 ease-out",
        !active && "transition-none",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        active
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
