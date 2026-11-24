import { describe, expect, it } from 'vitest';
import { correctIdOf, showKindOf, toBoard, toRevealStats, toShowQuestion, toStages } from '../showLive.adapter';
import { phaseOf } from '@/features/live-event/OrshabatobaShow';

const ka = (t: string) => ({ en: t, ka: t });
const opts = [{ id: 'a', text: ka('A') }, { id: 'b', text: ka('B') }];

describe('showLive adapter', () => {
  it('presents a dispatch by its show.kind, else by the WL kind', () => {
    expect(showKindOf({ kind: 'mcq', question: { show: { kind: 'zoom_out' } } })).toBe('zoom_out');
    expect(showKindOf({ kind: 'true_false', question: {} })).toBe('true_false');
    expect(showKindOf({ kind: 'mcq', question: { show: { kind: 'mines' } } })).toBe('mcq');
  });

  it('builds true/false with fixed true/false option ids', () => {
    const q = toShowQuestion({ attempt_id: 'x', kind: 'true_false', question: { prompt: ka('?') } }, 'true');
    expect(q.kind).toBe('true_false');
    expect('options' in q && q.options.map((o) => o.id)).toEqual(['true', 'false']);
    expect('correctId' in q && q.correctId).toBe('true');
  });

  it('builds zoom out with the image and a clamped focus', () => {
    const q = toShowQuestion({ attempt_id: 'x', kind: 'mcq', question: { prompt: ka('?'), options: opts, image: { url: 'https://i/a.webp' }, show: { kind: 'zoom_out', focus: { x: 2, y: 0.3 } } } }, null);
    expect(q.kind).toBe('zoom_out');
    if (q.kind !== 'zoom_out') return;
    expect(q.art).toMatchObject({ kind: 'image', src: 'https://i/a.webp' });
    expect(q.focus).toEqual({ x: 1, y: 0.3 });
    expect(q.correctId).toBe('');
  });

  it('builds evolution eras oldest first and drops eras without a picture', () => {
    const q = toShowQuestion({ attempt_id: 'x', kind: 'mcq', question: { prompt: ka('?'), options: opts, show: { kind: 'evolution', eras: [
      { year: 1950, image: { url: 'u1' } }, { year: 1990 }, { year: 2020, image: 'u3' },
    ] } } }, 'a');
    expect(q.kind === 'evolution' && q.eras.map((e) => e.year)).toEqual([1950, 2020]);
  });

  it('keeps a fake fact subject', () => {
    const q = toShowQuestion({ attempt_id: 'x', kind: 'mcq', question: { prompt: ka('?'), options: opts, show: { kind: 'fake_fact', subject: { name: ka('Messi') } } } }, null);
    expect(q.kind === 'fake_fact' && q.subject?.name.ka).toBe('Messi');
  });

  it('turns the reveal distribution into shares and the correct share', () => {
    const r = toRevealStats({ answered: 4, distribution: { a: 3, b: 1 }, evaluation: { correct_id: 'a' } });
    expect(r.shares).toEqual({ a: 0.75, b: 0.25 });
    expect(r.correctShare).toBe(0.75);
    expect(correctIdOf({ evaluation: { correct_id: true } })).toBe('true');
  });

  it('names board rows, falling back when a nickname is missing', () => {
    const b = toBoard([{ user_id: 'u2', nickname: null, points: 5, time_ms_total: 1, rank: 2 }, { user_id: 'u1', nickname: 'Nika', points: 9, time_ms_total: 1, rank: 1 }], 'ka');
    expect(b.map((r) => r.name)).toEqual(['Nika', 'მოთამაშე 2']);
  });

  it('round headers follow the server layout, else what was seen', () => {
    expect(toStages([{ kind: 'zoom_out', count: 3 }], new Map())[0]!.questions).toHaveLength(3);
    const seen = toStages(null, new Map([[1, { kind: 'mcq' as const, count: 2 }], [0, { kind: 'true_false' as const, count: 4 }]]));
    expect(seen.map((s) => s.questions.length)).toEqual([4, 2]);
  });
});

describe('phaseOf', () => {
  it('lobby before Start, countdown after it, game once the stream shows anything', () => {
    expect(phaseOf('entry_open', null, 'waiting')).toBe('pregame');
    expect(phaseOf('checkin', 123, 'waiting')).toBe('countdown');
    expect(phaseOf('entry_closed', 123, 'waiting')).toBe('countdown');
    expect(phaseOf('game_live', 123, 'waiting')).toBe('game');
    expect(phaseOf('checkin', 123, 'question')).toBe('game');
    expect(phaseOf(null, null, 'waiting')).toBe('pregame');
  });
});
