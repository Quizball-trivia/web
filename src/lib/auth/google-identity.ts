/**
 * Google Identity Services (GIS) integration.
 *
 * GIS is Google's modern Sign-in library. It uses `accounts.google.com/gsi/...`
 * endpoints (popup + JWT credential) instead of the classic
 * `accounts.google.com/o/oauth2/v2/auth` redirect, which is blocked by
 * `disallowed_useragent` (Error 403) inside embedded webviews like Facebook
 * Messenger and Instagram. By using GIS we can sign users in without leaving
 * the in-app browser.
 *
 * Flow:
 *   1. Load https://accounts.google.com/gsi/client (Next <Script>)
 *   2. Generate a cryptographic nonce, store its hash in window.google config
 *   3. Call `google.accounts.id.initialize({ client_id, callback, nonce: hash })`
 *   4. Call `google.accounts.id.prompt()` to show the One Tap / popup
 *   5. Callback fires with `{ credential: idToken }`
 *   6. POST { provider: 'google', id_token, nonce } to /auth/v1/social-login-token
 *   7. Server verifies the JWT with Google and creates a Supabase session.
 *
 * If GIS fails to load (CDN blocked) or fails to render (some webview
 * versions detect the UA and bail), callers should fall back to the classic
 * redirect-based `socialLogin('google', ...)` and finally to the in-app
 * browser overlay.
 */

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
  clientId?: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce?: string;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
    ux_mode?: 'popup' | 'redirect';
  }): void;
  prompt(listener?: (notification: PromptMomentNotification) => void): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  disableAutoSelect(): void;
  cancel(): void;
}

interface PromptMomentNotification {
  isDisplayMoment(): boolean;
  isDisplayed(): boolean;
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
  isDismissedMoment(): boolean;
  getNotDisplayedReason(): string | undefined;
  getSkippedReason(): string | undefined;
  getDismissedReason(): string | undefined;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

/**
 * Wait for the GIS library to be available on window.google.accounts.id.
 * Resolves to true once available, or false after timeout / unavailable.
 */
export function waitForGoogleIdentity(timeoutMs = 4000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.id) return Promise.resolve(true);
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (window.google?.accounts?.id) {
        resolve(true);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(tick, 100);
    };
    tick();
  });
}

/**
 * Generate a cryptographic random nonce and its SHA-256 hash.
 * The hash is sent to Google (in the `nonce` field of the id_token request)
 * and the raw nonce is sent to Supabase so it can verify the binding.
 */
export async function generateNoncePair(): Promise<{ raw: string; hash: string }> {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const raw = Array.from(random, (b) => b.toString(16).padStart(2, '0')).join('');
  const hashBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hash = Array.from(new Uint8Array(hashBytes), (b) => b.toString(16).padStart(2, '0')).join('');
  return { raw, hash };
}

/**
 * Trigger the GIS One Tap / popup and resolve with the id_token credential
 * + the raw nonce that should be sent to the server for verification.
 *
 * Rejects if GIS isn't available, the user dismissed the prompt, or the
 * library refused to render (e.g. unsupported webview).
 */
export async function signInWithGoogleIdentity(clientId: string): Promise<{
  idToken: string;
  nonce: string;
}> {
  const available = await waitForGoogleIdentity();
  if (!available || !window.google) {
    throw new Error('GIS_UNAVAILABLE');
  }

  const { raw, hash } = await generateNoncePair();

  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error('GIS_UNAVAILABLE'));
      return;
    }
    window.google.accounts.id.initialize({
      client_id: clientId,
      nonce: hash,
      auto_select: false,
      cancel_on_tap_outside: false,
      ux_mode: 'popup',
      callback: (response) => {
        if (response?.credential) {
          resolve({ idToken: response.credential, nonce: raw });
        } else {
          reject(new Error('GIS_NO_CREDENTIAL'));
        }
      },
    });

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        reject(new Error(`GIS_NOT_DISPLAYED: ${notification.getNotDisplayedReason() ?? 'unknown'}`));
        return;
      }
      if (notification.isSkippedMoment()) {
        reject(new Error(`GIS_SKIPPED: ${notification.getSkippedReason() ?? 'unknown'}`));
        return;
      }
      if (notification.isDismissedMoment()) {
        const reason = notification.getDismissedReason();
        if (reason && reason !== 'credential_returned') {
          reject(new Error(`GIS_DISMISSED: ${reason}`));
        }
      }
    });
  });
}
