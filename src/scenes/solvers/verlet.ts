/**
 * Velocity-Verlet (Störmer-Verlet) symplectic integrator for second-order ODEs
 * of the form d²x/dt² = a(x).
 *
 * This is a 1-DOF variant. For N-body systems call it per-particle.
 * Symplectic property: conserves a modified Hamiltonian exactly → no secular
 * energy drift over arbitrarily long runs (unlike dissipative methods).
 *
 * Algorithm:
 *   x_{n+1} = x_n + v_n * dt + 0.5 * a(x_n) * dt²
 *   a_{n+1} = a(x_{n+1})
 *   v_{n+1} = v_n + 0.5 * (a(x_n) + a(x_{n+1})) * dt
 */
export function verletStep(
  x: number,
  v: number,
  accel: (position: number) => number,
  dt: number,
): { x: number; v: number } {
  const a0 = accel(x)
  const xNew = x + v * dt + 0.5 * a0 * dt * dt
  const a1 = accel(xNew)
  const vNew = v + 0.5 * (a0 + a1) * dt
  return { x: xNew, v: vNew }
}

/**
 * Vector velocity-Verlet for N-dimensional systems where acceleration is a
 * function of the full position vector.
 *
 * positions and velocities are mutated in-place.
 */
export function verletStepVec(
  positions: Float64Array,
  velocities: Float64Array,
  accel: (pos: Float64Array) => Float64Array,
  dt: number,
): void {
  const n = positions.length
  const a0 = accel(positions)

  const newPos = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    newPos[i] = positions[i] + velocities[i] * dt + 0.5 * a0[i] * dt * dt
  }

  const a1 = accel(newPos)

  for (let i = 0; i < n; i++) {
    positions[i] = newPos[i]
    velocities[i] = velocities[i] + 0.5 * (a0[i] + a1[i]) * dt
  }
}
