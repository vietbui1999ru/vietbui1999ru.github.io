import { useControls } from 'leva'
import React from 'react'
import type { SimModule, PerfTier, SymmetryConfig, SymmetryType } from '@/scenes/engine/types'
import { SingularityScene } from './Scene'
import { SINGULARITY_PRESETS } from './presets'

// ---------------------------------------------------------------------------
// Config type
// ---------------------------------------------------------------------------

export interface SingularityConfig {
  speed: number
  intensity: number
  size: number
  waveStrength: number
  colorShift: number
}

// ---------------------------------------------------------------------------
// Shader-only sim has no meaningful CPU state
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SingularityState {}

// ---------------------------------------------------------------------------
// Leva schema
// ---------------------------------------------------------------------------

const schema = {
  speed: { value: 5.0, min: 0.5, max: 20.0, step: 0.1, label: 'Speed' },
  intensity: { value: 0.5, min: 0.01, max: 3.0, step: 0.01, label: 'Intensity' },
  size: { value: 1.0, min: 0.2, max: 3.0, step: 0.05, label: 'Size' },
  waveStrength: { value: 0.5, min: 0.0, max: 2.0, step: 0.05, label: 'Wave Strength' },
  colorShift: { value: 0.1, min: -1.0, max: 1.0, step: 0.05, label: 'Color Shift' },
}

// ---------------------------------------------------------------------------
// Scene wrapper that wires leva controls to the shader
// ---------------------------------------------------------------------------

function SingularitySceneWithControls({
  config: initialConfig,
  perf,
  symmetry,
}: {
  config: SingularityConfig
  perf: PerfTier
  symmetry: SymmetryConfig
}): React.ReactElement {
  // useControls merges into the global Leva store (mounted in BaseLayout)
  const config = useControls('Singularity', {
    speed: { value: initialConfig.speed, min: 0.5, max: 20.0, step: 0.1, label: 'Speed' },
    intensity: { value: initialConfig.intensity, min: 0.01, max: 3.0, step: 0.01, label: 'Intensity' },
    size: { value: initialConfig.size, min: 0.2, max: 3.0, step: 0.05, label: 'Size' },
    waveStrength: { value: initialConfig.waveStrength, min: 0.0, max: 2.0, step: 0.05, label: 'Wave Strength' },
    colorShift: { value: initialConfig.colorShift, min: -1.0, max: 1.0, step: 0.05, label: 'Color Shift' },
  })

  return React.createElement(SingularityScene, { config, perf, symmetry })
}

// ---------------------------------------------------------------------------
// SimModule export
// ---------------------------------------------------------------------------

export const singularityModule: SimModule<SingularityConfig, SingularityState> = {
  id: 'singularity',
  title: 'Singularity',
  description:
    'A fragment shader simulating gravitational lensing around a black hole accretion disk. ' +
    'Light bends as it approaches the event horizon; the color ramp spans from black through ' +
    'white-yellow to deep orange at the outer disk boundary.',

  defaults: {
    speed: 5.0,
    intensity: 0.5,
    size: 1.0,
    waveStrength: 0.5,
    colorShift: 0.1,
  },

  presets: SINGULARITY_PRESETS,

  schema,

  Scene: SingularitySceneWithControls,

  init(_config: SingularityConfig, _perf: PerfTier): SingularityState {
    // Shader-only sim: no CPU state to initialize
    return {}
  },

  step(_state: SingularityState, _dt: number): void {
    // No integration step; all animation is driven by u_time in useFrame
  },

  dispose(_state: SingularityState): void {
    // No GPU resources to release beyond what three.js disposes automatically
  },

  /**
   * Singularity is an isotropic radial shader — it has inherent continuous
   * rotational symmetry and discrete symmetry groups are not applicable.
   * Always returns false to disable the symmetry controls in the Leva panel.
   */
  symmetryApplies(_type: SymmetryType, _order: number): boolean {
    return false
  },
}
