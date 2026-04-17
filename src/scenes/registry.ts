/**
 * Single source of truth for all registered SimModules.
 *
 * Consumed by:
 *  - AppCanvasIsland (React): calls createAppSceneRegistry() to get a
 *    class-based SceneRegistry instance at module load time.
 *  - /sim/[name].astro (Astro SSG): uses the plain SCENE_REGISTRY object
 *    in getStaticPaths without importing React-side code.
 *
 * Adding a new sim: import its module here and push it into registeredModules.
 */
import type { SimModule } from './engine/types'
import { SceneRegistry } from './engine/SceneRegistry'
import { singularityModule } from './sims/singularity/index'
import LorenzModule from './sims/lorenz/index'
import MagneticModule from './sims/magnetic/index'
import GrayScottModule from './sims/grayScott/index'
import KuramotoSivashinskyModule from './sims/kuramotoSivashinsky/index'

// ---------------------------------------------------------------------------
// All registered modules in display order
// ---------------------------------------------------------------------------
// Cast each module to the base SimModule type (unknown Config/State) to satisfy
// the covariant array type. The concrete generics are preserved inside each
// sim's own index.ts; the registry only needs the common contract.
export const registeredModules: SimModule[] = [
  singularityModule as SimModule,
  LorenzModule as SimModule,
  MagneticModule as SimModule,
  GrayScottModule as SimModule,
  KuramotoSivashinskyModule as SimModule,
]

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
