import React from "react";
import { Canvas as R3FCanvas } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { SceneHost } from "./SceneHost";
import type { PerfTier, SceneId, SymmetryConfig } from "./types";

export interface AppCanvasProps {
  activeSceneId: SceneId;
  /** Config forwarded to the active scene. Until D13 (Leva store), AppCanvasIsland
   *  supplies the module's defaults. */
  config: unknown;
  perf: PerfTier;
  symmetry: SymmetryConfig;
  /** When true, use an orthographic projection (default false = perspective) */
  orthographic?: boolean;
  /** Optional inline style override. Defaults to fixed full-viewport behind content. */
  style?: React.CSSProperties;
}

const defaultStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: -10,
  pointerEvents: "none",
};

/**
 * Full-viewport r3f Canvas for the dedicated simulation routes.
 *
 * Mounted inside `SimLayout` pages at `fixed inset-0 -z-10 pointer-events-none`.
 * The surrounding stacking context keeps the negative layer behind the lab
 * controls without loading it behind portfolio or blog content.
 *
 * The Canvas is intentionally frameless; the simulation layout owns the dark
 * page background.
 */
export function AppCanvas({
  activeSceneId,
  config,
  perf,
  symmetry,
  orthographic = false,
  style,
}: AppCanvasProps): React.ReactElement {
  return (
    <R3FCanvas
      orthographic={orthographic}
      gl={{ antialias: true, alpha: true }}
      style={{ ...defaultStyle, ...style }}
      aria-hidden="true"
    >
      {orthographic && <OrthographicCamera makeDefault position={[0, 0, 5]} />}
      <SceneHost activeSceneId={activeSceneId} config={config} perf={perf} symmetry={symmetry} />
    </R3FCanvas>
  );
}
