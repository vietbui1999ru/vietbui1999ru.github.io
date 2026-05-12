/**
 * Real-valued 1D FFT wrapper around the `fft.js` package.
 *
 * `fft.js` expects interleaved [re0, im0, re1, im1, ...] format.
 * This module provides a friendlier API with separate re/im arrays.
 *
 * For the Kuramoto-Sivashinsky solver we need:
 *   - fftForward(realSignal) → { re, im }  (complex spectrum)
 *   - fftInverse(re, im, N) → realSignal   (recovers real part)
 */

// fft.js ships as CommonJS; Vite interop gives us the constructor as default.
import FFTImport from 'fft.js'

type FFTInstance = {
  size: number
  createComplexArray(): Float64Array
  toComplexArray(input: ArrayLike<number>, output?: Float64Array): Float64Array
  fromComplexArray(input: Float64Array, output?: Float64Array): Float64Array
  transform(out: Float64Array, inp: Float64Array): void
  inverseTransform(out: Float64Array, inp: Float64Array): void
  realTransform(out: Float64Array, inp: Float64Array): void
  completeSpectrum(spectrum: Float64Array): void
}

const FFT = FFTImport as unknown as new (size: number) => FFTInstance

/** Cache FFT instances by size to avoid repeated allocation */
const fftCache = new Map<number, FFTInstance>()

function getFFT(n: number): FFTInstance {
  if (!fftCache.has(n)) {
    fftCache.set(n, new FFT(n))
  }
  return fftCache.get(n)!
}

/**
 * Forward real-to-complex FFT.
 * Input:  real-valued signal of length N (must be power of 2).
 * Output: { re, im } each of length N (full spectrum, Hermitian-symmetric).
 */
export function fftForward(signal: Float64Array): { re: Float64Array; im: Float64Array } {
  const N = signal.length
  const fft = getFFT(N)

  const complexInput = fft.createComplexArray()
  for (let i = 0; i < N; i++) {
    complexInput[2 * i] = signal[i]
    complexInput[2 * i + 1] = 0
  }

  const complexOutput = fft.createComplexArray()
  fft.transform(complexOutput, complexInput)

  const re = new Float64Array(N)
  const im = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    re[i] = complexOutput[2 * i]
    im[i] = complexOutput[2 * i + 1]
  }
  return { re, im }
}

/**
 * Inverse complex-to-real FFT.
 * Inputs: re, im each of length N.
 * Output: real-valued signal of length N (imaginary parts discarded after IFFT).
 *
 * fft.js `inverseTransform` already normalises by 1/N, so we do NOT divide
 * again here (plan's original /N was a double-normalise bug).
 */
export function fftInverse(re: Float64Array, im: Float64Array, N: number): Float64Array {
  const fft = getFFT(N)

  const complexInput = fft.createComplexArray()
  for (let i = 0; i < N; i++) {
    complexInput[2 * i] = re[i]
    complexInput[2 * i + 1] = im[i]
  }

  const complexOutput = fft.createComplexArray()
  fft.inverseTransform(complexOutput, complexInput)

  const result = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    result[i] = complexOutput[2 * i]
  }
  return result
}
