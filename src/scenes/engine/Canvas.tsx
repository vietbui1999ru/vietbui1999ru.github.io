import React from 'react'
import { Canvas as R3FCanvas } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { SceneHost } from './SceneHost'
import type { SceneId } from './types'

export interface AppCanvasProps {
  activeSceneId: SceneId
  /** When true, use an orthographic projection (default false = perspective) */
  orthographic?: boolean
}

/**
 * App-wide single r3f Canvas.
 *
 * Mounted in BaseLayout at `fixed inset-0 -z-10 pointer-events-none` so it
 * sits behind all page content and never intercepts mouse events.
 *
 * The Canvas is intentionally frameless (no background): the site background
 * color is set via CSS on `<body>`, so the Canvas layer blends on top
 * transparently by default.
 */
export function AppCanvas({ activeSceneId, orthographic = false }: AppCanvasProps): React.ReactElement {
  return (
    <R3FCanvas
      orthographic={orthographic}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {orthographic && <OrthographicCamera makeDefault position={[0, 0, 5]} />}
      <SceneHost activeSceneId={activeSceneId} />
    </R3FCanvas>
  )
}
