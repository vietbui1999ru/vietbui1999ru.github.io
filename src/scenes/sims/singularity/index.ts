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
// Leva schema — ranges match the legacy react-shaders Singularity controls
// (all five params default to 1.0; colorShift spans [-1, 1] for hue flip).
// ---------------------------------------------------------------------------

const schema = {
  speed: { value: 1.0, min: 0.1, max: 8.0, step: 0.05, label: 'Speed' },
  intensity: { value: 1.0, min: 0.1, max: 3.0, step: 0.05, label: 'Intensity' },
  size: { value: 1.0, min: 0.3, max: 3.0, step: 0.05, label: 'Size' },
  waveStrength: { value: 1.0, min: 0.0, max: 3.0, step: 0.05, label: 'Wave Strength' },
  colorShift: { value: 1.0, min: -2.0, max: 2.0, step: 0.05, label: 'Color Shift' },
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
    speed: { value: initialConfig.speed, min: 0.1, max: 8.0, step: 0.05, label: 'Speed' },
    intensity: { value: initialConfig.intensity, min: 0.1, max: 3.0, step: 0.05, label: 'Intensity' },
    size: { value: initialConfig.size, min: 0.3, max: 3.0, step: 0.05, label: 'Size' },
    waveStrength: { value: initialConfig.waveStrength, min: 0.0, max: 3.0, step: 0.05, label: 'Wave Strength' },
    colorShift: { value: initialConfig.colorShift, min: -2.0, max: 2.0, step: 0.05, label: 'Color Shift' },
  })

  return React.createElement(SingularityScene, { config, perf, symmetry })
}

// ---------------------------------------------------------------------------
// SimModule export
// ---------------------------------------------------------------------------

export const singularityModule: SimModule<SingularityConfig> = {
  id: 'singularity',
  title: 'Singularity',
  description:
    'A fragment shader simulating gravitational lensing around a black hole accretion disk. ' +
    'Color emerges from per-channel exponential tinting of the geometry; colorShift scales ' +
    'the RGB gradient vector (0.6, -0.4, -1.0) so channels diverge asymmetrically.',

  defaults: {
    speed: 1.0,
    intensity: 1.0,
    size: 1.0,
    waveStrength: 1.0,
    colorShift: 1.0,
  },

  presets: SINGULARITY_PRESETS,

  schema,

  Scene: SingularitySceneWithControls,

  /**
   * Singularity is an isotropic radial shader — it has inherent continuous
   * rotational symmetry and discrete symmetry groups are not applicable.
   * Always returns false to disable the symmetry controls in the Leva panel.
   */
  symmetryApplies(_type: SymmetryType, _order: number): boolean {
    return false
  },
}
