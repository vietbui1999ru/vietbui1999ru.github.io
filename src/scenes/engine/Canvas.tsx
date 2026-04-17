import React from 'react'
import { Canvas as R3FCanvas } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { SceneHost } from './SceneHost'
import type { PerfTier, SceneId, SymmetryConfig } from './types'

export interface AppCanvasProps {
  activeSceneId: SceneId
  /** Config forwarded to the active scene. Until D13 (Leva store), AppCanvasIsland
   *  supplies the module's defaults. */
  config: unknown
  perf: PerfTier
  symmetry: SymmetryConfig
  /** When true, use an orthographic projection (default false = perspective) */
  orthographic?: boolean
  /** Optional inline style override. Defaults to fixed full-viewport behind content. */
  style?: React.CSSProperties
}

const defaultStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: -10,
  pointerEvents: 'none',
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
export function AppCanvas({
  activeSceneId,
  config,
  perf,
  symmetry,
  orthographic = false,
  style,
}: AppCanvasProps): React.ReactElement {
  return (
    <R3FCanvas
      orthographic={orthographic}
      gl={{ antialias: true, alpha: true }}
      style={{ ...defaultStyle, ...style }}
      aria-hidden="true"
    >
      {orthographic && <OrthographicCamera makeDefault position={[0, 0, 5]} />}
      <SceneHost activeSceneId={activeSceneId} config={config} perf={perf} symmetry={symmetry} />
    </R3FCanvas>
  )
}
