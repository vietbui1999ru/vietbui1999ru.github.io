import React, { useState, useEffect } from 'react'
import { useControls } from 'leva'
import { AppCanvas } from './Canvas'
import type { SceneId, SymmetryConfig, PerfTier } from './types'
import { createAppSceneRegistry, registeredModules, sceneMap } from '../registry'
import { getPerfTier } from './PerfController'

const SCENE_OFF = 'none' as const
type SceneSelection = SceneId | typeof SCENE_OFF

const registry = createAppSceneRegistry()
const defaultSymmetry: SymmetryConfig = { type: 'none', order: 1 }
const sceneOptions: SceneSelection[] = [SCENE_OFF, ...registeredModules.map((m) => m.id)]

function deriveRouteHint(): SceneId {
  if (typeof window === 'undefined') return 'singularity'
  const match = window.location.pathname.match(/^\/sim\/([^/]+)/)
  const id = match?.[1]
  if (id && sceneMap[id as SceneId]) return id as SceneId
  return 'singularity'
}

export default function AppCanvasIsland(): React.ReactElement {
  const defaultScene = deriveRouteHint()
  const [perf, setPerf] = useState<PerfTier>('mid')

  useEffect(() => {
    getPerfTier().then((r) => setPerf(r.tier))
  }, [])

  const { scene } = useControls('Scene', {
    scene: { value: defaultScene, options: sceneOptions },
  })

  const selection = scene as SceneSelection
  if (selection === SCENE_OFF) return <></>

  const activeSceneId = selection
  const activeModule = registry.get(activeSceneId)
  const config = activeModule?.defaults ?? {}

  return (
    <AppCanvas
      activeSceneId={activeSceneId}
      config={config}
      perf={perf}
      symmetry={defaultSymmetry}
    />
  )
}
