import type React from 'react'

// ---------------------------------------------------------------------------
// Perf tier — determined once at boot by PerfController
// ---------------------------------------------------------------------------
export type PerfTier = 'low' | 'mid' | 'high'

// ---------------------------------------------------------------------------
// Symmetry — constrained initial conditions
// ---------------------------------------------------------------------------
export type SymmetryType = 'none' | 'C' | 'D'

export interface SymmetryConfig {
  type: SymmetryType
  /** order n: C_n gives n-fold rotation; D_n gives n-fold rotation + n reflections */
  order: number
}

// ---------------------------------------------------------------------------
// Scene identifiers
// ---------------------------------------------------------------------------
export type SceneId =
  | 'singularity'
  | 'magnetic'
  | 'lorenz'
  | 'gray-scott'
  | 'kuramoto-sivashinsky'

// ---------------------------------------------------------------------------
// Leva schema — opaque at this layer; each sim provides its own typed schema
// object at runtime. We use unknown here so the engine layer does not import
// leva directly (keeping it optional / tree-shakeable for SSR).
// ---------------------------------------------------------------------------
export type LevaSchema = Record<string, unknown>

// ---------------------------------------------------------------------------
// Sim module contract
// ---------------------------------------------------------------------------
export interface SimModule<Config = unknown> {
  /** Unique identifier matching SceneId */
  id: SceneId

  /** Human-readable title shown in UI */
  title: string

  /** Math description shown in HelpOverlay */
  description: string

  /** Default config values */
  defaults: Config

  /** Named preset configs (partial overrides applied on top of defaults) */
  presets: Record<string, Partial<Config>>

  /** Leva schema object (opaque here; typed inside each sim module) */
  schema: LevaSchema

  /** The r3f scene subtree component */
  Scene: React.FC<{
    config: Config
    perf: PerfTier
    symmetry: SymmetryConfig
  }>

  /**
   * Returns true when the given symmetry type + order is physically
   * meaningful for this sim. Used by the leva panel to disable invalid combos.
   */
  symmetryApplies(type: SymmetryType, order: number): boolean
}
