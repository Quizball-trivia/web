import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/types';

const state = vi.hoisted(() => ({ pathname: '/auction', status: 'anonymous', user: null as User | null, bootstrap: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname, useRouter: () => ({ replace: state.replace }) }));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: (selector: (value: typeof state) => unknown) => selector(state) }));
vi.mock('@/contexts/LocaleContext', () => ({ useLocale: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/sounds/gameSounds', () => ({ stopBgm: vi.fn() }));
vi.mock('@/lib/config', () => ({ GUEST_LOBBIES_ENABLED: true }));
vi.mock('@/lib/realtime/realtime-principal', () => ({ useRealtimePrincipal: () => ({ kind: 'guest' }) }));
vi.mock('@/features/auth/GuestAuthDialog', () => ({ GuestAuthDialog: () => {
  const open = useAuthPromptStore(value => value.isOpen);
  return open ? <div role="dialog">Sign in</div> : null;
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
  it.each(['/auction', '/tic-tac-toe'])('opens the results sign-in dialog on fullscreen %s', pathname => {
    state.pathname = pathname;
    render(<AppAuthGate><GuestResultsCta /></AppAuthGate>);
    fireEvent.click(screen.getByTestId('guest-results-cta'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
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
});
