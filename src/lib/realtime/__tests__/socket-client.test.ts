/**
 * Socket auth/reconnect reliability tests.
 *
 * Prod incident background: Supabase access tokens expire ~1h after login in
 * cohorts; clients drop + reconnect their sockets en masse. Before the fix,
 * automatic reconnects replayed the stale token ("Token introspection failed"
 * storms) and the auth-recovery path permanently replaced the dynamic auth
 * callback with a frozen static token. These tests pin the fixed behavior.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ioMock = vi.fn();
const getSupabaseAccessTokenMock = vi.fn();
const refreshSessionMock = vi.fn();

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

vi.mock('@/lib/auth/supabase', () => ({
  getSupabaseAccessToken: (...args: unknown[]) => getSupabaseAccessTokenMock(...args),
  getSupabaseClient: () => ({ auth: { refreshSession: refreshSessionMock } }),
}));

vi.mock('@/lib/analytics/game-events', () => ({
  trackSocketConnectionFailed: vi.fn(),
}));

type FakeSocket = {
  id: string | null;
  connected: boolean;
  active: boolean;
  auth?: unknown;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  io: { on: ReturnType<typeof vi.fn> };
};

function makeJwt(claims: Record<string, number>): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `header.${payload}.sig`;
}

function createFakeSocket(): { socket: FakeSocket; handlers: Map<string, (...args: unknown[]) => void>; managerHandlers: Map<string, (...args: unknown[]) => void> } {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const managerHandlers = new Map<string, (...args: unknown[]) => void>();
  const socket: FakeSocket = {
    id: null,
    connected: false,
    active: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
      return socket;
    }),
    io: {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        managerHandlers.set(event, handler);
      }),
    },
  };
  return { socket, handlers, managerHandlers };
}

describe('socket-client auth/reconnect reliability', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup() {
    const fake = createFakeSocket();
    let capturedOptions: { auth?: (cb: (data: { token?: string }) => void) => void } = {};
    ioMock.mockImplementation((_url: string, options: typeof capturedOptions) => {
      capturedOptions = options;
      return fake.socket;
    });
    const mod = await import('../socket-client');
    const socket = mod.getSocket();
    return { ...fake, mod, capturedOptions, returnedSocket: socket };
  }

  it('auth callback refreshes an expiring token before every connection attempt', async () => {
    const expiring = makeJwt({ exp: Math.floor((Date.now() + 10_000) / 1000), iat: Math.floor(Date.now() / 1000) - 600 });
    getSupabaseAccessTokenMock.mockResolvedValue(expiring);
    refreshSessionMock.mockResolvedValue({ data: { session: { access_token: 'fresh-token' } }, error: null });

    const { capturedOptions } = await setup();
    expect(capturedOptions.auth).toBeTypeOf('function');

    const cb = vi.fn();
    capturedOptions.auth!(cb);
    await vi.runAllTimersAsync();

    // The stale-but-expiring token must NOT be replayed; the refreshed one is sent.
    expect(refreshSessionMock).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ token: 'fresh-token' });
  });

  it('auth callback passes a healthy token through without refreshing', async () => {
    const healthy = makeJwt({ exp: Math.floor((Date.now() + 3_600_000) / 1000), iat: Math.floor(Date.now() / 1000) - 600 });
    getSupabaseAccessTokenMock.mockResolvedValue(healthy);

    const { capturedOptions } = await setup();
    const cb = vi.fn();
    capturedOptions.auth!(cb);
    await vi.runAllTimersAsync();

    expect(refreshSessionMock).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ token: healthy });
  });

  it('auth recovery after connect_error never replaces the dynamic auth callback with a static token', async () => {
    const healthy = makeJwt({ exp: Math.floor((Date.now() + 3_600_000) / 1000), iat: Math.floor(Date.now() / 1000) - 600 });
    getSupabaseAccessTokenMock.mockResolvedValue(healthy);

    const { socket, handlers } = await setup();
    const connectError = handlers.get('connect_error');
    expect(connectError).toBeTypeOf('function');

    connectError!(new Error('Invalid token'));
    await vi.runAllTimersAsync();

    // Regression: socket.auth = { token } here froze one token into every
    // future automatic reconnect. The property must remain untouched.
    expect(socket.auth).toBeUndefined();
    expect(socket.connect).toHaveBeenCalled();
  });

  it('registers reconnect lifecycle listeners on the manager, not the socket', async () => {
    getSupabaseAccessTokenMock.mockResolvedValue(null);
    const { managerHandlers } = await setup();

    // socket.on('reconnect_attempt') never fires in socket.io-client v4 —
    // these belong to the Manager.
    expect(managerHandlers.has('reconnect_attempt')).toBe(true);
    expect(managerHandlers.has('reconnect_failed')).toBe(true);
  });

  it('nudgeSocketReconnectAfterTokenRefresh connects a disconnected socket and no-ops when reconnecting', async () => {
    const healthy = makeJwt({ exp: Math.floor((Date.now() + 3_600_000) / 1000), iat: Math.floor(Date.now() / 1000) - 600 });
    getSupabaseAccessTokenMock.mockResolvedValue(healthy);

    const { socket, mod } = await setup();

    // Disconnected + idle -> nudge connects.
    socket.connected = false;
    socket.active = false;
    mod.nudgeSocketReconnectAfterTokenRefresh();
    await vi.runAllTimersAsync();
    expect(socket.connect).toHaveBeenCalledTimes(1);

    // Already reconnecting (active) -> no extra connect.
    socket.active = true;
    mod.nudgeSocketReconnectAfterTokenRefresh();
    await vi.runAllTimersAsync();
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it('nudgeSocketReconnectAfterTokenRefresh does not create a socket when none exists', async () => {
    vi.resetModules();
    ioMock.mockClear();
    const mod = await import('../socket-client');
    mod.nudgeSocketReconnectAfterTokenRefresh();
    expect(ioMock).not.toHaveBeenCalled();
  });

  it('connection quality monitor ignores in-flight ping acknowledgements after stop', async () => {
    const { socket, mod } = await setup();
    const health = await import('../connection-health');
    let pingAck: (() => void) | undefined;
    socket.connected = true;
    socket.id = 'socket-1';
    socket.emit.mockImplementation((_eventName: string, _payload: unknown, ack?: () => void) => {
      pingAck = ack;
    });
    health.__resetRealtimeConnectionHealthForTests();
    health.markRealtimeConnected();

    mod.startConnectionQualityMonitor();
    mod.stopConnectionQualityMonitor();
    pingAck?.();
    await vi.advanceTimersByTimeAsync(2500);

    expect(health.getRealtimeConnectionHealth()).toMatchObject({
      sampleCount: 0,
      missedPongs: 0,
    });
  });

  it('connection quality monitor ignores stale callbacks after socket id changes', async () => {
    const { socket, mod } = await setup();
    const health = await import('../connection-health');
    let pingAck: (() => void) | undefined;
    socket.connected = true;
    socket.id = 'socket-1';
    socket.emit.mockImplementation((_eventName: string, _payload: unknown, ack?: () => void) => {
      pingAck = ack;
    });
    health.__resetRealtimeConnectionHealthForTests();
    health.markRealtimeConnected();

    mod.startConnectionQualityMonitor();
    socket.id = 'socket-2';
    pingAck?.();
    await vi.advanceTimersByTimeAsync(2500);
    mod.stopConnectionQualityMonitor();

    expect(health.getRealtimeConnectionHealth()).toMatchObject({
      sampleCount: 0,
      missedPongs: 0,
    });
  });
});

describe('reconnect storm protection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setupStorm() {
    const fake = createFakeSocket();
    ioMock.mockImplementation(() => fake.socket);
    getSupabaseAccessTokenMock.mockResolvedValue(
      makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) - 600 }),
    );
    const mod = await import('../socket-client');
    mod.getSocket();
    const analytics = await import('@/lib/analytics/game-events');
    return { ...fake, mod, trackFailed: vi.mocked(analytics.trackSocketConnectionFailed) };
  }

  it('backs off auth-recovery retries exponentially instead of a fixed 1s loop', async () => {
    const { handlers, socket } = await setupStorm();
    const authError = { message: 'Authentication required' };

    // Failure 1: retries after ~1s.
    handlers.get('connect_error')!(authError);
    await vi.advanceTimersByTimeAsync(1_100);
    expect(socket.connect).toHaveBeenCalledTimes(1);

    // Failure 2: the next retry must wait ~2s, NOT fire at 1s again.
    handlers.get('connect_error')!(authError);
    await vi.advanceTimersByTimeAsync(1_100);
    expect(socket.connect).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_100);
    expect(socket.connect).toHaveBeenCalledTimes(2);

    // Failure 3: ~4s.
    handlers.get('connect_error')!(authError);
    await vi.advanceTimersByTimeAsync(2_200);
    expect(socket.connect).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2_200);
    expect(socket.connect).toHaveBeenCalledTimes(3);
  });

  it('resets the auth-recovery backoff after a successful connect', async () => {
    const { handlers, socket } = await setupStorm();
    const authError = { message: 'Authentication required' };

    handlers.get('connect_error')!(authError);
    await vi.advanceTimersByTimeAsync(1_100);
    handlers.get('connect_error')!(authError);
    await vi.advanceTimersByTimeAsync(2_200);
    expect(socket.connect).toHaveBeenCalledTimes(2);

    handlers.get('connect')!();

    // Backoff ladder reset: next failure retries at the base ~1s again.
    handlers.get('connect_error')!(authError);
    await vi.advanceTimersByTimeAsync(1_100);
    expect(socket.connect).toHaveBeenCalledTimes(3);
  });

  it('throttles connection-failure analytics to a burst per window and reports the suppressed count', async () => {
    const { handlers, trackFailed } = await setupStorm();

    // A retry storm: 25 non-auth failures in one window.
    for (let i = 0; i < 25; i += 1) {
      handlers.get('connect_error')!({ message: 'websocket error' });
    }
    expect(trackFailed).toHaveBeenCalledTimes(10);

    // Next window: the first allowed event carries the suppressed tally.
    await vi.advanceTimersByTimeAsync(61_000);
    handlers.get('connect_error')!({ message: 'websocket error' });
    expect(trackFailed).toHaveBeenCalledTimes(11);
    expect(trackFailed).toHaveBeenLastCalledWith('websocket error (+15 suppressed)');
  });
});
