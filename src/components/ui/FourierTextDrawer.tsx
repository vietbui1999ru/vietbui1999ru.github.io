"use client";

import { cn } from "@/lib/utils";
import { circlePath } from "@/lib/fourier";
import { useEffect, useMemo, useRef, useState } from "react";

type FourierCoeff = {
  freq: number;
  amp: number;
  phase: number;
};

function getCssVarColor(name: string): string {
  if (typeof window === "undefined") return "#ffffff";
  const el = document.createElement("div");
  el.style.color = `var(${name})`;
  document.body.appendChild(el);
  const color = getComputedStyle(el).color || "#ffffff";
  document.body.removeChild(el);
  return color;
}

function resolveThemeStroke(strokeColor?: string): string {
  if (!strokeColor) return getCssVarColor("--foreground");
  const v = strokeColor.trim();
  if (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl("))
    return v;
  if (v.startsWith("--")) return getCssVarColor(v);
  if (v.startsWith("stroke-")) {
    const token = v.slice("stroke-".length) || "foreground";
    return getCssVarColor(`--${token}`);
  }
  if (v === "primary") return getCssVarColor("--primary");
  if (v === "foreground") return getCssVarColor("--foreground");
  if (v === "muted-foreground") return getCssVarColor("--muted-foreground");
  return v;
}

/** DFT matching Daniel Shiffman's Coding Challenge 130.1: phi = 2πkn/N, re += x*cos, im -= x*sin */
function dft(values: number[]): FourierCoeff[] {
  const N = values.length;
  const out: FourierCoeff[] = [];
  for (let k = 0; k < N; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const phi = (2 * Math.PI * k * n) / N;
      re += values[n] * Math.cos(phi);
      im -= values[n] * Math.sin(phi);
    }
    re /= N;
    im /= N;
    const amp = Math.hypot(re, im);
    const phase = Math.atan2(im, re);
    out.push({ freq: k, amp, phase });
  }
  return out;
}

export type DrawingPoint = { x: number; y: number };

/** Convert text to a list of (x,y) plot points (Shiffman-style drawing array). Exported for reuse. */
export function textToDrawingPoints(
  text: string,
  fontSize: number,
  samples: number,
): DrawingPoint[] {
  if (typeof document === "undefined") return [];
  const off = document.createElement("canvas");
  const w = 512;
  const h = 256;
  off.width = w;
  off.height = h;
  const ctx = off.getContext("2d");
  if (!ctx) {
    const fallback = circlePath(0.5, samples);
    return fallback.map((p) => ({ x: p.re, y: p.im }));
  }

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, w / 2, h / 2);

  const img = ctx.getImageData(0, 0, w, h);
  const step = 4;
  const pts: DrawingPoint[] = [];
  for (let py = 0; py < h; py += step) {
    for (let px = 0; px < w; px += step) {
      const idx = (py * w + px) * 4;
      const alpha = img.data[idx + 3];
      if (alpha > 32) pts.push({ x: px, y: py });
    }
  }
  if (pts.length < 2) {
    const fallback = circlePath(0.5, samples);
    return fallback.map((p) => ({ x: p.re, y: p.im }));
  }

  const midX =
    (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2;
  const midY =
    (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2;
  const sorted = [...pts]
    .map((p) => {
      const dx = p.x - midX;
      const dy = p.y - midY;
      return { p, angle: Math.atan2(dy, dx), r: Math.hypot(dx, dy) };
    })
    .sort((a, b) => a.angle - b.angle || a.r - b.r)
    .map((o) => o.p);

  const xs = sorted.map((p) => p.x);
  const ys = sorted.map((p) => p.y);
  const boxW = Math.max(...xs) - Math.min(...xs) || 1;
  const boxH = Math.max(...ys) - Math.min(...ys) || 1;
  const scale = 1 / Math.max(boxW, boxH);

  const normalized: DrawingPoint[] = sorted.map((p) => ({
    x: (p.x - midX) * scale,
    y: -(p.y - midY) * scale,
  }));

  if (normalized.length === samples) return normalized;

  const out: DrawingPoint[] = [];
  const N = normalized.length;
  for (let i = 0; i < samples; i++) {
    const idx = Math.floor((i * N) / samples) % N;
    out.push(normalized[idx]);
  }
  return out;
}

export interface FourierTextDrawerProps {
  text?: string;
  epicycleCount?: number;
  fontSize?: number;
  samples?: number;
  width?: number;
  height?: number;
  speed?: number;
  showCircles?: boolean;
  trailLength?: number;
  /** Canvas stays transparent; wrapper uses theme bg/border by default. */
  transparent?: boolean;
  /** Use theme colors: `stroke-primary`, `stroke-foreground`, or any CSS color. */
  strokeColor?: string;
  className?: string;
}

export function FourierTextDrawer({
  text = "HELLO",
  epicycleCount = 24,
  fontSize = 96,
  samples = 512,
  width = 800,
  height = 240,
  speed = 1,
  showCircles = false,
  trailLength = 900,
  transparent = true,
  strokeColor = "stroke-foreground",
  className,
}: FourierTextDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState<DrawingPoint[]>([]);

  const stroke = useMemo(() => resolveThemeStroke(strokeColor), [strokeColor]);

  useEffect(() => {
    let cancelled = false;
    const pts = textToDrawingPoints(text, fontSize, samples);
    if (!cancelled) setDrawing(pts);
    return () => {
      cancelled = true;
    };
  }, [text, fontSize, samples]);

  const { fx, fy } = useMemo(() => {
    if (drawing.length < 2)
      return { fx: [] as FourierCoeff[], fy: [] as FourierCoeff[] };
    const scale = Math.min(width, height) * 0.38;
    const cx = width / 2;
    const cy = height / 2;
    const xs = drawing.map((p) => cx + p.x * scale);
    const ys = drawing.map((p) => cy + p.y * scale);

    const fourierX = dft(xs)
      .sort((a, b) => b.amp - a.amp)
      .slice(0, epicycleCount);
    const fourierY = dft(ys)
      .sort((a, b) => b.amp - a.amp)
      .slice(0, epicycleCount);
    return { fx: fourierX, fy: fourierY };
  }, [drawing, width, height, epicycleCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", {
      alpha: transparent,
      willReadFrequently: false,
    });
    if (!ctx || fx.length === 0 || fy.length === 0) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReduced) return;

    const dpr = Math.min(
      2,
      typeof window !== "undefined" ? window.devicePixelRatio : 1,
    );
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const xOrigin = { x: width * 0.5, y: height * 0.32 };
    const yOrigin = { x: width * 0.3, y: height * 0.55 };

    const trail: { x: number; y: number }[] = [];
    let rafId = 0;
    let time = 0;
    let last = performance.now();

    const step = (now: number) => {
      rafId = requestAnimationFrame(step);
      if (document.hidden) return;

      const dt = Math.min(32, now - last);
      last = now;
      time += (dt / 1000) * speed * 2.2;

      ctx.clearRect(0, 0, width, height);

      // X epicycles (top) — Shiffman: rotation=0
      let vx = { x: xOrigin.x, y: xOrigin.y };
      for (const c of fx) {
        const prev = { ...vx };
        vx.x += c.amp * Math.cos(c.freq * time + c.phase);
        vx.y += c.amp * Math.sin(c.freq * time + c.phase) * 0;

        if (showCircles) {
          ctx.save();
          ctx.globalAlpha = 0.12;
          ctx.beginPath();
          ctx.arc(prev.x, prev.y, c.amp, 0, Math.PI * 2);
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }

        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(vx.x, vx.y);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Y epicycles (left) — Shiffman: rotation=HALF_PI → use cos for y
      let vy = { x: yOrigin.x, y: yOrigin.y };
      for (const c of fy) {
        const prev = { ...vy };
        const angle = c.freq * time + c.phase + Math.PI / 2;
        vy.x += c.amp * Math.cos(angle) * 0;
        vy.y += c.amp * Math.sin(angle);

        if (showCircles) {
          ctx.save();
          ctx.globalAlpha = 0.12;
          ctx.beginPath();
          ctx.arc(prev.x, prev.y, c.amp, 0, Math.PI * 2);
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }

        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(vy.x, vy.y);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      const p = { x: vx.x, y: vy.y };
      trail.unshift(p);
      if (trail.length > trailLength) trail.pop();

      if (trail.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++)
          ctx.lineTo(trail[i].x, trail[i].y);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2.25;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [
    fx,
    fy,
    width,
    height,
    speed,
    trailLength,
    showCircles,
    transparent,
    stroke,
  ]);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-label={`Fourier epicycle text: ${text}`}
      />
    </div>
  );
}
