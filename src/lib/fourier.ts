/**
 * Fourier series utilities for epicycle drawing.
 * Reusable, pure functions for DFT and path handling.
 */

export interface Complex {
  re: number;
  im: number;
}

/**
 * Discrete Fourier Transform. Converts time-domain points to frequency coefficients.
 */
export function dft(pts: Complex[]): Complex[] {
  const N = pts.length;
  return pts.map((_, k) => {
    let sum: Complex = { re: 0, im: 0 };
    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * k * n) / N;
      sum.re += pts[n].re * Math.cos(angle) - pts[n].im * Math.sin(angle);
      sum.im += pts[n].re * Math.sin(angle) + pts[n].im * Math.cos(angle);
    }
    return { re: sum.re / N, im: sum.im / N };
  });
}

/**
 * Sort coefficients by magnitude (largest first) and take top N for drawing.
 */
export function topCoefficients(coeffs: Complex[], count: number): Complex[] {
  return [...coeffs].sort((a, b) => magnitude(b) - magnitude(a)).slice(0, count);
}

export function magnitude(c: Complex): number {
  return Math.hypot(c.re, c.im);
}

/**
 * Sample N evenly spaced points from an SVG path string (e.g. from path.getAttribute('d')).
 * Uses a temporary SVG path element and getPointAtLength for accuracy.
 */
export function samplePathFromSvgPath(pathD: string, numPoints: number): Complex[] {
  if (typeof document === "undefined") return [];
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  svg.appendChild(path);
  document.body.appendChild(svg);
  const length = path.getTotalLength();
  const points: Complex[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * length;
    const pt = path.getPointAtLength(t);
    points.push({ re: pt.x, im: pt.y });
  }
  document.body.removeChild(svg);
  return points;
}

/**
 * Generate a simple circle path (useful for testing without font).
 */
export function circlePath(radius: number, numPoints: number): Complex[] {
  const points: Complex[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * 2 * Math.PI;
    points.push({ re: radius * Math.cos(t), im: radius * Math.sin(t) });
  }
  return points;
}
