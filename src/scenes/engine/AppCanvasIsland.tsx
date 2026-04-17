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
import { singularityModule } from '../sims/singularity/index'

// Singleton registry for the app (all sims registered here at module load time)
const registry = new SceneRegistry()
registry.register(singularityModule)
// Additional sims registered in their respective task commits (D17-D20)

export default function AppCanvasIsland(): React.ReactElement {
  const { activeSceneId } = useActiveScene({ registry, routeHint: 'singularity' })
  return <AppCanvas activeSceneId={activeSceneId} />
}
