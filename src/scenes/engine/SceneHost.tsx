import React, { Suspense, lazy, useMemo } from 'react'
import type { PerfTier, SceneId, SymmetryConfig } from './types'

/**
 * Static map of SceneId → lazy-imported scene module.
 *
 * Each entry lazy-imports `src/scenes/sims/<id>/index.ts` which must export a
 * `SimModule`. The lazy wrapper returns the module's Scene component, which
 * receives `{ config, perf, symmetry }` via the props forwarded by SceneHost.
 *
 * Add a new entry here when adding a new sim.
 */
type SceneProps = { config: unknown; perf: PerfTier; symmetry: SymmetryConfig }

const sceneImportMap: Partial<
  Record<SceneId, React.LazyExoticComponent<React.FC<SceneProps>>>
> = {
  singularity: lazy(async () => {
    const mod = await import('../sims/singularity/index')
    const SceneComponent: React.FC<SceneProps> = (props) =>
      React.createElement(mod.singularityModule.Scene, props as Parameters<typeof mod.singularityModule.Scene>[0])
    return { default: SceneComponent }
  }),
  lorenz: lazy(async () => {
    const mod = await import('../sims/lorenz/index')
    const SceneComponent: React.FC<SceneProps> = (props) =>
      React.createElement(mod.default.Scene, props as Parameters<typeof mod.default.Scene>[0])
    return { default: SceneComponent }
  }),
  magnetic: lazy(async () => {
    const mod = await import('../sims/magnetic/index')
    const SceneComponent: React.FC<SceneProps> = (props) =>
      React.createElement(mod.default.Scene, props as Parameters<typeof mod.default.Scene>[0])
    return { default: SceneComponent }
  }),
  'gray-scott': lazy(async () => {
    const mod = await import('../sims/grayScott/index')
    const SceneComponent: React.FC<SceneProps> = (props) =>
      React.createElement(mod.default.Scene, props as Parameters<typeof mod.default.Scene>[0])
    return { default: SceneComponent }
  }),
  'kuramoto-sivashinsky': lazy(async () => {
    const mod = await import('../sims/kuramotoSivashinsky/index')
    const SceneComponent: React.FC<SceneProps> = (props) =>
      React.createElement(mod.default.Scene, props as Parameters<typeof mod.default.Scene>[0])
    return { default: SceneComponent }
  }),
}

export interface SceneHostProps {
  activeSceneId: SceneId
  /** Config object forwarded to the active scene. Typically the module's defaults
   *  until D13 (Leva store) wires in live values. */
  config: unknown
  perf: PerfTier
  symmetry: SymmetryConfig
}

/**
 * Renders the scene component matching `activeSceneId`.
 * Each sim is code-split via React.lazy + dynamic import.
 * Wraps with Suspense (fallback = null) so missing sims fail gracefully.
 */
export function SceneHost({ activeSceneId, config, perf, symmetry }: SceneHostProps): React.ReactElement {
  const LazyScene = useMemo(
    () => sceneImportMap[activeSceneId] ?? null,
    [activeSceneId],
  )

  if (!LazyScene) {
    return <></>
  }

  return (
    <Suspense fallback={null}>
      <LazyScene config={config} perf={perf} symmetry={symmetry} />
    </Suspense>
  )
}
