/** Shared by capture and replay: Spanish, Russian, Portuguese, German, Turkish and French quiz URLs have a translated base. */
export const SEO_QUIZ_PATH = /^\/(?:(?:en|ka)\/football-quiz|es\/quiz-de-futbol|ru\/futbolnaya-viktorina|pt\/quiz-de-futebol|de\/fussball-quiz|tr\/futbol-bilgi-yarismasi|fr\/quiz-foot|el\/kouiz-podosfairou)(?:\/[^/?#]+)?\/?$/;
export const SEO_LANDING_PATH = /^\/(?:en|ka|es|tr|ru|pt|de|fr|el)\/?$/;

export function isSeoAnalyticsPath(pathname: string): boolean {
  return SEO_LANDING_PATH.test(pathname) || SEO_QUIZ_PATH.test(pathname);
}
