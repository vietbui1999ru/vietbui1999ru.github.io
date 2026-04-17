/**
 * Astro island entry-point for the app-wide Canvas.
 *
 * Wraps AppCanvas with SceneRouter so the active scene is determined by
 * IntersectionObserver + route. Passes the singleton SceneRegistry.
 *
 * Imported in BaseLayout.astro as `client:load`.
 */
import React from 'react'
import { AppCanvas } from './Canvas'
import { useActiveScene } from './SceneRouter'
import type { SceneId, SymmetryConfig } from './types'
import { createAppSceneRegistry, sceneMap } from '../registry'

// Singleton registry for the app (all sims registered here at module load time)
const registry = createAppSceneRegistry()

// Stub perf + symmetry until D9/D13 wire them live. 'mid' is the safe middle
// tier; detect-gpu integration ships in a later task.
const defaultSymmetry: SymmetryConfig = { type: 'none', order: 1 }

/**
 * Derive the initial active scene from the URL path so playground pages
 * (/sim/<id>) activate their sim on first paint, before the
 * IntersectionObserver-based SceneRouter sees the sentinel.
 */
function deriveRouteHint(): SceneId {
  if (typeof window === 'undefined') return 'singularity'
  const match = window.location.pathname.match(/^\/sim\/([^/]+)/)
  const id = match?.[1]
  if (id && sceneMap[id as SceneId]) return id as SceneId
  return 'singularity'
}

export default function AppCanvasIsland(): React.ReactElement {
  const routeHint = deriveRouteHint()
  const { activeSceneId } = useActiveScene({ registry, routeHint })
  const activeModule = registry.get(activeSceneId)
  const config = activeModule?.defaults ?? {}
  return (
    <AppCanvas
      activeSceneId={activeSceneId}
      config={config}
      perf="mid"
      symmetry={defaultSymmetry}
    />
  )
}
