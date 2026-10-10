import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/types';

const state = vi.hoisted(() => ({ pathname: '/auction', status: 'anonymous', user: null as User | null, bootstrap: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname, useRouter: () => ({ replace: state.replace }) }));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: (selector: (value: typeof state) => unknown) => selector(state) }));
vi.mock('@/contexts/LocaleContext', () => ({ useLocale: () => ({ t: (key: string) => key }) }));
const stopLoadedBgm = vi.hoisted(() => vi.fn());
vi.mock('@/lib/sounds/audioControl', () => ({ stopLoadedBgm }));
vi.mock('@/lib/config', () => ({ GUEST_LOBBIES_ENABLED: true }));
vi.mock('@/lib/realtime/realtime-principal', () => ({ useRealtimePrincipal: () => ({ kind: 'guest' }) }));
vi.mock('@/features/auth/GuestAuthDialog', () => ({ GuestAuthDialog: () => {
  const open = useAuthPromptStore(value => value.isOpen);
  return <div data-testid="auth-dialog-host">{open ? <div role="dialog">Sign in</div> : null}</div>;
} }));
vi.mock('@/features/auth/AccountBannedScreen', () => ({ AccountBannedScreen: () => <div>Banned</div> }));
vi.mock('@/components/shared/LoadingScreen', () => ({ LoadingScreen: () => <div>Loading</div> }));

import AppAuthGate from '../AppAuthGate';
import { GuestResultsCta } from '@/features/friend/components/GuestResultsCta';
import { useAuthPromptStore } from '@/stores/authPrompt.store';
import { peekPostAuthRedirect, rememberPostAuthRedirect } from '@/lib/auth/postAuthRedirect';
import { STORAGE_KEYS } from '@/utils/storage';

describe('guest sign-in navigation through the shared app gate', () => {
  beforeEach(() => {
    state.pathname = '/auction'; state.status = 'anonymous'; state.user = null;
    vi.clearAllMocks(); localStorage.removeItem(STORAGE_KEYS.POST_AUTH_REDIRECT);
    useAuthPromptStore.setState({ isOpen: false });
  });
  it.each(['/auction', '/tic-tac-toe'])('opens the results sign-in dialog on fullscreen %s', async pathname => {
    state.pathname = pathname;
    render(<AppAuthGate><GuestResultsCta /></AppAuthGate>);
    expect(screen.queryByTestId('auth-dialog-host')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('guest-results-cta'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
  it('does not mount a closed dialog until it is requested, then retains it across closing and reopening', async () => {
    render(<AppAuthGate><GuestResultsCta /></AppAuthGate>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('guest-results-cta'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    act(() => useAuthPromptStore.getState().close());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('auth-dialog-host')).toBeInTheDocument();
    act(() => useAuthPromptStore.getState().open());
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });
  it('returns a signed-in guest to the saved room after the guest UI unmounts', () => {
    rememberPostAuthRedirect('/friend/room/ABC123');
    const view = render(<AppAuthGate><GuestResultsCta /></AppAuthGate>);
    fireEvent.click(screen.getByTestId('guest-results-cta'));
    state.status = 'authenticated'; state.user = { onboarding_complete: true } as User;
    view.rerender(<AppAuthGate><GuestResultsCta /></AppAuthGate>);
    expect(state.replace).toHaveBeenCalledWith('/friend/room/ABC123');
    expect(peekPostAuthRedirect()).toBeNull();
    expect(useAuthPromptStore.getState().isOpen).toBe(false);
  });
  it('keeps the saved room through onboarding rather than replacing it with the hub', () => {
    state.pathname = '/play'; rememberPostAuthRedirect('/friend/room/ABC123');
    state.status = 'authenticated'; state.user = { onboarding_complete: false } as User;
    const view = render(<AppAuthGate><div>Hub</div></AppAuthGate>);
    expect(state.replace).toHaveBeenCalledWith('/onboarding');
    expect(peekPostAuthRedirect()).toBe('/friend/room/ABC123');
    act(() => { state.pathname = '/onboarding'; state.user = { onboarding_complete: true } as User; });
    view.rerender(<AppAuthGate><div>Onboarding</div></AppAuthGate>);
    expect(state.replace).toHaveBeenLastCalledWith('/friend/room/ABC123');
  });
  it('stops already-loaded music synchronously before redirecting a signed-out player from a private route', () => {
    state.pathname = '/profile';
    render(<AppAuthGate><div>Profile</div></AppAuthGate>);
    expect(stopLoadedBgm).toHaveBeenCalledWith(0);
    expect(state.replace).toHaveBeenCalledWith('/play');
    expect(stopLoadedBgm.mock.invocationCallOrder[0]).toBeLessThan(state.replace.mock.invocationCallOrder[0]);
  });
});
