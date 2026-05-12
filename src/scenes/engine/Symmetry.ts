/**
 * Symmetry IC generators for constrained initial conditions.
 *
 * Supports:
 *   - C_n  cyclic group of order n  (n-fold rotational symmetry)
 *   - D_n  dihedral group of order n (n-fold rotation + n reflections)
 *
 * Used by each sim's `init()` to place particles / seed textures with the
 * symmetry requested by the user via the Symmetry leva controls.
 */

// ---------------------------------------------------------------------------
// Point-set generators (for particle-based sims: Magnetic, Lorenz)
// ---------------------------------------------------------------------------

/**
 * Returns N points evenly spaced on a circle of the given radius.
 * Points start at angle 0 (positive x-axis) and progress counter-clockwise.
 */
export function cyclicRing(n: number, radius: number): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  return points;
}

/**
 * Returns 2N points on a circle of the given radius.
 * The first N points are the C_n ring. The second N points are their
 * reflections across the x-axis (y → -y), giving the D_n dihedral arrangement.
 */
export function dihedralRing(n: number, radius: number): Array<[number, number]> {
  const base = cyclicRing(n, radius);
  const reflected: Array<[number, number]> = base.map(([x, y]) => [x, -y]);
  return [...base, ...reflected];
}

// ---------------------------------------------------------------------------
// 2D texture mask generators (for PDE sims: Gray-Scott, KS)
// ---------------------------------------------------------------------------

/**
 * Generates a 2D Float32Array of dimensions size×size where each pixel value
 * is the average of base(x, y) evaluated at all N rotations of the pixel's
 * normalized coordinates. This guarantees exact C_n symmetry.
 *
 * Coordinates are mapped to the range [-1, 1] from pixel indices.
 *
 * @param size  - grid size (pixels per side)
 * @param n     - fold order of C_n symmetry
 * @param base  - scalar function of (x, y) in [-1, 1]²
 * @returns     - row-major Float32Array of length size*size
 */
export function cnMask(
  size: number,
  n: number,
  base: (x: number, y: number) => number,
): Float32Array {
  const mask = new Float32Array(size * size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      // Map pixel to [-1, 1]
      const x = (i / (size - 1)) * 2 - 1;
      const y = (j / (size - 1)) * 2 - 1;

      // Average over all C_n rotations
      let sum = 0;
      for (let k = 0; k < n; k++) {
        const angle = (2 * Math.PI * k) / n;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rx = cos * x - sin * y;
        const ry = sin * x + cos * y;
        sum += base(rx, ry);
      }
      mask[j * size + i] = sum / n;
    }
  }
  return mask;
}

/**
 * Generates a 2D Float32Array with D_n dihedral symmetry (C_n + reflection).
 *
 * Achieved by first reflecting the coordinates across the x-axis and then
 * averaging the C_n symmetrized values of the original and reflected
 * coordinates. This guarantees the mask is symmetric under both rotation by
 * 2π/n and reflection across the x-axis.
 *
 * @param size  - grid size (pixels per side)
 * @param n     - fold order of D_n symmetry
 * @param base  - scalar function of (x, y) in [-1, 1]²
 * @returns     - row-major Float32Array of length size*size
 */
export function dnMask(
  size: number,
  n: number,
  base: (x: number, y: number) => number,
): Float32Array {
  const mask = new Float32Array(size * size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i / (size - 1)) * 2 - 1;
      const y = (j / (size - 1)) * 2 - 1;

      // D_n = C_n + reflection: average over all 2n group elements
      let sum = 0;
      for (let k = 0; k < n; k++) {
        const angle = (2 * Math.PI * k) / n;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Rotation
        const rx = cos * x - sin * y;
        const ry = sin * x + cos * y;
        sum += base(rx, ry);

        // Rotation of reflection (reflect y first, then rotate)
        const rrx = cos * x + sin * y;
        const rry = sin * x - cos * y;
        sum += base(rrx, rry);
      }
      mask[j * size + i] = sum / (2 * n);
    }
  }
  return mask;
}
