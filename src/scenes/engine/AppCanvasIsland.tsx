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
import { SceneRegistry } from './SceneRegistry'
import type { SymmetryConfig } from './types'
import { singularityModule } from '../sims/singularity/index'

// Singleton registry for the app (all sims registered here at module load time)
const registry = new SceneRegistry()
registry.register(singularityModule)
// Additional sims registered in their respective task commits (D17-D20)

// Stub perf + symmetry until D9/D13 wire them live. 'mid' is the safe middle
// tier; detect-gpu integration ships in a later task.
const defaultSymmetry: SymmetryConfig = { type: 'none', order: 1 }

export default function AppCanvasIsland(): React.ReactElement {
  const { activeSceneId } = useActiveScene({ registry, routeHint: 'singularity' })
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
