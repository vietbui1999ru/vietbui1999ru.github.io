# Responsive & Adaptive Portfolio Refactoring

**Date**: 2026-03-02
**Approach**: Component-by-component refactor (Approach 1)
**Goal**: Make the portfolio responsive across phone/tablet/desktop screens with intuitive touch and mouse interactions.

## Decisions

- Mobile nav: Bottom tab bar (fixed bottom, icons only, 8 sections)
- Hero text: Fluid scaling with `clamp()`
- Performance: Reduce VectorFieldBackground grid on mobile, respect `prefers-reduced-motion`
- Touch: Full optimization — swipe gestures, 44px touch targets, active states

## Sections

### 1. Mobile Navigation — Bottom Tab Bar

- Hide `NavBarDock` on mobile (`hidden md:block`)
- New `MobileBottomNav.tsx`: fixed bottom bar, 8 section icons, scroll-spy active state
- 44px min touch targets, backdrop blur, `env(safe-area-inset-bottom)` padding
- Adjust `<main>` padding: reduce top on mobile, add bottom padding

### 2. Hero Text Fluid Scaling

- Replace `text-7xl md:text-7xl` with `text-[clamp(2.25rem,8vw,4.5rem)]`
- TypingText/GradientText inherit size — no changes needed

### 3. Timeline Mobile Layout

- Mobile (`< md`): shift spine to left, cards flow right, no zig-zag
- Desktop: keep existing center-spine zig-zag
- Common responsive timeline pattern

### 4. Gallery Marquee3D Responsive Columns

- Detect viewport with `matchMedia` in Gallery component
- Pass `columns={2}` mobile, `columns={3}` tablet, `columns={4}` desktop
- Tile sizes already responsive

### 5. Carousel Touch & Sizing

- Add `scroll-snap-type: x mandatory` + `scroll-snap-align: start`
- Increase mobile card size to `h-52 w-44`
- Keep scroll buttons (work for both input types)

### 6. Modal Touch Optimization

- Mobile: `max-w-[95%]` with `rounded-2xl`
- Swipe-down dismiss via framer-motion `drag="y"` + threshold
- Close buttons: 44x44px minimum

### 7. Touch Target Enforcement

- Apply 44px minimum to: carousel buttons, modal close, blog links, timeline CTAs
- `active:scale-95` feedback on touch-interactive elements

### 8. VectorFieldBackground Performance

- Mobile: reduce grid 32 → 20, disable cursor attraction
- `prefers-reduced-motion: reduce` → disable animation entirely

### 9. General Responsive Polish

- AboutParagraphReveal: reduce `slideOffset` on mobile (40 → 20px)
- Blog grid: already responsive (no change)
- Section padding: already responsive (no change)

## Files to Modify

| File                        | Changes                                     |
| --------------------------- | ------------------------------------------- |
| `BaseLayout.astro`          | Import MobileBottomNav, adjust main padding |
| `NavBarDock.tsx`            | Add `hidden md:block` wrapper               |
| `MobileBottomNav.tsx`       | **NEW** — bottom tab bar component          |
| `Home.tsx`                  | Fluid text sizing                           |
| `TimelineLayout.tsx`        | Left-rail mobile layout                     |
| `Gallery.tsx`               | Responsive column count                     |
| `Marquee3D.tsx`             | Accept dynamic columns                      |
| `CardsCarousel.tsx`         | Scroll snap, mobile card size               |
| `AnimatedModal.tsx`         | Mobile max-width, swipe dismiss             |
| `Contact.tsx`               | Modal touch targets                         |
| `VectorFieldBackground.tsx` | Mobile grid reduction, reduced-motion       |
| `AboutParagraphReveal.tsx`  | Mobile slide offset                         |
| `global.css`                | Reduced-motion media query, safe-area       |
