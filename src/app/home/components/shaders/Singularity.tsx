"use client";

import type React from "react";
import { forwardRef } from "react";
import { Shader } from "react-shaders";
import { cn } from "@/lib/utils";

export interface SingularityShadersProps
	extends React.HTMLAttributes<HTMLDivElement> {
	/**
	 * Rotation and animation speed
	 * @default 1.0
	 */
	speed?: number;

	/**
	 * Overall brightness multiplier
	 * @default 1.0
	 */
	intensity?: number;

	/**
	 * Blackhole diameter scaling
	 * @default 1.0
	 */
	size?: number;

	/**
	 * Accretion disk turbulence
	 * @default 1.0
	 */
	waveStrength?: number;

	/**
	 * Color gradient intensity
	 * @default 1.0
	 */
	colorShift?: number;
}

const fragmentShader = `
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

    // Grayscale: same r,g,b for black/white/grey
    vec4 colorGrad = vec4(.2, .2, .2, 0) * u_colorShift;

    O = 1. - exp( -exp( c.x * colorGrad )
                   / w.xyyx
                   / ( 2. + i*i/4. - i )
                   / ( .5 + 1. / a )
                   / ( .03 + abs( length(p)-.7 ) )
                   * u_intensity
             );
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
			waveStrength = .5,
			colorShift = 1.00,
			...props
		},
		ref,
	) => {
		return (
			<div
				className={cn("w-full h-full", className)}
				ref={ref}
				{...(props as any)}
			>
				<Shader
					fs={fragmentShader}
					style={{ width: "100%", height: "100%" } as CSSStyleDeclaration}
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
