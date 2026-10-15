import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
const state = vi.hoisted(() => ({ code: 'AB1234', status: 'anonymous', locale: 'en', search: 'source=share' }));
vi.mock('next/navigation', () => ({ useParams: () => ({ code: state.code }), useSearchParams: () => new URLSearchParams(state.search) }));
vi.mock('@/contexts/LocaleContext', () => ({ useLocale: () => ({ locale: state.locale, t: (s: string) => s }) }));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ status: state.status }) }));
vi.mock('@/components/auth/AppAuthGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-gate">{children}</div> }));
vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../components/FriendLobbyScreen', () => ({ FriendLobbyScreen: ({ roomCode, isHost, newRoomDuelGame }: { roomCode: string; isHost: boolean; newRoomDuelGame?: string | null }) => <div data-testid="lobby">{roomCode}:{String(isHost)}{newRoomDuelGame ? `:${newRoomDuelGame}` : ''}</div> }));
vi.mock('@/lib/config', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/config')>()), DUEL_GAMES_ENABLED: ['buscaminas'] }));
vi.mock('../hooks/useFriendLobbyLogic', () => ({ parseFriendLobbyInviteSource: (s: string) => s }));
import { FriendInviteEntry } from '../components/FriendInviteEntry';
import { mobileInviteUrl } from '@/lib/friend/mobileInvite';
import { GET } from '@/app/.well-known/apple-app-site-association/route';

beforeEach(() => {
  state.code = 'ab1234'; state.status = 'anonymous'; state.locale = 'en'; state.search = 'source=share';
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api-staging.quizball.io');
});
describe('public invite handoff', () => {
  it('shows an anonymous visitor their code and app handoff without redirecting to login', () => {
    render(<FriendInviteEntry />);
    expect(screen.getByText('AB1234')).toBeVisible();
    expect(screen.queryByTestId('auth-gate')).toBeNull();
    expect(screen.getByRole('link', { name: 'Open in Quizball' })).toHaveAttribute('href', 'quizball:///friend/room/AB1234?environment=staging');
    expect(screen.queryByRole('link', { name: 'View on the App Store' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Play in browser' }));
    expect(screen.getByTestId('auth-gate')).toBeVisible();
    expect(screen.getByTestId('lobby')).toHaveTextContent('AB1234:false');
  });
  it('offers the App Store only for production invitations', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.quizball.io');
    render(<FriendInviteEntry />);
    expect(screen.getByRole('link', { name: 'View on the App Store' })).toHaveAttribute('href', 'https://apps.apple.com/app/id6817809479');
    expect(mobileInviteUrl('ab1234')).toContain('environment=production');
  });
  it('keeps signed-in players and host creation in the existing protected lobby flow', () => {
    state.status = 'authenticated'; render(<FriendInviteEntry />);
    expect(screen.getByTestId('lobby')).toHaveTextContent('AB1234:false');
  });
  it('a public game page link (/friend/room/new?duel=<game>) opens a duel room for an enabled game only', () => {
    state.code = 'new'; state.search = 'duel=buscaminas';
    const { unmount } = render(<FriendInviteEntry />);
    expect(screen.getByTestId('lobby')).toHaveTextContent('new:true:buscaminas');
    unmount();
    state.search = 'duel=pistas';
    const second = render(<FriendInviteEntry />);
    expect(screen.getByTestId('lobby')).toHaveTextContent(/^new:true$/);
    second.unmount();
    state.code = 'ab1234'; state.status = 'authenticated'; state.search = 'duel=buscaminas';
    render(<FriendInviteEntry />);
    expect(screen.getByTestId('lobby')).toHaveTextContent(/^AB1234:false$/);
  });
  it('does not turn new-room creation into a join invitation', () => {
    state.code = 'new'; render(<FriendInviteEntry />);
    expect(screen.getByTestId('lobby')).toHaveTextContent('new:true');
    expect(mobileInviteUrl('new')).toBeNull();
  });
  it.each(['ka', 'es', 'tr'])('provides translated handoff copy for %s', locale => {
    state.locale = locale; render(<FriendInviteEntry />);
    expect(screen.queryByText('Your friend is waiting.')).toBeNull();
    expect(screen.getByText('AB1234')).toBeVisible();
  });
  it('rejects malformed codes and does not create an app link', () => {
    state.code = 'bad/code'; render(<FriendInviteEntry />);
    expect(screen.getByRole('alert')).toHaveTextContent('inviteCode.invalid');
    expect(mobileInviteUrl('bad/code')).toBeNull();
  });
  it('serves public JSON for the exact signed bundle and invite paths', async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect((await response.json()).applinks.details).toEqual([
      { appID: 'D52VX5574L.io.quizball.mobile', paths: ['NOT /friend/room/new', '/friend/room/*', '/play'] },
      { appID: 'N9TWV36HUN.io.quizball.app', paths: ['NOT /friend/room/new', '/friend/room/*', '/play'] },
    ]);
  });
});
