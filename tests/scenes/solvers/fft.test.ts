import { describe, it, expect } from "vitest";
import { fftForward, fftInverse } from "@/scenes/solvers/fft";

describe("fft round-trip", () => {
  it("forward then inverse recovers the original 256-point signal to 1e-10", () => {
    const N = 256;
    const signal = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      signal[i] = Math.sin((2 * Math.PI * 3 * i) / N) + 0.5 * Math.cos((2 * Math.PI * 7 * i) / N);
    }

    const { re, im } = fftForward(signal);
    const recovered = fftInverse(re, im, N);

    for (let i = 0; i < N; i++) {
      expect(Math.abs(recovered[i] - signal[i])).toBeLessThan(1e-10);
    }
  });

  it("forward + inverse round-trips a pure DC signal", () => {
    const N = 64;
    const signal = new Float64Array(N).fill(3.14);
    const { re, im } = fftForward(signal);
    const recovered = fftInverse(re, im, N);
    for (let i = 0; i < N; i++) {
      expect(Math.abs(recovered[i] - 3.14)).toBeLessThan(1e-10);
    }
  });

  it("returns re and im arrays of length N", () => {
    const N = 128;
    const signal = new Float64Array(N);
    const { re, im } = fftForward(signal);
    expect(re.length).toBe(N);
    expect(im.length).toBe(N);
  });
});
