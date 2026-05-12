import { describe, it, expect, vi } from 'vitest'

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ gl: {} })),
}))
vi.mock('leva', () => ({
  useControls: vi.fn(() => ({
    L: 32 * Math.PI, N: 64, nu: 1.0, dt: 0.05, symmetryOrder: 1,
  })),
}))
vi.mock('@/scenes/sims/kuramotoSivashinsky/compute', () => ({
  createKSState: vi.fn(() => ({
    u: new Float64Array(64),
    k: new Float64Array(64),
    L_hat: new Float64Array(64),
    time: 0,
  })),
  ksStep: vi.fn((s: unknown) => s),
  ksSymmetricIC: vi.fn(() => new Float64Array(64)),
}))

import { KS_LEVA_SCHEMA } from '@/scenes/sims/kuramotoSivashinsky/Scene'

describe('KuramotoSivashinskyScene (unit)', () => {
  it('leva schema has required keys', () => {
    const keys = ['L', 'N', 'nu', 'dt', 'symmetryOrder']
    for (const key of keys) {
      expect(KS_LEVA_SCHEMA).toHaveProperty(key)
    }
  })

  it('default N is 512', () => {
    expect(KS_LEVA_SCHEMA.N.value).toBe(512)
  })

  it('default nu is 1.0', () => {
    expect(KS_LEVA_SCHEMA.nu.value).toBeCloseTo(1.0, 5)
  })

  it('default dt is 0.05', () => {
    expect(KS_LEVA_SCHEMA.dt.value).toBeCloseTo(0.05, 5)
  })
})
