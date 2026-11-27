<script lang="ts">
import { onMount } from "svelte";
import { FIXED_STEP, MAX_CATCH_UP_STEPS, MAX_DPR, getRouteProfile } from "@/lib/ink-ambient/config";
import {
  collectObstacles,
  hasOpenModal,
  hasTextSelection,
  isInteractiveTarget,
} from "@/lib/ink-ambient/obstacles";
import { acceptsPointer, dragThreshold, findGrabTarget } from "@/lib/ink-ambient/input";
import { clamp, fixedStepAccumulator } from "@/lib/ink-ambient/physics";
import { loadSnapshot, saveSnapshot } from "@/lib/ink-ambient/persistence";
import { CONFIG_EVENT, RESTART_EVENT, STATS_EVENT } from "@/lib/ink-ambient/panel-controls";
import { InkRenderer } from "@/lib/ink-ambient/renderer";
import { usesSnapshot, type SimConfig } from "@/lib/ink-ambient/sim-config";
import { randomSeed } from "@/lib/ink-ambient/rng";
import { step } from "@/lib/ink-ambient/step";
import {
  addPredator,
  addPrey,
  applyDragPenalty,
  createWorld,
  resetWorld,
  restartWorld,
  restoreWorld,
  setConfig,
  setGeometry,
  spawnInitialBatch,
  spawnStateOf,
} from "@/lib/ink-ambient/world";
import { setSpawnState } from "@/lib/ink-ambient/spawn-state";
import { watchPage } from "@/lib/ink-ambient/page-watch";
import type { PointerState } from "@/lib/ink-ambient/types";

// DOM adapter over the framework-free core in lib/ink-ambient/world.ts and step.ts:
// canvas, renderer, pointer drag, page geometry, snapshot storage and the frame loop.
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

function createPointer(fine: boolean): PointerState {
  return { ...EMPTY_POINTER, fine };
}

onMount(() => {
  if (!enabled || !canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const renderer = new InkRenderer(canvas);
  // The playground runs a fresh world each visit and never touches the shared
  // snapshot, so its settings and objects cannot reach other pages (#22).
  const persist = usesSnapshot(pathname);
  const snapshot = persist ? loadSnapshot() : null;
  const pointer = createPointer(matchMedia("(pointer: fine)").matches);
  const world = createWorld({ pointerFine: pointer.fine }, snapshot?.seed ?? randomSeed());
  const { objects, effects } = world;
  let activeSection = "";
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
  let lastSectionChange = 0;
  let pointerSampleTime = 0;
  let grabPointerType = "mouse";
  let pointerListenersInstalled = false;
  const sectionRatios: Array<[Element, number]> = [];

  // Playground readout: smoothed step time per frame, sent about twice per second.
  let averageStepMs = 0;
  let lastStatsAt = 0;
  function reportStats(stepMs: number, now: number): void {
    averageStepMs = averageStepMs * 0.9 + stepMs * 0.1;
    if (now - lastStatsAt < 500) return;
    lastStatsAt = now;
    window.dispatchEvent(
      new CustomEvent(STATS_EVENT, { detail: { objects: objects.length, stepMs: averageStepMs } }),
    );
  }

  function save(savedAt?: number): void {
    if (!persist) return;
    saveSnapshot(world.seed, objects, { width: world.width, height: world.height }, savedAt);
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    world.width = Math.max(1, rect.width || window.innerWidth);
    world.height = Math.max(1, rect.height || window.innerHeight);
    dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    renderer.resize(world.width, world.height, dpr);
    geometryDirty = true;
  }

  function scheduleGeometry(): void {
    geometryDirty = true;
  }

  function refreshGeometry(): void {
    const obstacles = collectObstacles();
    pausedByModal = hasOpenModal();
    setGeometry(world, {
      width: world.width,
      height: world.height,
      obstacles,
      // location.pathname: the island persists across swaps (#42), and the location is
      // current at astro:after-swap, before the pathname prop updates.
      profile: getRouteProfile(location.pathname, activeSection),
    });
    geometryDirty = false;
  }

  function updateSimulation(dt: number, now: number): void {
    if (geometryDirty) refreshGeometry();
    pausedByModal = hasOpenModal();
    if (pausedByModal) return;
    step(world, dt, now);
  }

  function frame(now: number): void {
    if (!running) return;
    const elapsed = Math.min(0.2, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    pausedByModal = hasOpenModal();
    if (animationEnabled && !document.hidden && !pausedByModal) {
      const stepStart = performance.now();
      accumulator = fixedStepAccumulator(
        elapsed,
        accumulator,
        FIXED_STEP,
        MAX_CATCH_UP_STEPS,
        (dt) => updateSimulation(dt, now),
      );
      if (!persist) reportStats(performance.now() - stepStart, now);
      setSpawnState(spawnStateOf(world));
    } else {
      accumulator = 0;
    }
    renderer.draw(objects, effects, world.obstacles, world.width, world.height, now, world.config);
    if (now - lastSave > 7000) {
      save(Date.now());
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
    if (!animationEnabled || !acceptsPointer(event.pointerType)) return;
    // While an object is held, only the pointer holding it moves it.
    if (pointer.id !== null && event.pointerId !== pointer.id) return;
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
      if (moved < dragThreshold(grabPointerType)) return;
      pointer.dragStarted = true;
      object.grabbed = true;
    }
    object.position.x = pointer.x;
    object.position.y = pointer.y;
    object.velocity.x = pointer.velocityX;
    object.velocity.y = pointer.velocityY;
  }

  function pointerDown(event: PointerEvent): void {
    if (
      !animationEnabled ||
      !acceptsPointer(event.pointerType) ||
      pointer.grabbedId !== null ||
      pausedByModal ||
      isInteractiveTarget(event.target) ||
      hasTextSelection()
    )
      return;
    const object = findGrabTarget(objects, event.clientX, event.clientY, event.pointerType);
    if (!object) return;
    grabPointerType = event.pointerType;
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

  // A touch scrolls the page unless the scroll is stopped at touchstart; after
  // that the browser sends pointercancel and no more pointer events. So a touch
  // that lands on an object (the same hit test pointerDown uses) stops the
  // scroll here. Every other touch is left alone and scrolls as before.
  function touchStart(event: TouchEvent): void {
    if (
      !animationEnabled ||
      pausedByModal ||
      event.touches.length !== 1 ||
      isInteractiveTarget(event.target) ||
      hasTextSelection()
    )
      return;
    const touch = event.changedTouches[0];
    if (findGrabTarget(objects, touch.clientX, touch.clientY, "touch")) event.preventDefault();
  }

  function releasePointer(throwObject: boolean): void {
    if (pointer.grabbedId === null) return;
    const object = objects.find(
      (candidate) => candidate.id === pointer.grabbedId,
    );
    if (object) {
      object.grabbed = false;
      if (pointer.dragStarted && throwObject) {
        object.velocity.x = clamp(pointer.velocityX, -260, 260);
        object.velocity.y = clamp(pointer.velocityY, -260, 260);
      }
      if (pointer.dragStarted) applyDragPenalty(world, object);
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
      save();
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
  restoreWorld(world, snapshot, performance.now());
  spawnInitialBatch(world, performance.now());

  // Body, obstacle and section observers; they follow each ClientRouter swap (#42).
  const pageWatch = watchPage({
    onLayout: () => {
      if (hasOpenModal()) {
        pausedByModal = true;
        pointerCancel();
      }
      scheduleGeometry();
    },
    onSections: activeSectionChange,
    onSwap: () => {
      sectionRatios.length = 0;
      activeSection = "";
      pointerCancel();
      scheduleGeometry();
    },
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
    window.addEventListener("touchstart", touchStart, { passive: false });
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
    window.removeEventListener("touchstart", touchStart);
    window.removeEventListener("blur", onBlur);
    pointerListenersInstalled = false;
  };
  const onInkAmbientAddPredator = () => {
    addPredator(world, performance.now());
    setSpawnState(spawnStateOf(world));
  };
  const onInkAmbientAddPrey = () => {
    addPrey(world, performance.now());
    setSpawnState(spawnStateOf(world));
  };
  const onInkAmbientReset = () => {
    if (!world.field) return;
    resetWorld(world, performance.now());
    save();
  };
  // Playground panel (#22): apply config changes, restart with a seed.
  const onInkAmbientConfig = (event: Event) => {
    setConfig(world, (event as CustomEvent<Partial<SimConfig>>).detail);
  };
  const onInkAmbientRestart = (event: Event) => {
    restartWorld(world, (event as CustomEvent<{ seed: number }>).detail.seed, performance.now());
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
      renderer.clear(world.width, world.height);
    }
  };

  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  if (animationEnabled) installPointerListeners();
  document.addEventListener("visibilitychange", visibilityChange, {
    passive: true,
  });
  window.addEventListener("ink-ambient-change", onInkAmbientChange);
  window.addEventListener("ink-ambient-add-predator", onInkAmbientAddPredator);
  window.addEventListener("ink-ambient-add-prey", onInkAmbientAddPrey);
  window.addEventListener("ink-ambient-reset", onInkAmbientReset);
  if (!persist) {
    window.addEventListener(CONFIG_EVENT, onInkAmbientConfig);
    window.addEventListener(RESTART_EVENT, onInkAmbientRestart);
  }
  setSpawnState(spawnStateOf(world));
  start();

  return () => {
    save();
    stop();
    pageWatch.disconnect();
    themeObserver.disconnect();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll);
    removePointerListeners();
    document.removeEventListener("visibilitychange", visibilityChange);
    window.removeEventListener("ink-ambient-change", onInkAmbientChange);
    window.removeEventListener("ink-ambient-add-predator", onInkAmbientAddPredator);
    window.removeEventListener("ink-ambient-add-prey", onInkAmbientAddPrey);
    window.removeEventListener("ink-ambient-reset", onInkAmbientReset);
    window.removeEventListener(CONFIG_EVENT, onInkAmbientConfig);
    window.removeEventListener(RESTART_EVENT, onInkAmbientRestart);
  };
});
</script>

<canvas {@attach attachCanvas} class="ink-ambient-canvas" aria-hidden="true"></canvas>

<style>
  .ink-ambient-canvas {
    position: fixed;
    inset: 0;
    /* Above ordinary page content/text/links (unstyled, effectively z-auto)
       so predators/prey visually pass over them, but below the sticky nav
       (z-40) and modal overlays (z-50) so those stay usable and aren't
       painted over by a frozen ink-ambient frame while a modal is open. */
    z-index: 30;
    display: block;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    overflow: hidden;
  }
</style>
