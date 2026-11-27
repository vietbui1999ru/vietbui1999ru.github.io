import { beforeAll, describe, expect, it } from "vitest";
import { FIXED_STEP, FLOCK_TARGET_SWITCH_MARGIN, getRouteProfile } from "@/lib/ink-ambient/config";
import { detectFlocks } from "@/lib/ink-ambient/flocking";
import { step, type Rule } from "@/lib/ink-ambient/step";
import { addPrey, countAlive, createWorld, setGeometry, spawnInitialBatch } from "@/lib/ink-ambient/world";
import type { InkObject } from "@/lib/ink-ambient/types";

// Issue #14: hunting and hunted tints flickered between green and red.

type Tint = "hunt" | "hunted" | "none";

// 30 frames at 60 Hz: a tint that flips back within half a second reads as flicker.
const FLICKER_WINDOW_FRAMES = 30;
const SEEDS = 10;
const FRAMES = 3600;

function centreOf(members: readonly InkObject[]) {
  return {
    x: members.reduce((sum, m) => sum + m.position.x, 0) / members.length,
    y: members.reduce((sum, m) => sum + m.position.y, 0) / members.length,
  };
}

/**
 * Step a seeded world with flocking unlocked for FRAMES steps. Count flicker: an
 * object's tint flips back to its earlier tint within the window while no rule
 * input changed. Rule inputs are the flock gate, flock membership (of the object,
 * or of the flock that hunts a predator), a flock target that died, and a target
 * switch that clears FLOCK_TARGET_SWITCH_MARGIN. Also count flock kills.
 *
 * A target death excuses the whole window: after a kill the flock loses its tint,
 * and it hunts again as soon as a predator (often a fresh top-up) targets a member.
 */
function simulate(seed: number): { flicker: number; flockKills: number } {
  const world = createWorld({ pointerFine: true }, seed);
  setGeometry(world, { width: 1280, height: 800, obstacles: [], profile: getRouteProfile("/") });
  spawnInitialBatch(world, 0);
  for (let i = 0; i < 6; i += 1) addPrey(world, 0);

  const history = new Map<number, { tint: Tint; previous: Tint | null; changedAt: number }>();
  // Tints set in step k come from the state observed at the end of step k-1, so a
  // tint change at k is compared with the rule inputs at k-1 and k-2.
  let gates: [boolean | null, boolean | null] = [null, null];
  let memberSets: [Set<number>, Set<number>] = [new Set(), new Set()];
  let previousTargets = new Map<number, number>();
  let previousHunters = new Map<number, number[]>();
  let frame = 0;
  const targetDiedAt = new Map<number, number>();
  let flicker = 0;
  let flockKills = 0;

  const observe: Rule = (w) => {
    frame += 1;
    const gate = w.preyButtonEverPressed && countAlive(w, "prey") > countAlive(w, "predator");
    // The flocks the next assignment will see, with the same membership hysteresis.
    const members = new Set(
      detectFlocks(w.objects, new Set(w.flockTargetByMemberId.keys())).flat().map((o) => o.id),
    );
    const huntersNow = new Map([...w.flockByTargetPredatorId].map(([p, ms]) => [p, ms.map((m) => m.id)]));
    const isDead = (id: number | undefined) =>
      id !== undefined && !w.objects.some((p) => p.id === id && p.vanishElapsed === null);
    const membershipChanged = (id: number) => memberSets[0].has(id) !== memberSets[1].has(id);

    for (const o of w.objects) {
      if (o.vanishElapsed !== null) {
        // A hunted predator that vanished this step was killed by its flock.
        if (o.role === "predator" && o.vanishElapsed === 0 && previousHunters.has(o.id)) flockKills += 1;
        continue;
      }
      const tint: Tint = o.huntingFlock ? "hunt" : o.beingHunted ? "hunted" : "none";
      const seen = history.get(o.id);
      if (!seen) {
        history.set(o.id, { tint, previous: null, changedAt: frame });
        continue;
      }
      if (seen.tint === tint) continue;

      // For a predator, the flock that hunts it now or hunted it before this change.
      const hunterIds = [...(huntersNow.get(o.id) ?? []), ...(previousHunters.get(o.id) ?? [])];
      const targetDied = isDead(previousTargets.get(o.id)) || hunterIds.some((m) => isDead(previousTargets.get(m)));
      const marginSwitch = (() => {
        const memberIds = previousHunters.get(o.id);
        if (!memberIds || huntersNow.has(o.id)) return false;
        const flock = w.objects.filter((m) => memberIds.includes(m.id));
        const nextId = [...huntersNow].find(([, ids]) => ids.some((id) => memberIds.includes(id)))?.[0];
        const next = w.objects.find((p) => p.id === nextId);
        if (flock.length === 0 || !next) return false;
        const c = centreOf(flock);
        const d = (p: InkObject) => Math.hypot(p.position.x - c.x, p.position.y - c.y);
        // 5% slack: positions here are one step later than at the assignment.
        return d(next) < d(o) * (1 - FLOCK_TARGET_SWITCH_MARGIN) * 1.05;
      })();
      if (targetDied) targetDiedAt.set(o.id, frame);
      const recentTargetDeath = frame - (targetDiedAt.get(o.id) ?? -Infinity) < FLICKER_WINDOW_FRAMES;
      const ruleInputChanged =
        recentTargetDeath ||
        gates[0] !== gates[1] ||
        membershipChanged(o.id) ||
        hunterIds.some(membershipChanged) ||
        targetDied ||
        marginSwitch;
      const flippedBack = seen.previous === tint && frame - seen.changedAt < FLICKER_WINDOW_FRAMES;
      if (flippedBack && !ruleInputChanged) flicker += 1;
      history.set(o.id, { tint, previous: seen.tint, changedAt: frame });
    }

    gates = [gate, gates[0]];
    memberSets = [members, memberSets[0]];
    previousHunters = huntersNow;
    previousTargets = new Map([...w.flockTargetByMemberId].map(([member, predator]) => [member, predator.id]));
  };

  let now = 0;
  for (let i = 0; i < FRAMES; i += 1) {
    now += FIXED_STEP * 1000;
    step(world, FIXED_STEP, now, [observe]);
  }
  return { flicker, flockKills };
}

describe("flock tint stability", () => {
  let runs: Array<{ flicker: number; flockKills: number }>;
  beforeAll(() => {
    runs = Array.from({ length: SEEDS }, (_, i) => simulate(i + 1));
  });

  it("does not flicker hunting or hunted tints without a rule change", () => {
    expect(runs.map((r) => r.flicker)).toEqual(runs.map(() => 0));
  });

  it("still lets flocks kill the predators they hunt", () => {
    // A flock rests after each kill, so it kills about once per run (seeds 1 to 10
    // give 1,1,1,0,0,1,2,2,0,2). Require a kill in at least half the runs.
    const seedsWithKill = runs.filter((r) => r.flockKills > 0).length;
    expect(seedsWithKill).toBeGreaterThanOrEqual(SEEDS / 2);
  });
});
