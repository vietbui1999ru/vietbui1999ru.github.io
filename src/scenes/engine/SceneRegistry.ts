import type { SceneId, SimModule } from './types'

/**
 * Typed registry mapping SceneId → SimModule.
 *
 * Instantiate once at app boot and pass to Canvas + LevaPanel via React context.
 *
 * Rules:
 * - Registering the same id twice throws. Prevents silent override of modules
 *   that share an id in different dynamic import chunks.
 * - `get()` returns undefined (not null) for unregistered ids so callers can
 *   use optional-chaining without null checks.
 * - `list()` preserves insertion order (Map guarantees this in ES2015+).
 */
export class SceneRegistry {
  private readonly map = new Map<SceneId, SimModule>()

  /**
   * Register a sim module. Throws if the id is already registered.
   */
  register(mod: SimModule): void {
    if (this.map.has(mod.id)) {
      throw new Error(
        `SceneRegistry: id "${mod.id}" already registered. ` +
          `Each SimModule must have a unique SceneId.`,
      )
    }
    this.map.set(mod.id, mod)
  }

  /**
   * Retrieve a sim module by id.
   * Returns undefined if no module with this id has been registered.
   */
  get(id: SceneId): SimModule | undefined {
    return this.map.get(id)
  }

  /**
   * Return all registered modules in insertion order.
   */
  list(): SimModule[] {
    return Array.from(this.map.values())
  }
}
