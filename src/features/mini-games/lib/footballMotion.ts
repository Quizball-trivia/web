/** Presentation time for the last shot before showing the settled result. */
export const ROAD_FINISH_MS = 2300;

/** Gravity after a scored ball reaches the net, followed by one small bounce.
 * Uses elapsed time, so dropped frames cannot push the ball through the turf. */
export function netBallHeight(impactHeight: number, elapsed: number): number {
  const radius = 0.13;
  const height = Math.max(radius, impactHeight);
  const fall = Math.max(0, elapsed - 0.18);
  const groundTime = Math.sqrt((height - radius) / 4.9);
  if (fall <= groundTime) return Math.max(radius, height - 4.9 * fall * fall);
  const bounce = (fall - groundTime) / 0.42;
  return radius + (bounce < 1 ? Math.sin(bounce * Math.PI) * Math.min(0.16, (height - radius) * 0.2) : 0);
}
