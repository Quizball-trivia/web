/**
 * Navigation can stop already-loaded game audio without importing the audio
 * engine on a fresh public landing. Registration is synchronous, so leaving a
 * running game still stops its music before the redirect, without a load race.
 */
let stopCurrentBgm: ((fadeMs?: number) => void) | undefined;

export function registerBgmStop(stop: (fadeMs?: number) => void): void {
  stopCurrentBgm = stop;
}

export function stopLoadedBgm(fadeMs = 0): void {
  stopCurrentBgm?.(fadeMs);
}
