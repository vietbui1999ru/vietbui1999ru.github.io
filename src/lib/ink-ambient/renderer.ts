import { TRAIL_MAX_AGE_SECONDS } from "./config";
import { SeededRng } from "./rng";
import type { InkEffect, InkObject, Rect, Vec2 } from "./types";

const SPRITE_SIZE = 96;

export class InkRenderer {
  private readonly context: CanvasRenderingContext2D;
  private sprites: HTMLCanvasElement[] = [];
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
      const renderedRadius =
        object.radius * Math.max(object.scale.x, object.scale.y);
      const opacity = obstacleOpacity(
        { position: object.position, radius: renderedRadius },
        obstacles,
      );
      if (opacity <= 0) continue;
      const sprite = this.sprites[object.variant % this.sprites.length];
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
    const rng = new SeededRng(variant + 1);
    const center = SPRITE_SIZE / 2;
    const baseRadius = 30;
    const localPoints =
      variant === 0 ? shapeDart(baseRadius, rng) : shapeTriSliver(baseRadius, rng);
    const points = localPoints.map((point) => ({
      x: center + point.x,
      y: center + point.y,
    }));
    context.fillStyle = variant === 0 ? this.colors.ink : this.colors.soft;
    context.globalAlpha = 0.92;
    context.beginPath();
    drawPolygon(context, points);
    context.fill();
    return sprite;
  }

  private drawTrail(object: InkObject, obstacles: readonly Rect[]): void {
    if (object.trail.length === 0) return;
    const chain: Array<{ x: number; y: number; age: number }> = [
      ...object.trail,
      { x: object.position.x, y: object.position.y, age: 0 },
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

function shapeDart(radius: number, rng: SeededRng): Vec2[] {
  const flare = 0.5 + rng.next() * 0.18;
  const notch = 0.75 + rng.next() * 0.2;
  return [
    { x: radius * 1.35, y: 0 },
    { x: radius * 0.1, y: radius * flare },
    { x: -radius * 0.85, y: radius * flare * 0.5 },
    { x: -radius * notch, y: 0 },
    { x: -radius * 0.85, y: -radius * flare * 0.5 },
    { x: radius * 0.1, y: -radius * flare },
  ];
}

function shapeTriSliver(radius: number, rng: SeededRng): Vec2[] {
  const length = 1.3 + rng.next() * 0.25;
  return [
    { x: radius * length, y: 0 },
    { x: -radius * 0.55, y: radius * (0.28 + rng.next() * 0.1) },
    { x: -radius * 0.75, y: -radius * (0.42 + rng.next() * 0.15) },
  ];
}

function drawPolygon(context: CanvasRenderingContext2D, points: readonly Vec2[]): void {
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.closePath();
}

const OCCLUSION_FADE_BAND = 14;

function obstacleOpacity(
  object: Pick<InkObject, "position" | "radius">,
  obstacles: readonly Rect[],
): number {
  let opacity = 1;
  for (const obstacle of obstacles) {
    const closestX = Math.max(
      obstacle.x,
      Math.min(object.position.x, obstacle.x + obstacle.width),
    );
    const closestY = Math.max(
      obstacle.y,
      Math.min(object.position.y, obstacle.y + obstacle.height),
    );
    const distance = Math.hypot(
      object.position.x - closestX,
      object.position.y - closestY,
    );
    const local = Math.min(
      1,
      Math.max(0, (distance - object.radius) / OCCLUSION_FADE_BAND),
    );
    opacity = Math.min(opacity, local);
    if (opacity <= 0) return 0;
  }
  return opacity;
}
