import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useActiveScene } from "@/scenes/engine/SceneRouter";
import type { SceneRegistry } from "@/scenes/engine/SceneRegistry";

// ---------------------------------------------------------------------------
// Mock IntersectionObserver
// ---------------------------------------------------------------------------

type IOCallback = (entries: IntersectionObserverEntry[]) => void;

let capturedCallback: IOCallback | null = null;
let capturedTargets: Element[] = [];

const mockObserve = vi.fn((el: Element) => {
  capturedTargets.push(el);
});
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

function MockIntersectionObserver(cb: IOCallback) {
  capturedCallback = cb;
  return {
    observe: mockObserve,
    unobserve: mockUnobserve,
    disconnect: mockDisconnect,
  };
}

// Utility: fire mock IO entries
function fireEntries(entries: Array<{ target: Element; intersectionRatio: number }>) {
  if (!capturedCallback) throw new Error("IntersectionObserver callback not captured");
  capturedCallback(
    entries.map(({ target, intersectionRatio }) => ({
      target,
      intersectionRatio,
      isIntersecting: intersectionRatio > 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: 0,
    })) as IntersectionObserverEntry[],
  );
}

beforeEach(() => {
  capturedCallback = null;
  capturedTargets = [];
  mockObserve.mockClear();
  mockUnobserve.mockClear();
  mockDisconnect.mockClear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).IntersectionObserver = MockIntersectionObserver;
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).IntersectionObserver;
});

// Minimal registry stub
function makeRegistry(ids: string[]) {
  return {
    list: () => ids.map((id) => ({ id })),
  } as unknown as SceneRegistry;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useActiveScene", () => {
  it("falls back to routeHint when no sentinel has intersectionRatio > 0", () => {
    const registry = makeRegistry(["singularity", "lorenz"]);
    const { result } = renderHook(() => useActiveScene({ registry, routeHint: "lorenz" }));
    expect(result.current.activeSceneId).toBe("lorenz");
  });

  it("selects the scene with the highest intersectionRatio when sentinels fire", () => {
    const registry = makeRegistry(["singularity", "lorenz"]);

    // Create real DOM sentinels so the hook can observe them
    const sentinel1 = document.createElement("div");
    sentinel1.setAttribute("data-scene-id", "singularity");
    document.body.appendChild(sentinel1);

    const sentinel2 = document.createElement("div");
    sentinel2.setAttribute("data-scene-id", "lorenz");
    document.body.appendChild(sentinel2);

    const { result } = renderHook(() => useActiveScene({ registry, routeHint: "singularity" }));

    act(() => {
      fireEntries([
        { target: sentinel1, intersectionRatio: 0.3 },
        { target: sentinel2, intersectionRatio: 0.8 },
      ]);
    });

    expect(result.current.activeSceneId).toBe("lorenz");

    document.body.removeChild(sentinel1);
    document.body.removeChild(sentinel2);
  });

  it("setActiveSceneId overrides selection immediately", () => {
    const registry = makeRegistry(["singularity", "lorenz"]);
    const { result } = renderHook(() => useActiveScene({ registry, routeHint: "singularity" }));

    act(() => {
      result.current.setActiveSceneId("lorenz");
    });

    expect(result.current.activeSceneId).toBe("lorenz");
  });

  it("disconnects IntersectionObserver on unmount", () => {
    const registry = makeRegistry(["singularity"]);
    const { unmount } = renderHook(() => useActiveScene({ registry, routeHint: "singularity" }));
    unmount();
    expect(mockDisconnect).toHaveBeenCalledOnce();
  });
});
