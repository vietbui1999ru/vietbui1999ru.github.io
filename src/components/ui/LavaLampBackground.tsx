import React, { useMemo } from "react";

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

const randomInRange = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const createBlobConfigs = (): BlobConfig[] =>
  Array.from({ length: 8 }, (_, i) => {
    const sizeBase = 40 + i * 8;
    const sizeJitter = randomInRange(-10, 10);
    const size = Math.max(24, sizeBase + sizeJitter);

    const isLeftSide = i % 2 === 0;
    const horizontalBase = isLeftSide
      ? randomInRange(15, 40)
      : randomInRange(55, 85);

    return {
      width: size,
      height: size * randomInRange(0.9, 1.2),
      bottom: `${-25 - i * 4}%`,
      left: isLeftSide ? `${horizontalBase}%` : undefined,
      right: isLeftSide ? undefined : `${100 - horizontalBase}%`,
      floatDuration: randomInRange(12, 26),
      wobbleDuration: randomInRange(5, 11),
      delay: randomInRange(-5, 5),
    };
  });

export const LavaLampBackground: React.FC<LavaLampBackgroundProps> = ({
  fromColor,
  toColor,
}) => {
  const gradient = `linear-gradient(-206deg, ${fromColor} 0%, ${toColor} 100%)`;
  const blobConfigs = useMemo(() => createBlobConfigs(), []);

  // Scoped lava lamp background sized for the project card
  return (
    <div className="lava-card" style={{ backgroundImage: gradient }}>
      <div className="lava-card-lamp">
        <div className="lava-card-lava">
          {blobConfigs.map(
            (
              {
                width,
                height,
                bottom,
                left,
                right,
                floatDuration,
                wobbleDuration,
                delay,
              },
              index,
            ) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={index}
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
          <div className="lava-card-blob lava-card-blob-top" />
          <div className="lava-card-blob lava-card-blob-bottom" />
        </div>
      </div>
      <svg
        aria-hidden="true"
        className="lava-card-svg"
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
      >
        <defs>
          <filter id="lava-card-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
    </div>
  );
};
