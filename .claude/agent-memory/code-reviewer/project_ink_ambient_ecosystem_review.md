---
name: project_ink_ambient_ecosystem_review
description: Findings from final whole-branch reviews of the ink-ambient predator/prey ecosystem redesign (2026-07-29) and the prey-flock predator-conversion mechanic (2026-07-30), for future ink-ambient reviews.
metadata:
  type: project
---

## 2026-07-29: pairing.ts -> targeting.ts/catches.ts/population.ts/spawn.ts rewrite

Final review of branch feat/ui-lab-portfolio-density, base bfa623c..4388719.

**Confirmed-sound, non-obvious mechanics** (won't need re-verification unless touched again):
- Predator-prey collision exemption (`a.role === b.role` gate in `updateSimulation`'s pairwise loop, `InkAmbient.svelte`) — correctly lets same-role pairs still bounce, cross-role pairs never physically separate (by design, so they can interpenetrate to the tighter catch radius).
- `chaseElapsed` reset logic: captures `previousTargetId` *before* calling `updateTarget` (which mutates `currentTargetId`), then compares — correct self-resetting semantics, including the post-catch case (target removed from array next tick -> `current` lookup fails -> new nearest picked -> elapsed resets).
- Spawn-tint `source-atop` compositing in `renderer.ts` is bracketed inside the per-object `save()/restore()`, doesn't leak into next object's draw.
- Scarcity penalty ordering: computed *after* loser life-loss/vanish is applied same tick, so a predator that just died from losing a rival race doesn't count toward `predatorCount` in the scarcity check.

**Real, if minor, side-effect found**: the same-role collision-bounce cleanup (commit `f1dce9d`, message says "remove star-splat effect") actually removed BOTH the star-splat particle effect AND the squash/scale-distortion visual (`a.scale.x = 1+squash` etc., `addCollisionEffect` calls) for same-role bumps — not just the splat. Same-role bumps (predator-predator, prey-prey) now have zero visual feedback on contact, only physical separation. May be intentional simplification but the commit message undersells the scope of what changed. Flagged as Minor, not a blocker.

**Dead code surfaced**: `PREY_THROW_SPEED_MAX` (config.ts) — orphaned after `pairing.ts` deletion. `circlesOverlap` (physics.ts) — no longer called by any production path, only its own unit test.

## 2026-07-30: prey-flock predator-conversion mechanic (flocking.ts)

Final review of the 4-task SDD plan `docs/superpowers/plans/2026-07-30-ink-ambient-prey-flock-predator-conversion.md`, base 29f4fbd..3d02f11. Verdict: approve with minor fixes (none blocking).

**Confirmed-sound, non-obvious mechanics**:
- Settling-bypass fix (Task 3 fix round) correctly symmetric: both the acceleration ternary (`InkAmbient.svelte:471`) and the maxSpeed ternary (`:513`) gate `object.huntingFlock` on `!settling` — a spawning object swept into a hunting flock now correctly falls through to `idleAcceleration`/idle maxSpeed like any other settling object, not a flock-hunt override.
- `flockByTargetPredatorId`/`flockByMemberId` maps hold live `InkObject` references, not copies — the kill-trigger pass (`isFlockKillTriggered`) runs after `updateObject`'s per-tick position integration, so it correctly sees post-movement positions despite the maps being built at tick-start.
- Flock partitioning is provably disjoint (BFS connected components over prey), so a given predator can be at most one flock's target in a given tick — no double-conversion risk from map key collisions.
- Conversion-vs-vanish ordering: kill-trigger loop skips `predator.vanishElapsed !== null`, so a predator that died from losing a catch earlier the same tick can't also be flock-converted; a predator that *won* a catch the same tick *can* still be converted after (matches spec §7's explicit precedence rule).
- Grabbed/dragged prey self-heal out of `huntingFlock` next tick: both branches of the tick-start gate (`if`/`else` in `updateSimulation`) unconditionally overwrite `huntingFlock`/`beingHunted` for *every* object, not just current flock members, so a dragged former-flock-member's flag correctly clears the tick after it's grabbed (`detectFlocks` excludes `grabbed` prey).
- Population cap is `MAX_OBJECTS_DESKTOP = 24` / `MOBILE = 10` (config.ts) — the O(n²)-ish `detectFlocks`/`computeFlockAssignments` clustering is trivially cheap at these counts; not a real perf concern despite running every tick when the gate is open.

**New minor finding (not yet in ledger)**: `flocking.ts`'s `flockHuntAcceleration` duplicates the one-line `driveMultiplier` pattern (`clamp(object.attractionValue, PAIR_FORCE_MIN, PAIR_FORCE_MAX)`) that already exists as a private (unexported) helper in `targeting.ts:108-110`. Trivial duplication, not worth exporting a one-liner across modules — noted as a nit, not flagged as a blocker.

**Deferred minors from task-level reviews, still valid, none block merge** (see `.superpowers/sdd/2026-07-30-ink-ambient-prey-flock-predator-conversion/progress.md` for full ledger): tie-break test never exercises the actual distance-tie branch; redundant empty-candidates guard in `selectFlockTarget`; `separationDirection` sums unit vectors not proximity-weighted (matches spec, not a defect); else-branch reallocates 3 empty Maps every idle tick (negligible GC churn); kill-trigger loop variable named `predator` without a type-level guarantee (guarded correctly at runtime); renderer's huntingFlock blink is two sequential `source-atop` fills, not a true crossfade (visually indistinguishable at the blink frequency used).

**Why**: keeps future ink-ambient reviews from re-deriving the collision-exemption/chaseElapsed/spawn-tint/settling-bypass/flock-partitioning correctness proofs, and flags cleanup items if still unaddressed.
**How to apply**: On the next ink-ambient PR, check whether `PREY_THROW_SPEED_MAX`/`circlesOverlap` dead-code items were addressed; if flocking.ts grows a second near-duplicate of `driveMultiplier`, that's the trigger to finally export it from `targeting.ts`.
