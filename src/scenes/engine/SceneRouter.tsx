import { useState, useEffect, useCallback, useRef } from 'react'
import type { SceneId } from './types'
import type { SceneRegistry } from './SceneRegistry'

export interface UseActiveSceneOptions {
  registry: SceneRegistry
  /**
   * Fallback scene id when no `data-scene-id` sentinel is intersecting the
   * viewport. Typically derived from the current route path.
   */
  routeHint: SceneId
}

export interface UseActiveSceneResult {
  activeSceneId: SceneId
  setActiveSceneId: (id: SceneId) => void
}

/**
 * Tracks which sim scene is currently "active" based on which DOM sentinel
 * element (identified by `data-scene-id="<sceneId>"`) has the largest
 * intersection ratio with the viewport.
 *
 * Falls back to `routeHint` when no sentinel is visible (e.g. page load before
 * any scroll, or SSR/jsdom where IntersectionObserver is absent).
 *
 * Sentinels are `<div data-scene-id="singularity" />` elements. Each scene
 * section should render one at its scroll anchor. The hook picks them up
 * automatically via querySelectorAll after mount.
 *
 * @example
 * ```tsx
 * const { activeSceneId } = useActiveScene({ registry, routeHint: 'singularity' })
 * ```
 */
export function useActiveScene({
  registry,
  routeHint,
}: UseActiveSceneOptions): UseActiveSceneResult {
  const [activeSceneId, setActiveSceneId] = useState<SceneId>(routeHint)
  // Track per-sentinel ratio; the key is the data-scene-id attribute value
  const ratioMap = useRef(new Map<SceneId, number>())

  const selectBestScene = useCallback(() => {
    let best: SceneId | null = null
    let bestRatio = 0
    for (const [id, ratio] of ratioMap.current.entries()) {
      if (ratio > bestRatio) {
        bestRatio = ratio
        best = id
      }
    }
    if (best !== null && bestRatio > 0) {
      setActiveSceneId(best)
    } else {
      setActiveSceneId(routeHint)
    }
  }, [routeHint])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      // SSR / old browsers: stay with routeHint
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset['sceneId'] as SceneId | undefined
          if (id) {
            ratioMap.current.set(id, entry.intersectionRatio)
          }
        }
        selectBestScene()
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] },
    )

    // Observe all sentinels currently in the DOM
    const sentinels = Array.from(
      document.querySelectorAll<HTMLElement>('[data-scene-id]'),
    )
    for (const el of sentinels) {
      observer.observe(el)
    }

    return () => {
      observer.disconnect()
    }
  }, [registry, selectBestScene])

  return { activeSceneId, setActiveSceneId }
}

