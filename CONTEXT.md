# CONTEXT.md — Domain Glossary

Shared language between developers and agents for this codebase.
Read before any task touching `src/scenes/` or the simulation-to-section integration.

---

## Project

Personal portfolio (Astro 5 + React 19) with interactive WebGL simulations.
Two domains: **sim engine** (`src/scenes/`) and **portfolio UI** (`src/components/`, `src/data/`).
This file focuses on the sim engine — the UI side uses self-explanatory names.

### Sub-project history

The sim engine is the fourth implementation attempt (sub-project D).
Sub-projects A, B, C were prior iterations — discarded, not present in the codebase.
Do not reference or resurrect A/B/C patterns.

### Integration goal (next milestone)

After this branch merges to main: simulations become the background for all portfolio
sections, not just the home hero. The section → sim mapping is user-configurable via
the Leva panel. A new top-level "Scenes" folder in Leva will hold this mapping.

---

## Core Vocabulary

### Scene / Simulation

These terms are **interchangeable**. "Simulation" is the physics/math concept;
"scene" is the Three.js/r3f rendering wrapper around it. They are always 1:1.

Prefer:
- `scene` in engine context (SceneId, SceneHost, SceneRouter)
- `sim` in URL and module context (`/sim/[name]`, `sims/` directory)

### SceneId

```typescript
type SceneId =
  | 'singularity'
  | 'lorenz'
  | 'magnetic'
  | 'gray-scott'
  | 'kuramoto-sivashinsky'
```

Lowercase kebab-case string. The canonical identifier for a simulation everywhere
(registry lookup, URL slug, Leva section key, data-scene-id sentinel attribute).

### SimModule

The contract every simulation must satisfy. Key exports:

| Export | Type | Purpose |
|--------|------|---------|
| `id` | `SceneId` | Unique identifier |
| `title` | `string` | Human-readable name |
| `description` | `string` | One-line description |
| `defaults` | `Config` | Default parameter values |
| `presets` | `Preset[]` | Named parameter overrides |
| `schema` | `LevaSchema` | Leva GUI definition |
| `Scene` | `React.FC` | r3f scene component |
| `init()` | `() => State` | Create initial CPU state |
| `step()` | `(state, config, dt) => void` | Advance one frame (CPU sims) |
| `dispose()` | `() => void` | Release GPU/CPU resources |
| `symmetryApplies()` | `(s: SymmetryConfig) => boolean` | Validate symmetry applicability |

### SceneRegistry

`Map<SceneId, SimModule>` — the single source of truth for which simulations exist.
Populated in `src/scenes/registry.ts`. All lookups go through this map.

### SceneHost

React component that mounts the active Scene subtree inside the r3f Canvas.
Receives the active `SceneId` and renders the corresponding `SimModule.Scene`.

### SceneRouter

Watches `data-scene-id="<id>"` sentinel elements via IntersectionObserver.
When a sentinel enters the viewport, fires a scene-switch to the matching SceneId.
This is the mechanism by which scrolling through sections changes the active sim.

### AppCanvas

The single app-wide r3f `<Canvas>` mounted at `z-10`, fixed-position, behind all content.
One canvas, one WebGL context, for the lifetime of the page.

---

## Compute Archetypes

Every simulation belongs to exactly one archetype. Choose the archetype based on physics,
not preference — it determines solver, shader, and data-flow patterns.

### GPUComputeSim

Physics state lives entirely on the GPU as textures.
Uses `GPUComputationRenderer` with GLSL fragment shaders for each time step.

**Examples:** `gray-scott`, `kuramoto-sivashinsky`
**When to use:** continuous field PDEs (reaction-diffusion, fluid, wave equations)

### CPUSim

Physics state lives in JS TypedArrays, advanced by a numerical solver each frame,
then uploaded to GPU geometry/buffer attributes for rendering.

**Examples:** `lorenz`, `magnetic`
**Solvers available:** `rk4` (general ODEs), `verlet` (symplectic, energy-conserving)
**When to use:** particle systems, ODEs with small state (< ~10k particles)

### ShaderSim

No evolving simulation state. A fullscreen fragment shader computes appearance
analytically from `time` and `uv` uniforms. Stateless between frames.

**Examples:** `singularity`
**When to use:** purely mathematical/visual effects — lensing, noise fields, SDFs

---

## Numerical Solvers (`src/scenes/solvers/`)

| Module | Algorithm | Use case |
|--------|-----------|----------|
| `rk4` | 4-stage Runge-Kutta | General ODEs |
| `verlet` | Velocity-Verlet (symplectic) | Hamiltonian systems, Lorentz force |
| `etdrk4` | Exponential time-differencing RK4 | Stiff PDEs (Kuramoto) |
| `fft` | FFT wrapper (fft.js) | Spectral methods (Kuramoto, Gray-Scott) |
| `gpuCompute` | GPU texture ping-pong | Any GPUComputeSim |

---

## Symmetry System

| Term | Values | Meaning |
|------|--------|---------|
| `SymmetryType` | `'none' \| 'C' \| 'D'` | Group family |
| `SymmetryConfig` | `{ type, order }` | Full specification |
| C_n | cyclic, order n | n-fold rotational symmetry |
| D_n | dihedral, order n | n rotations + n reflections |

`symmetryApplies()` guards against physically meaningless combinations.
Singularity and Kuramoto-Sivashinsky disable symmetry entirely.

---

## Performance Tiers

`PerfTier`: `'low' | 'mid' | 'high'` — assigned at boot by `PerfController`
based on GPU capability detection (RGBA32F support, renderer score).

All simulations must degrade gracefully across tiers:
- Reduce grid resolution, particle count, or substeps for lower tiers
- `GPUComputeSim`: prefer RGBA32F, fall back to RGBA16F

---

## Section → Sim Integration (upcoming)

After merging to main:

- The Singularity hero section is **removed**
- The universal `AppCanvas` sim runs as background for **all** portfolio sections
- Each portfolio section has a `data-scene-id` sentinel; `SceneRouter` handles transitions
- A **"Scenes" folder in the Leva panel** lets users reassign which sim plays per section
- Sim parameters remain per-sim in their own Leva folders (unchanged)

Portfolio sections (in scroll order):
`home` → `about` → `projects` → `experience` → `education` → `gallery` → `blog` → `contact`

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| SimModule id | kebab-case | `'gray-scott'` |
| SimModule title | Title Case | `"Gray-Scott Reaction-Diffusion"` |
| Presets constant | `MODULE_PRESETS` | `GRAY_SCOTT_PRESETS` |
| Leva schema constant | `MODULE_LEVA_SCHEMA` | `GRAY_SCOTT_LEVA_SCHEMA` |
| Config type | `PascalCaseConfig` | `GrayScottConfig` |
| Scene component | `PascalCase.tsx` | `Scene.tsx` inside `sims/grayScott/` |
| Sim directory | camelCase | `sims/grayScott/`, `sims/kuramotoSivashinsky/` |
| Data constants | `UPPER_SNAKE_CASE` | `SCROLL_ACTIVE_THRESHOLD` |
| React components | PascalCase | `SceneHost.tsx`, `AnimatedCursor.tsx` |
| Hooks | `useNoun` | `useScrollSpy`, `useIsMobileOrTouch` |
