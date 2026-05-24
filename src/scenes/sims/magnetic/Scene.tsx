import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import * as THREE from "three";
import type { PerfTier, SymmetryConfig } from "@/scenes/engine/types";
import {
  velocityVerletStep,
  magneticField,
  lorentzForce,
  type MagneticParticle,
  type MagneticSource,
  type Vec3,
} from "./physics";

export interface MagneticConfig {
  particleCount: number;
  charge: number;
  mass: number;
  B0: number;
  dt: number;
  trailLength: number;
  symmetryType: "C" | "D" | "none";
  symmetryOrder: number;
}

export type MagneticSceneProps = {
  config: MagneticConfig;
  perf: PerfTier;
  symmetry: SymmetryConfig;
};

export const MAGNETIC_LEVA_SCHEMA = {
  particleCount: { value: 500, min: 10, max: 10000, step: 10 },
  charge: { value: 1, min: -5, max: 5, step: 0.1 },
  mass: { value: 1, min: 0.1, max: 10, step: 0.1 },
  B0: { value: 1, min: 0.01, max: 10, step: 0.01 },
  dt: { value: 0.005, min: 0.001, max: 0.05, step: 0.001 },
  trailLength: { value: 200, min: 10, max: 1000, step: 10 },
  symmetryOrder: { value: 4, min: 1, max: 12, step: 1 },
};

function dihedralRing(count: number, order: number, radius: number): Vec3[] {
  const positions: Vec3[] = [];
  const perSector = Math.max(1, Math.floor(count / order));
  for (let s = 0; s < order; s++) {
    const baseAngle = (s / order) * Math.PI * 2;
    for (let i = 0; i < perSector && positions.length < count; i++) {
      const jitter = (i / perSector) * ((Math.PI * 2) / order) * 0.8;
      const angle = baseAngle + jitter;
      positions.push({
        x: radius * Math.cos(angle) + (Math.random() - 0.5) * 0.05,
        y: radius * Math.sin(angle) + (Math.random() - 0.5) * 0.05,
        z: (Math.random() - 0.5) * 0.1,
      });
    }
  }
  while (positions.length < count) {
    const angle = Math.random() * Math.PI * 2;
    positions.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: 0 });
  }
  return positions;
}

/**
 * MagneticScene — accepts { config, perf, symmetry } per the SimModule contract.
 * Merges `config` into the Leva useControls initial values so the panel
 * reflects whatever preset or config was selected externally.
 */
export function MagneticScene({ config, perf: _perf, symmetry: _symmetry }: MagneticSceneProps) {
  const { particleCount, charge, mass, B0, dt, symmetryOrder } = useControls("Magnetic", {
    particleCount: { value: config.particleCount, min: 10, max: 10000, step: 10 },
    charge: { value: config.charge, min: -5, max: 5, step: 0.1 },
    mass: { value: config.mass, min: 0.1, max: 10, step: 0.1 },
    B0: { value: config.B0, min: 0.01, max: 10, step: 0.01 },
    dt: { value: config.dt, min: 0.001, max: 0.05, step: 0.001 },
    trailLength: { value: config.trailLength, min: 10, max: 1000, step: 10 },
    symmetryOrder: { value: config.symmetryOrder, min: 1, max: 12, step: 1 },
  });

  // positionsRef holds the flat Float32Array bound to the bufferAttribute.
  // Allocated full-size up front so the bufferAttribute binding stays valid
  // when particleCount changes (stale zero-length array would cause silent bugs).
  const positionsRef = useRef<Float32Array>(new Float32Array(particleCount * 3));
  const particles = useRef<MagneticParticle[]>([]);

  const sources: MagneticSource[] = useMemo(() => {
    const base: MagneticSource[] = [];
    for (let s = 0; s < symmetryOrder; s++) {
      const angle = (s / symmetryOrder) * Math.PI * 2;
      base.push({
        position: { x: 2 * Math.cos(angle), y: 2 * Math.sin(angle), z: 0 },
        moment: { x: 0, y: 0, z: B0 },
      });
    }
    return base;
  }, [symmetryOrder, B0]);

  useMemo(() => {
    // Re-allocate full-size buffer so the ref always holds a correctly-sized array
    positionsRef.current = new Float32Array(particleCount * 3);
    const initPositions = dihedralRing(particleCount, symmetryOrder, 1.0);
    particles.current = initPositions.map((pos) => {
      const B = magneticField(pos, sources);
      const v0 = { x: -pos.y * 0.5, y: pos.x * 0.5, z: 0 };
      const F = lorentzForce(v0, B, charge);
      return {
        position: pos,
        velocity: v0,
        accel: { x: F.x / mass, y: F.y / mass, z: F.z / mass },
      };
    });
  }, [particleCount, symmetryOrder, B0, charge, mass, sources]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame(() => {
    velocityVerletStep(particles.current, sources, { dt, charge, mass });
    const buf = positionsRef.current;
    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i];
      buf[i * 3] = p.position.x;
      buf[i * 3 + 1] = p.position.y;
      buf[i * 3 + 2] = p.position.z;
    }
    if (pointsRef.current) {
      const attr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      attr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positionsRef.current, 3]}
          count={particleCount}
        />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#00aaff" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

export default MagneticScene;
