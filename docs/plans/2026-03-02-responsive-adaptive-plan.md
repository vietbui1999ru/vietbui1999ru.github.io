# Responsive & Adaptive Portfolio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the portfolio responsive and adaptive across phone, tablet, and desktop screens with intuitive touch and mouse interactions.

**Architecture:** Component-by-component refactor using Tailwind CSS v4 responsive utilities and targeted JS touch handlers. No new abstractions — each component gets surgical changes. One new component (MobileBottomNav).

**Tech Stack:** Astro, React 19, Tailwind CSS v4, framer-motion, GSAP, lucide-react

---

### Task 1: Global CSS — Safe Area, Reduced Motion, Base Responsive Fixes

**Files:**

- Modify: `src/styles/global.css:135-206`

**Step 1: Add safe-area and reduced-motion rules to global.css**

At the end of the `@layer base` block (after line 172), add:

```css
/* Safe area for notched phones */
body {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Step 2: Verify no regressions**

Run: `npx astro build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add safe-area padding and prefers-reduced-motion to global CSS"
```

---

### Task 2: NavBarDock — Hide on Mobile

**Files:**

- Modify: `src/components/layout/NavBarDock.tsx:70`

**Step 1: Wrap the outer div with `hidden md:block`**

Change line 70 from:

```tsx
    <div className="fixed top-0 left-0 right-0 w-full z-[9999999] bg-background">
```

to:

```tsx
    <div className="hidden md:block fixed top-0 left-0 right-0 w-full z-[9999999] bg-background">
```

**Step 2: Verify build**

Run: `npx astro build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/layout/NavBarDock.tsx
git commit -m "feat: hide desktop dock nav on mobile screens"
```

---

### Task 3: Create MobileBottomNav Component

**Files:**

- Create: `src/components/layout/MobileBottomNav.tsx`

**Step 1: Create the mobile bottom navigation component**

```tsx
"use client";

import { cn } from "@/lib/utils";
import {
  User,
  HomeIcon,
  NotebookPen,
  ServerCog,
  BriefcaseBusiness,
  GraduationCap,
  GalleryHorizontal,
  UserPen,
} from "lucide-react";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { title: "Home", icon: HomeIcon, href: "#home" },
  { title: "About", icon: User, href: "#about" },
  { title: "Projects", icon: ServerCog, href: "#projects" },
  { title: "Work", icon: BriefcaseBusiness, href: "#experience" },
  { title: "Edu", icon: GraduationCap, href: "#education" },
  { title: "Blog", icon: NotebookPen, href: "#blog" },
  { title: "Gallery", icon: GalleryHorizontal, href: "#gallery" },
  { title: "Contact", icon: UserPen, href: "#contact" },
];

const SECTIONS = NAV_ITEMS.map((item) => item.href.slice(1));

const MobileBottomNav = () => {
  const [activeHash, setActiveHash] = useState("#home");

  useEffect(() => {
    const handleScroll = () => {
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveHash(`#${SECTIONS[i]}`);
            return;
          }
        }
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999999] md:hidden border-t border-border bg-background/80 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeHash === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 min-w-[44px] min-h-[44px] touch-manipulation transition-colors",
                isActive
                  ? "text-[#D92D48] dark:text-[#FA689A]"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="text-[10px] leading-tight">{item.title}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
```

**Step 2: Verify build**

Run: `npx astro build`
Expected: Build succeeds (component not yet imported).

**Step 3: Commit**

```bash
git add src/components/layout/MobileBottomNav.tsx
git commit -m "feat: create MobileBottomNav bottom tab bar component"
```

---

### Task 4: BaseLayout — Wire Up MobileBottomNav & Fix Padding

**Files:**

- Modify: `src/layouts/BaseLayout.astro:1-28`

**Step 1: Import MobileBottomNav and adjust layout**

Change the full file to:

```astro
---
import "@/styles/global.css";
import { cn } from "@/lib/utils";
import NavBarDock from "@/components/layout/NavBarDock";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import AnimatedCursor from "@/components/ui/AnimatedCursor";
import VectorFieldBackground from "@/components/ui/VectorFieldBackground";
---

<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Viet Bui | Portfolio</title>
  </head>
  <body
    class={cn(
      "group/body overscroll-none antialiased bg-background text-foreground",
    )}
  >
    <VectorFieldBackground client:load />
    <AnimatedCursor client:load />
    <NavBarDock client:load />
    <MobileBottomNav client:load />
    <main class="relative z-10 flex flex-1 flex-col pt-4 pb-20 md:pt-24 md:pb-0">
      <slot />
    </main>
  </body>
</html>
```

Key changes:

- Added `MobileBottomNav` import and render
- Added `viewport-fit=cover` to viewport meta for safe area support
- Changed `<main>` padding: `pt-4 pb-20 md:pt-24 md:pb-0` (mobile: small top padding since dock is at bottom, 80px bottom to clear the nav; desktop: original 96px top, no bottom)

**Step 2: Verify build and visual check**

Run: `npx astro build && npx astro preview`
Expected: Build succeeds. On mobile viewport: bottom nav visible, top dock hidden. On desktop: top dock visible, bottom nav hidden.

**Step 3: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: wire MobileBottomNav into layout with responsive padding"
```

---

### Task 5: Hero Text — Fluid Scaling

**Files:**

- Modify: `src/components/sections/Home.tsx:65`

**Step 1: Replace fixed text size with fluid clamp**

Change line 65 from:

```tsx
className =
  "text-7xl font-medium text-center text-foreground drop-shadow-md md:text-7xl";
```

to:

```tsx
            className="font-medium text-center text-foreground drop-shadow-md"
            style={{ fontSize: "clamp(2.25rem, 8vw, 4.5rem)" }}
```

Note: We use inline `style` because Tailwind v4 arbitrary values with `clamp()` containing commas can be tricky. The `style` prop is cleaner here.

**Step 2: Verify build**

Run: `npx astro build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/sections/Home.tsx
git commit -m "feat: fluid hero text scaling with clamp for all screen sizes"
```

---

### Task 6: TimelineLayout — Left-Rail Mobile Layout

**Files:**

- Modify: `src/components/ui/TimelineLayout.tsx:44-198`

**Step 1: Refactor the timeline for mobile left-rail layout**

Replace the entire component body (the return statement starting at line 44) with:

```tsx
if (!items.length) return null;

return (
  <div
    className={cn(
      "relative w-full max-w-4xl mx-auto flex flex-col gap-8",
      className,
    )}
  >
    {/* Spine: left on mobile, center on md+ */}
    <div
      className={cn(
        "pointer-events-none absolute top-0 bottom-0",
        "left-4 md:left-1/2 md:-translate-x-1/2",
        connectorColor === "primary" && "bg-primary/20",
        connectorColor === "muted" && "bg-muted/40",
        connectorColor === "accent" && "bg-accent/40",
      )}
      aria-hidden
      style={{ width: 2 }}
    />

    <ul className="space-y-10">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isRight = index % 2 === 1;

        const statusRing =
          item.status === "completed"
            ? "bg-primary"
            : item.status === "in-progress"
              ? "bg-yellow-400"
              : "bg-muted-foreground/30";

        // Heuristic: split description into bullets
        let bullets: string[] | null = null;
        if (item.description) {
          const byNewline = item.description
            .split(/\n+/)
            .map((s) => s.trim())
            .filter(Boolean);
          if (byNewline.length > 1) {
            bullets = byNewline;
          } else {
            const bySentence = item.description
              .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
              .map((s) => s.trim())
              .filter(Boolean);
            if (bySentence.length > 1) bullets = bySentence;
          }
        }

        const content = (
          <Card3D active maxTilt={8} className="h-full">
            <div
              className={cn(
                "rounded-xl border bg-card/60 p-4 shadow-sm transition-transform text-center h-full",
                animate && "animate-in slide-in-from-bottom-2 duration-300",
              )}
            >
              <div className="mb-2 space-y-1">
                <h3 className="font-semibold leading-tight text-sm md:text-base">
                  {item.title}
                </h3>
                {item.subtitle && (
                  <p className="text-[11px] md:text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                )}
                {item.date && (
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                    {item.date}
                  </p>
                )}
              </div>

              {bullets ? (
                <ul className="mt-2 space-y-1 text-[11px] md:text-xs text-muted-foreground list-disc list-inside text-left">
                  {bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : item.description ? (
                <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              ) : null}

              {item.ctaHref && (
                <a
                  href={item.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center gap-1 text-[11px] text-primary hover:underline min-h-[44px] min-w-[44px]"
                >
                  {item.ctaLabel ?? "View details"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Card3D>
        );

        return (
          <li key={item.id} className="relative">
            {/* Icon at spine position */}
            <div className="pointer-events-none absolute top-0 flex flex-col items-center left-4 -translate-x-1/2 md:left-1/2">
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border-2 bg-background shadow-sm",
                  iconColor === "primary" && "border-primary/70",
                  iconColor === "muted" && "border-muted-foreground/40",
                  iconColor === "accent" && "border-accent/70",
                  size === "sm" && "h-7 w-7",
                  size === "md" && "h-8 w-8",
                  size === "lg" && "h-10 w-10",
                )}
              >
                {item.icon ? (
                  <span
                    className={cn(
                      "flex items-center justify-center",
                      size === "sm" && "text-[10px]",
                      size === "md" && "text-xs",
                      size === "lg" && "text-sm",
                    )}
                  >
                    {item.icon}
                  </span>
                ) : (
                  <span
                    className={cn(
                      "block rounded-full",
                      statusRing,
                      size === "sm" && "h-2 w-2",
                      size === "md" && "h-2.5 w-2.5",
                      size === "lg" && "h-3 w-3",
                    )}
                  />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mt-1 flex-1",
                    connectorColor === "primary" && "bg-primary/40",
                    connectorColor === "muted" && "bg-muted-foreground/30",
                    connectorColor === "accent" && "bg-accent/40",
                  )}
                  style={{ width: 2 }}
                />
              )}
            </div>

            {/* Mobile: left-rail, card to the right */}
            <div className="md:hidden pl-12 pr-2">{content}</div>

            {/* Desktop: two-column zig-zag */}
            <div
              className={cn(
                "hidden md:flex w-full",
                isRight && "md:flex-row-reverse",
              )}
            >
              <div className={cn("w-1/2", isRight ? "pl-10" : "pr-10")}>
                {content}
              </div>
              <div className="w-1/2" />
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);
```

Key changes:

- Spine is `left-4 md:left-1/2 md:-translate-x-1/2` (left-rail on mobile, center on desktop)
- Icon uses same left positioning
- Mobile: `pl-12 pr-2` (clear the spine + icon)
- Desktop: unchanged zig-zag
- CTA link gets `min-h-[44px] min-w-[44px]` touch target
- Bullet lists get `text-left` for better mobile readability

**Step 2: Verify build**

Run: `npx astro build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/ui/TimelineLayout.tsx
git commit -m "feat: left-rail timeline layout on mobile, zig-zag on desktop"
```

---

### Task 7: Gallery — Responsive Column Count

**Files:**

- Modify: `src/components/sections/Gallery.tsx:56-60`

**Step 1: Add responsive column detection**

Add a `useColumns` state with matchMedia after the existing state declarations (after line 14):

At the top of the `Gallery` component (after line 12 `const Gallery = () => {`), add:

```tsx
const [columns, setColumns] = useState(4);

useEffect(() => {
  const update = () => {
    const w = window.innerWidth;
    setColumns(w < 640 ? 2 : w < 1024 ? 3 : 4);
  };
  update();
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
}, []);
```

Then change the `Marquee3D` usage on line 57 from:

```tsx
          <Marquee3D
            images={marqueeImages}
            columns={4}
```

to:

```tsx
          <Marquee3D
            images={marqueeImages}
            columns={columns}
```

Also update the gallery modal image max height for mobile — change line 108:

```tsx
className = "w-full h-full max-h-[400px] object-cover";
```

to:

```tsx
className = "w-full h-full max-h-[60vh] md:max-h-[400px] object-cover";
```

And update the modal close button (line 98) for touch targets:

```tsx
className =
  "sticky top-4 right-0 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4";
```

to:

```tsx
className =
  "sticky top-4 right-0 ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4";
```

**Step 2: Verify build**

Run: `npx astro build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/sections/Gallery.tsx
git commit -m "feat: responsive gallery columns and touch-friendly modal"
```

---

### Task 8: CardsCarousel — Scroll Snap & Mobile Sizing

**Files:**

- Modify: `src/components/ui/CardsCarousel.tsx:84,126-137,237`

**Step 1: Add scroll snap to the carousel container**

Change line 84 from:

```tsx
className =
  "flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-6 [scrollbar-width:none] md:py-10";
```

to:

```tsx
className =
  "flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-6 [scrollbar-width:none] md:py-10 snap-x snap-mandatory";
```

**Step 2: Add snap alignment to card items**

Change line 111 (the `motion.div` wrapping each card) from:

```tsx
className = "rounded-3xl last:pr-[5%] md:last:pr-[33%]";
```

to:

```tsx
className = "rounded-3xl last:pr-[5%] md:last:pr-[33%] snap-start";
```

**Step 3: Increase mobile card size and touch targets**

Change line 237 (the card button) from:

```tsx
className =
  "relative z-10 flex h-48 w-40 flex-col items-start justify-start overflow-hidden rounded-3xl bg-gray-100 md:h-64 md:w-56 dark:bg-neutral-900";
```

to:

```tsx
className =
  "relative z-10 flex h-52 w-44 flex-col items-start justify-start overflow-hidden rounded-3xl bg-gray-100 md:h-64 md:w-56 dark:bg-neutral-900";
```

Change carousel scroll buttons (lines 126-137) — increase touch target size from `h-10 w-10` to `h-11 w-11`:

First button:

```tsx
className =
  "relative z-40 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 disabled:opacity-50";
```

Second button:

```tsx
className =
  "relative z-40 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 disabled:opacity-50";
```

Also update the expanded card close button (line 213) for 44px touch target:

```tsx
className =
  "sticky top-4 right-0 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-black dark:bg-white";
```

to:

```tsx
className =
  "sticky top-4 right-0 ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-black dark:bg-white";
```

**Step 4: Verify build**

Run: `npx astro build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/components/ui/CardsCarousel.tsx
git commit -m "feat: scroll snap, larger mobile cards, 44px touch targets for carousel"
```

---

### Task 9: AnimatedModal — Mobile Width & Swipe Dismiss

**Files:**

- Modify: `src/components/ui/AnimatedModal.tsx:90-126,174`

**Step 1: Fix modal sizing for mobile**

Change line 98 from:

```tsx
              "min-h-[50%] max-h-[90%] md:max-w-[40%] bg-white dark:bg-neutral-950 border border-transparent dark:border-neutral-800 md:rounded-2xl relative z-50 flex flex-col flex-1 overflow-hidden",
```

to:

```tsx
              "min-h-[50%] max-h-[90%] max-w-[95%] md:max-w-[40%] bg-white dark:bg-neutral-950 border border-transparent dark:border-neutral-800 rounded-2xl relative z-50 flex flex-col flex-1 overflow-hidden",
```

Key changes: Added `max-w-[95%]` for mobile, changed `md:rounded-2xl` to `rounded-2xl` (round on all sizes).

**Step 2: Add swipe-down dismiss**

Replace the inner `motion.div` (lines 90-122) with drag support:

```tsx
<motion.div
  animate={{
    opacity: 1,
    scale: 1,
    rotateX: 0,
    y: 0,
  }}
  className={cn(
    "min-h-[50%] max-h-[90%] max-w-[95%] md:max-w-[40%] bg-white dark:bg-neutral-950 border border-transparent dark:border-neutral-800 rounded-2xl relative z-50 flex flex-col flex-1 overflow-hidden",
    className,
  )}
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={0.2}
  onDragEnd={(_e, info) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      setOpen(false);
    }
  }}
  exit={{
    opacity: 0,
    scale: 0.8,
    rotateX: 10,
  }}
  initial={{
    opacity: 0,
    scale: 0.5,
    rotateX: 40,
    y: 40,
  }}
  ref={modalRef}
  transition={{
    type: "spring",
    stiffness: 260,
    damping: 15,
  }}
>
  <CloseIcon />
  {children}
</motion.div>
```

**Step 3: Enlarge close button touch target**

Change line 174 from:

```tsx
    <button type="button" className="absolute top-4 right-4 group" onClick={() => setOpen(false)}>
```

to:

```tsx
    <button type="button" className="absolute top-4 right-4 group min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={() => setOpen(false)}>
```

**Step 4: Verify build**

Run: `npx astro build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/components/ui/AnimatedModal.tsx
git commit -m "feat: mobile modal sizing, swipe-down dismiss, 44px close button"
```

---

### Task 10: VectorFieldBackground — Mobile Performance

**Files:**

- Modify: `src/components/ui/VectorFieldBackground.tsx:49-65,101-102`

**Step 1: Add mobile detection and reduced-motion support**

Inside the `VectorFieldBackground` component, after the existing refs (after line 63 `const cursorEnabled = cursorAttraction > 0;`), add:

```tsx
const [isMobile, setIsMobile] = useState(false);
const [reducedMotion, setReducedMotion] = useState(false);

useEffect(() => {
  setIsMobile(
    window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768,
  );
  setReducedMotion(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
}, []);

const effectiveGrid = isMobile ? Math.min(grid, 20) : grid;
const effectiveCursorEnabled = cursorEnabled && !isMobile;
```

**Step 2: Use effective values**

Replace all uses of `grid` in the draw function with `effectiveGrid`, and `cursorEnabled` with `effectiveCursorEnabled`.

In the `draw` callback (line 102), change references:

- `grid` → `effectiveGrid`
- `cursorEnabled` → `effectiveCursorEnabled`

In the dependency array of `draw` (line 227):

```tsx
  }, [field, effectiveGrid, arrowScale, effectiveCursorEnabled, cursorAttraction]);
```

Add early return for reduced motion at the top of the component (after the state declarations):

```tsx
if (reducedMotion) {
  return null;
}
```

**Step 3: Verify build**

Run: `npx astro build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/components/ui/VectorFieldBackground.tsx
git commit -m "feat: reduce vector field grid on mobile, respect prefers-reduced-motion"
```

---

### Task 11: AboutParagraphReveal — Mobile Slide Offset

**Files:**

- Modify: `src/components/sections/About.tsx:12`

**Step 1: Reduce slide offset for mobile**

This is a data-driven change. In `About.tsx`, change line 12:

```tsx
  slideOffset: 40,
```

to:

```tsx
  slideOffset: typeof window !== "undefined" && window.innerWidth < 768 ? 20 : 40,
```

Wait — this won't work at render time in SSR. Instead, modify the `AboutParagraphReveal` component to accept a `mobileSlideOffset` prop, or better yet, just use a smaller default since `40px` is aggressive even on desktop.

Actually, the simplest approach: change `About.tsx` line 12 to just use `20` which works well on both sizes:

```tsx
  slideOffset: 20,
```

This reduces the horizontal slide animation distance from 40px to 20px, which prevents content from sliding off-screen on narrow viewports while still being visible on desktop.

**Step 2: Verify build**

Run: `npx astro build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/sections/About.tsx
git commit -m "feat: reduce paragraph reveal slide offset for mobile friendliness"
```

---

### Task 12: Touch Feedback — Active States

**Files:**

- Modify: `src/styles/global.css:163-166`

**Step 1: Enhance touch active states**

Change the existing active rule (lines 163-166):

```css
a:active,
button:active {
  @apply opacity-60 md:opacity-100;
}
```

to:

```css
a:active,
button:active,
[role="button"]:active {
  @apply opacity-60 md:opacity-100;
}

@media (pointer: coarse) {
  a:active,
  button:active,
  [role="button"]:active {
    @apply scale-[0.97] opacity-80;
    transition:
      transform 0.1s ease,
      opacity 0.1s ease;
  }
}
```

This adds a subtle scale-down effect on touch devices for tactile feedback, and includes `[role="button"]` for gallery tiles and other interactive elements.

**Step 2: Verify build**

Run: `npx astro build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: enhanced touch active states with scale feedback"
```

---

### Task 13: Final Build Verification

**Step 1: Full clean build**

Run:

```bash
rm -rf dist && npx astro build
```

Expected: Build succeeds with zero errors.

**Step 2: Visual verification**

Run: `npx astro preview`

Check:

- Mobile (320px-768px): Bottom nav visible, top dock hidden, hero text scales, timeline left-rail, gallery 2 columns, carousel snaps
- Tablet (768px-1024px): Top dock visible, bottom nav hidden, gallery 3 columns
- Desktop (1024px+): Full dock, gallery 4 columns, timeline zig-zag
- Touch simulation: Scroll snap on carousel, swipe-down dismiss on modals, 44px targets

**Step 3: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: responsive polish from visual verification"
```
