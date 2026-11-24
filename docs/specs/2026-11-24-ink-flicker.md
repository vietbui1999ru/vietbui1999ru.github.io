---
status: approved
branch: fix/ink-flicker
---
# SPEC: Ink-ambient flock tint flicker (issue #14, part 2)

## Objective
Stop the hunting (green/red blink) and hunted tints from flickering. The root cause is that the flock assignment is recomputed from nothing each step. First, when two or more predators chase one flock, "nearest to the flock centre" swaps between them as they move. Second, a flock near the 90 px link distance breaks up and re-forms every few frames. Measured headless on 10 seeds for 60 s each, the unfixed code makes 1,626 flicker events. The count gate was ruled out: it never flipped. Success: the seeded flicker test reports zero, and flocks still kill the predators they hunt. Builds on part 1 (PR #20). Context: issue #14.

## Acceptance Criteria
- AC-1: A flock keeps the predator it hunted last step while that predator is alive; when merged flocks held different predators, the one most members held wins, ties to the lower id
  verify: `npx vitest run tests/lib/ink-ambient.test.ts -t "held flock target"`
- AC-2: A flock switches to another candidate only when it is closer to the flock centre by more than `FLOCK_TARGET_SWITCH_MARGIN` (0.5) of the held predator's distance
  verify: `npx vitest run tests/lib/ink-ambient.test.ts -t "flock target switch"`
- AC-3: Prey that were both in a hunting flock last step stay linked up to `FLOCK_KEEP_RADIUS` (1.25 x `FLOCK_RADIUS`); new links still need `FLOCK_RADIUS`
  verify: `npx vitest run tests/lib/ink-ambient.test.ts -t "flock membership hysteresis"`
- AC-4: Over 10 seeds x 3,600 steps, no hunting or hunted tint flips back within 30 frames unless a rule input changed (flock gate, flock membership, a flock target died, or a switch that cleared the margin)
  verify: `npx vitest run tests/lib/ink-flicker.test.ts -t "does not flicker"`
- AC-5: Flocks still kill the predators they hunt over the same runs
  verify: `npx vitest run tests/lib/ink-flicker.test.ts -t "still lets flocks kill"`
- AC-6: Existing tests still pass
  verify: `npx vitest run`
  baseline: pass
- AC-7: Lint passes
  verify: `npx oxlint`
  baseline: pass
- AC-8: In the browser, with flocks unlocked by the pencil button, tints no longer flicker, and flocks still hunt and kill predators at a believable pace
  verify: manual - watch the ink ambient for a few minutes in a browser

## Boundaries
### Always
- Keep the change inside flock assignment (`flocking.ts`, its two config constants, the one call in `step.ts`)
- Run `~/dotfiles/scripts/spec check SPEC.md` and `~/dotfiles/scripts/floor-guard` before claiming done
### Ask first
- Changes to the tint colours or the 4 Hz hunting blink (the blink is intended)
- Tuning beyond `FLOCK_KEEP_RADIUS` and `FLOCK_TARGET_SWITCH_MARGIN`
### Never
- Edit a `verify:` line or a test to make a check pass

## Open Questions
- Balance. With the fix, flock kills fall from 76 to 63 over the 10 test runs (17% fewer): a flock keeps chasing its predator for longer before it switches. Default: accept `FLOCK_TARGET_SWITCH_MARGIN = 0.5`. A lower margin restores kills but lets more swaps through. With no switching at all, kills fell further.
- Release. A held predator is released only when it dies, the flock breaks up, or the flock gate closes. A distance-based release was tried and dropped: it re-opened the swap flicker when both candidates were far from the flock.
