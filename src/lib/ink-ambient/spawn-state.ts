// Shared state of the pen and pencil buttons (#42): how many hand-added objects of each
// role are alive, and whether the manual cap is reached. The ink island writes it and the
// nav reads it. It lives in this module, so it survives ClientRouter page swaps, and it
// imports no simulation code, so the nav bundle stays small.

export interface RoleSpawnState {
  count: number;
  full: boolean;
}

export interface SpawnState {
  predator: RoleSpawnState;
  prey: RoleSpawnState;
}

type Listener = (state: SpawnState) => void;

const EMPTY: SpawnState = { predator: { count: 0, full: false }, prey: { count: 0, full: false } };
let current: SpawnState = EMPTY;
const listeners = new Set<Listener>();

const same = (a: SpawnState, b: SpawnState) =>
  a.predator.count === b.predator.count &&
  a.predator.full === b.predator.full &&
  a.prey.count === b.prey.count &&
  a.prey.full === b.prey.full;

export function getSpawnState(): SpawnState {
  return current;
}

/** Stores the new state and notifies the subscribers when it changed. */
export function setSpawnState(next: SpawnState): void {
  if (same(current, next)) return;
  current = next;
  for (const listener of listeners) listener(current);
}

/** Calls `listener` with the current state now and on every change. Returns the unsubscribe. */
export function subscribeSpawnState(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

/** Back to the empty state with no subscribers; for tests. */
export function resetSpawnState(): void {
  current = EMPTY;
  listeners.clear();
}
