/** Shared by capture and replay: Spanish and Russian quiz URLs have a translated base. */
export const SEO_QUIZ_PATH = /^\/(?:(?:en|ka)\/football-quiz|es\/quiz-de-futbol|ru\/futbolnaya-viktorina)(?:\/[^/?#]+)?\/?$/;
export const SEO_LANDING_PATH = /^\/(?:en|ka|es|tr|ru)\/?$/;

export function isSeoAnalyticsPath(pathname: string): boolean {
  return SEO_LANDING_PATH.test(pathname) || SEO_QUIZ_PATH.test(pathname);
}
