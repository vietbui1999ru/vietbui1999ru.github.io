import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React, { Suspense } from 'react'

// ---------------------------------------------------------------------------
// Mock @react-three/fiber and @react-three/drei so jsdom doesn't need WebGL
// ---------------------------------------------------------------------------
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
}))

vi.mock('@react-three/drei', () => ({
  OrthographicCamera: () => null,
}))

// Mock dynamic import map used by SceneHost
// The SceneHost uses a static importMap object; we inject a test scene here.
vi.mock('@/scenes/sims/mock-sim/index', () => ({
  default: {
    id: 'singularity',
    Scene: () => <mesh data-testid="mock-scene-mesh" />,
  },
}))

import { SceneHost } from '@/scenes/engine/SceneHost'

const stubSceneProps = {
  config: {},
  perf: 'mid' as const,
  symmetry: { type: 'none' as const, order: 1 },
}

describe('SceneHost', () => {
  it('renders without crashing with a known activeSceneId', () => {
    const { container } = render(
      <Suspense fallback={<div>loading</div>}>
        <SceneHost activeSceneId="singularity" {...stubSceneProps} />
      </Suspense>,
    )
    // Suspense fallback may render initially; confirm no error thrown
    expect(container).toBeTruthy()
  })

  it('renders null without crashing for unknown activeSceneId', () => {
    const { container } = render(
      <Suspense fallback={null}>
        {/* Cast to bypass TS — tests unknown runtime id */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <SceneHost activeSceneId={'not-a-scene' as any} {...stubSceneProps} />
      </Suspense>,
    )
    expect(container).toBeTruthy()
  })
})
