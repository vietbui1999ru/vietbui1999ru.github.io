"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type VectorFieldFn = (x: number, y: number) => [number, number];

/** Electric dipole: + at origin, - at (2, 0). Good for divergence/curl intuition. */
export function dipoleField(x: number, y: number): [number, number] {
  const r1 = Math.sqrt(x * x + y * y) || 1e-6;
  const r2 = Math.sqrt((x - 2) ** 2 + y * y) || 1e-6;
  return [x / r1 ** 3 - (x - 2) / r2 ** 3, y / r1 ** 3 - y / r2 ** 3];
}

/** Smooth circular flow (curl-like). */
export function vortexField(x: number, y: number): [number, number] {
  const r = Math.sqrt(x * x + y * y) || 1e-6;
  const t = 0.5 / r;
  return [-y * t, x * t];
}

/** Radial (divergence-like). */
export function radialField(x: number, y: number): [number, number] {
  const r = Math.sqrt(x * x + y * y) || 1e-6;
  const t = 0.3 / r;
  return [x * t, y * t];
}

const HUE_BUCKETS = 12;
const INV_HUE_STEP = 360 / HUE_BUCKETS;
const CURSOR_ATTRACTION_STRENGTH = 2.2;
const CURSOR_ATTRACTION_FALLOFF = 0.4;
const CURSOR_SMOOTHING = 0.18;

export interface VectorFieldBackgroundProps {
  /** Field function (default: dipole). */
  field?: VectorFieldFn;
  /** Grid density (default 32 for performance). */
  grid?: number;
  /** Arrow scale (default 0.4). */
  arrowScale?: number;
  /** Scroll Y at which background is fully visible (default: ~85% viewport). */
  fadeEndScroll?: number;
  /** Cursor attraction strength; 0 to disable (default: enabled). */
  cursorAttraction?: number;
  className?: string;
}

export function VectorFieldBackground({
  field = dipoleField,
  grid = 32,
  arrowScale = 0.4,
  fadeEndScroll,
  cursorAttraction = CURSOR_ATTRACTION_STRENGTH,
  className,
}: VectorFieldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const smoothedCursorWorldRef = useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const scrollYRef = useRef(0);
  const rafRef = useRef<number>(0);
  const [fadeEnd, setFadeEnd] = useState(800);
  const effectiveFadeEndRef = useRef(800);
  const cursorEnabled = cursorAttraction > 0;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768
    );
  }, []);

  const effectiveGrid = isMobile ? Math.min(grid, 20) : grid;
  const effectiveCursorEnabled = cursorEnabled && !isMobile;

  useEffect(() => {
    const h = typeof window !== "undefined" ? window.innerHeight * 0.85 : 800;
    setFadeEnd(h);
    effectiveFadeEndRef.current = fadeEndScroll ?? h;
  }, [fadeEndScroll]);

  useEffect(() => {
    effectiveFadeEndRef.current = fadeEndScroll ?? fadeEnd;
  }, [fadeEndScroll, fadeEnd]);

  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!effectiveCursorEnabled) return;
    const onMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [effectiveCursorEnabled]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    if (typeof document !== "undefined" && document.hidden) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const dpr = Math.min(
      2,
      typeof window !== "undefined" ? window.devicePixelRatio : 1,
    );
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      ctx.scale(dpr, dpr);
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const scrollY = scrollYRef.current;
    const effectiveFadeEnd = effectiveFadeEndRef.current;
    const opacity = Math.min(1, scrollY / effectiveFadeEnd);
    if (opacity <= 0) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const now = performance.now();

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = opacity * 0.6;

    const xMin = -5;
    const xMax = 5;
    const yMin = -5;
    const yMax = 5;
    const yOffset = (scrollY * 0.015) % (yMax - yMin);
    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y: number) =>
      ((y - (yMin + yOffset)) / (yMax - yMin)) * height;
    const toWorldX = (sx: number) => xMin + (sx / width) * (xMax - xMin);
    const toWorldY = (sy: number) =>
      yMin + yOffset + (sy / height) * (yMax - yMin);

    let cursorWX: number | null = null;
    let cursorWY: number | null = null;
    const hasActiveCursor = effectiveCursorEnabled && mouseRef.current;
    if (hasActiveCursor && mouseRef.current) {
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const twX = toWorldX(mx);
      const twY = toWorldY(my);
      const sm = smoothedCursorWorldRef.current;
      sm.x += (twX - sm.x) * CURSOR_SMOOTHING;
      sm.y += (twY - sm.y) * CURSOR_SMOOTHING;
      cursorWX = sm.x;
      cursorWY = sm.y;
    }

    const addCursorAttraction = (
      x: number,
      y: number,
      u: number,
      v: number,
    ): [number, number] => {
      if (cursorWX === null || cursorWY === null) return [u, v];
      const dx = cursorWX - x;
      const dy = cursorWY - y;
      const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
      const strength = cursorAttraction / (d * d + CURSOR_ATTRACTION_FALLOFF);
      return [u + (dx / d) * strength, v + (dy / d) * strength];
    };

    const time = now * 0.001;
    const flowPhase = time * 0.3;

    const buckets: [number, number, number, number][][] = Array.from(
      { length: HUE_BUCKETS },
      () => [],
    );
    const gridM1 = effectiveGrid - 1;
    const stepX = width / gridM1;
    const stepY = height / gridM1;

    for (let i = 0; i < effectiveGrid; i++) {
      const sx = i * stepX;
      for (let j = 0; j < effectiveGrid; j++) {
        const sy = j * stepY;
        const x = toWorldX(sx);
        const y = toWorldY(sy);
        let [u, v] = field(x, y);
        [u, v] = addCursorAttraction(x, y, u, v);
        const mag = Math.sqrt(u * u + v * v) || 1e-6;
        const uu = u / mag;
        const vv = v / mag;
        const len = Math.min(12, mag * arrowScale * 15);
        const ex = Math.round(sx + uu * len);
        const ey = Math.round(sy + vv * len);
        const hue = (mag * 20 + flowPhase * 50) % 360;
        const bucket = Math.floor(hue / INV_HUE_STEP) % HUE_BUCKETS;
        buckets[bucket].push([Math.round(sx), Math.round(sy), ex, ey]);
      }
    }

    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let b = 0; b < HUE_BUCKETS; b++) {
      const segs = buckets[b];
      if (segs.length === 0) continue;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      for (let s = 0; s < segs.length; s++) {
        const [sx, sy, ex, ey] = segs[s];
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
      }
      ctx.stroke();
    }

    ctx.restore();
    rafRef.current = requestAnimationFrame(draw);
  }, [field, effectiveGrid, arrowScale, effectiveCursorEnabled, cursorAttraction]);

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-0 contain-[paint]",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className="block size-full"
        aria-hidden
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default VectorFieldBackground;
