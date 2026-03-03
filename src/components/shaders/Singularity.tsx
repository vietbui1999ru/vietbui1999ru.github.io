"use client";

import type React from "react";
import { forwardRef } from "react";
import { Shader } from "react-shaders";
import { cn } from "@/lib/utils";

export interface SingularityShadersProps extends React.HTMLAttributes<HTMLDivElement> {
  speed?: number;
  intensity?: number;
  size?: number;
  waveStrength?: number;
  colorShift?: number;
}

const fragmentShader = `
vec3 blackholeColorRamp(float t) {
    // t in [0,1], returns black -> deep orange gradient with white/yellow in middle.
    if (t < 0.1)   return vec3(0.0, 0.0, 0.0); // black
    if (t < 0.25)  return mix(vec3(0.0), vec3(1.0), (t-0.1)/0.15); // black to white
    if (t < 0.55)  return mix(vec3(1.0), vec3(1.0,0.95,0.36), (t-0.25)/0.3); // white to yellow
    if (t < 0.8)   return mix(vec3(1.0,0.95,0.36), vec3(1.0,0.6,0.18), (t-0.55)/0.25); // yellow to strong orange
    if (t < 0.95)  return mix(vec3(1.0,0.6,0.18), vec3(0.9,0.33,0.05), (t-0.8)/0.15); // orange to deep burnt orange
    return vec3(0.1, 0.07, 0.07); // faint reddish-black at the edge
}

void mainImage(out vec4 O, vec2 F)
{
    float i = .2 * u_speed, a;
    vec2 r = iResolution.xy,
         p = ( F+F - r ) / r.y / (.7 * u_size),
         d = vec2(-1,1),
         b = p - i*d,
         c = p * mat2(1, 1, d/(.1 + i/dot(b,b))),
         v = c * mat2(cos(.5*log(a=dot(c,c)) + iTime*i*u_speed + vec4(0,33,11,0)))/i,
         w = vec2(0.0);

    for(float j = 0.0; j < 9.0; j++) {
        i++;
        w += 1.0 + sin(v * u_waveStrength);
        v += .7 * sin(v.yx * i + iTime * u_speed) / i + .5;
    }

    i = length( sin(v/.3)*.4 + c*(3.+d) );

    // Use length of position, and a time-based shift, for color ramp along radius and time
    float color_t = clamp((length(p) - 0.4) * 1.4 + 0.25 * sin(iTime * 0.2 + length(c)*4.0) + u_colorShift*0.2, 0.0, 1.0);
    vec3 colorRamp = blackholeColorRamp(color_t);

    // Increase dynamic range near the "event horizon"
    float brightness = 1.0 - exp(
       -exp( c.x * 0.7 )
            / w.xyyx.x
            / ( 2. + i*i/4. - i )
            / ( .5 + 1. / a )
            / ( .03 + abs( length(p)-.7 ) )
            * u_intensity
     );

    O = vec4(colorRamp * brightness, 1.0);
}
`;

export const SingularityShaders = forwardRef<
  HTMLDivElement,
  SingularityShadersProps
>(
  (
    {
      className,
      speed = 5.0,
      intensity = 0.5,
      size = 1.0,
      waveStrength = 0.5,
      colorShift = 0.1,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        className={cn("w-full h-full", className)}
        ref={ref}
        {...(props as object)}
      >
        <Shader
          fs={fragmentShader}
          style={{ width: "100%", height: "100%" } as React.CSSProperties}
          uniforms={{
            u_speed: { type: "1f", value: speed },
            u_intensity: { type: "1f", value: intensity },
            u_size: { type: "1f", value: size },
            u_waveStrength: { type: "1f", value: waveStrength },
            u_colorShift: { type: "1f", value: colorShift },
          }}
        />
      </div>
    );
  },
);

SingularityShaders.displayName = "SingularityShaders";

export default SingularityShaders;
