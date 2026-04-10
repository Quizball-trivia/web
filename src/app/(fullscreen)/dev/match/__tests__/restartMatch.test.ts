import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ErrorPayload, SessionStatePayload } from '@/lib/realtime/socket.types';

const socketMock = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('@/lib/realtime/socket-client', () => ({
  getSocket: () => socketMock,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe('waitForMatchLeaveConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits match:leave and resolves only after session state clears the active match', async () => {
    const listeners = new Map<string, ((payload: unknown) => void)[]>();
    socketMock.on.mockImplementation((event: string, handler: (payload: unknown) => void) => {
      listeners.set(event, [...(listeners.get(event) ?? []), handler]);
    });
    socketMock.off.mockImplementation((event: string, handler: (payload: unknown) => void) => {
      listeners.set(event, (listeners.get(event) ?? []).filter((entry) => entry !== handler));
    });

    const { waitForMatchLeaveConfirmation } = await import('../restartMatch');
    const pending = waitForMatchLeaveConfirmation('match-1');

    expect(socketMock.emit).toHaveBeenCalledWith('match:leave', { matchId: 'match-1' });

    const sameMatchState: SessionStatePayload = {
      state: 'IN_ACTIVE_MATCH',
      activeMatchId: 'match-1',
      waitingLobbyId: null,
      queueSearchId: null,
      openLobbyIds: [],
      resolvedAt: new Date().toISOString(),
    };
    listeners.get('session:state')?.forEach((handler) => handler(sameMatchState));

    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    const leftState: SessionStatePayload = {
      ...sameMatchState,
      state: 'IDLE',
      activeMatchId: null,
    };
    listeners.get('session:state')?.forEach((handler) => handler(leftState));

    await expect(pending).resolves.toBeUndefined();
  });

  it('treats MATCH_NOT_ACTIVE as already confirmed', async () => {
    const listeners = new Map<string, ((payload: unknown) => void)[]>();
    socketMock.on.mockImplementation((event: string, handler: (payload: unknown) => void) => {
      listeners.set(event, [...(listeners.get(event) ?? []), handler]);
    });
    socketMock.off.mockImplementation((event: string, handler: (payload: unknown) => void) => {
      listeners.set(event, (listeners.get(event) ?? []).filter((entry) => entry !== handler));
    });

    const { waitForMatchLeaveConfirmation } = await import('../restartMatch');
    const pending = waitForMatchLeaveConfirmation('match-1');

    const payload: ErrorPayload = {
      code: 'MATCH_NOT_ACTIVE',
      message: 'No active match to leave',
    };
    listeners.get('error')?.forEach((handler) => handler(payload));

    await expect(pending).resolves.toBeUndefined();
  });
});
