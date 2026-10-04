import { describe, it, expect } from 'vitest';
import { differsFromGeorgiaClock, formatStageWhen, formatWlTime } from '../wlTime';
import { getMilestones } from '../mock-data';
import en from '@/messages/en.json';
import ka from '@/messages/ka.json';
import es from '@/messages/es.json';
import tr from '@/messages/tr.json';

// GE = UTC+4 fixed. Build a UTC ms from a Georgia wall-clock ISO string.
const geMs = (iso: string) => Date.parse(`${iso}Z`) - 4 * 60 * 60 * 1000;
const GE = 'Asia/Tbilisi';

describe('formatStageWhen', () => {
  it('renders an exact-midnight deadline as the PREVIOUS day 24:00', () => {
    const satMidnight = geMs('2026-09-05T00:00:00'); // Sat 00:00 GE
    expect(formatStageWhen(satMidnight, 'en', GE)).toBe('Fri 24:00');
    expect(formatStageWhen(satMidnight, 'ka', GE)).toBe('პარ. 24:00');
  });

  it('one millisecond before midnight is still the same day', () => {
    const friLate = geMs('2026-09-05T00:00:00') - 1;
    expect(formatStageWhen(friLate, 'en', GE)).toBe('Fri 23:59');
  });

  it('an ordinary time keeps its own day, in every app language', () => {
    const satKickoff = geMs('2026-10-10T22:00:00');
    expect(formatStageWhen(satKickoff, 'en', GE)).toBe('Sat 22:00');
    expect(formatStageWhen(satKickoff, 'ka', GE)).toBe('შაბ. 22:00');
    expect(formatStageWhen(satKickoff, 'es', GE)).toBe('Sáb 22:00');
    expect(formatStageWhen(satKickoff, 'tr', GE)).toBe('Cmt 22:00');
    expect(formatStageWhen(satKickoff, 'fr', GE)).toBe('Sat 22:00');
  });

  it('prints the same instant on each viewer\'s own clock', () => {
    const satKickoff = geMs('2026-10-10T22:00:00');
    expect(formatStageWhen(satKickoff, 'es', 'America/Bogota')).toBe('Sáb 13:00');
    expect(formatStageWhen(satKickoff, 'es', 'America/Argentina/Buenos_Aires')).toBe('Sáb 15:00');
    expect(formatStageWhen(satKickoff, 'es', 'America/Mexico_City')).toBe('Sáb 12:00');
    expect(formatStageWhen(satKickoff, 'es', 'Europe/Madrid')).toBe('Sáb 20:00');
    expect(formatStageWhen(satKickoff, 'tr', 'Europe/Istanbul')).toBe('Cmt 21:00');
  });

  it('follows daylight-saving changes in the viewer\'s zone', () => {
    // Europe leaves summer time on 2026-10-25: the same Georgia hour is an hour earlier in Madrid.
    expect(formatWlTime(geMs('2026-10-24T22:00:00'), 'Europe/Madrid')).toBe('20:00');
    expect(formatWlTime(geMs('2026-10-31T22:00:00'), 'Europe/Madrid')).toBe('19:00');
  });

  it('uses the viewer\'s weekday when the instant falls on another day there', () => {
    const satKickoff = geMs('2026-10-10T22:00:00');
    expect(formatStageWhen(satKickoff, 'en', 'Asia/Tokyo')).toBe('Sun 03:00');
    // Georgia's Friday-midnight entry close is still Friday evening further west.
    expect(formatStageWhen(geMs('2026-10-10T00:00:00'), 'es', 'Europe/Madrid')).toBe('Vie 22:00');
    // ...and a viewer whose own clock reads midnight gets the 24:00 form.
    expect(formatStageWhen(geMs('2026-10-10T22:00:00'), 'en', 'Asia/Dhaka')).toBe('Sat 24:00');
  });

  it('only an EXACT midnight borrows the previous day; later in that minute is the new day', () => {
    expect(formatStageWhen(geMs('2026-10-10T00:00:00'), 'en', GE)).toBe('Fri 24:00');
    expect(formatStageWhen(geMs('2026-10-10T00:00:30'), 'en', GE)).toBe('Sat 00:00');
  });
});

describe('differsFromGeorgiaClock', () => {
  const satKickoff = geMs('2026-10-10T22:00:00');

  it('is false for a viewer on Georgia time or a zone with the same offset', () => {
    expect(differsFromGeorgiaClock(satKickoff, GE)).toBe(false);
    expect(differsFromGeorgiaClock(satKickoff, 'Asia/Dubai')).toBe(false);
  });

  it('is true for a viewer whose clock reads differently', () => {
    expect(differsFromGeorgiaClock(satKickoff, 'America/Bogota')).toBe(true);
    expect(differsFromGeorgiaClock(satKickoff, 'Europe/Madrid')).toBe(true);
  });
});

describe('weekly calendar fallback', () => {
  it('kicks off Saturday and Sunday at 22:00 Georgia time, entry closing Friday midnight', () => {
    const m = getMilestones(geMs('2026-10-07T12:00:00'));
    expect(new Date(m.entry.targetMs).toISOString()).toBe('2026-10-09T20:00:00.000Z');
    expect(new Date(m.qualifier.targetMs).toISOString()).toBe('2026-10-10T18:00:00.000Z');
    expect(new Date(m.playoffs.targetMs).toISOString()).toBe('2026-10-11T18:00:00.000Z');
  });

  it('rolls to next week once entry has closed, even before Saturday\'s kickoff', () => {
    const m = getMilestones(geMs('2026-10-10T15:00:00'));
    expect(new Date(m.qualifier.targetMs).toISOString()).toBe('2026-10-17T18:00:00.000Z');
  });
});

describe('Weekend League copy', () => {
  const WHEN = ['step2Body', 'step3Body', 'gSunday', 'sTop25Final', 'qBody'] as const;
  const WEEKDAY = /saturday|sunday|friday|sábado|domingo|viernes|შაბათ|კვირას|კვირა ·|პარასკევ|cumartesi|pazar|cuma/i;

  it.each([['en', en], ['ka', ka], ['es', es], ['tr', tr]] as const)('%s states no fixed hour, and no weekday beside a converted time', (_locale, messages) => {
    const wl = messages.weekendLeague as Record<string, string>;
    // Weekday and hour arrive together in {when}/{deadline}: a weekday word left
    // in the sentence would be wrong wherever the instant is another day.
    for (const key of WHEN) {
      expect(wl[key]).toContain('{when}');
      expect(wl[key]).not.toMatch(WEEKDAY);
    }
    expect(wl.step1Body).toContain('{deadline}');
    expect(wl.step1Body).not.toMatch(WEEKDAY);
    expect(wl.gCheckinBody).toContain('{time}');
    expect(wl.localTimeNote).toBeTruthy();
    expect(Object.values(wl).filter((value) => /14:00|13:50|22:00/.test(value))).toEqual([]);
    for (const removed of ['qualifierShort', 'playoffsShort', 'qualifyingShort']) expect(wl[removed]).toBeUndefined();
  });
});
