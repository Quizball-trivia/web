import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const emitMock = vi.fn();
const socketHandlers = new Map<string, Set<() => void>>();
const socketMock = {
  connected: true,
  emit: emitMock,
  on: vi.fn((eventName: string, handler: () => void) => {
    if (!socketHandlers.has(eventName)) socketHandlers.set(eventName, new Set());
    socketHandlers.get(eventName)!.add(handler);
  }),
  off: vi.fn((eventName: string, handler: () => void) => {
    socketHandlers.get(eventName)?.delete(handler);
  }),
};

vi.mock('../socket-client', () => ({
  getSocket: () => socketMock,
}));

describe('useMatchStagePresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    emitMock.mockReset();
    socketMock.on.mockClear();
    socketMock.off.mockClear();
    socketHandlers.clear();
    socketMock.connected = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits ready once and heartbeats while the match stage is mounted', async () => {
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

  it('re-emits heartbeat and ready when the socket reconnects while mounted', async () => {
    const { useMatchStagePresence } = await import('../useMatchStagePresence');
    socketMock.connected = false;

    const { unmount } = renderHook(() => useMatchStagePresence({ matchId: 'm1', stageKey: 'resume' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(emitMock).not.toHaveBeenCalled();

    socketMock.connected = true;
    act(() => {
      socketHandlers.get('connect')?.forEach((handler) => handler());
    });

    expect(emitMock).toHaveBeenCalledWith('match:presence_heartbeat', {
      matchId: 'm1',
      stageKey: 'resume',
    });
    expect(emitMock).toHaveBeenCalledWith('match:stage_ready', {
      matchId: 'm1',
      stageKey: 'resume',
    });

    const connectHandler = [...(socketHandlers.get('connect') ?? [])][0];
    unmount();
    expect(socketMock.off).toHaveBeenCalledWith('connect', connectHandler);
  });
});
