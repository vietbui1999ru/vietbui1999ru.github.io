# Ink Ambient Physics

<!-- markdownlint-disable MD013 -->

**Status:** Final — implementation handoff  
**Date:** 2026-07-26  
**Owner:** Portfolio UI  
**Target:** Paper-and-ink portfolio routes built with Astro and Svelte

## 1. Summary

Add a lightweight ambient 2D animation to the portfolio. A small family of expressive ink forms drifts through available whitespace, collides, reacts subtly to the pointer, performs randomized autonomous behaviors, and occasionally leaves or re-enters the viewport.

The feature is decorative rather than informational. It must remain visually behind portfolio content, preserve readability and interaction, adapt its active object count to the space actually available, respect an explicit user preference, and avoid WebGL or a physics-engine dependency.

The intended result is a quiet living ink ecosystem—not a particle background, screensaver, game, or visible character widget.

## 2. Goals

- Add subtle artistic motion consistent with the existing paper-and-ink design system.
- Render variations of one coherent ink-form family.
- Support simple, stable 2D movement and object-object collision.
- Give objects distinct temperaments through movement rather than faces or labels.
- Let objects independently choose weighted autonomous behaviors.
- Support discoverable mouse interaction: proximity reactions, grab, and throw.
- Prefer route- and section-specific whitespace without assuming that every layout has side gutters.
- Protect text, controls, photos, thumbnails, cards, and modal content through steering and renderer-level occlusion.
- Preserve approximate continuity across full Astro navigations using a small session snapshot.
- Degrade to fewer or no visible objects when available space is insufficient.
- Add no Three.js, WebGL, React, or physics-engine dependency.
- Remain independently testable outside the Svelte component and renderer.

## 3. Non-goals

- Physically accurate rigid-body simulation.
- Pixel-perfect collision against rendered ink silhouettes.
- A reusable general-purpose simulation engine.
- Permanent drawing, accumulating trails, or persistent graffiti.
- Gameplay, scoring, tutorials, controls, or explicit interaction affordances.
- Faces, dialogue, labels, or required narrative.
- Required touch interaction.
- Exact frame-for-frame continuity across document navigation.
- Animation when the user has explicitly disabled Ink Ambient.
- Scanning or measuring every text node on every animation frame.
- Mounting the existing `src/scenes/` simulation engine on portfolio routes.

## 4. Architectural boundary

### 4.1 Existing constraint

ADR 001 and `CONTEXT.md` isolate the retained r3f simulation engine to `/sim/*`. The portfolio layout is paper-first and does not currently load a continuous canvas runtime.

Ink Ambient is a new decorative Canvas 2D UI effect, not a `Scene`, `Simulation`, or `SimModule`. It must:

- live outside `src/scenes/`;
- avoid imports from Three.js, r3f, Leva, or the scene registry;
- be explicitly enabled only on intended portfolio routes;
- remain absent from `/sim/*`, `/sim-test`, and `/ui-lab`;
- be documented in a new ADR or an amendment to ADR 001 before implementation is considered complete.

`CONTEXT.md` should clarify that Ink Ambient is a decorative portfolio UI effect and does not change the meaning or location of the scene engine.

### 4.2 Recommended integration

Implement one Svelte island and pure supporting modules:

```text
src/components/svelte/InkAmbient.svelte
src/lib/ink-ambient/
├── types.ts
├── config.ts
├── rng.ts
├── physics.ts
├── behaviors.ts
├── lifecycle.ts
├── spatial-field.ts
├── obstacles.ts
├── persistence.ts
└── renderer.ts
```

Mount the island through the portfolio layout with explicit route opt-in. Do not infer eligibility solely from a route using `BaseLayout.astro`, because utility routes also use that layout.

A layout prop or dedicated portfolio wrapper is acceptable. The default should fail closed: routes not explicitly identified as portfolio routes do not mount the effect.

### 4.3 Hydration

The island may use `client:load` so the first object can appear shortly after page readiness. It must not block static content rendering, and the feature chunk must stay within the performance budget in Section 18.

## 5. Layering and rendering surface

Use one fixed Canvas 2D surface:

```css
position: fixed;
inset: 0;
z-index: 0;
pointer-events: none;
```

The layout must establish an explicit isolated stacking context:

```text
layout/body isolation
├── Ink canvas                 z-0
├── main portfolio content     z-10
├── desktop navigation         z-40
├── mobile navigation          z-50
└── modal/dialog               z-60+
```

Requirements:

- Never use a negative canvas `z-index`; it may place the canvas beneath the paper background.
- The canvas must not affect document flow or create horizontal overflow.
- The canvas root must use `aria-hidden="true"`.
- No ink object may be represented as a focusable DOM element.
- Navigation, page controls, text selection, and scrolling must remain normal.
- The canvas uses CSS viewport dimensions and a DPR-capped backing buffer.

## 6. Object population

Counts are upper bounds, not guarantees.

| Environment                       | Desired population |    Maximum visible |
| --------------------------------- | -----------------: | -----------------: |
| Desktop with sufficient space     |                  3 |                  4 |
| Narrow viewport or coarse pointer |                  1 |                  2 |
| Space-constrained content view    |                0–2 | Capacity-dependent |
| User-disabled Ink Ambient         |                  0 |                  0 |

Rules:

- One object may fade in immediately after initialization.
- Additional objects use seeded staggered entry delays.
- A shy object may enter through a viewport edge later.
- A fourth object is rare and may remain off-screen for most of a session.
- Individual objects may leave the viewport and remain absent temporarily.
- The engine should normally keep one object available when a viable safe region exists.
- If no safe region can contain an object plus clearance, the object remains off-screen.
- Never force an object through meaningful content merely to satisfy a target count.

Recommended initial timing ranges, subject to visual tuning:

```text
object 1: 0–300 ms
object 2: 1–4 s
object 3: 3–10 s
object 4: 10–30 s, low spawn probability
```

## 7. Visual language

### 7.1 Shared family

All objects are variations of one ink-form language. Variation comes from:

- dense black, soft black, washed gray, and translucent dry-brush ink;
- small, medium, and large forms;
- rounded blob, comma, pebble, or short brush-stroke silhouettes;
- asymmetry, rotation, and slight edge irregularity;
- seeded texture density;
- differing mass, drag, steering, and deformation response.

Use existing design tokens where possible:

- `--ink`
- `--ink-soft`
- `--grey-1` through `--grey-3`
- `--paper`
- `--paper-raised`

Pastel ink may be used only as a rare, muted variation after visual review. The initial implementation may remain monochrome and gray.

### 7.2 Cached rendering assets

Do not generate random pixel noise every frame.

- Define or generate 4–6 seeded silhouettes.
- Pre-render silhouettes and texture into off-screen canvases or cached sprites.
- Rebuild the cache only when DPR, theme, or relevant visual configuration changes.
- Draw cached sprites with translation, rotation, opacity, and squash/stretch transforms.
- Keep temporary effects in a bounded reusable pool.

### 7.3 Temperaments

Temperament influences behavior weights and physical parameters but is not a visible label.

Suggested temperaments:

- **Lazy:** low acceleration, broad arcs, frequent sleep.
- **Curious:** more likely to approach objects or a lingering pointer.
- **Shy:** prefers edges, flees more often, may leave the viewport.
- **Heavy:** high mass, slower steering, stronger collision response.
- **Restless:** shorter behavior durations and occasional streaks.

Temperament is seeded per object and persists for the browser-tab session.

## 8. Spatial model

### 8.1 Do not assume gutters

The current `--content-max` reaches `94vw`, so many routes leave only approximately `3vw` on each side. The following route behavior is required:

| Route or section      | Verified spatial strategy                                                            |
| --------------------- | ------------------------------------------------------------------------------------ |
| About                 | Prefer right of the left-aligned `max-w-4xl` content on sufficiently wide screens    |
| Experience            | Prefer right-side whitespace and vertical gaps when available                        |
| Contact               | Prefer right-side whitespace when available                                          |
| Blog article          | Prefer space outside the 76ch article, usually the right side                        |
| Blog archive          | Do not assume usable side gutters; use measured gaps, edge-peeking, or fewer objects |
| Project index/grid    | Do not assume usable side gutters; use measured gaps or suppress objects             |
| Project detail        | Prefer space outside the 76ch prose body where available                             |
| Gallery               | Treat as content-dense; prefer gaps, edge-peeking, or absence                        |
| Home hero and teasers | Use measured open regions around the composition                                     |

### 8.2 Active section

Reuse the existing `[data-section-id]` sentinels.

- Observe them with `IntersectionObserver`.
- Select the visible section with the greatest useful intersection.
- Apply a small hysteresis threshold so the active profile does not flicker at section boundaries.
- Use `location.pathname` as fallback for article and detail routes without a section sentinel.
- Do not create a second redundant scroll-spy system.

### 8.3 Coarse safe-space field

Build a low-resolution viewport occupancy or scoring field from obstacle rectangles and route preferences. A grid around `24×14` to `32×18` cells is sufficient; exact resolution is implementation-tunable.

For each refresh:

1. project visible obstacle rectangles into viewport coordinates;
2. expand them by object radius plus readability clearance;
3. mark covered cells unsafe;
4. score remaining cells according to the active route/section profile;
5. identify connected regions large enough for each object;
6. choose safe anchors using seeded randomness;
7. hide or delay objects for which no viable region exists.

The field guides steering; it is not a pixel-perfect navigation mesh.

## 9. Obstacles and geometry

### 9.1 Semantic markers

Use explicit semantic markers such as:

```html
<div data-ink-obstacle="prose">...</div>
<article data-ink-obstacle="card">...</article>
<figure data-ink-obstacle="media">...</figure>
<div data-ink-obstacle="controls">...</div>
```

Do not mark an entire full-width section when only its inner content is occupied. Mark tightly fitted content wrappers so intended whitespace remains available.

At minimum protect:

- headings, paragraphs, prose bodies, and timelines;
- links, buttons, forms, filters, tabs, and navigation;
- project cards and collection rows;
- photos, gallery items, covers, and thumbnails;
- code blocks, embeds, callouts, and article media;
- modal dialogs and backdrops;
- desktop and mobile navigation bands.

### 9.2 Coordinate spaces

The simulation and canvas are viewport-relative. Avoid layout reads during the hot frame loop.

Recommended geometry strategy:

- Measure normal-flow obstacle rectangles and store them in document coordinates.
- Convert their vertical position using the current scroll offset without remeasurement.
- Treat fixed and sticky navigation as separate viewport-coordinate obstacles.
- Refresh measurements after resize, responsive reflow, marked-region resize, font completion, image load, or relevant DOM mutation.
- Throttle geometry work to animation frames when scroll or resize events burst.

Use `ResizeObserver` on coarse marked regions, not every text element. A narrowly scoped `MutationObserver` may handle dynamically inserted article/media/modal regions.

### 9.3 Modal behavior

While `dialog[open]` or the project modal overlay is present:

- fade or hide the ambient canvas;
- pause autonomous updates and effects;
- disable pointer reactions and dragging;
- resume safely after the modal closes without catching up missed simulation time.

## 10. Readability and occlusion

Layering alone does not ensure readability because content wrappers may be transparent. Protection must exist at two levels:

1. **Physics:** steer objects away from expanded obstacle bounds.
2. **Renderer:** fade, clip, or suppress ink when overlap still occurs.

Required behavior:

- Begin opacity attenuation before an object reaches protected content.
- Fully suppress drawing inside the protected core of text, media, or controls.
- Add padding around obstacle bounds so ink does not touch glyphs or control borders.
- High-speed streaks and thrown objects are subject to the same renderer mask.
- Temporary trails and splats must also obey the mask.

The visual result may imply that an object passes behind content, but ink must not remain visible through glyph spacing or meaningful image areas.

## 11. Simulation state

A representative state model is:

```ts
type InkObject = {
  id: number;
  position: Vec2; // normalized viewport coordinates
  velocity: Vec2; // normalized units per second
  radius: number;
  mass: number;
  rotation: number;
  angularVelocity: number;
  opacity: number;
  scale: Vec2;
  temperament: Temperament;
  behavior: BehaviorState;
  lifecycle: LifecycleState;
  reaction: ReactionState | null;
  rngState: number;
  offscreenUntil: number | null;
};
```

Keep hot-loop state compact and avoid Svelte deep-reactive proxies for per-frame object mutation. The renderer and simulation own ordinary mutable records or typed structures; Svelte owns only lifecycle/configuration state that must update the component template.

## 12. Fixed-step update

Use one `requestAnimationFrame` loop with a fixed simulation step, recommended `1/60s`.

Frame algorithm:

1. measure real elapsed time;
2. clamp excessive elapsed time after suspension;
3. accumulate elapsed time;
4. execute a bounded number of fixed simulation steps;
5. discard excessive catch-up time rather than simulating a long hidden interval;
6. render the latest state once.

Recommended maximum catch-up is 3–4 fixed steps per rendered frame.

Simulation-step order:

1. update lifecycle timers;
2. resolve direct drag/throw state;
3. update eligible pointer reactions;
4. advance autonomous behavior scheduler;
5. apply behavior intent and safe-field steering;
6. apply drag/friction and boundary forces;
7. integrate velocity, position, and rotation;
8. resolve object-object collisions;
9. apply collision reactions and deformation;
10. update effects and visibility guarantees.

## 13. Collision model

Treat objects as circles or simple ellipses even when rendered silhouettes are irregular.

On overlap:

- separate objects along the collision normal;
- apply a low-energy elastic impulse based on mass;
- add a small seeded tangential component for artistic imperfection;
- trigger squash/stretch based on impact strength;
- apply cooldowns to prevent repeated effect triggering during sustained overlap;
- optionally emit a bounded temporary mark under a low probability threshold.

Collision detection is `O(n²)`, which is appropriate for at most four objects. Do not add spatial partitioning or a physics library.

## 14. Behavioral state machine

### 14.1 Priority

Do not put all activity in one weighted array. Apply this priority hierarchy:

```text
1. disabled / hidden document / open modal
2. dragging
3. throw recovery
4. entering / leaving / off-screen / returning
5. pointer reaction
6. collision impulse
7. autonomous behavior
8. visual effect
```

Higher-priority states temporarily override lower-priority intent without corrupting the underlying scheduler.

### 14.2 Autonomous behaviors

Only sustained autonomous behaviors use regular weighted selection:

| Behavior          | Purpose                           | Typical duration |
| ----------------- | --------------------------------- | ---------------: |
| `wander`          | Quiet imperfect drift             |             2–6s |
| `sleep`           | Slow to near-stillness, then wake |             2–8s |
| `approach_object` | Investigate another object        |             1–4s |
| `flee_object`     | Brief shy escape                  |         0.8–2.5s |
| `orbit_object`    | Circle another object             |           1.5–4s |
| `seek_boundary`   | Playfully approach a safe edge    |             1–3s |
| `streak`          | Cross a safe lane quickly         |         0.5–1.5s |
| `hide_offscreen`  | Deliberately leave the viewport   |        1–3s exit |

Starting weight guidance:

```text
wander           32
sleep             12
approach_object   12
flee_object       10
orbit_object      10
seek_boundary      8
streak             5
hide_offscreen     7
```

Temperament, current safe-space capacity, cooldowns, and target availability modify these weights.

### 14.3 Reactions, lifecycle, and effects

These are not normal weighted behaviors:

- `cursor_attract`, `cursor_repel`: conditional pointer reactions.
- `return_to_zone`: lifecycle transition after absence or displacement.
- `bounce`: collision or boundary impulse.
- `grab_and_throw`: direct pointer state.
- `splat`, `trail`, `squash`: visual effects.

### 14.4 Transition stability

- Use a minimum behavior dwell time before ordinary interruption.
- Blend steering intent over a short transition rather than snapping direction.
- Prevent immediate reselection of the same rare behavior.
- Require valid targets for approach/orbit/flee.
- Prevent `hide_offscreen` if it would leave no object visible and no imminent return.
- Seed every random decision; do not call `Math.random()` in simulation code.

### 14.5 Shared event budget

At most one dramatic event should normally be active across the scene:

- streak;
- large splat;
- energetic throw recovery;
- coordinated multi-object orbit or collision event.

Quiet behaviors continue while the dramatic-event token is occupied.

## 15. Off-screen lifecycle

Objects may leave intentionally.

Lifecycle rules:

- Ordinary movement is softly attracted toward safe anchors.
- `hide_offscreen`, streaks, and throws may cross a viewport edge.
- After a grace period outside the bounds, transition to `offscreen`.
- Remain absent for a seeded interval.
- Return through a suitable edge or form inside a safe region with a short fade.
- Revalidate the destination against the current safe-space field.
- A thrown object must eventually enter return behavior if it remains displaced.
- A watchdog must prevent every object from remaining absent indefinitely when usable space exists.

## 16. Pointer interaction

### 16.1 Scope

Grab and throw is a hidden desktop discovery. Enable it only when both are true:

- the primary pointer is fine;
- the viewport meets the configured desktop capability rule.

Mobile/coarse-pointer interaction remains decorative in the first release.

### 16.2 Non-blocking event architecture

The canvas remains `pointer-events: none`. Observe pointer events at window or document level and perform simulation hit-testing.

A pointer-down may arm a grab only when:

- no modal is open;
- the event target is not a link, button, input, textarea, select, label, editable element, media element, or interactive role;
- the target is outside a protected content obstacle;
- there is no active text selection;
- the pointer is close enough to a visible object;
- the object is not fully occluded by content.

Requirements:

- Use a small movement threshold before entering dragging state.
- Do not call `preventDefault()` for ordinary page gestures.
- Do not make the canvas itself clickable.
- Track the initiating pointer ID.
- Cancel on `pointerup`, `pointercancel`, window blur, document hiding, or modal opening.
- Never allow hidden interaction to break links, text selection, scrolling, or native drag behavior.

### 16.3 Pointer reactions

- Proximity may produce a small probabilistic repulsion.
- A lingering pointer may occasionally attract a curious object.
- Reactions require line-of-safe-space eligibility and may not pull ink through content.
- Continuous cursor following is prohibited.

### 16.4 Throwing

On release:

- derive velocity from a short smoothed pointer history;
- clamp the transferred speed;
- enter temporary throw-recovery priority;
- permit a bounce, flee, streak, or off-screen exit;
- eventually return to a safe preferred region.

## 17. Persistence

Use `sessionStorage`, not `localStorage`. State is per browser tab and route-independent.

With at most four objects, storing useful kinematic state is simpler than reconstructing it and remains well below a few kilobytes.

Suggested snapshot:

```ts
type InkSnapshot = {
  version: 1;
  seed: number;
  savedAt: number;
  objects: Array<{
    id: number;
    position: Vec2;
    velocity: Vec2;
    visibility: "active" | "sleeping" | "offscreen";
    temperament: Temperament;
    behavior: BehaviorName;
    behaviorRemaining: number;
    rngState: number;
    offscreenUntil: number | null;
  }>;
};
```

Do not persist:

- pointer state;
- collision manifolds;
- trail or splat particles;
- canvas pixels or cached sprites;
- obstacle geometry;
- active DOM references.

Persistence rules:

- throttle periodic saves to once every 5–10 seconds;
- save on `pagehide` and document visibility loss;
- validate version, bounds, numeric values, and age before restoration;
- ignore malformed or expired data safely;
- normalize positions to viewport dimensions;
- reconcile restored positions with the new route’s safe-space field;
- return invalidly placed objects through a safe edge instead of teleporting through content.

Continuity is approximate. Trails, collision history, and transient reactions reset across full navigation.

## 18. Accessibility and preferences

The animation is decorative:

- root uses `aria-hidden="true"`;
- no focusable elements;
- no semantic information conveyed by motion;
- no interaction required for navigation or comprehension;
- content remains complete if the island fails or JavaScript is disabled.

Ink Ambient uses an explicit, persisted user preference instead of the browser or OS
reduced-motion setting. The navigation control must expose the current state with
`aria-pressed` and let users enable or disable the effect at any time.

When disabled:

- render no ambient ink;
- do not run the animation loop or pointer listeners;
- do not schedule delayed entries or render trails/splats;
- persist the choice in `localStorage` and apply it before hydration;
- react to changes from either desktop or mobile navigation during the session.

## 19. Performance budget

### 19.1 Required constraints

- One Canvas 2D surface.
- One `requestAnimationFrame` loop.
- No WebGL or physics dependency.
- No per-frame DOM measurement.
- Device pixel ratio capped at `2`.
- Bounded object and effect pools.
- Pause when the document is hidden, a modal blocks the page, or the user disables Ink Ambient.
- Clamp elapsed time after suspension.
- Avoid hot-loop allocations where practical.

### 19.2 Targets

- Added feature JavaScript target: at most `20 KB` gzip; exceeding this requires review.
- Update plus drawing P95 target: at most `2 ms/frame` on a representative desktop.
- No material first-contentful-paint regression.
- No long task attributable to animation initialization.
- Graceful operation at 30fps on lower-end devices without simulation instability.

## 20. Svelte lifecycle requirements

The component should use browser-only initialization in `onMount` and return complete cleanup.

Cleanup must cover:

- active animation frame;
- window/document pointer listeners;
- visibility and blur listeners;
- media-query listeners;
- `ResizeObserver`;
- `MutationObserver`;
- `IntersectionObserver`;
- image/font completion callbacks;
- persistence timers.

Use `<svelte:window>` and `<svelte:document>` for global declarative event handling where practical. Keep the per-frame simulation outside Svelte deep-reactive state.

Theme handling:

- resolve canvas colors from computed CSS variables;
- observe the root `.dark` class or an equivalent theme signal;
- rebuild cached sprites after a theme change;
- never read computed styles every frame.

Resize handling:

- separate CSS canvas dimensions from backing-buffer dimensions;
- rebuild the DPR-scaled buffer when needed;
- retain normalized object positions;
- invalidate spatial geometry after responsive reflow.

## 21. Testing

### 21.1 Automated unit tests

Use Vitest for pure modules. Cover:

- seeded PRNG reproducibility;
- fixed-step accumulator behavior;
- action weighting, eligibility, cooldowns, and minimum dwell;
- priority between drag, lifecycle, reactions, and autonomous behavior;
- target validation for approach/orbit/flee;
- collision separation and impulse direction;
- mass-dependent collision response;
- collision effect cooldown;
- off-screen exit, absence, and return;
- visible-object watchdog;
- spatial-field obstacle expansion;
- capacity-based object suppression;
- active-zone scoring;
- restored-position reconciliation;
- snapshot serialization, versioning, validation, expiry, and malformed data;
- user preference disabling initialization;
- mobile/coarse-pointer count limits.

The current jsdom setup does not provide complete Canvas, `matchMedia`, `ResizeObserver`, or real layout behavior. Add focused test mocks only where component cleanup/wiring tests are useful. Keep physics and behavior tests browser-independent.

### 21.2 Manual browser acceptance gate

The first release does not require adding a browser automation dependency, but the following matrix must be completed manually and recorded:

Routes:

- home;
- about, including experience and education;
- projects index;
- project detail;
- blog archive;
- blog article;
- gallery;
- contact section.

Conditions:

- light and dark theme;
- wide desktop, normal desktop, tablet, and narrow mobile;
- short and long pages;
- scrolling and responsive reflow;
- images loading after initial paint;
- blog filtering and dynamic content height;
- modal open and close;
- text selection and keyboard navigation;
- clicking links, buttons, filters, and controls;
- pointer proximity, grab, and throw;
- object leaving and returning;
- full route navigation and restoration;
- Ink Ambient toggle behavior and persistence;
- document tab hiding and restoration;
- DevTools performance profile.

## 22. Acceptance criteria

### Architecture

- [ ] A dedicated Svelte ambient island is explicitly enabled only on portfolio routes.
- [ ] `/sim/*`, `/sim-test`, and `/ui-lab` do not mount or download the feature.
- [ ] No dependency or import from `src/scenes/`, Three.js, r3f, React, or Leva is introduced.
- [ ] The runtime-boundary decision is documented in an ADR or ADR 001 amendment.
- [ ] `CONTEXT.md` distinguishes Ink Ambient from the scene engine.

### Behavior

- [ ] Desktop targets three objects and may rarely show four only when space permits.
- [ ] Narrow/coarse-pointer environments show at most two.
- [ ] Object count decreases automatically when safe capacity is insufficient.
- [ ] Objects enter at staggered times and may leave, remain absent, and return.
- [ ] Autonomous behavior selection is seeded, weighted, eligible, and duration-bounded.
- [ ] Reactions, lifecycle transitions, collisions, and visual effects are separate from autonomous behavior selection.
- [ ] A shared event budget prevents simultaneous dramatic actions.
- [ ] Collisions remain stable and visually expressive.

### Layout and readability

- [ ] Existing section sentinels drive active section selection where available.
- [ ] Safe regions derive from measured obstacles rather than assumed gutters.
- [ ] Blog archive, project grid, and gallery suppress objects when no suitable gap exists.
- [ ] Text, controls, navigation, photos, thumbnails, cards, code, and modal content are protected.
- [ ] Renderer-level fading/clipping prevents ink from showing through protected content.
- [ ] No layout shift or horizontal overflow is introduced.

### Input and accessibility

- [ ] Pointer reactions are subtle and never become continuous cursor following.
- [ ] Hidden grab/throw works on eligible fine-pointer whitespace.
- [ ] Links, controls, scrolling, native drag behavior, and text selection remain unaffected.
- [ ] Modal opening cancels interaction and pauses the simulation.
- [ ] Users can disable or enable Ink Ambient through the navigation control; the choice persists across reloads.
- [ ] The feature is completely decorative and inaccessible to assistive-technology focus.

### Persistence and performance

- [ ] A small versioned `sessionStorage` snapshot restores approximate state across navigation.
- [ ] Invalid restored positions reconcile to the current safe field.
- [ ] Storage writes are throttled and never occur every frame.
- [ ] The animation pauses while hidden or modal-blocked.
- [ ] DPR is capped and no DOM geometry is measured in the hot loop.
- [ ] Bundle and frame-time targets are measured during final QA.

### Quality

- [ ] Pure physics, behavior, spatial, lifecycle, and persistence modules have unit coverage.
- [ ] The manual route/viewport/accessibility matrix is completed.
- [ ] Svelte Autofixer reports no issues or suggestions for new or modified Svelte files.
- [ ] Repository lint, formatting, tests, and production build pass.

## 23. Implementation sequence

Implement the smallest convincing vertical slice before adding rare effects.

1. Record the architectural decision and route scope.
2. Add the fixed, correctly layered Canvas 2D island.
3. Implement seeded PRNG, fixed-step update, and one cached ink silhouette.
4. Add existing-section observation and pathname fallback.
5. Add semantic obstacle markers and the coarse safe-space field.
6. Add capacity-based population and staggered entry.
7. Add three-object movement and stable collision.
8. Add autonomous behavior scheduling and priority separation.
9. Add renderer-level content occlusion.
10. Add pointer proximity, guarded grab, and throw.
11. Add off-screen absence, return, and the visibility watchdog.
12. Add versioned session persistence.
13. Add temporary trails, splats, and squash/stretch within a bounded event budget.
14. Add user-preference, theme, modal, visibility, and resize handling.
15. Complete unit tests, Svelte Autofixer, diagnostics, build checks, and manual QA.

Do not start by implementing every behavior or effect. The quality bar is calm movement, readable content, safe interaction, and convincing ink texture—not maximum activity.

## 24. Remediation addendum (2026-07-26)

The first implementation shipped but visually reads as rigid/mechanical and exhibits
erratic motion. Investigation confirmed the implementation deviates from this spec in
the ways below (file:line references are illustrative, not load-bearing — the current
line numbers may drift before a subagent picks up the work).

### 24.1 Confirmed defects

- **Ink silhouette is a straight-line polygon**, not a rounded blob per §7.1
  (`renderer.ts` `createSprite()`). Primary cause of the "ugly/rigid" visual report.
- **No steering blend across behavior transitions**, violating §14.4's explicit
  blending requirement (`behaviors.ts` `behaviorAcceleration`,
  `InkAmbient.svelte` behavior-swap call site). Primary cause of the "wrong
  behavior" / snap-every-few-seconds report.
- **Collision squash/stretch is a fixed constant**, not scaled to impact strength
  per §13, and has no cooldown of its own — sustained contact keeps re-flattening
  the object instead of springing back.
- **Boundary handling conflates teleport-wrap with an un-scaled (non-`dt`) velocity
  push**; the wrap path is effectively unreachable through the behaviors that could
  reach it, and the push causes edge twitchiness.
- **No priority resolution between pointer reaction, safe-anchor pull, and
  autonomous behavior** — accelerations are summed unconditionally, contradicting
  the §14.1 priority hierarchy for tiers 5-7.
- **Update order integrates velocity before drag/boundary forces**, the reverse of
  §12's algorithm, causing a persistent one-step damping/overshoot bias.
- **Obstacle occlusion opacity is a two-step function** (`1 → 0.12 → 0`), not a
  gradual attenuation, contradicting §10's "begin opacity attenuation before an
  object reaches protected content."
- **Angular velocity is spawn-random and decays to static rotation**, uncoupled
  from travel direction or collisions.
- **No ADR references Ink Ambient**, leaving the §22 Architecture acceptance
  criterion ("documented in an ADR or ADR 001 amendment") unmet.

### 24.2 Decided remediation parameters

These resolve the open questions raised during root-cause review and are now
normative for implementation:

- **Restitution:** replace the current `0.72` with a value in the `0.30–0.45`
  range; target `0.38` unless implementation/visual testing motivates a different
  point in that range.
- **Ink silhouette reference:** no external visual reference is required for v1.
  Build the closed-spline blob generator (Catmull-Rom or bezier through 6-10
  seeded control points, per remediation plan Task A) and iterate by eye in the
  dev server before requesting review.
- **Rotation:** couple `rotation` to heading — derive it from a smoothed
  `atan2(velocity.y, velocity.x)` rather than free-running `angularVelocity`.
  Remove the spawn-random angular spin as the base motion driver. A small,
  optional collision-triggered rotational perturbation may be layered on top if
  it reads as a natural embellishment, but heading-coupling is the required
  baseline.
- **Behavior-transition blend duration:** base window `220ms`, scaled by the same
  temperament factor already used in `behaviorDuration()` (`restless` faster at
  `0.82×`, `lazy` slower at `1.18×`, others `1×`) rather than introducing a second
  set of temperament constants.
- **Boundary handling at the extreme edge:** remove the teleport-wrap path for
  ordinary (non-exiting) behaviors. If continuous boundary steering still fails to
  keep an object in bounds (e.g. after an unusual velocity spike), hard-clamp
  position to `[radius, width - radius]` / `[radius, height - radius]` rather than
  wrapping or teleporting.
- **Documentation debt:** in scope for this remediation pass, not deferred. Add or
  amend an ADR recording the Ink Ambient / scene-engine runtime boundary and the
  physics remediation decisions above, and confirm `CONTEXT.md` still
  distinguishes Ink Ambient from the legacy r3f scene engine.

See `docs/superpowers/plans/2026-07-26-ink-ambient-remediation.md` for the task
breakdown implementing this addendum.
