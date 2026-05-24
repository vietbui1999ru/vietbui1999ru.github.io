export interface LorenzState {
  x: number;
  y: number;
  z: number;
}

export interface LorenzParams {
  sigma: number;
  rho: number;
  beta: number;
  dt: number;
}

function lorenzDerivative(
  s: LorenzState,
  { sigma, rho, beta }: Omit<LorenzParams, "dt">,
): LorenzState {
  return {
    x: sigma * (s.y - s.x),
    y: s.x * (rho - s.z) - s.y,
    z: s.x * s.y - beta * s.z,
  };
}

/** RK4 integration of Lorenz ODEs. Returns next state. */
export function lorenzStep(state: LorenzState, params: LorenzParams): LorenzState {
  const { dt, sigma, rho, beta } = params;
  const p = { sigma, rho, beta };

  const k1 = lorenzDerivative(state, p);

  const s2: LorenzState = {
    x: state.x + 0.5 * dt * k1.x,
    y: state.y + 0.5 * dt * k1.y,
    z: state.z + 0.5 * dt * k1.z,
  };
  const k2 = lorenzDerivative(s2, p);

  const s3: LorenzState = {
    x: state.x + 0.5 * dt * k2.x,
    y: state.y + 0.5 * dt * k2.y,
    z: state.z + 0.5 * dt * k2.z,
  };
  const k3 = lorenzDerivative(s3, p);

  const s4: LorenzState = {
    x: state.x + dt * k3.x,
    y: state.y + dt * k3.y,
    z: state.z + dt * k3.z,
  };
  const k4 = lorenzDerivative(s4, p);

  return {
    x: state.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: state.y + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    z: state.z + (dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
  };
}
