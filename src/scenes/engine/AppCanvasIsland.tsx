import React, { useState, useEffect } from "react";
import { useControls } from "leva";
import { AppCanvas } from "./Canvas";
import type { SceneId, SymmetryConfig, PerfTier } from "./types";
import {
  createAppSceneRegistry,
  registeredModules,
  sceneMap,
} from "../registry";
import { getPerfTier } from "./PerfController";
import { useIsMobileOrTouch } from "@/hooks/useIsMobileOrTouch";

const SCENE_OFF = "none" as const;
type SceneSelection = SceneId | typeof SCENE_OFF;
const SCENE_STORAGE_KEY = "portfolio:activeScene";

const registry = createAppSceneRegistry();
const defaultSymmetry: SymmetryConfig = { type: "none", order: 1 };
const sceneOptions: SceneSelection[] = [
  SCENE_OFF,
  ...registeredModules.map((m) => m.id),
];

function deriveRouteHint(): SceneId {
  if (typeof window === "undefined") return "singularity";
  const match = window.location.pathname.match(/^\/sim\/([^/]+)/);
  const id = match?.[1];
  if (id && sceneMap[id as SceneId]) return id as SceneId;
  return "singularity";
}

function isSimEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path.startsWith("/sim/") || path.startsWith("/sim-test");
}

function SimCanvas(): React.ReactElement {
  // The dedicated route is authoritative so shared /sim/:name URLs always
  // open the requested scene, independent of the user's last Leva choice.
  const initialScene: SceneSelection = deriveRouteHint();
  const [perf, setPerf] = useState<PerfTier>("mid");

  useEffect(() => {
    getPerfTier().then((r) => setPerf(r.tier));
  }, []);

  const { scene } = useControls("Scene", {
    scene: { value: initialScene, options: sceneOptions },
  });

  // Persist whenever the user changes the scene
  useEffect(() => {
    try {
      localStorage.setItem(SCENE_STORAGE_KEY, scene as string);
    } catch {
      // ignore write errors
    }
  }, [scene]);

  const selection = scene as SceneSelection;
  if (selection === SCENE_OFF) return <></>;

  const activeSceneId = selection;
  const activeModule = registry.get(activeSceneId);
  const config = activeModule?.defaults ?? {};

  return (
    <AppCanvas
      activeSceneId={activeSceneId}
      config={config}
      perf={perf}
      symmetry={defaultSymmetry}
    />
  );
}

export default function AppCanvasIsland(): React.ReactElement {
  const isMobile = useIsMobileOrTouch();
  if (isMobile || !isSimEnabled()) return <></>;
  return <SimCanvas />;
}
