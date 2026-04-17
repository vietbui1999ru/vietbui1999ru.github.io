/**
 * Per-particle ring buffer of positions for trail rendering.
 * Maintains a flat Float32Array of xyz triples; `head` is the next
 * write index (mod capacity). Provides a helper to fill a
 * BufferAttribute positions array in draw order (oldest → newest).
 */
export interface TrailBuffer {
  /** Flat xyz positions, length = capacity * 3 */
  data: Float32Array
  /** How many slots the ring has */
  capacity: number
  /** Index of next write slot (not yet filled) */
  head: number
  /** Total pushes so far (capped at Number.MAX_SAFE_INTEGER) */
  count: number
}

export function createTrailBuffer(capacity: number): TrailBuffer {
  return {
    data: new Float32Array(capacity * 3),
    capacity,
    head: 0,
    count: 0,
  }
}

/** Push a new xyz position into the ring buffer. */
export function pushPosition(
  buf: TrailBuffer,
  x: number,
  y: number,
  z: number,
): void {
  const idx = buf.head * 3
  buf.data[idx] = x
  buf.data[idx + 1] = y
  buf.data[idx + 2] = z
  buf.head = (buf.head + 1) % buf.capacity
  if (buf.count < buf.capacity) buf.count++
}

/**
 * Write the ring buffer contents (oldest → newest) into `out`,
 * starting at `outOffset` (xyz index, not byte index).
 * Returns the number of valid positions written.
 */
export function readTrail(
  buf: TrailBuffer,
  out: Float32Array,
  outOffset = 0,
): number {
  const n = buf.count
  if (n === 0) return 0

  const cap = buf.capacity
  // Oldest slot: if buffer is not yet full, it's 0; otherwise it's `head`
  const oldest = buf.count < cap ? 0 : buf.head

  for (let i = 0; i < n; i++) {
    const src = ((oldest + i) % cap) * 3
    const dst = (outOffset + i) * 3
    out[dst] = buf.data[src]
    out[dst + 1] = buf.data[src + 1]
    out[dst + 2] = buf.data[src + 2]
  }
  return n
}
