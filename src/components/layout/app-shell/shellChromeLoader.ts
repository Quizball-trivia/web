/** Retryable, immutable module cache only: never retain user/locale/intent state. */
export function retryableModule<T>(importModule: () => Promise<T>) {
  let value: T | undefined;
  let pending: Promise<T> | undefined;
  return {
    peek: () => value,
    load: (): Promise<T> => {
      if (value) return Promise.resolve(value);
      if (pending) return pending;
      const request = importModule().then(module => { value = module; return module; }).finally(() => {
        if (pending === request) pending = undefined;
      });
      pending = request;
      return request;
    },
  };
}

// Five literal boundaries: opening Facebook must not fetch contact/auth/profile UI.
export const languageChrome = retryableModule(() => Promise.all([
  import("../../i18n/LanguageSwitcher"), import("../../i18n/PublicLanguageLink"),
]).then(([menu, link]) => ({ ...menu, ...link })));
export const socialChrome = retryableModule(() => import("../../shared/SocialLinks"));
export const contactChrome = retryableModule(() => import("../../shared/ContactModal"));
export const profileChrome = retryableModule(() => import("./AppShellProfileMenu"));
export const logoutChrome = retryableModule(() => import("./AppShellLogoutDialog"));
