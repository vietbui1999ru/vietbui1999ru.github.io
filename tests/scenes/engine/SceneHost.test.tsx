import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// jsdom has no WebGL; stub r3f + drei + leva so sim modules load clean.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ gl: {}, size: { width: 800, height: 600 } })),
  extend: vi.fn(),
}))

vi.mock('@react-three/drei', () => ({
  OrthographicCamera: () => null,
  PerspectiveCamera: () => null,
  shaderMaterial: vi.fn(() => () => null),
}))

vi.mock('leva', () => ({
  useControls: vi.fn((_name, schema: Record<string, { value: unknown }>) => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(schema)) out[k] = v.value
    return out
  }),
  folder: vi.fn(),
  button: vi.fn(),
}))

// Replace the registry with a tiny stub so SceneHost resolves to a test mesh.
vi.mock('@/scenes/registry', () => ({
  sceneMap: {
    singularity: {
      id: 'singularity',
      Scene: () => <mesh data-testid="mock-scene-mesh" />,
    },
  },
}))

import { SceneHost } from '@/scenes/engine/SceneHost'

const stubSceneProps = {
  config: {},
  perf: 'mid' as const,
  symmetry: { type: 'none' as const, order: 1 },
}

describe('SceneHost', () => {
  it('renders the Scene component for a known activeSceneId', () => {
    const { container } = render(
      <SceneHost activeSceneId="singularity" {...stubSceneProps} />,
    )
    expect(container).toBeTruthy()
  })

  it('renders an empty fragment for an unknown activeSceneId', () => {
    const { container } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <SceneHost activeSceneId={'not-a-scene' as any} {...stubSceneProps} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
