/**
 * Single source of truth for all registered SimModules.
 *
 * Adding a new sim: add ONE entry to `registeredModules` below. The derived
 * maps (`SCENE_REGISTRY`, `sceneMap`, `createAppSceneRegistry`) update
 * automatically, and `SceneHost` reads from `sceneMap` — no parallel lists
 * to keep in sync.
 *
 * Consumed by:
 *  - AppCanvasIsland (React): `createAppSceneRegistry()` for live lookups
 *  - SceneHost (React): `sceneMap` for id → Scene component
 *  - /sim/[name].astro (Astro SSG): `SCENE_REGISTRY` for `getStaticPaths`
 *    (plain metadata object, no React deps)
 */
import type { SceneId, SimModule } from './engine/types'
import { SceneRegistry } from './engine/SceneRegistry'
import { singularityModule } from './sims/singularity/index'
import LorenzModule from './sims/lorenz/index'
import MagneticModule from './sims/magnetic/index'
import GrayScottModule from './sims/grayScott/index'
import KuramotoSivashinskyModule from './sims/kuramotoSivashinsky/index'

// ---------------------------------------------------------------------------
// All registered modules in display order — THE ONE LIST
// ---------------------------------------------------------------------------
export const registeredModules: SimModule[] = [
  singularityModule as SimModule,
  LorenzModule as SimModule,
  MagneticModule as SimModule,
  GrayScottModule as SimModule,
  KuramotoSivashinskyModule as SimModule,
]

// ---------------------------------------------------------------------------
// Id → module lookup (runtime). SceneHost reads Scene components from here.
// ---------------------------------------------------------------------------
export const sceneMap: Partial<Record<SceneId, SimModule>> = Object.fromEntries(
  registeredModules.map((m) => [m.id, m]),
) as Partial<Record<SceneId, SimModule>>

// ---------------------------------------------------------------------------
// Plain record for Astro SSG (getStaticPaths). No React dependencies.
// ---------------------------------------------------------------------------
export const SCENE_REGISTRY: Record<string, { id: string; title: string }> =
  Object.fromEntries(
    registeredModules.map((m) => [m.id, { id: m.id, title: m.title }]),
  )

// ---------------------------------------------------------------------------
// Factory for the React-side class-based SceneRegistry
// ---------------------------------------------------------------------------
export function createAppSceneRegistry(): SceneRegistry {
  const registry = new SceneRegistry()
  for (const mod of registeredModules) {
    registry.register(mod)
  }
  return registry
}
