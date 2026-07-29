import { OBJECT_TIP_OFFSET_FRACTION, TRAIL_MAX_AGE_SECONDS } from "./config";
import { tipPosition } from "./physics";
import type { InkEffect, InkObject, Rect } from "./types";

const SPRITE_SIZE = 96;

// Precomputed from each source SVG's actual path content bounding box (not the
// declared viewBox/width/height — the pen source's declared canvas has a large
// unused margin). Both shapes are normalized to the same TARGET_SPAN so they
// render at the same base size; the predator/prey size difference comes
// entirely from InkObject.radius (role-based), not these assets' unrelated
// native scales. TARGET_SPAN is derived from OBJECT_TIP_OFFSET_FRACTION so the
// trail's tip-offset calculation (physics.ts) and this sprite geometry never
// drift apart.
const TARGET_SPAN = OBJECT_TIP_OFFSET_FRACTION * SPRITE_SIZE;

// Both source SVGs are authored with their tip pointing up (toward -y); the
// object's local "forward" axis is +x (see applyHeadingRotation's use of
// atan2(vy, vx)). A +90 degree pre-rotation converts "tip up" to "tip +x" so
// the nib leads in the direction of travel once the per-object heading
// rotation is applied on top.
const SHAPE_TIP_ROTATION = Math.PI / 2;

const PENCIL_PATH_D =
  "M1747.67 3412.84L4.48922 3416.91L0.000213253 1494.65L0.000163439 588.669C-0.0822588 547.621 31.0241 508.182 59.9775 479.093L830.74 9.0521C836.533 3.27086 844.4 0.0326536 852.609 0.000154095C860.799 -0.0256456 868.694 3.18917 874.52 8.94991L1670.64 479.095C1699.75 508.068 1743.07 543.543 1743.18 584.597L1743.18 1490.58L1747.67 3412.84Z M4.48926 3574.41L1753.74 3574.41L1753.74 4173.91C1753.74 4245.04 1725.3 4313.29 1674.72 4363.6C1624.14 4413.91 1555.56 4442.16 1484.01 4442.2C1483.98 4442.16 274.25 4442.16 274.25 4442.16C202.687 4442.19 134.089 4413.91 83.5094 4363.6C32.93 4313.29 4.48927 4245.04 4.48928 4173.91L4.48926 3574.41Z";
const PENCIL_CENTER = { x: 876.8288706, y: 2221.0871772 };
const PENCIL_SCALE = TARGET_SPAN / 4442.2256456;

const PEN_PATH_D =
  "M2429.7 468.828H2428.85V1711.51C2474.08 1727.07 2507.29 1778.31 2507.29 1839.12C2507.29 1912.34 2459.29 1971.62 2400 1971.67C2340.71 1971.62 2292.71 1912.34 2292.71 1839.12C2292.71 1778.31 2325.92 1727.07 2371.15 1711.51V468.828H2370.3C2255.34 976.551 2055.82 1441.92 1805.65 1881.94C1882.7 2052.51 1930.04 2265.05 1944.33 2524.26H2855.67C2869.96 2265.05 2917.3 2052.51 2994.35 1881.94C2744.18 1441.92 2544.66 976.551 2429.7 468.828Z M2822.95 2831.17H1977.05V2613.36H2822.95V2831.17Z";
const PEN_CENTER = { x: 2400, y: 1649.999 };
const PEN_SCALE = TARGET_SPAN / 2362.342;

export class InkRenderer {
  private readonly context: CanvasRenderingContext2D;
  private sprites: HTMLCanvasElement[] = [];
  private readonly pencilPath = new Path2D(PENCIL_PATH_D);
  private readonly penPath = new Path2D(PEN_PATH_D);
  private dpr = 1;
  private colors = { ink: "#141412", soft: "#6e6d66", wash: "#a3a29a" };

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Ink Ambient requires a 2D canvas context");
    this.context = context;
    this.rebuildSprites();
  }

  resize(width: number, height: number, dpr: number): void {
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.floor(width * dpr));
    this.canvas.height = Math.max(1, Math.floor(height * dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  rebuildSprites(): void {
    if (typeof document === "undefined") return;
    const style = getComputedStyle(document.documentElement);
    this.colors = {
      ink: style.getPropertyValue("--ink").trim() || "#141412",
      soft: style.getPropertyValue("--grey-1").trim() || "#6e6d66",
      wash: style.getPropertyValue("--grey-2").trim() || "#a3a29a",
    };
    this.sprites = [0, 1].map((variant) => this.createSprite(variant));
  }

  clear(width: number, height: number): void {
    this.context.clearRect(0, 0, width, height);
  }

  draw(
    objects: readonly InkObject[],
    effects: readonly InkEffect[],
    obstacles: readonly Rect[],
    width: number,
    height: number,
  ): void {
    this.context.save();
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.context.clearRect(0, 0, width, height);
    this.context.globalCompositeOperation = "source-over";

    for (const effect of effects) {
      if (effect.type === "splat") this.drawSplat(effect, obstacles);
      else this.drawBurst(effect, obstacles);
    }

    for (const object of objects) {
      if (object.opacity <= 0) continue;
      this.drawTrail(object, obstacles);
      const renderedRadius = object.radius * Math.max(object.scale.x, object.scale.y);
      const opacity = obstacleOpacity(
        { position: object.position, radius: renderedRadius },
        obstacles,
      );
      if (opacity <= 0) continue;
      // sprites[0] = pencil (prey), sprites[1] = pen (predator); unpaired/idle
      // objects fall back to their random variant for visual mix.
      const spriteIndex =
        object.role === "predator"
          ? 1
          : object.role === "prey"
            ? 0
            : object.variant % this.sprites.length;
      const sprite = this.sprites[spriteIndex];
      this.context.save();
      this.context.globalAlpha = object.opacity * opacity;
      this.context.translate(object.position.x, object.position.y);
      this.context.rotate(object.rotation);
      this.context.scale(
        (object.radius * 2 * object.scale.x) / SPRITE_SIZE,
        (object.radius * 2 * object.scale.y) / SPRITE_SIZE,
      );
      this.context.drawImage(sprite, -SPRITE_SIZE / 2, -SPRITE_SIZE / 2);
      this.context.restore();
    }
    this.context.restore();
  }

  private createSprite(variant: number): HTMLCanvasElement {
    const sprite = document.createElement("canvas");
    sprite.width = SPRITE_SIZE;
    sprite.height = SPRITE_SIZE;
    const context = sprite.getContext("2d");
    if (!context) return sprite;
    const center = SPRITE_SIZE / 2;
    // variant 0 = pencil (prey, softer graphite grey), variant 1 = pen (predator, bold ink)
    context.fillStyle = variant === 0 ? this.colors.soft : this.colors.ink;
    context.globalAlpha = 0.92;
    context.save();
    context.translate(center, center);
    context.rotate(SHAPE_TIP_ROTATION);
    if (variant === 0) {
      context.scale(PENCIL_SCALE, PENCIL_SCALE);
      context.translate(-PENCIL_CENTER.x, -PENCIL_CENTER.y);
      context.fill(this.pencilPath);
    } else {
      context.scale(PEN_SCALE, PEN_SCALE);
      context.translate(-PEN_CENTER.x, -PEN_CENTER.y);
      context.fill(this.penPath);
    }
    context.restore();
    return sprite;
  }

  private drawTrail(object: InkObject, obstacles: readonly Rect[]): void {
    if (object.trail.length === 0) return;
    const tip = tipPosition(object);
    const chain: Array<{ x: number; y: number; age: number }> = [
      ...object.trail,
      { x: tip.x, y: tip.y, age: 0 },
    ];
    const baseWidth = object.radius * 0.4;
    for (let index = 0; index < chain.length - 1; index += 1) {
      const a = chain[index];
      const b = chain[index + 1];
      const lifeT = Math.min(1, Math.max(0, 1 - (a.age + b.age) / 2 / TRAIL_MAX_AGE_SECONDS));
      if (lifeT <= 0) continue;
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const localOpacity = obstacleOpacity(
        { position: midpoint, radius: object.radius * 0.3 },
        obstacles,
      );
      const alpha = object.opacity * 0.5 * lifeT * localOpacity;
      if (alpha <= 0.01) continue;
      this.context.save();
      this.context.globalAlpha = alpha;
      this.context.strokeStyle = this.colors.wash;
      this.context.lineWidth = Math.max(1, baseWidth * (0.4 + lifeT * 0.6));
      this.context.lineCap = "round";
      this.context.beginPath();
      this.context.moveTo(a.x, a.y);
      this.context.lineTo(b.x, b.y);
      this.context.stroke();
      this.context.restore();
    }
  }

  private drawSplat(effect: InkEffect, obstacles: readonly Rect[]): void {
    if (
      obstacleOpacity(
        {
          position: { x: effect.x, y: effect.y },
          radius: effect.radius,
        } as InkObject,
        obstacles,
      ) <= 0
    )
      return;
    this.context.save();
    this.context.globalAlpha = effect.alpha;
    this.context.fillStyle = this.colors.soft;
    this.context.translate(effect.x, effect.y);
    this.context.rotate(effect.rotation);
    this.context.beginPath();
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const radius = effect.radius * (index % 2 ? 0.6 : 1);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) this.context.moveTo(x, y);
      else this.context.lineTo(x, y);
    }
    this.context.closePath();
    this.context.fill();
    this.context.restore();
  }

  private drawBurst(effect: InkEffect, obstacles: readonly Rect[]): void {
    if (
      obstacleOpacity(
        {
          position: { x: effect.x, y: effect.y },
          radius: effect.radius,
        } as InkObject,
        obstacles,
      ) <= 0
    )
      return;
    const t = Math.min(1, effect.age / effect.lifetime);
    this.context.save();
    this.context.translate(effect.x, effect.y);

    const flashT = Math.min(1, t / 0.35);
    const flashAlpha = (1 - flashT) ** 2 * effect.alpha;
    if (flashAlpha > 0.01) {
      this.context.globalAlpha = flashAlpha;
      this.context.fillStyle = this.colors.ink;
      this.context.beginPath();
      this.context.arc(0, 0, effect.radius * 0.4 * (1 - flashT * 0.5), 0, Math.PI * 2);
      this.context.fill();
    }

    const ringRadius = effect.radius * easeOutCubic(t);
    const ringAlpha = (1 - t) * effect.alpha;
    if (ringAlpha > 0.01 && ringRadius > 0.5) {
      this.context.globalAlpha = ringAlpha;
      this.context.strokeStyle = this.colors.ink;
      this.context.lineWidth = Math.max(1, effect.radius * 0.12 * (1 - t * 0.6));
      this.context.beginPath();
      this.context.arc(0, 0, ringRadius, 0, Math.PI * 2);
      this.context.stroke();
    }

    this.context.restore();
  }
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

const OCCLUSION_FADE_BAND = 14;

function obstacleOpacity(
  object: Pick<InkObject, "position" | "radius">,
  obstacles: readonly Rect[],
): number {
  let opacity = 1;
  for (const obstacle of obstacles) {
    const closestX = Math.max(obstacle.x, Math.min(object.position.x, obstacle.x + obstacle.width));
    const closestY = Math.max(
      obstacle.y,
      Math.min(object.position.y, obstacle.y + obstacle.height),
    );
    const distance = Math.hypot(object.position.x - closestX, object.position.y - closestY);
    const local = Math.min(1, Math.max(0, (distance - object.radius) / OCCLUSION_FADE_BAND));
    opacity = Math.min(opacity, local);
    if (opacity <= 0) return 0;
  }
  return opacity;
}
