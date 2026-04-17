/**
 * Classical 4-stage explicit Runge-Kutta (RK4) for autonomous and
 * non-autonomous systems dx/dt = f(t, x) where x is a Float64Array.
 *
 * Returns a new Float64Array holding x(t + dt).
 * Does NOT mutate the input state array.
 */
export function rk4Step(
  f: (t: number, x: Float64Array) => Float64Array,
  t: number,
  x: Float64Array,
  dt: number,
): Float64Array {
  const n = x.length
  const half = dt * 0.5

  const k1 = f(t, x)

  const x2 = new Float64Array(n)
  for (let i = 0; i < n; i++) x2[i] = x[i] + half * k1[i]
  const k2 = f(t + half, x2)

  const x3 = new Float64Array(n)
  for (let i = 0; i < n; i++) x3[i] = x[i] + half * k2[i]
  const k3 = f(t + half, x3)

  const x4 = new Float64Array(n)
  for (let i = 0; i < n; i++) x4[i] = x[i] + dt * k3[i]
  const k4 = f(t + dt, x4)

  const next = new Float64Array(n)
  const sixth = dt / 6.0
  for (let i = 0; i < n; i++) {
    next[i] = x[i] + sixth * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
  }
  return next
}
