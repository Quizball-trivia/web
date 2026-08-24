import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
}

function fireVisibilityChange(state: 'visible' | 'hidden') {
  setVisibility(state);
  document.dispatchEvent(new Event('visibilitychange'));
}

function fireConnect() {
  socketHandlers.get('connect')?.forEach((handler) => handler());
}

describe('useMatchVisibilitySignals', () => {
  beforeEach(() => {
    vi.resetModules();
    emitMock.mockReset();
    socketMock.on.mockClear();
    socketMock.off.mockClear();
    socketHandlers.clear();
    socketMock.connected = true;
    setVisibility('visible');
  });

  it('emits transitions and dedupes consecutive identical signals', async () => {
    const { useMatchVisibilitySignals } = await import('../useMatchVisibilitySignals');
    renderHook(() => useMatchVisibilitySignals({ matchId: 'm1' }));

    act(() => {
      fireVisibilityChange('hidden');
      fireVisibilityChange('hidden');
      fireVisibilityChange('visible');
    });

    expect(emitMock.mock.calls).toEqual([
      ['match:visibility_signal', { matchId: 'm1', signal: 'hidden' }],
      ['match:visibility_signal', { matchId: 'm1', signal: 'visible' }],
    ]);
  });

  it('does not advance state while disconnected and re-establishes it on connect', async () => {
    const { useMatchVisibilitySignals } = await import('../useMatchVisibilitySignals');
    renderHook(() => useMatchVisibilitySignals({ matchId: 'm1' }));

    socketMock.connected = false;
    act(() => {
      fireVisibilityChange('hidden');
    });
    expect(emitMock).not.toHaveBeenCalled();

    socketMock.connected = true;
    act(() => {
      fireConnect();
    });
    // Current state (still hidden) is emitted after reconnect, so the
    // server-side episode is not left dangling.
    expect(emitMock.mock.calls).toEqual([
      ['match:visibility_signal', { matchId: 'm1', signal: 'hidden' }],
    ]);
  });

  it('cleans up listeners and stops emitting after unmount or when disabled', async () => {
    const { useMatchVisibilitySignals } = await import('../useMatchVisibilitySignals');

    const { unmount } = renderHook(() => useMatchVisibilitySignals({ matchId: 'm1' }));
    unmount();
    act(() => {
      fireVisibilityChange('hidden');
    });
    expect(emitMock).not.toHaveBeenCalled();
    expect(socketMock.off).toHaveBeenCalled();

    renderHook(() => useMatchVisibilitySignals({ matchId: 'm1', enabled: false }));
    act(() => {
      fireVisibilityChange('visible');
    });
    expect(emitMock).not.toHaveBeenCalled();
  });
});
