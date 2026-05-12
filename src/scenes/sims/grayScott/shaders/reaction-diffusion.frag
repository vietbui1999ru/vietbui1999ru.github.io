// Gray-Scott reaction-diffusion step, GLSL ES 1.00 (WebGL1-style).
//
// GPUComputationRenderer prepends its own header that declares:
//   - the precision statement
//   - `uniform sampler2D textureField;`  (the ping-pong state)
//   - `uniform vec2 resolution;`         (texture size in pixels)
// and uses a minimal vertex shader that does NOT pass a UV varying.
// So we compute UV in the fragment shader from gl_FragCoord/resolution.

// Reaction parameters (injected via variable.material.uniforms in compute.ts)
uniform float u_F;       // feed rate
uniform float u_k;       // kill rate
uniform float u_Du;      // diffusion coefficient for U
uniform float u_Dv;      // diffusion coefficient for V
uniform float u_dt;      // time step per substep
uniform vec2  u_texel;   // 1.0 / textureSize

/**
 * 3×3 isotropic discrete Laplacian (Peyret & Taylor weights):
 *   center: -1, axis neighbors: 0.2, diagonal neighbors: 0.05
 * Normalized so the sum of weights = 0 and the central weight equals -1.
 */
vec2 laplacian(sampler2D tex, vec2 uv, vec2 texel) {
  vec2 center = texture2D(tex, uv).rg;

  vec2 n  = texture2D(tex, uv + vec2( 0.0,  1.0) * texel).rg;
  vec2 s  = texture2D(tex, uv + vec2( 0.0, -1.0) * texel).rg;
  vec2 e  = texture2D(tex, uv + vec2( 1.0,  0.0) * texel).rg;
  vec2 w  = texture2D(tex, uv + vec2(-1.0,  0.0) * texel).rg;

  vec2 ne = texture2D(tex, uv + vec2( 1.0,  1.0) * texel).rg;
  vec2 nw = texture2D(tex, uv + vec2(-1.0,  1.0) * texel).rg;
  vec2 se = texture2D(tex, uv + vec2( 1.0, -1.0) * texel).rg;
  vec2 sw = texture2D(tex, uv + vec2(-1.0, -1.0) * texel).rg;

  return (
    0.2  * (n + s + e + w) +
    0.05 * (ne + nw + se + sw) -
    1.0  * center
  );
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  // Current concentrations
  vec2 conc = texture2D(textureField, uv).rg;
  float U = conc.r;
  float V = conc.g;

  // 3×3 Laplacian for each species
  vec2 lap = laplacian(textureField, uv, u_texel);
  float lapU = lap.r;
  float lapV = lap.g;

  // Gray-Scott reaction terms
  float reaction = U * V * V;

  // PDE update (explicit Euler substep)
  float dU = u_Du * lapU - reaction + u_F * (1.0 - U);
  float dV = u_Dv * lapV + reaction - (u_F + u_k) * V;

  float newU = clamp(U + u_dt * dU, 0.0, 1.0);
  float newV = clamp(V + u_dt * dV, 0.0, 1.0);

  gl_FragColor = vec4(newU, newV, 0.0, 1.0);
}
