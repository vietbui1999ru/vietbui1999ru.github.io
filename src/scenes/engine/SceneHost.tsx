import React, { Suspense, lazy, useMemo } from 'react'
import type { SceneId } from './types'

/**
 * Static map of SceneId → lazy-imported scene module.
 *
 * Each entry lazy-imports `src/scenes/sims/<id>/index.ts` which must export a
 * default `SimModule`. The `Scene` component is extracted inside the lazy
 * wrapper so that React.lazy receives a component directly.
 *
 * Add a new entry here when adding a new sim.
 */
const sceneImportMap: Partial<Record<SceneId, React.LazyExoticComponent<React.FC>>> = {
  singularity: lazy(async () => {
    const mod = await import('../sims/singularity/index')
    const SceneComponent: React.FC = (props) =>
      React.createElement(mod.singularityModule.Scene, props as Parameters<typeof mod.singularityModule.Scene>[0])
    return { default: SceneComponent }
  }),
}

export interface SceneHostProps {
  activeSceneId: SceneId
}

/**
 * Renders the scene component matching `activeSceneId`.
 * Each sim is code-split via React.lazy + dynamic import.
 * Wraps with Suspense (fallback = null) so missing sims fail gracefully.
 */
export function SceneHost({ activeSceneId }: SceneHostProps): React.ReactElement {
  const LazyScene = useMemo(
    () => sceneImportMap[activeSceneId] ?? null,
    [activeSceneId],
  )

  if (!LazyScene) {
    return <></>
  }

  return (
    <Suspense fallback={null}>
      <LazyScene />
    </Suspense>
  )
}
