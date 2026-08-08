// Server-clock authority for the PRE-GAME weekend-league surfaces. The live
// game syncs over its socket (useWlLive serverNow); the lobby/entry/check-in
// countdowns previously ticked against the raw device clock, so a phone with
// a skewed clock showed the wrong time to kickoff. Every /current poll calls
// syncWlClock with the server's clock; wlNow() is the corrected "now".
let offsetMs = 0;

export function syncWlClock(serverNowMs: number): void {
  if (Number.isFinite(serverNowMs) && serverNowMs > 0) {
    offsetMs = serverNowMs - Date.now();
  }
}

export function wlNow(): number {
  return Date.now() + offsetMs;
}
