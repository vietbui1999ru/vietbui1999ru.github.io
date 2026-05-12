import { useEffect, useMemo } from "react";

const SVG_NS = "http://www.w3.org/2000/svg";

// Singleton: inject the SVG goo filter into <body> once.
// All card instances share the same filter node — no per-card SVG overhead.
let _gooInjected = false;
function ensureGooFilter() {
  if (_gooInjected || typeof document === "undefined") return;
  _gooInjected = true;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";

  const defs = document.createElementNS(SVG_NS, "defs");
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", "lava-card-goo");

  const blur = document.createElementNS(SVG_NS, "feGaussianBlur");
  blur.setAttribute("in", "SourceGraphic");
  blur.setAttribute("stdDeviation", "8");
  blur.setAttribute("result", "blur");

  const matrix = document.createElementNS(SVG_NS, "feColorMatrix");
  matrix.setAttribute("in", "blur");
  matrix.setAttribute("mode", "matrix");
  matrix.setAttribute("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7");
  matrix.setAttribute("result", "goo");

  const blend = document.createElementNS(SVG_NS, "feBlend");
  blend.setAttribute("in", "SourceGraphic");
  blend.setAttribute("in2", "goo");

  filter.appendChild(blur);
  filter.appendChild(matrix);
  filter.appendChild(blend);
  defs.appendChild(filter);
  svg.appendChild(defs);
  document.body.insertBefore(svg, document.body.firstChild);
}

export interface LavaLampBackgroundProps {
  fromColor: string;
  toColor: string;
}

type BlobConfig = {
  width: number;
  height: number;
  bottom: string;
  left?: string;
  right?: string;
  floatDuration: number;
  wobbleDuration: number;
  delay: number;
};

function createBlobConfigs(): BlobConfig[] {
  // 5 blobs (was 8) — same visual effect, 37% fewer animated compositing layers
  return Array.from({ length: 5 }, (_, i) => {
    const size = Math.max(28, 44 + i * 10 + (Math.random() * 12 - 6));
    const isLeft = i % 2 === 0;
    const hBase = isLeft ? Math.random() * 25 + 15 : Math.random() * 25 + 55;
    return {
      width: size,
      height: size * (0.9 + Math.random() * 0.25),
      bottom: `${-20 - i * 5}%`,
      left: isLeft ? `${hBase}%` : undefined,
      right: isLeft ? undefined : `${100 - hBase}%`,
      floatDuration: 14 + Math.random() * 10,
      wobbleDuration: 6 + Math.random() * 5,
      delay: Math.random() * 10 - 5,
    };
  });
}

export function LavaLampBackground({ fromColor, toColor }: LavaLampBackgroundProps) {
  useEffect(() => {
    ensureGooFilter();
  }, []);

  const gradient = `linear-gradient(-206deg, ${fromColor} 0%, ${toColor} 100%)`;
  // Empty dep array — configs are stable for the lifetime of this component instance
  const blobs = useMemo(() => createBlobConfigs(), []);

  return (
    <div className="lava-card" style={{ backgroundImage: gradient }}>
      <div className="lava-card-lamp">
        <div className="lava-card-lava">
          {blobs.map(
            ({ width, height, bottom, left, right, floatDuration, wobbleDuration, delay }, i) => (
              <div
                key={i}
                className="lava-card-blob"
                style={{
                  width,
                  height,
                  bottom,
                  left,
                  right,
                  backgroundImage: gradient,
                  animation: `lava-card-wobble ${wobbleDuration}s ease-in-out alternate infinite, lava-card-float ${floatDuration}s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            ),
          )}
          <div
            className="lava-card-blob lava-card-blob-top"
            style={{ backgroundImage: gradient }}
          />
          <div
            className="lava-card-blob lava-card-blob-bottom"
            style={{ backgroundImage: gradient }}
          />
        </div>
      </div>
    </div>
  );
}
