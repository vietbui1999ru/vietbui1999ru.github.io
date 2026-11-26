---
status: draft
branch: feat/ink-touch
---
# SPEC: Touch grab, drag and throw for the ink ambient (issue #26)

## Objective
On phones and tablets, a finger picks up a pen or pencil, drags it and throws it, the same way a mouse does on desktop. A finger anywhere else scrolls the page as before. Today touch input is ignored: `pointerDown` and `pointerMove` in `InkAmbient.svelte` return early unless the device has a fine pointer and `event.pointerType === "mouse"`.

The browser decides at the first touch whether a gesture scrolls. The canvas is `pointer-events: none`, so the touch lands on page content and scrolls it. When a scroll starts, the browser sends `pointercancel` and no more pointer events. So a touch that starts on an object must stop the scroll at `touchstart`. This spec adds one `touchstart` listener with `passive: false`. It calls `preventDefault()` only when the touch hits an object, using the same hit test as the pointer path. Every other touch stays a normal scroll. Context: issue #26.

## Design
- A new framework-free module, `src/lib/ink-ambient/input.ts`, holds the input rules, so they can be tested without a browser:
  - `hitSlop(pointerType)`: the extra hit radius around an object. Mouse is 12 px, as today (`MOUSE_HIT_SLOP`). Touch and pen are `TOUCH_HIT_SLOP` (24 px), because a fingertip covers about 40 to 48 px.
  - `findGrabTarget(objects, x, y, pointerType)`: the nearest live object whose radius plus slop contains the point, or null. Vanishing objects cannot be grabbed. Today the first match in the array wins; this changes to the nearest.
  - `acceptsPointer(pointerType)`: true for `mouse`, `touch` and `pen`.
  - `dragThreshold(pointerType)`: movement before a press becomes a drag. Mouse is 5 px, as today. Touch and pen are `TOUCH_DRAG_THRESHOLD` (8 px), so a tap does not jitter the object.
- `InkAmbient.svelte`:
  - `pointerDown` and `pointerMove` accept every pointer type from `acceptsPointer`. The `pointer.fine` gate is removed from them. `world.pointerFine` keeps choosing the object caps, unchanged.
  - A `touchstart` listener with `passive: false` runs `findGrabTarget` at the first touch point. On a hit, it calls `preventDefault()`, which stops the scroll, the long-press callout and text selection. On a miss, it does nothing.
  - The `touchstart` listener is installed and removed with the other pointer listeners: it exists only while the ink ambient is on.
  - One grab at a time. While an object is held, other touches are ignored and keep their normal behaviour.
  - Throw clamp, drag hunger penalty, `pointercancel` handling, modal pause and the interactive-target check (`isInteractiveTarget`) stay as they are. A touch on a link or button never grabs.
- All new values are named constants in `src/lib/ink-ambient/config.ts`.

## Acceptance Criteria
- AC-1: `findGrabTarget` returns the nearest live object within its radius plus `hitSlop(pointerType)`; null on a miss; never a vanishing object; touch reaches farther than mouse
  verify: `npx vitest run tests/lib/ink-input.test.ts -t "findGrabTarget"`
- AC-2: `acceptsPointer` accepts `mouse`, `touch` and `pen`, and rejects other values
  verify: `npx vitest run tests/lib/ink-input.test.ts -t "acceptsPointer"`
- AC-3: `dragThreshold` is 5 px for mouse and `TOUCH_DRAG_THRESHOLD` for touch and pen
  verify: `npx vitest run tests/lib/ink-input.test.ts -t "dragThreshold"`
- AC-4: `InkAmbient.svelte` no longer requires `pointerType === "mouse"` or `pointer.fine` in `pointerDown` or `pointerMove`, and uses `findGrabTarget`
  verify: `! rg -q 'pointerType !== "mouse"' src/components/svelte/InkAmbient.svelte && rg -q "findGrabTarget" src/components/svelte/InkAmbient.svelte`
- AC-5: The `touchstart` listener is registered with `passive: false` and removed with the other pointer listeners
  verify: `rg -q 'addEventListener\("touchstart", [a-zA-Z]+, \{ passive: false \}\)' src/components/svelte/InkAmbient.svelte && rg -q 'removeEventListener\("touchstart"' src/components/svelte/InkAmbient.svelte`
- AC-6: Existing tests still pass
  verify: `npx vitest run`
  baseline: pass
- AC-7: Lint passes
  verify: `npx oxlint`
  baseline: pass
- AC-8: The site builds
  verify: `npx astro build >/dev/null`
  baseline: pass
- AC-9: On a real iPhone (Safari) and a real Android phone (Chrome), on a content page and on `/playground`:
  - a finger on a pen or pencil drags it, and a flick throws it;
  - a finger anywhere else scrolls the page with no delay;
  - a tap on a link under or near an object follows the link;
  - pinch zoom and the back swipe still work;
  - desktop mouse drag is unchanged.
  verify: manual - device check by the owner; DevTools touch emulation is not enough

## Boundaries
### Always
- Keep the input rules in `src/lib/ink-ambient/input.ts`, free of DOM types beyond plain values
- Keep every `touchstart` path that misses an object free of `preventDefault()`
- Run `svelte-autofixer` on `InkAmbient.svelte`
- Run `~/dotfiles/scripts/spec check SPEC.md` before claiming done
### Ask first
- New dependencies
- Any change to simulation rules, caps or the throw clamp
- Adding the pen, pencil and reset buttons to the mobile nav (issue #22)
### Never
- Set `touch-action: none` on the page, the body or `main`
- Make the pointer listeners non-passive
- Edit a `verify:` line to make a check pass

## Open Questions
- Instant grab or hold to grab. A moving object can sit under a finger that meant to scroll. Default: instant grab, because objects are small and content pages hold only 5. If the device check shows accidental grabs, a follow-up adds a short hold, which needs the scroll to be released after `touchstart`.
- Multi-touch. Default: one grab at a time. Grabbing one object per finger can follow on `/playground` with #22.
- Hit slop for touch. Default: 24 px. Tune after the device check.
