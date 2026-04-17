import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// Mock @react-three/fiber and leva — not available in jsdom
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ gl: {}, scene: {}, camera: {} })),
}))
vi.mock('leva', () => ({
  useControls: vi.fn(() => ({
    sigma: 10, rho: 28, beta: 8 / 3,
    particleCount: 10, dt: 0.005, trailLength: 20,
  })),
}))

vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three')
  return actual
})

import { LORENZ_LEVA_SCHEMA } from '@/scenes/sims/lorenz/Scene'

describe('LorenzScene (unit)', () => {
  it('leva schema has required keys', () => {
    expect(LORENZ_LEVA_SCHEMA).toHaveProperty('sigma')
    expect(LORENZ_LEVA_SCHEMA).toHaveProperty('rho')
    expect(LORENZ_LEVA_SCHEMA).toHaveProperty('beta')
    expect(LORENZ_LEVA_SCHEMA).toHaveProperty('particleCount')
    expect(LORENZ_LEVA_SCHEMA).toHaveProperty('dt')
    expect(LORENZ_LEVA_SCHEMA).toHaveProperty('trailLength')
  })

  it('sigma default is 10', () => {
    expect(LORENZ_LEVA_SCHEMA.sigma.value).toBe(10)
  })

  it('rho default is 28', () => {
    expect(LORENZ_LEVA_SCHEMA.rho.value).toBe(28)
  })
})
