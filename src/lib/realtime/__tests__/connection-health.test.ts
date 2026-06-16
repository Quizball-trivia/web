import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetRealtimeConnectionHealthForTests,
  getRealtimeConnectionHealth,
  markRealtimeConnected,
  markRealtimeDisconnected,
  markRealtimePingMissed,
  recordRealtimeRtt,
} from '../connection-health';

describe('realtime connection health', () => {
  beforeEach(() => {
    __resetRealtimeConnectionHealthForTests();
  });

  it('waits for stable RTT samples before showing a good tier', () => {
    markRealtimeConnected();
    recordRealtimeRtt(80);
    recordRealtimeRtt(90);

    expect(getRealtimeConnectionHealth().tier).toBe('unknown');

    recordRealtimeRtt(100);

    expect(getRealtimeConnectionHealth()).toMatchObject({
      connected: true,
      sampleCount: 3,
      tier: 'good',
    });
  });

  it('degrades on missed pongs and disconnects', () => {
    markRealtimeConnected();
    recordRealtimeRtt(80);
    recordRealtimeRtt(80);
    recordRealtimeRtt(80);

    markRealtimePingMissed();
    expect(getRealtimeConnectionHealth().tier).toBe('unstable');

    markRealtimePingMissed();
    expect(getRealtimeConnectionHealth().tier).toBe('bad');

    markRealtimeDisconnected('transport close');
    expect(getRealtimeConnectionHealth()).toMatchObject({
      connected: false,
      phase: 'disconnected',
      tier: 'bad',
    });
  });
});
