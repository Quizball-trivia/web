import * as THREE from 'three';

export const BALL_GRAVITY = 9.81;

/** Gravity-driven flight with a modest lateral curve. The endpoint and arrival
 * time are exact, so shot outcomes and the keeper's contact share one clock. */
export function shotFlight(out: THREE.Vector3, origin: THREE.Vector3, target: THREE.Vector3, elapsed: number, duration: number, curl = 0) {
  const t = THREE.MathUtils.clamp(elapsed, 0, duration), u = t / duration;
  const vy = (target.y - origin.y + .5 * BALL_GRAVITY * duration * duration) / duration;
  return out.set(
    THREE.MathUtils.lerp(origin.x, target.x, u) + curl * 4 * u * (1 - u),
    origin.y + vy * t - .5 * BALL_GRAVITY * t * t,
    THREE.MathUtils.lerp(origin.z, target.z, u),
  );
}

/** Analytic impacts with restitution. Sampling remains stable when frames are
 * skipped, and the ball cannot penetrate the ground or bounce indefinitely. */
export function bounceHeight(height: number, velocity: number, elapsed: number, radius = .13, restitution = .34): number {
  let y = Math.max(radius, height), v = velocity, t = Math.max(0, elapsed);
  for (let bounce = 0; bounce < 10; bounce++) {
    const impact = (v + Math.sqrt(v * v + 2 * BALL_GRAVITY * (y - radius))) / BALL_GRAVITY;
    if (t <= impact) return Math.max(radius, y + v * t - .5 * BALL_GRAVITY * t * t);
    t -= impact;
    v = -(v - BALL_GRAVITY * impact) * restitution;
    y = radius;
    if (v < .12) return radius;
  }
  return radius;
}

export function netRebound(out: THREE.Vector3, impact: THREE.Vector3, elapsed: number) {
  const t = Math.max(0, elapsed);
  return out.set(
    impact.x + Math.sign(impact.x) * .06 * (1 - Math.exp(-t * 5)),
    bounceHeight(impact.y, -.35, t),
    impact.z - .95 * (1 - Math.exp(-t * 12)) + .12 * (1 - Math.exp(-t * 3)),
  );
}
