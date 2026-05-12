import { describe, it, expect } from 'vitest'
import { cyclicRing, dihedralRing, cnMask, dnMask } from '@/scenes/engine/Symmetry'

describe('cyclicRing', () => {
  it('returns exactly N points', () => {
    expect(cyclicRing(5, 1.0).length).toBe(5)
  })

  it('all points lie on the given radius', () => {
    const pts = cyclicRing(6, 2.5)
    for (const [x, y] of pts) {
      expect(Math.sqrt(x * x + y * y)).toBeCloseTo(2.5, 8)
    }
  })

  it('is rotationally invariant by 2π/N: rotating each point by one step gives the next point', () => {
    const N = 4
    const pts = cyclicRing(N, 1.0)
    const angle = (2 * Math.PI) / N
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    for (let i = 0; i < N; i++) {
      const [x, y] = pts[i]
      const [nx, ny] = pts[(i + 1) % N]
      expect(cos * x - sin * y).toBeCloseTo(nx, 8)
      expect(sin * x + cos * y).toBeCloseTo(ny, 8)
    }
  })
})

describe('dihedralRing', () => {
  it('returns exactly 2N points', () => {
    expect(dihedralRing(5, 1.0).length).toBe(10)
  })

  it('all points lie on the given radius', () => {
    const pts = dihedralRing(4, 3.0)
    for (const [x, y] of pts) {
      expect(Math.sqrt(x * x + y * y)).toBeCloseTo(3.0, 8)
    }
  })

  it('includes reflection: for every point (x, y) there is a point (x, -y)', () => {
    const pts = dihedralRing(3, 1.0)
    for (const [x, y] of pts) {
      const hasReflection = pts.some(
        ([px, py]) => Math.abs(px - x) < 1e-8 && Math.abs(py + y) < 1e-8,
      )
      expect(hasReflection).toBe(true)
    }
  })
})

describe('cnMask', () => {
  it('returns a Float32Array of length size*size', () => {
    const size = 16
    const mask = cnMask(size, 4, (x, y) => Math.sqrt(x * x + y * y))
    expect(mask).toBeInstanceOf(Float32Array)
    expect(mask.length).toBe(size * size)
  })

  it('is N-fold rotationally symmetric: f(r, θ) ≈ f(r, θ + 2π/N)', () => {
    const size = 64
    const N = 4
    const base = (x: number, y: number) => Math.exp(-(x * x + y * y) * 4)
    const mask = cnMask(size, N, base)

    // Sample a few off-axis pixels and verify they match their rotated counterpart
    // Use center-based coordinates: pixel (i, j) → (x, y) in [-1, 1]
    const toIdx = (i: number, j: number) => j * size + i
    const half = size / 2

    // Point at 45°: (half + 8, half) rotated by 90° → (half, half + 8)
    const ix = Math.round(half + 8)
    const iy = Math.round(half)
    const rotX = Math.round(half)
    const rotY = Math.round(half + 8)

    if (ix < size && iy < size && rotX < size && rotY < size) {
      expect(mask[toIdx(ix, iy)]).toBeCloseTo(mask[toIdx(rotX, rotY)], 3)
    }
  })
})

describe('dnMask', () => {
  it('returns a Float32Array of length size*size', () => {
    const mask = dnMask(16, 3, () => 1.0)
    expect(mask).toBeInstanceOf(Float32Array)
    expect(mask.length).toBe(16 * 16)
  })

  it('for a radially-symmetric base, cnMask and dnMask equal the base at every pixel', () => {
    // A radially-symmetric base f(x,y) = g(r) is invariant under any rotation,
    // so averaging N rotated samples yields f itself. This is a clean structural
    // check that sidesteps pixel-rounding artefacts from comparing rotated pixel
    // indices (which do NOT lie at the same continuous radius after rounding).
    const size = 32
    const N = 3
    const base = (x: number, y: number) => Math.cos(Math.sqrt(x * x + y * y) * 5)
    const cn = cnMask(size, N, base)
    const dn = dnMask(size, N, base)

    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const x = (i / (size - 1)) * 2 - 1
        const y = (j / (size - 1)) * 2 - 1
        const expected = base(x, y)
        const idx = j * size + i
        // Float32Array storage → ~7 decimal digits; precision 5 leaves margin
        expect(cn[idx]).toBeCloseTo(expected, 5)
        expect(dn[idx]).toBeCloseTo(expected, 5)
      }
    }
  })

  it('preserves 4-fold symmetry at integer-aligned pixel offsets (no rounding error)', () => {
    // N=4, 90° rotation maps pixel offset (a, b) → (-b, a) EXACTLY in integer
    // pixels. Pick a non-radial base and verify the rotation pair matches.
    const size = 33 // odd so there's a true center pixel
    const N = 4
    const base = (x: number, y: number) => x + 2 * y // non-radial
    const cn = cnMask(size, N, base)
    const center = (size - 1) / 2
    const a = 6, b = 3
    const toIdx = (i: number, j: number) => j * size + i
    // (center+a, center+b) and (center-b, center+a) are exact 90° rotation pair.
    expect(cn[toIdx(center + a, center + b)]).toBeCloseTo(
      cn[toIdx(center - b, center + a)], 10,
    )
  })
})
