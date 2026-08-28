import { describe, it, expect } from 'vitest';
import { formatStageWhen } from '../components/ScheduleTimeline';

// GE = UTC+4 fixed. Build a UTC ms from a Georgia wall-clock ISO string.
const geMs = (iso: string) => Date.parse(`${iso}Z`) - 4 * 60 * 60 * 1000;

describe('formatStageWhen', () => {
  it('renders an exact-midnight deadline as the PREVIOUS day 24:00', () => {
    const satMidnight = geMs('2026-09-05T00:00:00'); // Sat 00:00 GE
    expect(formatStageWhen(satMidnight, '00:00', 'en')).toBe('Fri 24:00');
    expect(formatStageWhen(satMidnight, '00:00', 'ka')).toBe('პარ. 24:00');
  });

  it('one millisecond before midnight is still the same day', () => {
    const friLate = geMs('2026-09-05T00:00:00') - 1;
    expect(formatStageWhen(friLate, '23:59', 'en')).toBe('Fri 23:59');
  });

  it('an ordinary afternoon time keeps its own day', () => {
    const satKickoff = geMs('2026-09-05T14:00:00');
    expect(formatStageWhen(satKickoff, '14:00', 'en')).toBe('Sat 14:00');
    expect(formatStageWhen(satKickoff, '14:00', 'ka')).toBe('შაბ. 14:00');
  });
});
