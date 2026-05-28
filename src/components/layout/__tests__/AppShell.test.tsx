import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// External deps — every hook the AppShell touches is mocked here. The tests
// focus on observable behavior: which banners render, which callbacks fire,
// which sub-component receives what.
// ---------------------------------------------------------------------------

// next/navigation: usePathname + useRouter
const pathnameMock = vi.fn(() => '/');
const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({ push: routerPushMock, replace: routerReplaceMock }),
}));

// next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// next/image
vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt?: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ''} src={src} />
  ),
}));

// Locale context — t() echoes the key so tests can match on it.
vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
    locale: 'en',
  }),
}));

// Player context
vi.mock('@/contexts/PlayerContext', () => ({
  usePlayer: () => ({
    player: {
      username: 'Tester',
      avatar: 'avatar-1',
      avatarCustomization: null,
      level: 5,
      rankPoints: 1234,
    },
  }),
}));

// Store/queries
const useAuthStoreMock = vi.fn();
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector?: (state: unknown) => unknown) => useAuthStoreMock(selector),
}));

const realtimeStoreState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('@/stores/realtimeMatch.store', () => ({
  useRealtimeMatchStore: (selector?: (state: Record<string, unknown>) => unknown) =>
    selector ? selector(realtimeStoreState.current) : realtimeStoreState.current,
}));

const clearRankedMatchmakingMock = vi.fn();
vi.mock('@/stores/rankedMatchmaking.store', () => ({
  useRankedMatchmakingStore: {
    getState: () => ({ clearRankedMatchmaking: clearRankedMatchmakingMock }),
  },
}));

const startSessionMock = vi.fn();
const setGameStageMock = vi.fn();
vi.mock('@/stores/gameSession.store', () => ({
  useGameSessionStore: (selector?: (state: unknown) => unknown) => {
    const state = { startSession: startSessionMock, setStage: setGameStageMock };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/lib/queries/store.queries', () => ({
  useStoreWallet: () => ({ data: { coins: 1500, tickets: 7 } }),
}));

vi.mock('@/lib/queries/social.queries', () => ({
  useIncomingFriendRequestCount: () => ({ data: 2 }),
}));

// Socket + realtime connection
const socketEmitMock = vi.fn();
const socketHandlers: Record<string, Array<(...args: unknown[]) => void>> = {};
function pushHandler(event: string, handler: (...args: unknown[]) => void) {
  socketHandlers[event] ??= [];
  socketHandlers[event].push(handler);
}
const socketStub = {
  connected: true,
  on: (event: string, handler: (...args: unknown[]) => void) => {
    pushHandler(event, handler);
    return socketStub;
  },
  off: () => socketStub,
  emit: socketEmitMock,
};
vi.mock('@/lib/realtime/socket-client', () => ({
  getSocket: () => socketStub,
}));

vi.mock('@/lib/realtime/useRealtimeConnection', () => ({
  useRealtimeConnection: () => undefined,
}));

// Heavy children
vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: ({ currentPath, socialBadgeCount }: { currentPath: string; socialBadgeCount: number }) => (
    <aside
      data-testid="sidebar"
      data-current-path={currentPath}
      data-social-badge={socialBadgeCount}
    />
  ),
}));
vi.mock('@/components/layout/NotificationsDropdown', () => ({
  NotificationsDropdown: ({ badgeCount }: { badgeCount: number }) => (
    <div data-testid="notifications" data-badge={badgeCount} />
  ),
}));
vi.mock('@/components/layout/ChallengeInvitePrompt', () => ({
  ChallengeInvitePrompt: () => <div data-testid="challenge-invite-prompt" />,
}));

vi.mock('@/components/AvatarDisplay', () => ({
  AvatarDisplay: () => <div data-testid="avatar" />,
}));

// shadcn dropdown / dialog — render the children directly so the menu items are
// always discoverable. Default-open the dialog when its `open` prop is true.
vi.mock('@/components/ui/dropdown-menu', () => {
  const Frag = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    DropdownMenu: Frag,
    DropdownMenuContent: Frag,
    DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
      <button type="button" onClick={onClick} data-dropdown-item>
        {children}
      </button>
    ),
    DropdownMenuLabel: Frag,
    DropdownMenuSeparator: () => null,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('@/components/ui/alert-dialog', () => {
  const Frag = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    AlertDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      open ? <div role="alertdialog">{children}</div> : null,
    AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
      <button type="button" onClick={onClick} data-testid="logout-confirm">
        {children}
      </button>
    ),
    AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
    AlertDialogContent: Frag,
    AlertDialogDescription: Frag,
    AlertDialogFooter: Frag,
    AlertDialogHeader: Frag,
    AlertDialogTitle: Frag,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface AuthState {
  user: { id: string; country?: string } | null;
  logout: () => Promise<void>;
}
const defaultAuth = {
  user: { id: 'self-user', country: 'us' },
  logout: vi.fn(async () => {}),
};

interface RealtimeStateSeed {
  lobby?: unknown;
  draft?: unknown;
  match?: unknown;
  remainingReconnects?: number | null;
  sessionState?: { state: string; waitingLobbyId?: string | null } | null;
  rejoinMatch?: unknown;
  forfeitPending?: { matchId: string; reason: string; message: string } | null;
  challengeInvites?: unknown[];
  suppressLobbyBannerUntil?: number | null;
  suppressLobbyBannerReason?: string | null;
  clearLobbyBannerSuppression?: () => void;
  clearRejoinAvailable?: () => void;
  reset?: () => void;
}
function seedRealtime(overrides: RealtimeStateSeed = {}) {
  realtimeStoreState.current = {
    lobby: null,
    draft: null,
    match: null,
    remainingReconnects: null,
    sessionState: null,
    rejoinMatch: null,
    forfeitPending: null,
    challengeInvites: [],
    suppressLobbyBannerUntil: null,
    suppressLobbyBannerReason: null,
    clearLobbyBannerSuppression: vi.fn(),
    clearRejoinAvailable: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
  return realtimeStoreState.current;
}

function seedAuth(state: Partial<AuthState> = {}) {
  const merged: AuthState = { ...defaultAuth, ...state };
  useAuthStoreMock.mockImplementation((selector?: (state: AuthState) => unknown) =>
    selector ? selector(merged) : merged,
  );
  return merged;
}

beforeEach(() => {
  pathnameMock.mockReset();
  pathnameMock.mockReturnValue('/');
  routerPushMock.mockClear();
  routerReplaceMock.mockClear();
  socketEmitMock.mockClear();
  clearRankedMatchmakingMock.mockClear();
  startSessionMock.mockClear();
  setGameStageMock.mockClear();
  useAuthStoreMock.mockReset();
  for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
  socketStub.connected = true;
  seedAuth();
  seedRealtime();
});

afterEach(() => {
  vi.useRealTimers();
});

// Import after all mocks are registered.
import { AppShell } from '../AppShell';

function renderShell(children: React.ReactNode = <div data-testid="page-children">Page</div>) {
  return render(<AppShell>{children}</AppShell>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppShell — children + chrome', () => {
  it('renders page children inside the shell', () => {
    renderShell(<div data-testid="page-children">My Page</div>);
    // Children render twice — once in the desktop main, once in the mobile main.
    // Both layouts mount because Tailwind's responsive utilities are no-ops in
    // JSDOM. Verify both copies are present so we know the children are wired
    // through to both layout paths.
    expect(screen.getAllByTestId('page-children').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('My Page').length).toBeGreaterThanOrEqual(1);
  });

  it('mounts the challenge invite prompt at the shell root', () => {
    renderShell();
    expect(screen.getByTestId('challenge-invite-prompt')).toBeInTheDocument();
  });

  it('passes currentPath and the social badge count into the Sidebar', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    renderShell();
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.getAttribute('data-current-path')).toBe('/leaderboard');
    // socialBadgeCount = challengeInvites.length (0) + incomingFriendRequestCount (2) = 2
    expect(sidebar.getAttribute('data-social-badge')).toBe('2');
  });

  it('forwards the social badge count to NotificationsDropdown', () => {
    renderShell();
    const dropdowns = screen.getAllByTestId('notifications');
    expect(dropdowns.length).toBeGreaterThan(0);
    expect(dropdowns[0].getAttribute('data-badge')).toBe('2');
  });
});

describe('AppShell — route gating', () => {
  it('hides the mobile bottom nav on /game routes', () => {
    pathnameMock.mockReturnValue('/game');
    renderShell();
    expect(screen.queryByText('navigation.home')).not.toBeInTheDocument();
  });

  it('hides the mobile bottom nav on /onboarding', () => {
    pathnameMock.mockReturnValue('/onboarding');
    renderShell();
    expect(screen.queryByText('navigation.home')).not.toBeInTheDocument();
  });

  it('renders the mobile bottom nav on /', () => {
    pathnameMock.mockReturnValue('/');
    renderShell();
    expect(screen.getByText('navigation.home')).toBeInTheDocument();
    expect(screen.getByText('navigation.leaderboard')).toBeInTheDocument();
    expect(screen.getByText('navigation.store')).toBeInTheDocument();
    // `navigation.profile` + `navigation.social` also appear in the profile
    // dropdown menus, so just assert they're present at least once.
    expect(screen.getAllByText('navigation.profile').length).toBeGreaterThan(0);
    expect(screen.getAllByText('navigation.social').length).toBeGreaterThan(0);
  });

  it('shows the mobile header on /', () => {
    pathnameMock.mockReturnValue('/');
    renderShell();
    // The header renders the user's display name. Show on /, hide on /game.
    expect(screen.getAllByText('Tester').length).toBeGreaterThan(0);
  });

  it('hides the mobile header on routes outside HEADER_PATHS', () => {
    pathnameMock.mockReturnValue('/');
    const headerCount = render(<AppShell><div /></AppShell>).container.querySelectorAll('.size-12.rounded-full').length;
    // Mobile header on `/` renders one `size-12 rounded-full` wrapper for the
    // user avatar. Switch the route to a non-HEADER path and that wrapper
    // disappears.
    pathnameMock.mockReturnValue('/onboarding');
    const onboardingCount = render(<AppShell><div /></AppShell>).container.querySelectorAll('.size-12.rounded-full').length;
    expect(headerCount).toBeGreaterThan(onboardingCount);
  });

  it('shows a social badge bubble on the /social mobile nav item when count > 0', () => {
    pathnameMock.mockReturnValue('/');
    renderShell();
    // The badge number appears next to the social icon. Two of them — desktop
    // sidebar gets the count via prop, mobile bottom nav renders the literal.
    const badges = screen.getAllByText('2');
    expect(badges.length).toBeGreaterThan(0);
  });
});

describe('AppShell — lobby banner', () => {
  it('shows the friendly lobby banner when waiting in a friendly lobby outside the room', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    seedRealtime({
      lobby: {
        status: 'waiting',
        mode: 'friendly',
        inviteCode: 'CODE42',
        lobbyId: 'L1',
        displayName: 'My Lobby',
        members: [],
      },
    });
    renderShell();
    expect(screen.getAllByText(/appShell.stillInLobby/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CODE42/).length).toBeGreaterThan(0);
  });

  it('hides the friendly lobby banner when already inside /friend/room/:code', () => {
    pathnameMock.mockReturnValue('/friend/room/CODE42');
    seedRealtime({
      lobby: {
        status: 'waiting',
        mode: 'friendly',
        inviteCode: 'CODE42',
        lobbyId: 'L1',
        displayName: 'My Lobby',
        members: [],
      },
    });
    renderShell();
    expect(screen.queryByText(/appShell.stillInLobby/)).not.toBeInTheDocument();
  });

  it('shows the ranked lobby banner when a ranked lobby is waiting outside /game', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    seedRealtime({
      lobby: {
        status: 'waiting',
        mode: 'ranked',
        inviteCode: '',
        lobbyId: 'L2',
        displayName: 'Ranked',
        members: [],
      },
    });
    renderShell();
    expect(screen.getAllByText(/appShell.rankedMatchPreparing/).length).toBeGreaterThan(0);
  });

  it('hides the ranked lobby banner on /game', () => {
    pathnameMock.mockReturnValue('/game');
    seedRealtime({
      lobby: {
        status: 'waiting',
        mode: 'ranked',
        inviteCode: '',
        lobbyId: 'L2',
        displayName: 'Ranked',
        members: [],
      },
    });
    renderShell();
    expect(screen.queryByText(/appShell.rankedMatchPreparing/)).not.toBeInTheDocument();
  });

  it('suppresses the lobby banner while suppressLobbyBannerReason is set', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    seedRealtime({
      lobby: {
        status: 'waiting',
        mode: 'friendly',
        inviteCode: 'CODE42',
        lobbyId: 'L1',
        displayName: 'My Lobby',
        members: [],
      },
      suppressLobbyBannerReason: 'just-left',
    });
    renderShell();
    expect(screen.queryByText(/appShell.stillInLobby/)).not.toBeInTheDocument();
  });
});

describe('AppShell — rejoin / completed / forfeit / draft banners', () => {
  it('shows the rejoin banner when rejoinMatch is set and we are outside /game', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    seedRealtime({
      rejoinMatch: {
        matchId: 'M1',
        mode: 'ranked',
        opponent: { id: 'opp', username: 'Opp', avatarUrl: null },
        remainingReconnects: 3,
      },
    });
    renderShell();
    expect(screen.getAllByText(/appShell.matchStillActiveAgainst/).length).toBeGreaterThan(0);
  });

  it('falls back to active-match banner when match exists with no finalResults', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    seedRealtime({
      match: {
        matchId: 'M2',
        mode: 'friendly',
        opponent: { id: 'opp', username: 'Friend', avatarUrl: null },
        finalResults: null,
      },
    });
    renderShell();
    expect(screen.getAllByText(/appShell.matchStillActiveAgainst/).length).toBeGreaterThan(0);
  });

  it('shows the completed-match banner when match.finalResults is present', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    seedRealtime({
      match: {
        matchId: 'M3',
        mode: 'friendly',
        variant: 'friendly_possession',
        opponent: { id: 'opp', username: 'WinnerOpp', avatarUrl: null },
        finalResults: { winnerDecisionMethod: 'goals' },
      },
    });
    renderShell();
    expect(screen.getAllByText(/appShell.matchFinishedAgainst/).length).toBeGreaterThan(0);
  });

  it('shows the forfeit-pending banner before finalResults are received', () => {
    pathnameMock.mockReturnValue('/');
    seedRealtime({
      forfeitPending: { matchId: 'M4', reason: 'opponent_forfeit', message: 'They quit' },
    });
    renderShell();
    expect(screen.getAllByText('Opponent forfeited').length).toBeGreaterThan(0);
    expect(screen.getAllByText('They quit').length).toBeGreaterThan(0);
  });

  it('shows the draft banner when lobby is active and a draft is in progress', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    seedRealtime({
      lobby: {
        status: 'active',
        mode: 'friendly',
        inviteCode: 'X',
        lobbyId: 'L9',
        displayName: 'L',
        members: [
          { userId: 'self-user', username: 'me', avatarUrl: null },
          { userId: 'opp', username: 'DraftOpp', avatarUrl: null },
        ],
      },
      draft: { state: 'in_progress' },
    });
    renderShell();
    expect(screen.getAllByText(/appShell.draftActiveAgainst/).length).toBeGreaterThan(0);
  });
});

describe('AppShell — banner callbacks fire the right store / socket actions', () => {
  it('rejoin banner → handleRejoinMatch emits match:rejoin and routes to /game', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    const clearRejoin = vi.fn();
    seedRealtime({
      rejoinMatch: {
        matchId: 'M1',
        mode: 'ranked',
        opponent: { id: 'opp', username: 'Opp', avatarUrl: null },
        remainingReconnects: 2,
      },
      clearRejoinAvailable: clearRejoin,
    });
    renderShell();
    // The desktop banner button label is appShell.rejoinMatch
    const rejoinButtons = screen.getAllByText(/appShell.rejoinMatch/);
    fireEvent.click(rejoinButtons[0]);
    expect(startSessionMock).toHaveBeenCalledTimes(1);
    expect(setGameStageMock).toHaveBeenCalledWith('playing');
    expect(socketEmitMock).toHaveBeenCalledWith('match:rejoin', { matchId: 'M1' });
    expect(clearRejoin).toHaveBeenCalledTimes(1);
    expect(routerPushMock).toHaveBeenCalledWith('/game');
  });

  it('rejoin banner forfeit button → emits match:forfeit', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    seedRealtime({
      rejoinMatch: {
        matchId: 'MX',
        mode: 'ranked',
        opponent: { id: 'opp', username: 'Opp', avatarUrl: null },
        remainingReconnects: 0,
      },
    });
    renderShell();
    const buttons = screen.getAllByText(/appShell.forfeit/);
    fireEvent.click(buttons[0]);
    expect(socketEmitMock).toHaveBeenCalledWith('match:forfeit', { matchId: 'MX' });
  });

  it('friendly lobby banner → Return To Lobby pushes to /friend/room/:code', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    seedRealtime({
      lobby: {
        status: 'waiting',
        mode: 'friendly',
        inviteCode: 'ROOM1',
        lobbyId: 'L1',
        displayName: 'L',
        members: [],
      },
    });
    renderShell();
    const buttons = screen.getAllByText(/appShell.returnToLobby/);
    fireEvent.click(buttons[0]);
    expect(routerPushMock).toHaveBeenCalledWith('/friend/room/ROOM1');
  });

  it('lobby banner Leave → emits lobby:leave, resets realtime, clears ranked matchmaking', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    const reset = vi.fn();
    seedRealtime({
      lobby: {
        status: 'waiting',
        mode: 'friendly',
        inviteCode: 'ROOM2',
        lobbyId: 'L1',
        displayName: 'L',
        members: [],
      },
      reset,
    });
    renderShell();
    const leaves = screen.getAllByText(/appShell.leave/);
    fireEvent.click(leaves[0]);
    expect(socketEmitMock).toHaveBeenCalledWith('lobby:leave');
    expect(reset).toHaveBeenCalled();
    expect(clearRankedMatchmakingMock).toHaveBeenCalled();
  });

  it('completed-match banner View Results → routes to /game with finalResults stage', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    seedRealtime({
      match: {
        matchId: 'M9',
        mode: 'friendly',
        variant: 'friendly_possession',
        opponent: { id: 'opp', username: 'Winner', avatarUrl: null },
        finalResults: { winnerDecisionMethod: 'goals' },
      },
    });
    renderShell();
    const view = screen.getAllByText(/appShell.viewResults/);
    fireEvent.click(view[0]);
    expect(setGameStageMock).toHaveBeenCalledWith('finalResults');
    expect(routerPushMock).toHaveBeenCalledWith('/game');
  });

  it('completed-match banner Dismiss → resets realtime + clears ranked matchmaking', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    const reset = vi.fn();
    seedRealtime({
      match: {
        matchId: 'M9',
        mode: 'friendly',
        variant: 'friendly_possession',
        opponent: { id: 'opp', username: 'Winner', avatarUrl: null },
        finalResults: { winnerDecisionMethod: 'goals' },
      },
      reset,
    });
    renderShell();
    // Desktop variant uses the literal "Dismiss" label (not a translation key)
    const dismiss = screen.getAllByText('Dismiss');
    fireEvent.click(dismiss[0]);
    expect(reset).toHaveBeenCalled();
    expect(clearRankedMatchmakingMock).toHaveBeenCalled();
  });

  it('draft banner Return to Draft → starts session with skipDraftShowdown and routes to /game', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    seedRealtime({
      lobby: {
        status: 'active',
        mode: 'ranked',
        inviteCode: '',
        lobbyId: 'L4',
        displayName: 'L',
        members: [
          { userId: 'self-user', username: 'me', avatarUrl: null },
          { userId: 'opp', username: 'DraftOpp', avatarUrl: null },
        ],
      },
      draft: { state: 'in_progress' },
    });
    renderShell();
    const returns = screen.getAllByText(/appShell.returnToDraft/);
    fireEvent.click(returns[0]);
    expect(startSessionMock).toHaveBeenCalledTimes(1);
    const callArgs = startSessionMock.mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.mode).toBe('ranked');
    expect(callArgs.matchType).toBe('ranked');
    expect(callArgs.skipDraftShowdown).toBe(true);
    expect(setGameStageMock).toHaveBeenCalledWith('categoryBlocking');
    expect(routerPushMock).toHaveBeenCalledWith('/game');
  });

  it('ranked lobby Return to Matchmaking → starts session and routes to /game', () => {
    pathnameMock.mockReturnValue('/leaderboard');
    seedRealtime({
      lobby: {
        status: 'waiting',
        mode: 'ranked',
        inviteCode: '',
        lobbyId: 'L7',
        displayName: 'L',
        members: [],
      },
    });
    const { container } = renderShell();
    // Find the actual <button> with the appShell.returnToMatchmaking key
    // text (the body paragraph also matches the regex but isn't clickable).
    const buttons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent?.includes('appShell.returnToMatchmaking') && !b.textContent.includes('OrLeave'),
    );
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(startSessionMock).toHaveBeenCalledWith(expect.objectContaining({ mode: 'ranked' }));
    expect(setGameStageMock).toHaveBeenCalledWith('matchmaking');
    expect(routerPushMock).toHaveBeenCalledWith('/game');
  });
});

describe('AppShell — logout dialog wiring', () => {
  it('opens the logout dialog when a profile menu logout item is clicked', () => {
    renderShell();
    // The mock collapses the dropdown to a flat list of buttons. There are
    // multiple logOut items (desktop + mobile profile menus); clicking any
    // opens the dialog.
    const logoutItems = screen.getAllByText(/accountMenu.logOut$/);
    expect(logoutItems.length).toBeGreaterThan(0);
    fireEvent.click(logoutItems[0]);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('confirming the logout calls the auth store logout and routes home', async () => {
    const logoutSpy = vi.fn(async () => {});
    seedAuth({ logout: logoutSpy });
    renderShell();
    const logoutItems = screen.getAllByText(/accountMenu.logOut$/);
    fireEvent.click(logoutItems[0]);
    fireEvent.click(screen.getByTestId('logout-confirm'));
    // logout is async; wait a microtask for the await to settle.
    await Promise.resolve();
    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(routerReplaceMock).toHaveBeenCalledWith('/');
  });
});

describe('AppShell — chrome details', () => {
  it('renders the navbar currencies from the wallet query', () => {
    renderShell();
    expect(screen.getAllByText('1,500').length).toBeGreaterThan(0);
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
  });

  it('renders the user RP pill from the player context', () => {
    renderShell();
    // Format = "{rp}RP" desktop, "{rp} RP" mobile. Match the digits.
    expect(screen.getAllByText(/1234/).length).toBeGreaterThan(0);
  });
});
