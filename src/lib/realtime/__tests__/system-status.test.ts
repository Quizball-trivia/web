import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applySystemStatus,
  getSystemStatus,
  __resetSystemStatusForTests,
  BACK_ONLINE_VISIBLE_MS,
} from '@/lib/realtime/system-status';

afterEach(() => {
  __resetSystemStatusForTests();
  vi.useRealTimers();
});

describe('system-status store', () => {
  it('starts healthy', () => {
    const s = getSystemStatus();
    expect(s.degraded).toBe(false);
    expect(s.matchmaking).toBe('available');
    expect(s.recoveredUntilMs).toBeNull();
  });

  it('applies a degraded snapshot', () => {
    applySystemStatus({ degraded: true, reason: 'db_write_outage', matchmaking: 'paused', sinceMs: 1 });
    const s = getSystemStatus();
    expect(s.degraded).toBe(true);
    expect(s.matchmaking).toBe('paused');
    expect(s.recoveredUntilMs).toBeNull();
  });

  it('arms the recovery pulse ONLY on a degraded → healthy edge', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    // A healthy snapshot while already healthy must NOT arm the pulse.
    applySystemStatus({ degraded: false, reason: null, matchmaking: 'available', sinceMs: null });
    expect(getSystemStatus().recoveredUntilMs).toBeNull();

    applySystemStatus({ degraded: true, reason: 'db_write_outage', matchmaking: 'paused', sinceMs: 500 });
    // Now recover: the edge arms the pulse.
    applySystemStatus({ degraded: false, reason: null, matchmaking: 'available', sinceMs: null });
    expect(getSystemStatus().recoveredUntilMs).toBe(1_000 + BACK_ONLINE_VISIBLE_MS);
  });

  it('clears the pulse when it goes degraded again', () => {
    applySystemStatus({ degraded: true, reason: 'db_write_outage', matchmaking: 'paused', sinceMs: 1 });
    applySystemStatus({ degraded: false, reason: null, matchmaking: 'available', sinceMs: null });
    expect(getSystemStatus().recoveredUntilMs).not.toBeNull();
    applySystemStatus({ degraded: true, reason: 'db_write_outage', matchmaking: 'paused', sinceMs: 2 });
    expect(getSystemStatus().recoveredUntilMs).toBeNull();
  });
});
