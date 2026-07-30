export type Vec2 = { x: number; y: number };

export type LifecycleState = "spawning" | "active";

export type MotionBlend = {
  from: Vec2;
  elapsed: number;
  duration: number;
};

export type TrailPoint = Vec2 & { age: number };

export type InkObject = {
  id: number;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  mass: number;
  rotation: number;
  angularVelocity: number;
  opacity: number;
  scale: Vec2;
  variant: number;
  lifecycle: LifecycleState;
  rngState: number;
  spawnAt: number;
  effectCooldown: number;
  squashCooldown: number;
  grabbed: boolean;
  lastAcceleration: Vec2;
  smoothedAngularVelocity: number;
  unsafeElapsed: number;
  wobbleFrequency: number;
  wobblePhase: number;
  trail: TrailPoint[];
  trailSampleTimer: number;
  currentTargetId: number | null;
  chaseElapsed: number;
  lives: number;
  hungerElapsed: number;
  vanishElapsed: number | null;
  role: "predator" | "prey" | null;
  chaseSpeed: number;
  attractionValue: number;
  motionBlend: MotionBlend | null;
  huntingFlock: boolean;
  beingHunted: boolean;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  kind?: string;
  fixed?: boolean;
};

export type NormalizedRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  weight?: number;
};

export type RouteProfile = {
  name: string;
  regions: NormalizedRegion[];
  edgeBias: "left" | "right" | "outer" | "none";
};

export type SpatialField = {
  columns: number;
  rows: number;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  safe: boolean[];
  score: number[];
  obstacles: Rect[];
  profile: RouteProfile;
};

export type PointerState = {
  active: boolean;
  fine: boolean;
  id: number | null;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  velocityX: number;
  velocityY: number;
  downX: number;
  downY: number;
  downTime: number;
  dragStarted: boolean;
  grabbedId: number | null;
};

export type InkEffect = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  age: number;
  lifetime: number;
  type: "splat" | "burst";
  rotation: number;
};

export type InkSnapshot = {
  version: 2;
  seed: number;
  savedAt: number;
  objects: Array<{
    id: number;
    position: Vec2;
    velocity: Vec2;
    attractionValue: number;
    rngState: number;
  }>;
};
