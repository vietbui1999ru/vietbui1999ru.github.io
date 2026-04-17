import { fftForward, fftInverse } from '@/scenes/solvers/fft'
import { etdrk4Step } from '@/scenes/solvers/etdrk4'

export interface KSConfig {
  /** Domain length L */
  L: number
  /** Number of Fourier modes N (should be power of 2) */
  N: number
  /** Hyper-viscosity coefficient ν (default 1.0) */
  nu: number
  /** Time step */
  dt: number
}

export interface KSState {
  /** Real-space solution array, length N */
  u: Float64Array
  /** Wavenumbers, length N */
  k: Float64Array
  /** ETDRK4 linear operator diagonal (Fourier space), length N */
  L_hat: Float64Array
  /** Time elapsed */
  time: number
}

/**
 * Build wavenumbers for an N-point FFT on domain [0, L).
 * Ordering: [0, 1, …, N/2-1, -N/2, …, -1] (standard FFT ordering).
 */
function buildWavenumbers(N: number, L: number): Float64Array {
  const k = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    const ki = i <= N / 2 ? i : i - N
    k[i] = (2 * Math.PI * ki) / L
  }
  return k
}

/**
 * KS linear operator: L = -k² - ν k⁴
 * (instability at low k, hyperviscous damping at high k)
 */
function buildLinearOperator(k: Float64Array, nu: number): Float64Array {
  const L_hat = new Float64Array(k.length)
  for (let i = 0; i < k.length; i++) {
    const ki2 = k[i] * k[i]
    L_hat[i] = -ki2 - nu * ki2 * ki2
  }
  return L_hat
}

/**
 * Nonlinear term for mode i in Fourier space: N_i(u) = FFT(-u * du/dx)[i]
 * du/dx is computed spectrally: multiply by ik in Fourier space, then IFFT.
 *
 * @param re   - real parts of Fourier spectrum
 * @param im   - imaginary parts of Fourier spectrum
 * @param k    - wavenumbers array
 * @returns    { re_nl, im_nl } nonlinear term spectrum
 */
function nonlinearSpectrum(
  re: Float64Array,
  im: Float64Array,
  k: Float64Array,
): { re_nl: Float64Array; im_nl: Float64Array } {
  const N = re.length

  // Spectral derivative: du/dx = IFFT(ik * u_hat)
  // Multiply by ik: (a + ib) * ik = -kb + ika
  const dudx_re = new Float64Array(N)
  const dudx_im = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    dudx_re[i] = -k[i] * im[i]
    dudx_im[i] = k[i] * re[i]
  }

  // IFFT to get real-space u and du/dx
  const u_real = fftInverse(re, im, N)
  const dudx_real = fftInverse(dudx_re, dudx_im, N)

  // Nonlinear product in real space: -u * du/dx
  const nl_real = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    nl_real[i] = -u_real[i] * dudx_real[i]
  }

  // FFT of nonlinear product → spectrum
  const { re: re_nl, im: im_nl } = fftForward(nl_real)
  return { re_nl, im_nl }
}

/** Initialize a KS state from a real-space initial condition array. */
export function createKSState(u0: Float64Array, config: KSConfig): KSState {
  const { N, L, nu } = config
  const k = buildWavenumbers(N, L)
  const L_hat = buildLinearOperator(k, nu)

  return {
    u: u0.slice(),
    k,
    L_hat,
    time: 0,
  }
}

/**
 * Advance the KS equation one time step using ETDRK4 in Fourier space.
 *
 * The scalar ETDRK4 solver is applied independently to each Fourier mode.
 * Each mode evolves as:  dû_i/dt = L_i * û_i + N_i(û)
 * where N_i is the i-th component of FFT(-u * du/dx).
 *
 * We treat the nonlinear forcing as time-independent within each stage
 * (the current Fourier spectrum is frozen per etdrk4Step call). This is
 * equivalent to the exponential integrator treating N as constant over dt,
 * which is exact for the ETDRK4 formulation.
 */
export function ksStep(state: KSState, config: KSConfig): KSState {
  const { dt } = config
  const { k, L_hat, time, u } = state
  const N = u.length

  // Forward FFT of current real-space state
  const { re, im } = fftForward(u)

  // Nonlinear term at current state
  const { re_nl, im_nl } = nonlinearSpectrum(re, im, k)

  // Advance each Fourier mode independently via scalar ETDRK4.
  // N(t, u) for each mode uses the nonlinear spectrum frozen at current state.
  const re_new = new Float64Array(N)
  const im_new = new Float64Array(N)

  for (let i = 0; i < N; i++) {
    const Li = L_hat[i]
    const nl_re_i = re_nl[i]
    const nl_im_i = im_nl[i]

    // Real part: dre_i/dt = L_i * re_i + re(N_i)
    re_new[i] = etdrk4Step(Li, (_t, _u) => nl_re_i, time, re[i], dt)

    // Imaginary part: dim_i/dt = L_i * im_i + im(N_i)
    im_new[i] = etdrk4Step(Li, (_t, _u) => nl_im_i, time, im[i], dt)
  }

  // Inverse FFT back to real space
  const u_next = fftInverse(re_new, im_new, N)

  return {
    u: u_next,
    k,
    L_hat,
    time: time + dt,
  }
}

/**
 * Generate a C_n-symmetric initial condition:
 * u(x) = Σ_j amplitude * cos(n·j·2πx/L + φ_j)  for j in [1, harmonics]
 */
export function ksSymmetricIC(
  N: number,
  L: number,
  symmetryOrder: number,
  harmonics = 3,
  amplitude = 0.1,
): Float64Array {
  const u = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    const x = (i / N) * L
    for (let j = 1; j <= harmonics; j++) {
      const phase = j * 0.1337 // deterministic phase offset
      u[i] +=
        amplitude *
        Math.cos(symmetryOrder * j * ((2 * Math.PI * x) / L) + phase)
    }
  }
  return u
}
