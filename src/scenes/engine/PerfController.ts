import { getGPUTier } from 'detect-gpu'
import type { PerfTier } from './types'

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface PerfResult {
  /** GPU capability tier after mapping */
  tier: PerfTier
  /**
   * True when the OS-level `prefers-reduced-motion: reduce` media query is
   * active. In this case tier is forced to 'low' regardless of GPU score, and
   * the engine should render only static snapshots.
   */
  reducedMotion: boolean
}

// ---------------------------------------------------------------------------
// Internal cache — reset via resetPerfCache() for tests
// ---------------------------------------------------------------------------

let cached: PerfResult | null = null

/** Clears the cached result. Exposed for unit tests; do not call in production. */
export function resetPerfCache(): void {
  cached = null
}

// ---------------------------------------------------------------------------
// Reduced-motion detection
// ---------------------------------------------------------------------------

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ---------------------------------------------------------------------------
// GPU tier mapping
// ---------------------------------------------------------------------------

function mapGPUTier(tier: number): PerfTier {
  if (tier <= 1) return 'low'
  if (tier === 2) return 'mid'
  return 'high'
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detects the GPU performance tier once at boot and caches the result.
 *
 * - If `prefers-reduced-motion: reduce` is set, immediately returns
 *   `{ tier: 'low', reducedMotion: true }` without calling detect-gpu.
 * - Otherwise, calls `getGPUTier()` from `detect-gpu` and maps tiers:
 *   0–1 → 'low', 2 → 'mid', 3 → 'high'.
 * - Subsequent calls return the cached result (no repeat GPU detection).
 *
 * @returns Promise resolving to a PerfResult with tier and reducedMotion flag.
 */
export async function getPerfTier(): Promise<PerfResult> {
  if (cached !== null) return cached

  // Short-circuit for accessibility preference
  if (prefersReducedMotion()) {
    cached = { tier: 'low', reducedMotion: true }
    return cached
  }

  let gpuTierNumber = 2 // default to mid if detection fails
  try {
    const result = await getGPUTier()
    gpuTierNumber = result.tier ?? 2
  } catch {
    // Detection failure treated as mid tier (safe default)
    gpuTierNumber = 2
  }

  cached = { tier: mapGPUTier(gpuTierNumber), reducedMotion: false }
  return cached
}
