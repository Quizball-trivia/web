/** Routes that render without authentication, player state or the full app provider tree. */
export function isLightweightSeoRoute(pathname: string): boolean {
  return /^\/(?:(?:en|ka)\/football-quiz|es\/quiz-de-futbol|ru\/futbolnaya-viktorina|pt\/quiz-de-futebol|de\/fussball-quiz|tr\/futbol-bilgi-yarismasi|fr\/quiz-foot)(?:\/[^/]+)?\/?$/.test(pathname)
    || /^\/(?:en|ka|es|tr|ru|pt|de|fr)\/download\/?$/.test(pathname);
}
