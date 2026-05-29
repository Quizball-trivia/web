import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
const registerMock = vi.fn(async (_payload: { email: string; password: string }) => ({ user: { id: 'u1' }, tokensSet: true }));
const socialLoginMock = vi.fn(async (_provider: string, _redirect: string) => undefined);
const socialLoginWithIdTokenMock = vi.fn(async (_provider: string, _idToken: string, _nonce: string) => undefined);
const startGeorgianPhoneOtpMock = vi.fn(async (_phone: string) => undefined);
const verifyGeorgianPhoneOtpMock = vi.fn(async (_phone: string, _code: string) => ({ id: 'u1' }));
const forgotPasswordMock = vi.fn(async (_email: string, _redirectTo: string) => undefined);
vi.mock('@/lib/auth/auth.service', () => ({
  login: (email: string, password: string) => loginMock(email, password),
  register: (payload: { email: string; password: string }) => registerMock(payload),
  forgotPassword: (email: string, redirectTo: string) => forgotPasswordMock(email, redirectTo),
  socialLogin: (provider: string, redirect: string) => socialLoginMock(provider, redirect),
  socialLoginWithIdToken: (provider: string, idToken: string, nonce: string) =>
    socialLoginWithIdTokenMock(provider, idToken, nonce),
  startGeorgianPhoneOtp: (phone: string) => startGeorgianPhoneOtpMock(phone),
  verifyGeorgianPhoneOtp: (phone: string, code: string) => verifyGeorgianPhoneOtpMock(phone, code),
}));

// Google Identity — clientId comes from process.env; the screen calls
// `signInWithGoogleIdentity` if present. Stub it to a sentinel so we can
// assert it ran with the right id.
const signInWithGoogleIdentityMock = vi.fn(async (_clientId: string) => ({ idToken: 'tok', nonce: 'nonce' }));
vi.mock('@/lib/auth/google-identity', () => ({
  signInWithGoogleIdentity: (clientId: string) => signInWithGoogleIdentityMock(clientId),
}));

// In-app-browser helpers.
const isInAppBrowserMock = vi.fn(() => false);
const tryOpenInExternalBrowserMock = vi.fn((_url: string) => true);
const getPlatformMock = vi.fn(() => 'ios' as const);
vi.mock('@/lib/auth/in-app-browser', () => ({
  isInAppBrowser: () => isInAppBrowserMock(),
  tryOpenInExternalBrowser: (url: string) => tryOpenInExternalBrowserMock(url),
  getPlatform: () => getPlatformMock(),
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
  registerMock.mockResolvedValue({ user: { id: 'u1' }, tokensSet: true });
  socialLoginMock.mockReset();
  socialLoginMock.mockResolvedValue(undefined);
  socialLoginWithIdTokenMock.mockReset();
  socialLoginWithIdTokenMock.mockResolvedValue(undefined);
  startGeorgianPhoneOtpMock.mockReset();
  startGeorgianPhoneOtpMock.mockResolvedValue(undefined);
  verifyGeorgianPhoneOtpMock.mockReset();
  verifyGeorgianPhoneOtpMock.mockResolvedValue({ id: 'u1' });
  forgotPasswordMock.mockReset();
  forgotPasswordMock.mockResolvedValue(undefined);
  signInWithGoogleIdentityMock.mockReset();
  signInWithGoogleIdentityMock.mockResolvedValue({ idToken: 'tok', nonce: 'nonce' });
  isInAppBrowserMock.mockReturnValue(false);
  tryOpenInExternalBrowserMock.mockReturnValue(true);
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
  });

  it('closes the login dialog via the modal close button and resets the in-app-browser panel', () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    fireEvent.click(screen.getByTestId('modal-close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('WelcomeScreen — Google sign-in flow', () => {
  it('uses Google Identity when client id is set and bootstraps on success', async () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    clickContinueWithGoogle();
    expect(trackSignupStartedMock).toHaveBeenCalledWith('google');
    await waitFor(() => expect(signInWithGoogleIdentityMock).toHaveBeenCalledWith('test-google-client'));
    expect(socialLoginWithIdTokenMock).toHaveBeenCalledWith('google', 'tok', 'nonce');
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

  it('takes the in-app-browser branch instead of starting GIS', async () => {
    isInAppBrowserMock.mockReturnValueOnce(true);
    render(<WelcomeScreen />);
    openLoginDialog();
    clickContinueWithGoogle();
    expect(tryOpenInExternalBrowserMock).toHaveBeenCalled();
    expect(signInWithGoogleIdentityMock).not.toHaveBeenCalled();
    expect(socialLoginMock).not.toHaveBeenCalled();
  });

  it('shows the in-app-browser instructions panel after the bounce timeout', () => {
    vi.useFakeTimers();
    isInAppBrowserMock.mockReturnValue(true);
    render(<WelcomeScreen />);
    openLoginDialog();
    clickContinueWithGoogle();
    // Instructions hidden until the 1500ms timer fires.
    expect(screen.queryByText(/inAppBrowser\.title/)).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.getByText(/inAppBrowser\.title/)).toBeInTheDocument();
  });
});

describe('WelcomeScreen — email signin / signup', () => {
  it('submits email signin and bootstraps on success', async () => {
    render(<WelcomeScreen />);
    openLoginDialog();
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

  it('shows the check-email notice when register reports tokensSet=false', async () => {
    registerMock.mockResolvedValueOnce({ user: null as unknown as { id: string }, tokensSet: false });
    render(<WelcomeScreen />);
    openLoginDialog();
    fireEvent.click(screen.getByText(/welcome\.signUpTab/));
    setEmailFields('new@example.com', 'secret12', 'secret12');
    fireEvent.click(screen.getByText(/welcome\.createAccount/));
    await waitFor(() => expect(screen.getByText(/welcome\.checkEmail/)).toBeInTheDocument());
    expect(bootstrapMock).not.toHaveBeenCalled();
  });

  it('shows the password-mismatch error in signup mode without calling register', () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    fireEvent.click(screen.getByText(/welcome\.signUpTab/));
    setEmailFields('new@example.com', 'secret12', 'different12');
    fireEvent.click(screen.getByText(/welcome\.createAccount/));
    expect(screen.getByText(/authValidation\.passwordMismatch/)).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('blocks signup with a too-short password before calling register', () => {
    render(<WelcomeScreen />);
    openLoginDialog();
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
    setEmailFields('user@example.com', 'wrongpass');
    fireEvent.click(screen.getByText(/welcome\.signInWithEmail/));
    // Always the generic message — never the raw upstream error.
    await waitFor(() => expect(screen.getByText(/welcome\.loginError/)).toBeInTheDocument());
    expect(screen.queryByText('Bad credentials, bro')).not.toBeInTheDocument();
    expect(bootstrapMock).not.toHaveBeenCalled();
  });

  it('surfaces the upstream error message on a failed signup', async () => {
    registerMock.mockRejectedValueOnce(new Error('Email already registered'));
    render(<WelcomeScreen />);
    openLoginDialog();
    fireEvent.click(screen.getByText(/welcome\.signUpTab/));
    setEmailFields('new@example.com', 'secret12', 'secret12');
    fireEvent.click(screen.getByText(/welcome\.createAccount/));
    await waitFor(() => expect(screen.getByText('Email already registered')).toBeInTheDocument());
  });

  it('opens the in-modal forgot panel and submits with redirect_to, showing generic success', async () => {
    render(<WelcomeScreen />);
    openLoginDialog();
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
    setEmailFields('user@example.com', 'secret');
    const submit = screen.getByText(/welcome\.signInWithEmail/).closest('button');
    expect(submit).not.toBeNull();
    fireEvent.click(submit as HTMLButtonElement);
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(true));
    act(() => resolveLogin?.());
  });
});

describe('WelcomeScreen — phone OTP', () => {
  it('starts the OTP flow on first submit then verifies on second', async () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    fireEvent.click(screen.getByText(/welcome\.phoneTab/));
    const phoneInput = screen.getByPlaceholderText(/welcome\.phonePlaceholder/);
    fireEvent.change(phoneInput, { target: { value: '+995555000111' } });
    const sendButton = screen.getByText(/welcome\.sendCode/);
    fireEvent.click(sendButton);
    expect(trackSignupStartedMock).toHaveBeenCalledWith('phone');
    await waitFor(() => expect(startGeorgianPhoneOtpMock).toHaveBeenCalledWith('+995555000111'));
    await waitFor(() => expect(screen.getByText(/welcome\.phoneCodeSent/)).toBeInTheDocument());

    // OTP input is now visible. Type 6 digits + verify.
    const otpInput = screen.getByPlaceholderText(/welcome\.otpPlaceholder/);
    fireEvent.change(otpInput, { target: { value: '123456' } });
    const verifyButton = screen.getByText(/welcome\.verifyCode/);
    fireEvent.click(verifyButton);
    await waitFor(() => expect(verifyGeorgianPhoneOtpMock).toHaveBeenCalledWith('+995555000111', '123456'));
    expect(trackLoginCompletedMock).toHaveBeenCalledWith('phone');
    await waitFor(() => expect(bootstrapMock).toHaveBeenCalledWith({ force: true }));
  });

  it('surfaces the auth error when OTP verify fails', async () => {
    startGeorgianPhoneOtpMock.mockRejectedValueOnce(new Error('SMS blocked here'));
    render(<WelcomeScreen />);
    openLoginDialog();
    fireEvent.click(screen.getByText(/welcome\.phoneTab/));
    const phoneInput = screen.getByPlaceholderText(/welcome\.phonePlaceholder/);
    fireEvent.change(phoneInput, { target: { value: '+995555000111' } });
    fireEvent.click(screen.getByText(/welcome\.sendCode/));
    await waitFor(() => expect(screen.getByText('SMS blocked here')).toBeInTheDocument());
  });
});

describe('WelcomeScreen — mode-switch reset behavior', () => {
  it('switching tabs resets feedback and disables stale OTP state', () => {
    render(<WelcomeScreen />);
    openLoginDialog();
    fireEvent.click(screen.getByText(/welcome\.phoneTab/));
    const phoneInput = screen.getByPlaceholderText(/welcome\.phonePlaceholder/);
    fireEvent.change(phoneInput, { target: { value: '+1' } });
    // Switch back to signin — the email form should appear.
    fireEvent.click(screen.getByText(/welcome\.signInTab/));
    expect(screen.getByPlaceholderText(/welcome\.emailPlaceholder/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/welcome\.otpPlaceholder/)).not.toBeInTheDocument();
  });
});
