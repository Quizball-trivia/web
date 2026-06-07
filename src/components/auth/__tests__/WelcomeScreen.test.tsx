import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api';

// JSDOM doesn't ship with IntersectionObserver, which motion/react uses for
// `whileInView`. Stub it before any component imports.
class IntersectionObserverStub {
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IntersectionObserver = IntersectionObserverStub;

// ---------------------------------------------------------------------------
// Mock layer. WelcomeScreen pulls from every corner of the app; isolating it
// means stubbing the auth service, locale/copy, queries, heavy children, and
// the in-app-browser detection.
// ---------------------------------------------------------------------------

const inAppBrowserMock = vi.hoisted(() => ({
  app: null as 'facebook' | 'instagram' | 'messenger' | null,
  platform: 'other' as 'ios' | 'android' | 'other',
}));

const postAuthRedirectMock = vi.hoisted(() => ({
  redirect: null as string | null,
}));

// next/script — render nothing.
vi.mock('next/script', () => ({
  default: () => null,
}));
vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt?: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ''} src={src} />
  ),
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));


// Locale — echo the key with optional params suffix so tests can assert on the
// translation key without depending on the i18n JSON.
vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
    locale: 'en',
  }),
}));

// Auth store — bootstrap is the only field the screen reads.
const bootstrapMock = vi.fn(async () => undefined);
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector?: (state: { bootstrap: typeof bootstrapMock }) => unknown) =>
    selector ? selector({ bootstrap: bootstrapMock }) : { bootstrap: bootstrapMock },
}));

// Auth service — these are the six calls the screen issues.
const loginMock = vi.fn(async (_email: string, _password: string) => ({ id: 'u1' }));
type RegisterMockResult = {
  user: { id: string } | null;
  tokensSet: boolean;
  alreadyRegistered: boolean;
  pendingDeletion: boolean;
};
const registerMock = vi.fn(
  async (_payload: { email: string; password: string }): Promise<RegisterMockResult> => ({
    user: { id: 'u1' },
    tokensSet: true,
    alreadyRegistered: false,
    pendingDeletion: false,
  }),
);
const restorePendingDeletionWithLoginMock = vi.fn(async (_email: string, _password: string) => ({ id: 'u1' }));
const socialLoginMock = vi.fn(async (_provider: string, _redirect: string) => undefined);
const socialLoginWithIdTokenMock = vi.fn(
  async (_provider: string, _idToken: string, _nonce?: string, _options?: { restorePendingDeletion?: boolean }) => undefined,
);
const startGeorgianPhoneOtpMock = vi.fn(async (_phone: string) => undefined);
const verifyGeorgianPhoneOtpMock = vi.fn(
  async (_phone: string, _code: string, _options?: { restorePendingDeletion?: boolean }) => ({ id: 'u1' }),
);
const forgotPasswordMock = vi.fn(async (_email: string, _redirectTo: string) => undefined);
vi.mock('@/lib/auth/auth.service', () => ({
  login: (email: string, password: string) => loginMock(email, password),
  register: (payload: { email: string; password: string }) => registerMock(payload),
  restorePendingDeletionWithLogin: (email: string, password: string) =>
    restorePendingDeletionWithLoginMock(email, password),
  isPendingDeletionAuthError: (error: unknown) =>
    error instanceof ApiError &&
    Boolean(
      error.data &&
        typeof error.data === 'object' &&
        'details' in error.data &&
        (error.data as { details?: { reason?: string } }).details?.reason === 'pending_deletion',
    ),
  forgotPassword: (email: string, redirectTo: string) => forgotPasswordMock(email, redirectTo),
  socialLogin: (provider: string, redirect: string) => socialLoginMock(provider, redirect),
  socialLoginWithIdToken: (provider: string, idToken: string, nonce: string, options?: { restorePendingDeletion?: boolean }) =>
    socialLoginWithIdTokenMock(provider, idToken, nonce, options),
  startGeorgianPhoneOtp: (phone: string) => startGeorgianPhoneOtpMock(phone),
  verifyGeorgianPhoneOtp: (phone: string, code: string, options?: { restorePendingDeletion?: boolean }) =>
    verifyGeorgianPhoneOtpMock(phone, code, options),
}));

const georgianPhoneAvailabilityMock = vi.fn(() => ({
  country: 'GE',
  isAvailable: true,
  isLoading: false,
}));
vi.mock('@/lib/auth/useGeorgianPhoneAuthAvailability', () => ({
  useGeorgianPhoneAuthAvailability: () => georgianPhoneAvailabilityMock(),
}));

vi.mock('@/lib/auth/in-app-browser', () => ({
  getInAppBrowserApp: () => inAppBrowserMock.app,
  getPlatform: () => inAppBrowserMock.platform,
  isPopupBlockedInAppBrowser: (app = inAppBrowserMock.app) =>
    app === 'facebook' || app === 'messenger',
}));

vi.mock('@/lib/auth/postAuthRedirect', () => ({
  peekPostAuthRedirect: () => postAuthRedirectMock.redirect,
}));

// Google Identity. The overlaid GIS button (renderGoogleButton) is the primary
// path; clicking the visible yellow button triggers the fallback
// (signInWithGoogleIdentity One Tap → redirect). We capture renderGoogleButton's
// onCredential callback so a test can drive the primary path directly.
const signInWithGoogleIdentityMock = vi.fn(async (_clientId: string) => ({ idToken: 'tok', nonce: 'nonce' }));
let lastGoogleButtonCredentialCb: ((c: { idToken: string; nonce: string }) => void) | null = null;
const renderGoogleButtonMock = vi.fn(
  async (
    _clientId: string,
    _container: HTMLElement,
    _width: number,
    onCredential: (c: { idToken: string; nonce: string }) => void,
  ) => {
    lastGoogleButtonCredentialCb = onCredential;
    return true;
  },
);
vi.mock('@/lib/auth/google-identity', () => ({
  signInWithGoogleIdentity: (clientId: string) => signInWithGoogleIdentityMock(clientId),
  renderGoogleButton: (
    clientId: string,
    container: HTMLElement,
    width: number,
    onCredential: (c: { idToken: string; nonce: string }) => void,
  ) => renderGoogleButtonMock(clientId, container, width, onCredential),
}));

// Analytics — we assert event names + payloads.
const trackLoginCompletedMock = vi.fn();
const trackSignupCompletedMock = vi.fn();
const trackSignupStartedMock = vi.fn();
vi.mock('@/lib/analytics/game-events', () => ({
  trackLoginCompleted: (method: string) => trackLoginCompletedMock(method),
  trackSignupCompleted: (method: string) => trackSignupCompletedMock(method),
  trackSignupStarted: (method: string) => trackSignupStartedMock(method),
}));

// React Query hooks. Categories returns an empty list so the categories
// section short-circuits — the test focus is the auth dialog + chrome.
vi.mock('@/lib/queries/categories.queries', () => ({
  useAllCategoriesList: () => ({ data: { items: [] } }),
}));
vi.mock('@/lib/queries/leaderboard.queries', () => ({
  useLeaderboard: () => ({ data: null }),
}));

// Heavy children — render markers only.
vi.mock('@/components/AppLogo', () => ({
  AppLogo: () => <div data-testid="app-logo" />,
}));
vi.mock('@/components/AvatarDisplay', () => ({
  AvatarDisplay: () => <div data-testid="avatar" />,
}));
vi.mock('@/components/i18n/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));
vi.mock('@/features/leaderboard/components/LeaderboardPodium', () => ({
  LeaderboardPodium: () => <div data-testid="leaderboard-podium" />,
}));
vi.mock('@/features/leaderboard/components/LeaderboardTable', () => ({
  LeaderboardTable: () => <div data-testid="leaderboard-table" />,
}));
vi.mock('@/features/possession/components/PitchVisualization', () => ({
  PitchVisualization: () => <div data-testid="pitch-visualization" />,
}));
vi.mock('@/features/possession/components/BarBattleFlightOverlay', () => ({
  BarBattleFlightOverlay: () => <div data-testid="bar-battle-flight-overlay" />,
  FLIGHT_TOTAL_MS: 500,
}));

// shadcn primitives — render as transparent wrappers; Dialog respects `open`
// so we can assert open/close.
vi.mock('@/components/ui/dialog', () => {
  const Frag = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      open ? <div role="dialog">{children}</div> : null,
    DialogContent: Frag,
    DialogDescription: Frag,
    DialogHeader: Frag,
    DialogTitle: Frag,
  };
});
vi.mock('@/components/shared/ModalCloseButton', () => ({
  ModalCloseButton: ({ onClose }: { onClose: () => void }) => (
    <button type="button" data-testid="modal-close" onClick={onClose} />
  ),
}));

// Lucide / react-icons — render-only.
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
  return actual;
});

// ---------------------------------------------------------------------------
// Env: Google client id (must be set BEFORE the component imports).
// ---------------------------------------------------------------------------
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-google-client';

import { WelcomeScreen } from '../WelcomeScreen';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function openLoginDialog() {
  // The Kick Off button in the hero opens the login dialog.
  const kickoff = screen.getAllByText(/welcome\.kickOff/)[0];
  fireEvent.click(kickoff);
}

function openAuthOptions() {
  fireEvent.click(screen.getByText(/welcome\.moreSignInOptions/));
}

function clickContinueWithGoogle() {
  const btn = screen.getByText(/welcome\.continueWithGoogle/);
  fireEvent.click(btn);
}

function setEmailFields(email: string, password: string, confirm?: string) {
  const emailInput = screen.getByPlaceholderText(/welcome\.emailPlaceholder/);
  fireEvent.change(emailInput, { target: { value: email } });
  const passwordInput = screen.getByPlaceholderText(/welcome\.passwordPlaceholder/);
  fireEvent.change(passwordInput, { target: { value: password } });
  if (confirm !== undefined) {
    const confirmInput = screen.getByPlaceholderText(/welcome\.confirmPasswordPlaceholder/);
    fireEvent.change(confirmInput, { target: { value: confirm } });
  }
}

beforeEach(() => {
  bootstrapMock.mockClear();
  loginMock.mockReset();
  loginMock.mockResolvedValue({ id: 'u1' });
  registerMock.mockReset();
  registerMock.mockResolvedValue({ user: { id: 'u1' }, tokensSet: true, alreadyRegistered: false, pendingDeletion: false });
  restorePendingDeletionWithLoginMock.mockReset();
  restorePendingDeletionWithLoginMock.mockResolvedValue({ id: 'u1' });
  socialLoginMock.mockReset();
  socialLoginMock.mockResolvedValue(undefined);
  socialLoginWithIdTokenMock.mockReset();
  socialLoginWithIdTokenMock.mockResolvedValue(undefined);
  startGeorgianPhoneOtpMock.mockReset();
  startGeorgianPhoneOtpMock.mockResolvedValue(undefined);
  verifyGeorgianPhoneOtpMock.mockReset();
  verifyGeorgianPhoneOtpMock.mockResolvedValue({ id: 'u1' });
  georgianPhoneAvailabilityMock.mockReset();
  georgianPhoneAvailabilityMock.mockReturnValue({
    country: 'GE',
    isAvailable: true,
    isLoading: false,
  });
  forgotPasswordMock.mockReset();
  forgotPasswordMock.mockResolvedValue(undefined);
  signInWithGoogleIdentityMock.mockReset();
  signInWithGoogleIdentityMock.mockResolvedValue({ idToken: 'tok', nonce: 'nonce' });
  renderGoogleButtonMock.mockClear();
  lastGoogleButtonCredentialCb = null;
  inAppBrowserMock.app = null;
  inAppBrowserMock.platform = 'other';
  postAuthRedirectMock.redirect = null;
  trackLoginCompletedMock.mockClear();
  trackSignupCompletedMock.mockClear();
  trackSignupStartedMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WelcomeScreen — landing chrome', () => {
  it('renders the hero with kickoff CTA and the brand logo', () => {
    render(<WelcomeScreen />);
    expect(screen.getByTestId('app-logo')).toBeInTheDocument();
    expect(screen.getAllByText(/welcome\.kickOff/).length).toBeGreaterThan(0);
  });

  it('renders the World Cup countdown copy', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText(/welcome\.untilKickoff/)).toBeInTheDocument();
  });

  it('renders the leaderboard podium and table sections', () => {
    render(<WelcomeScreen />);
    expect(screen.getByTestId('leaderboard-podium')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-table')).toBeInTheDocument();
  });

  it('mounts the stadium sim pitch', () => {
    render(<WelcomeScreen />);
    expect(screen.getByTestId('pitch-visualization')).toBeInTheDocument();
  });

  it('opens the login dialog when Kick Off is clicked', () => {
    render(<WelcomeScreen />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    openLoginDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/welcome\.loginTitle/)).toBeInTheDocument();
    expect(screen.getByText(/welcome\.moreSignInOptions/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/welcome\.emailPlaceholder/)).not.toBeInTheDocument();
  });

  it('closes the login dialog via the modal close button and resets the in-app-browser panel', () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    fireEvent.click(screen.getByTestId('modal-close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each(['facebook', 'messenger'] as const)(
    'shows only the open-in-browser modal in %s webviews',
    (app) => {
      inAppBrowserMock.app = app;
      inAppBrowserMock.platform = 'ios';
      postAuthRedirectMock.redirect = '/friend/room/ABC123';

      render(<WelcomeScreen />);

      expect(screen.getByText(/inAppBrowser\.title/)).toBeInTheDocument();
      expect(screen.getByText(/inAppBrowser\.iosBottomRightStep1/)).toBeInTheDocument();
      expect(screen.queryByText(/inAppBrowser\.iosStep1/)).not.toBeInTheDocument();
      expect(screen.queryByText(/welcome\.loginTitle/)).not.toBeInTheDocument();
      expect(screen.queryByText(/welcome\.continueWithGoogle/)).not.toBeInTheDocument();

      openLoginDialog();

      expect(screen.getByText(/inAppBrowser\.title/)).toBeInTheDocument();
      expect(screen.queryByText(/welcome\.loginTitle/)).not.toBeInTheDocument();
      expect(screen.queryByText(/welcome\.continueWithGoogle/)).not.toBeInTheDocument();
    },
  );

  it('still opens the normal login dialog in Instagram webviews', () => {
    inAppBrowserMock.app = 'instagram';

    render(<WelcomeScreen />);
    openLoginDialog();

    expect(screen.getByText(/welcome\.loginTitle/)).toBeInTheDocument();
    expect(screen.getByText(/welcome\.continueWithGoogle/)).toBeInTheDocument();
    expect(screen.queryByText(/welcome\.continueWithFacebook/)).not.toBeInTheDocument();
    expect(screen.queryByText(/inAppBrowser\.title/)).not.toBeInTheDocument();
  });
});

describe('WelcomeScreen — Google sign-in flow', () => {
  it('uses Google Identity when client id is set and bootstraps on success', async () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    clickContinueWithGoogle();
    expect(trackSignupStartedMock).toHaveBeenCalledWith('google');
    await waitFor(() => expect(signInWithGoogleIdentityMock).toHaveBeenCalledWith('test-google-client'));
    expect(socialLoginWithIdTokenMock).toHaveBeenCalledWith('google', 'tok', 'nonce', undefined);
    expect(bootstrapMock).toHaveBeenCalledWith({ force: true });
  });

  it('falls back to redirect socialLogin when GIS throws', async () => {
    signInWithGoogleIdentityMock.mockRejectedValueOnce(new Error('GIS unavailable'));
    render(<WelcomeScreen />);
    openLoginDialog();
    clickContinueWithGoogle();
    await waitFor(() => expect(socialLoginMock).toHaveBeenCalled());
    // socialLogin('google', `${origin}/auth/callback`) — assert the call shape.
    const call = socialLoginMock.mock.calls[0];
    expect(call?.[0]).toBe('google');
    expect(call?.[1] ?? '').toMatch(/\/auth\/callback$/);
    // Token-based call never succeeded so bootstrap should not have fired.
    expect(bootstrapMock).not.toHaveBeenCalled();
  });

  it('falls back to the visible Google handler when GIS reports rendered but mounts no clickable button', async () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    await waitFor(() => expect(renderGoogleButtonMock).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });

    clickContinueWithGoogle();

    await waitFor(() => expect(signInWithGoogleIdentityMock).toHaveBeenCalledWith('test-google-client'));
    expect(socialLoginWithIdTokenMock).toHaveBeenCalledWith('google', 'tok', 'nonce', undefined);
    expect(bootstrapMock).toHaveBeenCalledWith({ force: true });
  });

  it('renders the overlaid GIS button and exchanges its credential for a session', async () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    // The overlaid Google button is rendered with the configured client id.
    await waitFor(() => expect(renderGoogleButtonMock).toHaveBeenCalled());
    expect(renderGoogleButtonMock.mock.calls[0]?.[0]).toBe('test-google-client');
    // Drive the primary path: Google returns a credential via the rendered button.
    expect(lastGoogleButtonCredentialCb).toBeTruthy();
    act(() => {
      lastGoogleButtonCredentialCb?.({ idToken: 'btn-tok', nonce: 'btn-nonce' });
    });
    expect(trackSignupStartedMock).toHaveBeenCalledWith('google');
    await waitFor(() =>
      expect(socialLoginWithIdTokenMock).toHaveBeenCalledWith('google', 'btn-tok', 'btn-nonce', undefined),
    );
    expect(bootstrapMock).toHaveBeenCalledWith({ force: true });
  });
});

describe('WelcomeScreen — email signin / signup', () => {
  it('submits email signin and bootstraps on success', async () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    setEmailFields('user@example.com', 'secret');
    const submit = screen.getByText(/welcome\.signInWithEmail/);
    fireEvent.click(submit);
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('user@example.com', 'secret'));
    expect(trackLoginCompletedMock).toHaveBeenCalledWith('email');
    await waitFor(() => expect(bootstrapMock).toHaveBeenCalledWith({ force: true }));
  });

  it('switches to signup tab and submits register', async () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    fireEvent.click(screen.getByText(/welcome\.signUpTab/));
    setEmailFields('new@example.com', 'secret12', 'secret12');
    const submit = screen.getByText(/welcome\.createAccount/);
    fireEvent.click(submit);
    await waitFor(() => expect(registerMock).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret12',
      redirect_to: `${window.location.origin}/auth/callback`,
      locale: 'en',
    }));
    expect(trackSignupStartedMock).toHaveBeenCalledWith('email');
    await waitFor(() => expect(trackSignupCompletedMock).toHaveBeenCalledWith('email'));
    await waitFor(() => expect(bootstrapMock).toHaveBeenCalled());
  });

  it('shows the check-email modal when register reports tokensSet=false (new signup)', async () => {
    registerMock.mockResolvedValueOnce({ user: null as unknown as { id: string }, tokensSet: false, alreadyRegistered: false, pendingDeletion: false });
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    fireEvent.click(screen.getByText(/welcome\.signUpTab/));
    setEmailFields('new@example.com', 'secret12', 'secret12');
    fireEvent.click(screen.getByText(/welcome\.createAccount/));
    await waitFor(() => expect(screen.getByText(/welcome\.checkEmailTitle/)).toBeInTheDocument());
    expect(bootstrapMock).not.toHaveBeenCalled();
  });

  it('shows the already-registered modal when register reports alreadyRegistered=true', async () => {
    registerMock.mockResolvedValueOnce({ user: null as unknown as { id: string }, tokensSet: false, alreadyRegistered: true, pendingDeletion: false });
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    fireEvent.click(screen.getByText(/welcome\.signUpTab/));
    setEmailFields('existing@example.com', 'secret12', 'secret12');
    fireEvent.click(screen.getByText(/welcome\.createAccount/));
    await waitFor(() => expect(screen.getByText(/welcome\.alreadyRegisteredTitle/)).toBeInTheDocument());
    expect(bootstrapMock).not.toHaveBeenCalled();
  });

  it('shows the password-mismatch error in signup mode without calling register', () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    fireEvent.click(screen.getByText(/welcome\.signUpTab/));
    setEmailFields('new@example.com', 'secret12', 'different12');
    fireEvent.click(screen.getByText(/welcome\.createAccount/));
    expect(screen.getByText(/authValidation\.passwordMismatch/)).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('blocks signup with a too-short password before calling register', () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    fireEvent.click(screen.getByText(/welcome\.signUpTab/));
    setEmailFields('new@example.com', 'short', 'short');
    fireEvent.click(screen.getByText(/welcome\.createAccount/));
    expect(screen.getByText(/authValidation\.passwordTooShort/)).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('shows a generic error on a failed login (no account enumeration)', async () => {
    loginMock.mockRejectedValueOnce(new Error('Bad credentials, bro'));
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    setEmailFields('user@example.com', 'wrongpass');
    fireEvent.click(screen.getByText(/welcome\.signInWithEmail/));
    // Always the generic message — never the raw upstream error.
    await waitFor(() => expect(screen.getByText(/welcome\.loginError/)).toBeInTheDocument());
    expect(screen.queryByText('Bad credentials, bro')).not.toBeInTheDocument();
    expect(bootstrapMock).not.toHaveBeenCalled();
  });

  it('shows restore modal for pending-deletion email login and disables restore while submitting', async () => {
    loginMock.mockRejectedValueOnce(new ApiError('Request failed', 401, {
      code: 'AUTHENTICATION_ERROR',
      details: { reason: 'pending_deletion' },
    }));
    let resolveRestore: (() => void) | null = null;
    restorePendingDeletionWithLoginMock.mockImplementationOnce(
      () => new Promise<{ id: string }>((resolve) => {
        resolveRestore = () => resolve({ id: 'u1' });
      }),
    );

    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    setEmailFields('user@example.com', 'secret');
    fireEvent.click(screen.getByText(/welcome\.signInWithEmail/));

    await waitFor(() => expect(screen.getByText(/welcome\.restoreAccountTitle/)).toBeInTheDocument());
    const restoreButton = screen.getByRole('button', { name: 'welcome.restoreAccount' }) as HTMLButtonElement;
    fireEvent.click(restoreButton);
    fireEvent.click(restoreButton);

    await waitFor(() => expect(restorePendingDeletionWithLoginMock).toHaveBeenCalledTimes(1));
    expect(restorePendingDeletionWithLoginMock).toHaveBeenCalledWith('user@example.com', 'secret');
    await waitFor(() => expect(restoreButton.disabled).toBe(true));
    act(() => resolveRestore?.());
    await waitFor(() => expect(bootstrapMock).toHaveBeenCalledWith({ force: true }));
  });

  it('shows restore modal when signup reports a pending-deletion account', async () => {
    registerMock.mockResolvedValueOnce({
      user: null as unknown as { id: string },
      tokensSet: false,
      alreadyRegistered: true,
      pendingDeletion: true,
    });

    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    fireEvent.click(screen.getByText(/welcome\.signUpTab/));
    setEmailFields('existing@example.com', 'secret12', 'secret12');
    fireEvent.click(screen.getByText(/welcome\.createAccount/));

    await waitFor(() => expect(screen.getByText(/welcome\.restoreAccountTitle/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'welcome.restoreAccount' })).toBeInTheDocument();
  });

  it('surfaces the upstream error message on a failed signup', async () => {
    registerMock.mockRejectedValueOnce(new Error('Email already registered'));
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    fireEvent.click(screen.getByText(/welcome\.signUpTab/));
    setEmailFields('new@example.com', 'secret12', 'secret12');
    fireEvent.click(screen.getByText(/welcome\.createAccount/));
    await waitFor(() => expect(screen.getByText('Email already registered')).toBeInTheDocument());
  });

  it('opens the in-modal forgot panel and submits with redirect_to, showing generic success', async () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    // Enter an email in sign-in mode, then open the forgot panel.
    const emailInput = screen.getByPlaceholderText(/welcome\.emailPlaceholder/);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByText(/welcome\.forgotPassword/));

    // Forgot panel renders its own header + send button (still in the modal).
    expect(screen.getByText(/forgotPassword\.title/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/forgotPassword\.sendResetLink/));

    await waitFor(() =>
      expect(forgotPasswordMock).toHaveBeenCalledWith(
        'user@example.com',
        `${window.location.origin}/auth/reset-password`,
      ),
    );
    // Generic success only after the request resolves.
    await waitFor(() => expect(screen.getByText(/forgotPassword\.genericSuccess/)).toBeInTheDocument());
  });

  it('disables submit while submitting', async () => {
    let resolveLogin: (() => void) | null = null;
    loginMock.mockImplementation(() => new Promise<{ id: string }>((resolve) => {
      resolveLogin = () => resolve({ id: 'u1' });
    }));
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    setEmailFields('user@example.com', 'secret');
    const submit = screen.getByText(/welcome\.signInWithEmail/).closest('button');
    expect(submit).not.toBeNull();
    fireEvent.click(submit as HTMLButtonElement);
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(true));
    act(() => resolveLogin?.());
  });
});

describe('WelcomeScreen — phone OTP', () => {
  it('hides the phone form when Georgian phone auth is not available', () => {
    georgianPhoneAvailabilityMock.mockReturnValue({
      country: 'US',
      isAvailable: false,
      isLoading: false,
    });

    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();

    // Phone is no longer a tab; when unavailable the phone form is absent under Sign In.
    expect(screen.queryByPlaceholderText(/welcome\.phoneLocalPlaceholder/)).not.toBeInTheDocument();
  });

  it('shows the phone form under Sign In via the Email|Phone toggle and runs the OTP flow', async () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    // Sign In defaults to the Email method; switch the toggle to Phone.
    fireEvent.click(screen.getByText(/welcome\.phoneMethod/));
    // The +995 prefix is fixed; the user types only the 9 local digits.
    const phoneInput = screen.getByPlaceholderText(/welcome\.phoneLocalPlaceholder/);
    fireEvent.change(phoneInput, { target: { value: '555000111' } });
    const sendButton = screen.getByText(/welcome\.sendCode/);
    fireEvent.click(sendButton);
    expect(trackSignupStartedMock).not.toHaveBeenCalledWith('phone');
    await waitFor(() => expect(startGeorgianPhoneOtpMock).toHaveBeenCalledWith('+995555000111'));
    // After the code is sent the modal collapses to a focused step showing the
    // persistent inline "code sent" hint + a change-number affordance.
    await waitFor(() => expect(screen.getByText(/welcome\.otpSentHint/)).toBeInTheDocument());
    expect(screen.getByText(/welcome\.changeNumber/)).toBeInTheDocument();

    // OTP input is now visible. Type 6 digits + verify.
    const otpInput = screen.getByPlaceholderText(/welcome\.otpPlaceholder/);
    fireEvent.change(otpInput, { target: { value: '123456' } });
    const verifyButton = screen.getByText(/welcome\.verifyCode/);
    fireEvent.click(verifyButton);
    await waitFor(() => expect(verifyGeorgianPhoneOtpMock).toHaveBeenCalledWith('+995555000111', '123456', undefined));
    expect(trackLoginCompletedMock).toHaveBeenCalledWith('phone');
    await waitFor(() => expect(bootstrapMock).toHaveBeenCalledWith({ force: true }));
  });

  it('surfaces the auth error when OTP verify fails', async () => {
    startGeorgianPhoneOtpMock.mockRejectedValueOnce(new Error('SMS blocked here'));
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    fireEvent.click(screen.getByText(/welcome\.phoneMethod/));
    const phoneInput = screen.getByPlaceholderText(/welcome\.phoneLocalPlaceholder/);
    fireEvent.change(phoneInput, { target: { value: '555000111' } });
    fireEvent.click(screen.getByText(/welcome\.sendCode/));
    await waitFor(() => expect(screen.getByText('SMS blocked here')).toBeInTheDocument());
  });
});

describe('WelcomeScreen — sign-in method toggle', () => {
  it('toggles between Email and Phone under Sign In, one form at a time', () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    // Defaults to Email: email form shown, phone hidden.
    expect(screen.getByPlaceholderText(/welcome\.emailPlaceholder/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/welcome\.phoneLocalPlaceholder/)).not.toBeInTheDocument();
    // Toggle to Phone: phone form shown, email hidden.
    fireEvent.click(screen.getByText(/welcome\.phoneMethod/));
    expect(screen.getByPlaceholderText(/welcome\.phoneLocalPlaceholder/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/welcome\.emailPlaceholder/)).not.toBeInTheDocument();
    // Toggle back to Email.
    fireEvent.click(screen.getByText(/welcome\.emailMethod/));
    expect(screen.getByPlaceholderText(/welcome\.emailPlaceholder/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/welcome\.phoneLocalPlaceholder/)).not.toBeInTheDocument();
  });

  it('hides the method toggle on Sign Up (email only)', () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    openAuthOptions();
    fireEvent.click(screen.getByText(/welcome\.signUpTab/));
    expect(screen.getByPlaceholderText(/welcome\.emailPlaceholder/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/welcome\.phoneLocalPlaceholder/)).not.toBeInTheDocument();
  });
});
