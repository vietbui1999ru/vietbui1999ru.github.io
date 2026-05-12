export interface Vec3 { x: number; y: number; z: number }

export interface MagneticSource {
  position: Vec3
  /** Magnetic moment vector (direction + magnitude) */
  moment: Vec3
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function len(v: Vec3): number {
  return Math.sqrt(dot(v, v))
}

/**
 * Dipole magnetic field: B = (mu0/4π) * [3(m·r̂)r̂ - m] / r³
 * We absorb (mu0/4π) into the source moment magnitude for simplicity (SI-like).
 */
export function dipoleField(position: Vec3, source: MagneticSource): Vec3 {
  const r = sub(position, source.position)
  const rLen = len(r)
  if (rLen < 1e-10) return { x: 0, y: 0, z: 0 }
  const rLen3 = rLen * rLen * rLen
  const rHat = scale(r, 1 / rLen)
  const mDotRHat = dot(source.moment, rHat)
  const term1 = scale(rHat, 3 * mDotRHat)
  const term2 = source.moment
  return scale(sub(term1, term2), 1 / rLen3)
}

/** Sum dipole B contributions from all sources at a given position. */
export function magneticField(position: Vec3, sources: MagneticSource[]): Vec3 {
  return sources.reduce<Vec3>(
    (acc, src) => add(acc, dipoleField(position, src)),
    { x: 0, y: 0, z: 0 },
  )
}

/** Lorentz force F = q * v × B */
export function lorentzForce(v: Vec3, B: Vec3, charge: number): Vec3 {
  return scale(cross(v, B), charge)
}

export interface MagneticParticle {
  position: Vec3
  velocity: Vec3
  /** Previous-step acceleration for Verlet bookkeeping */
  accel: Vec3
}

export interface VerletParams {
  dt: number
  charge: number
  mass: number
}

/**
 * Velocity-Verlet integration step (symplectic, energy-conserving for
 * conservative forces). Returns mutated particles array.
 */
export function velocityVerletStep(
  particles: MagneticParticle[],
  sources: MagneticSource[],
  { dt, charge, mass }: VerletParams,
): MagneticParticle[] {
  for (const p of particles) {
    // x(t+dt) = x(t) + v(t)*dt + 0.5*a(t)*dt²
    p.position = {
      x: p.position.x + p.velocity.x * dt + 0.5 * p.accel.x * dt * dt,
      y: p.position.y + p.velocity.y * dt + 0.5 * p.accel.y * dt * dt,
      z: p.position.z + p.velocity.z * dt + 0.5 * p.accel.z * dt * dt,
    }

    const B = magneticField(p.position, sources)
    const F = lorentzForce(p.velocity, B, charge)
    const newAccel = scale(F, 1 / mass)

    // v(t+dt) = v(t) + 0.5*(a(t)+a(t+dt))*dt
    p.velocity = {
      x: p.velocity.x + 0.5 * (p.accel.x + newAccel.x) * dt,
      y: p.velocity.y + 0.5 * (p.accel.y + newAccel.y) * dt,
      z: p.velocity.z + 0.5 * (p.accel.z + newAccel.z) * dt,
    }
    p.accel = newAccel
  }
  return particles
}
