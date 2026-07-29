<script lang="ts">
import { onMount } from "svelte";
import {
  ATTRACTION_MAX_ACCELERATION_HEAVY,
  ATTRACTION_MAX_ACCELERATION_LIGHT,
  ATTRACTION_VALUE_MAX,
  ATTRACTION_VALUE_MIN,
  BURST_ALPHA,
  BURST_LIFETIME_MAX,
  BURST_LIFETIME_MIN,
  BURST_RADIUS_MULTIPLIER,
  FIXED_STEP,
  MAX_CATCH_UP_STEPS,
  MAX_DPR,
  MAX_OBJECTS_DESKTOP,
  MAX_OBJECTS_MOBILE,
  PREDATOR_MAX_RAMPED_SPEED,
  SAFE_CLEARANCE,
  TRAIL_MAX_AGE_SECONDS,
  TRAIL_MAX_POINTS,
  TRAIL_MIN_SPEED,
  TRAIL_SAMPLE_INTERVAL_SECONDS,
  TRAPPED_ESCAPE_ACCELERATION,
  TRAPPED_ESCAPE_SECONDS,
  getRouteProfile,
} from "@/lib/ink-ambient/config";
import {
  detachPair,
  formInitialPairs,
  idleAcceleration,
  pairApproachRamp,
  predatorAcceleration,
  preyAcceleration,
  reevaluatePartner,
} from "@/lib/ink-ambient/pairing";
import { updateSpawnFade } from "@/lib/ink-ambient/lifecycle";
import {
  collectObstacles,
  hasOpenModal,
  hasTextSelection,
  isInteractiveTarget,
} from "@/lib/ink-ambient/obstacles";
import {
  applyDrag,
  applyHeadingRotation,
  boundarySteeringForce,
  circlesOverlap,
  clamp,
  clampToViewport,
  fixedStepAccumulator,
  integrate,
  length,
  limit,
  normalize,
  obstacleRepulsion,
  resolveCircleCollision,
  scale as scaleVector,
  subtract,
  updateTurnSquash,
} from "@/lib/ink-ambient/physics";
import { loadSnapshot, saveSnapshot } from "@/lib/ink-ambient/persistence";
import { InkRenderer } from "@/lib/ink-ambient/renderer";
import {
  buildSpatialField,
  findSafePoint,
  findSafePointNearCorner,
  availableCapacity,
  isSafePoint,
} from "@/lib/ink-ambient/spatial-field";
import { SeededRng, randomSeed } from "@/lib/ink-ambient/rng";
import type {
  InkEffect,
  InkObject,
  PointerState,
  Rect,
  SpatialField,
  Vec2,
} from "@/lib/ink-ambient/types";

let { pathname = "/", enabled = true } = $props<{
  pathname?: string;
  enabled?: boolean;
}>();
let canvas: HTMLCanvasElement;

function attachCanvas(node: HTMLCanvasElement): void {
  canvas = node;
}

const EMPTY_POINTER: PointerState = {
  active: false,
  fine: false,
  id: null,
  x: 0,
  y: 0,
  previousX: 0,
  previousY: 0,
  velocityX: 0,
  velocityY: 0,
  downX: 0,
  downY: 0,
  downTime: 0,
  dragStarted: false,
  grabbedId: null,
};

function massFraction(mass: number): number {
  return clamp((mass - 0.7) / (1.5 - 0.7), 0, 1);
}

function makeObject(id: number, position: Vec2, rng: SeededRng, now: number): InkObject {
  return {
    id,
    position: { ...position },
    velocity: { x: rng.range(-18, 18), y: rng.range(-12, 12) },
    radius: rng.range(13, 24),
    mass: rng.range(0.7, 1.5),
    rotation: rng.range(-Math.PI, Math.PI),
    angularVelocity: rng.range(-0.25, 0.25),
    opacity: 0.01,
    scale: { x: rng.range(0.86, 1.14), y: rng.range(0.86, 1.14) },
    variant: rng.int(0, 1),
    lifecycle: "spawning",
    rngState: rng.state,
    spawnAt: now,
    effectCooldown: 0,
    squashCooldown: 0,
    grabbed: false,
    lastAcceleration: { x: 0, y: 0 },
    smoothedAngularVelocity: 0,
    unsafeElapsed: 0,
    wobbleFrequency: rng.range(0.8, 1.6),
    wobblePhase: rng.range(0, Math.PI * 2),
    trail: [],
    trailSampleTimer: 0,
    partnerId: null,
    formerPartnerId: null,
    role: null,
    chaseSpeed: 0,
    attractionValue: rng.range(ATTRACTION_VALUE_MIN, ATTRACTION_VALUE_MAX),
    motionBlend: null,
  };
}

function createPointer(fine: boolean): PointerState {
  return { ...EMPTY_POINTER, fine };
}

onMount(() => {
  if (!enabled || !canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const renderer = new InkRenderer(canvas);
  const snapshot = loadSnapshot();
  const seed = snapshot?.seed ?? randomSeed();
  const rng = new SeededRng(seed);
  const objects: InkObject[] = [];
  let nextObjectId = 0;
  const effects: InkEffect[] = [];
  const pointer = createPointer(matchMedia("(pointer: fine)").matches);
  let obstacles: Rect[] = [];
  let field: SpatialField | null = null;
  let profile = getRouteProfile(pathname);
  let activeSection = "";
  let width = 0;
  let height = 0;
  let dpr = 1;
  let accumulator = 0;
  let lastTime = performance.now();
  let lastSave = lastTime;
  let frameId = 0;
  let running = false;
  let geometryDirty = true;
  let pausedByModal = false;
  let animationEnabled = !document.documentElement.classList.contains(
    "ink-ambient-disabled",
  );
  let activeAnchor: Vec2 | null = null;
  let lastSectionChange = 0;
  let pointerSampleTime = 0;
  let pointerListenersInstalled = false;
  const sectionRatios: Array<[Element, number]> = [];

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width || window.innerWidth);
    height = Math.max(1, rect.height || window.innerHeight);
    dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    renderer.resize(width, height, dpr);
    geometryDirty = true;
  }

  function scheduleGeometry(): void {
    geometryDirty = true;
  }

  function refreshGeometry(): void {
    obstacles = collectObstacles();
    pausedByModal = hasOpenModal();
    profile = getRouteProfile(pathname, activeSection);
    const representativeRadius = objects.length
      ? Math.max(...objects.map((object) => object.radius))
      : 18;
    field = buildSpatialField(
      width,
      height,
      obstacles,
      profile,
      representativeRadius,
    );
    activeAnchor = findSafePoint(
      field,
      representativeRadius,
      rng,
      objects.map((object) => object.position),
    );
    geometryDirty = false;
  }

  function targetPopulation(): number {
    if (!field) return pointer.fine ? MAX_OBJECTS_DESKTOP : MAX_OBJECTS_MOBILE;
    const mobile = !pointer.fine || width < 720;
    const maximum = mobile ? MAX_OBJECTS_MOBILE : MAX_OBJECTS_DESKTOP;
    const capacity = availableCapacity(field, 24);
    return Math.min(maximum, Math.max(0, capacity));
  }

  function spawnFreshBatch(now: number): void {
    if (!field) return;
    const target = targetPopulation();
    let cornerIndex = objects.length;
    while (objects.length < target) {
      const radius = rng.range(13, 24);
      const avoid = objects.map((object) => object.position);
      const position =
        findSafePointNearCorner(field, radius, rng, cornerIndex, avoid) ??
        findSafePoint(field, radius, rng, avoid);
      if (!position) break;
      objects.push(makeObject(nextObjectId++, position, rng, now));
      cornerIndex += 1;
    }
    formInitialPairs(objects, rng);
  }

  function restoreObjects(): void {
    if (!snapshot || !field) return;
    for (const saved of snapshot.objects.slice(
      0,
      pointer.fine ? MAX_OBJECTS_DESKTOP : MAX_OBJECTS_MOBILE,
    )) {
      const savedPosition = {
        x: saved.position.x * width,
        y: saved.position.y * height,
      };
      const position = isSafePoint(field, savedPosition, 24)
        ? savedPosition
        : findSafePoint(
            field,
            24,
            rng,
            objects.map((object) => object.position),
          );
      if (!position) continue;
      const object = makeObject(saved.id, position, rng, performance.now());
      nextObjectId = Math.max(nextObjectId, saved.id + 1);
      object.velocity = {
        x: saved.velocity.x * width,
        y: saved.velocity.y * height,
      };
      object.attractionValue = saved.attractionValue;
      object.rngState = saved.rngState;
      objects.push(object);
    }
  }

  function updateEffects(dt: number): void {
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const effect = effects[index];
      effect.age += dt;
      effect.alpha = 1 - effect.age / effect.lifetime;
      if (effect.age >= effect.lifetime) effects.splice(index, 1);
    }
  }

  function addCollisionEffect(object: InkObject): void {
    if (object.effectCooldown > 0 || effects.length >= 4 || !rng.chance(0.12))
      return;
    object.effectCooldown = 1.3;
    effects.push({
      x: object.position.x,
      y: object.position.y,
      radius: object.radius * rng.range(0.45, 0.9),
      alpha: 0.26,
      age: 0,
      lifetime: rng.range(0.5, 1.5),
      type: "splat",
      rotation: rng.range(-Math.PI, Math.PI),
    });
  }

  function addBurstEffect(x: number, y: number, radius: number): void {
    if (effects.length >= 4) return;
    effects.push({
      x,
      y,
      radius: radius * BURST_RADIUS_MULTIPLIER,
      alpha: BURST_ALPHA,
      age: 0,
      lifetime: rng.range(BURST_LIFETIME_MIN, BURST_LIFETIME_MAX),
      type: "burst",
      rotation: rng.range(-Math.PI, Math.PI),
    });
  }

  function updateTrail(object: InkObject, dt: number): void {
    // Age and prune every frame regardless of motion, so a trail fades out on
    // its own instead of freezing in place when the object slows down.
    for (let index = object.trail.length - 1; index >= 0; index -= 1) {
      object.trail[index].age += dt;
      if (object.trail[index].age >= TRAIL_MAX_AGE_SECONDS) object.trail.splice(index, 1);
    }
    object.trailSampleTimer += dt;
    if (
      object.opacity > 0.4 &&
      length(object.velocity) > TRAIL_MIN_SPEED &&
      object.trailSampleTimer >= TRAIL_SAMPLE_INTERVAL_SECONDS
    ) {
      object.trailSampleTimer = 0;
      object.trail.push({ x: object.position.x, y: object.position.y, age: 0 });
      if (object.trail.length > TRAIL_MAX_POINTS) object.trail.shift();
    }
  }

  function updateObject(object: InkObject, dt: number, now: number): void {
    object.effectCooldown = Math.max(0, object.effectCooldown - dt);
    object.squashCooldown = Math.max(0, object.squashCooldown - dt);
    updateSpawnFade(object, now, dt);

    if (object.grabbed) {
      // Still track the trail while dragged: object.position is synced to the
      // pointer in pointerMove, so this samples the real cursor trajectory
      // instead of freezing until release.
      updateTrail(object, dt);
      return;
    }

    const settling = object.lifecycle === "spawning";
    const massT = massFraction(object.mass);
    const maxAccel =
      ATTRACTION_MAX_ACCELERATION_LIGHT +
      (ATTRACTION_MAX_ACCELERATION_HEAVY - ATTRACTION_MAX_ACCELERATION_LIGHT) * massT;

    const partner =
      object.partnerId !== null
        ? (objects.find((candidate) => candidate.id === object.partnerId) ?? null)
        : null;

    const isUnsafe = Boolean(field) && !isSafePoint(field!, object.position, object.radius);
    object.unsafeElapsed = isUnsafe ? object.unsafeElapsed + dt : 0;

    let acceleration =
      partner && !settling
        ? object.role === "predator"
          ? predatorAcceleration(object, partner, maxAccel, now)
          : preyAcceleration(object, partner, maxAccel, now)
        : idleAcceleration(object, activeAnchor, isUnsafe, now);

    if (object.motionBlend) {
      object.motionBlend.elapsed += dt;
      const t = clamp(object.motionBlend.elapsed / object.motionBlend.duration, 0, 1);
      acceleration = {
        x: object.motionBlend.from.x + (acceleration.x - object.motionBlend.from.x) * t,
        y: object.motionBlend.from.y + (acceleration.y - object.motionBlend.from.y) * t,
      };
      if (t >= 1) object.motionBlend = null;
    }

    const boundary = boundarySteeringForce(object, width, height);
    acceleration.x += boundary.x;
    acceleration.y += boundary.y;
    const repulsion = obstacleRepulsion(object, obstacles, SAFE_CLEARANCE);
    acceleration.x += repulsion.x;
    acceleration.y += repulsion.y;

    if (activeAnchor && object.unsafeElapsed > TRAPPED_ESCAPE_SECONDS) {
      acceleration = scaleVector(
        normalize(subtract(activeAnchor, object.position)),
        TRAPPED_ESCAPE_ACCELERATION,
      );
    }

    object.lastAcceleration = { x: acceleration.x, y: acceleration.y };
    applyDrag(object, 0.06, dt);
    integrate(object, acceleration, dt);
    const rotationDelta = applyHeadingRotation(object, dt);
    const maxSpeed =
      partner && !settling
        ? object.role === "predator"
          ? Math.min(object.chaseSpeed * pairApproachRamp(object, partner), PREDATOR_MAX_RAMPED_SPEED)
          : object.chaseSpeed
        : 155 - (155 - 115) * massT;
    object.velocity = limit(object.velocity, maxSpeed);
    object.scale.x += (1 - object.scale.x) * Math.min(1, dt * 5);
    object.scale.y += (1 - object.scale.y) * Math.min(1, dt * 5);
    if (object.squashCooldown <= 0) {
      const turnFactor = updateTurnSquash(object, rotationDelta, dt);
      object.scale.x += (1 - turnFactor - object.scale.x) * Math.min(1, dt * 8);
      object.scale.y += (1 + turnFactor - object.scale.y) * Math.min(1, dt * 8);
    }
    clampToViewport(object, width, height);
    updateTrail(object, dt);
  }

  function updateSimulation(dt: number, now: number): void {
    if (geometryDirty) refreshGeometry();
    pausedByModal = hasOpenModal();
    if (pausedByModal) return;

    for (const object of objects) updateObject(object, dt, now);

    const destroyed = new Set<number>();
    const bursts: Array<{ x: number; y: number; radius: number }> = [];
    for (let first = 0; first < objects.length; first += 1) {
      for (let second = first + 1; second < objects.length; second += 1) {
        const a = objects[first];
        const b = objects[second];
        if (destroyed.has(a.id) || destroyed.has(b.id)) continue;

        const mutuallyPaired = a.partnerId === b.id && b.partnerId === a.id;
        if (mutuallyPaired && circlesOverlap(a, b)) {
          destroyed.add(a.id);
          destroyed.add(b.id);
          bursts.push({
            x: (a.position.x + b.position.x) / 2,
            y: (a.position.y + b.position.y) / 2,
            radius: a.radius + b.radius,
          });
          continue;
        }
        if (!mutuallyPaired) {
          const collision = resolveCircleCollision(a, b, rng.range(-0.08, 0.08));
          if (collision.hit) {
            const squash = clamp(collision.impulse / 90, 0.02, 0.22);
            if (a.squashCooldown <= 0) {
              a.scale.x = 1 + squash;
              a.scale.y = 1 - squash;
              a.squashCooldown = 0.18;
            }
            if (b.squashCooldown <= 0) {
              b.scale.x = 1 + squash;
              b.scale.y = 1 - squash;
              b.squashCooldown = 0.18;
            }
            addCollisionEffect(a);
            addCollisionEffect(b);
          }
        }
      }
    }

    if (destroyed.size > 0) {
      for (const burst of bursts) addBurstEffect(burst.x, burst.y, burst.radius);
      for (let index = objects.length - 1; index >= 0; index -= 1) {
        if (destroyed.has(objects[index].id)) objects.splice(index, 1);
      }
    }

    updateEffects(dt);

    if (objects.length === 0) spawnFreshBatch(now);
  }

  function frame(now: number): void {
    if (!running) return;
    const elapsed = Math.min(0.2, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    pausedByModal = hasOpenModal();
    if (animationEnabled && !document.hidden && !pausedByModal) {
      accumulator = fixedStepAccumulator(
        elapsed,
        accumulator,
        FIXED_STEP,
        MAX_CATCH_UP_STEPS,
        (dt) => updateSimulation(dt, now),
      );
    } else {
      accumulator = 0;
    }
    renderer.draw(objects, effects, obstacles, width, height);
    if (now - lastSave > 7000) {
      saveSnapshot(seed, objects, { width, height }, Date.now());
      lastSave = now;
    }
    frameId = requestAnimationFrame(frame);
  }

  function start(): void {
    if (running || !animationEnabled) return;
    running = true;
    lastTime = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function stop(): void {
    running = false;
    cancelAnimationFrame(frameId);
  }

  function pointerMove(event: PointerEvent): void {
    if (hasOpenModal()) {
      pausedByModal = true;
      pointerCancel();
      return;
    }
    if (!animationEnabled || !pointer.fine || event.pointerType !== "mouse")
      return;
    const now = performance.now();
    const elapsed = Math.max(1, now - (pointerSampleTime || now - 16));
    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const sampleVelocityX = ((pointer.x - pointer.previousX) / elapsed) * 1000;
    const sampleVelocityY = ((pointer.y - pointer.previousY) / elapsed) * 1000;
    pointer.velocityX = pointer.velocityX * 0.65 + sampleVelocityX * 0.35;
    pointer.velocityY = pointer.velocityY * 0.65 + sampleVelocityY * 0.35;
    pointerSampleTime = now;
    pointer.active = true;
    if (pointer.grabbedId === null) return;

    const object = objects.find(
      (candidate) => candidate.id === pointer.grabbedId,
    );
    if (!object) return;
    if (!pointer.dragStarted) {
      const moved = Math.hypot(
        pointer.x - pointer.downX,
        pointer.y - pointer.downY,
      );
      if (moved < 5) return;
      pointer.dragStarted = true;
      object.grabbed = true;
      detachPair(object, objects);
    }
    object.position.x = pointer.x;
    object.position.y = pointer.y;
    object.velocity.x = pointer.velocityX;
    object.velocity.y = pointer.velocityY;
  }

  function pointerDown(event: PointerEvent): void {
    if (
      !animationEnabled ||
      !pointer.fine ||
      event.pointerType !== "mouse" ||
      pausedByModal ||
      isInteractiveTarget(event.target) ||
      hasTextSelection()
    )
      return;
    const object = objects.find(
      (candidate) =>
        Math.hypot(
          candidate.position.x - event.clientX,
          candidate.position.y - event.clientY,
        ) <=
        candidate.radius + 12,
    );
    if (!object) return;
    pointer.id = event.pointerId;
    pointer.downX = event.clientX;
    pointer.downY = event.clientY;
    pointer.downTime = performance.now();
    pointerSampleTime = pointer.downTime;
    pointer.velocityX = 0;
    pointer.velocityY = 0;
    pointer.dragStarted = false;
    pointer.grabbedId = object.id;
  }

  function releasePointer(throwObject: boolean): void {
    if (pointer.grabbedId === null) return;
    const object = objects.find(
      (candidate) => candidate.id === pointer.grabbedId,
    );
    if (object) {
      object.grabbed = false;
      if (pointer.dragStarted) {
        if (throwObject) {
          object.velocity.x = clamp(pointer.velocityX, -260, 260);
          object.velocity.y = clamp(pointer.velocityY, -260, 260);
        }
        reevaluatePartner(object, objects, rng);
      }
    }
    pointer.id = null;
    pointer.grabbedId = null;
    pointer.dragStarted = false;
  }

  function pointerUp(event: PointerEvent): void {
    if (pointer.id !== event.pointerId) return;
    releasePointer(true);
  }

  function pointerCancel(): void {
    releasePointer(false);
    pointer.active = false;
    pointerSampleTime = 0;
  }

  function visibilityChange(): void {
    if (document.hidden) {
      saveSnapshot(seed, objects, { width, height });
      pointerCancel();
    }
    lastTime = performance.now();
  }

  function activeSectionChange(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const index = sectionRatios.findIndex(
        ([target]) => target === entry.target,
      );
      const value: [Element, number] = [
        entry.target,
        entry.isIntersecting ? entry.intersectionRatio : 0,
      ];
      if (index === -1) sectionRatios.push(value);
      else sectionRatios[index] = value;
    }
    const best = sectionRatios
      .filter(([, ratio]) => ratio > 0)
      .sort(([, first], [, second]) => second - first)[0]?.[0];
    const id = best?.getAttribute("data-section-id");
    if (
      id &&
      id !== activeSection &&
      performance.now() - lastSectionChange > 250
    ) {
      activeSection = id;
      lastSectionChange = performance.now();
      scheduleGeometry();
    }
  }

  resize();
  refreshGeometry();
  restoreObjects();
  spawnFreshBatch(performance.now());

  const sectionObserver = new IntersectionObserver(activeSectionChange, {
    threshold: [0.15, 0.35, 0.6],
  });
  document
    .querySelectorAll("[data-section-id]")
    .forEach((element) => sectionObserver.observe(element));
  const resizeObserver = new ResizeObserver(scheduleGeometry);
  resizeObserver.observe(document.body);
  const mutationObserver = new MutationObserver(() => {
    if (hasOpenModal()) {
      pausedByModal = true;
      pointerCancel();
    }
    scheduleGeometry();
  });
  mutationObserver.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "open", "aria-hidden", "data-ink-obstacle"],
  });
  const themeObserver = new MutationObserver(() => renderer.rebuildSprites());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  const onResize = () => resize();
  const onScroll = () => scheduleGeometry();
  const onBlur = () => pointerCancel();
  const installPointerListeners = () => {
    if (pointerListenersInstalled) return;
    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("pointerdown", pointerDown, { passive: true });
    window.addEventListener("pointerup", pointerUp, { passive: true });
    window.addEventListener("pointercancel", pointerCancel, { passive: true });
    window.addEventListener("blur", onBlur, { passive: true });
    pointerListenersInstalled = true;
  };
  const removePointerListeners = () => {
    if (!pointerListenersInstalled) return;
    pointerCancel();
    window.removeEventListener("pointermove", pointerMove);
    window.removeEventListener("pointerdown", pointerDown);
    window.removeEventListener("pointerup", pointerUp);
    window.removeEventListener("pointercancel", pointerCancel);
    window.removeEventListener("blur", onBlur);
    pointerListenersInstalled = false;
  };
  const onInkAmbientChange = (event: Event) => {
    const { enabled: nextEnabled } = (
      event as CustomEvent<{ enabled: boolean }>
    ).detail;
    animationEnabled = nextEnabled;
    if (animationEnabled) {
      installPointerListeners();
      start();
    } else {
      removePointerListeners();
      stop();
      renderer.clear(width, height);
    }
  };

  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  if (animationEnabled) installPointerListeners();
  document.addEventListener("visibilitychange", visibilityChange, {
    passive: true,
  });
  window.addEventListener("ink-ambient-change", onInkAmbientChange);
  mutationObserver.takeRecords();
  start();

  return () => {
    saveSnapshot(seed, objects, { width, height });
    stop();
    sectionObserver.disconnect();
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    themeObserver.disconnect();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll);
    removePointerListeners();
    document.removeEventListener("visibilitychange", visibilityChange);
    window.removeEventListener("ink-ambient-change", onInkAmbientChange);
  };
});
</script>

<canvas {@attach attachCanvas} class="ink-ambient-canvas" aria-hidden="true"></canvas>

<style>
  .ink-ambient-canvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    display: block;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    overflow: hidden;
  }
</style>
