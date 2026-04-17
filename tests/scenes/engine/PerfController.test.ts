import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We must mock 'detect-gpu' before importing PerfController
vi.mock('detect-gpu', () => ({
  getGPUTier: vi.fn(),
}))

import { getGPUTier } from 'detect-gpu'
import { getPerfTier, resetPerfCache } from '@/scenes/engine/PerfController'

const mockGetGPUTier = vi.mocked(getGPUTier)

// Helper: mock window.matchMedia for prefers-reduced-motion
function mockMatchMedia(prefersReduced: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('reduce') ? prefersReduced : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('getPerfTier — reduced motion short-circuit', () => {
  beforeEach(() => {
    resetPerfCache()
    mockGetGPUTier.mockClear()
    mockGetGPUTier.mockResolvedValue({ tier: 3, type: 'BENCHMARK' } as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns low + reducedMotion=true when prefers-reduced-motion is active, regardless of GPU tier', async () => {
    mockMatchMedia(true)
    const result = await getPerfTier()
    expect(result.tier).toBe('low')
    expect(result.reducedMotion).toBe(true)
  })

  it('does NOT short-circuit when prefers-reduced-motion is off', async () => {
    mockMatchMedia(false)
    const result = await getPerfTier()
    expect(result.reducedMotion).toBe(false)
    expect(result.tier).toBe('high') // GPU tier 3 → high
  })
})

describe('getPerfTier — GPU tier mapping', () => {
  beforeEach(() => {
    resetPerfCache()
    mockGetGPUTier.mockClear()
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps detect-gpu tier 0 → low', async () => {
    mockGetGPUTier.mockResolvedValue({ tier: 0, type: 'BENCHMARK' } as never)
    const result = await getPerfTier()
    expect(result.tier).toBe('low')
  })

  it('maps detect-gpu tier 1 → low', async () => {
    mockGetGPUTier.mockResolvedValue({ tier: 1, type: 'BENCHMARK' } as never)
    const result = await getPerfTier()
    expect(result.tier).toBe('low')
  })

  it('maps detect-gpu tier 2 → mid', async () => {
    mockGetGPUTier.mockResolvedValue({ tier: 2, type: 'BENCHMARK' } as never)
    const result = await getPerfTier()
    expect(result.tier).toBe('mid')
  })

  it('maps detect-gpu tier 3 → high', async () => {
    mockGetGPUTier.mockResolvedValue({ tier: 3, type: 'BENCHMARK' } as never)
    const result = await getPerfTier()
    expect(result.tier).toBe('high')
  })

  it('caches the result: second call does not re-invoke getGPUTier', async () => {
    mockGetGPUTier.mockResolvedValue({ tier: 2, type: 'BENCHMARK' } as never)
    await getPerfTier()
    await getPerfTier()
    expect(mockGetGPUTier).toHaveBeenCalledTimes(1)
  })
})
