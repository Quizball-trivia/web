/** Routes that render without authentication, player state or the full app provider tree. */
export function isLightweightSeoRoute(pathname: string): boolean {
  return /^\/(?:(?:en|ka)\/football-quiz|es\/quiz-de-futbol)(?:\/[^/]+)?\/?$/.test(pathname)
    || /^\/(?:en|ka|es|tr)\/download\/?$/.test(pathname);
}
