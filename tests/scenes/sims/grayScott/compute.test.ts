import { describe, it, expect, vi, beforeEach } from 'vitest'

// Gray-Scott compute requires WebGL2; mock the underlying GPU layer.
const rawStep = vi.fn()
const rawDispose = vi.fn()

vi.mock('@/scenes/solvers/gpuCompute', () => ({
  createComputeField: vi.fn(() => ({
    step: rawStep,
    dispose: rawDispose,
    texture: null,
  })),
}))

import { createGrayScottCompute } from '@/scenes/sims/grayScott/compute'
import { createComputeField } from '@/scenes/solvers/gpuCompute'

const SHADER_STUB = '/* stub */'

const BASE_CONFIG = {
  gridSize: 64,
  F: 0.03,
  k: 0.062,
  Du: 0.16,
  Dv: 0.08,
  dt: 1.0,
  substeps: 4,
}

beforeEach(() => {
  rawStep.mockClear()
  rawDispose.mockClear()
  ;(createComputeField as ReturnType<typeof vi.fn>).mockClear()
})

describe('createGrayScottCompute', () => {
  it('calls createComputeField with the correct grid dimensions', () => {
    createGrayScottCompute(BASE_CONFIG, SHADER_STUB)
    expect(createComputeField).toHaveBeenCalledWith(
      expect.objectContaining({ width: 64, height: 64 }),
    )
  })

  it('step() runs substeps dispatches on the underlying field', () => {
    const gs = createGrayScottCompute(BASE_CONFIG, SHADER_STUB)
    gs.step()
    expect(rawStep).toHaveBeenCalledTimes(4)
  })

  it('changing substeps affects compute call count', () => {
    const gs = createGrayScottCompute(BASE_CONFIG, SHADER_STUB)
    gs.substeps = 8
    rawStep.mockClear()
    gs.step()
    expect(rawStep).toHaveBeenCalledTimes(8)
  })

  it('substeps cannot be set below 1', () => {
    const gs = createGrayScottCompute(BASE_CONFIG, SHADER_STUB)
    gs.substeps = 0
    expect(gs.substeps).toBe(1)
  })

  it('dispose() releases the underlying field', () => {
    const gs = createGrayScottCompute(BASE_CONFIG, SHADER_STUB)
    gs.dispose()
    expect(rawDispose).toHaveBeenCalledTimes(1)
  })

  it('setUniform() updates a named uniform value', () => {
    const gs = createGrayScottCompute(BASE_CONFIG, SHADER_STUB)
    gs.field.setUniform('u_F', 0.05)
    // No direct assertion possible without reaching into createComputeField args;
    // verify by re-reading options passed to the mock factory.
    const call = (createComputeField as ReturnType<typeof vi.fn>).mock.calls.at(-1)
    const opts = call?.[0] as { uniforms: Record<string, { value: unknown }> }
    expect(opts.uniforms.u_F.value).toBe(0.05)
  })
})
