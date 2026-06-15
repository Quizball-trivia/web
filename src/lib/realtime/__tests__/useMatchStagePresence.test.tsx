import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const emitMock = vi.fn();
const socketMock = {
  connected: true,
  emit: emitMock,
};

vi.mock('../socket-client', () => ({
  getSocket: () => socketMock,
}));

describe('useMatchStagePresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_MATCH_STAGE_PRESENCE_ENABLED', 'true');
    emitMock.mockReset();
    socketMock.connected = true;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('emits ready once and heartbeats while the feature flag is enabled', async () => {
    const { useMatchStagePresence } = await import('../useMatchStagePresence');

    renderHook(() => useMatchStagePresence({ matchId: 'm1', stageKey: 'penalties' }));

    expect(emitMock).toHaveBeenCalledWith('match:presence_heartbeat', {
      matchId: 'm1',
      stageKey: 'penalties',
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(emitMock).toHaveBeenCalledWith('match:stage_ready', {
      matchId: 'm1',
      stageKey: 'penalties',
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });
    expect(emitMock.mock.calls.filter(([eventName]) => eventName === 'match:presence_heartbeat')).toHaveLength(2);
  });

  it('does not emit when the socket is disconnected', async () => {
    const { useMatchStagePresence } = await import('../useMatchStagePresence');
    socketMock.connected = false;

    renderHook(() => useMatchStagePresence({ matchId: 'm1', stageKey: 'resume' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });

    expect(emitMock).not.toHaveBeenCalled();
  });
});
