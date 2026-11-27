import { afterEach, describe, expect, it, vi } from "vitest";
import { getSpawnState, resetSpawnState, setSpawnState, subscribeSpawnState } from "@/lib/ink-ambient/spawn-state";
import { addPredator, createWorld, setGeometry, spawnStateOf } from "@/lib/ink-ambient/world";
import { getRouteProfile } from "@/lib/ink-ambient/config";

const full = { predator: { count: 6, full: true }, prey: { count: 2, full: false } };

afterEach(() => resetSpawnState());

describe("spawn state store", () => {
  it("starts empty and not full", () => {
    expect(getSpawnState()).toEqual({ predator: { count: 0, full: false }, prey: { count: 0, full: false } });
  });

  it("gives a subscriber the current value at once and every later change", () => {
    const seen = vi.fn();
    setSpawnState(full);
    const stop = subscribeSpawnState(seen);
    expect(seen).toHaveBeenLastCalledWith(full);
    const next = { ...full, prey: { count: 3, full: false } };
    setSpawnState(next);
    expect(seen).toHaveBeenLastCalledWith(next);
    expect(seen).toHaveBeenCalledTimes(2);
    stop();
    setSpawnState(full);
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it("does not notify when the value is unchanged", () => {
    const seen = vi.fn();
    setSpawnState(full);
    subscribeSpawnState(seen);
    setSpawnState({ predator: { count: 6, full: true }, prey: { count: 2, full: false } });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("spawnStateOf reports the hand-added counts and the cap for a world", () => {
    const world = createWorld({ pointerFine: true }, 3);
    setGeometry(world, { width: 1280, height: 800, obstacles: [], profile: getRouteProfile("/") });
    world.objects.length = 0;
    for (let i = 0; i < 8; i += 1) addPredator(world, 0);
    expect(spawnStateOf(world)).toEqual({ predator: { count: 6, full: true }, prey: { count: 0, full: false } });
  });
});
