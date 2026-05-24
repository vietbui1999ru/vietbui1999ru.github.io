import React from "react";
import type { PerfTier, SceneId, SymmetryConfig } from "./types";
import { sceneMap } from "../registry";

/**
 * Renders the Scene component matching `activeSceneId`, forwarding
 * `{ config, perf, symmetry }` props per the SimModule contract.
 *
 * The Scene→id mapping lives in `registry.ts` (single source of truth);
 * this component just does the lookup. Adding a sim = one registry entry.
 *
 * The enclosing Canvas is already `client:load`, so three.js / r3f never
 * evaluate server-side — no React.lazy / Suspense needed.
 */
export interface SceneHostProps {
  activeSceneId: SceneId;
  config: unknown;
  perf: PerfTier;
  symmetry: SymmetryConfig;
}

type SceneProps = { config: unknown; perf: PerfTier; symmetry: SymmetryConfig };

export function SceneHost({
  activeSceneId,
  config,
  perf,
  symmetry,
}: SceneHostProps): React.ReactElement {
  const mod = sceneMap[activeSceneId];
  if (!mod) return <></>;
  const Scene = mod.Scene as React.FC<SceneProps>;
  return <Scene config={config} perf={perf} symmetry={symmetry} />;
}
