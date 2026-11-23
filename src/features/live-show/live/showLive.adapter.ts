/**
 * The Live Show screens read a `ShowState`; on the real night it comes from the Weekend League live server instead of
 * the simulator. These pure helpers translate the server's events (dispatch, reveal, boards) into the show's shapes.
 *
 * Server contract (host-run show events): every question is a WL `mcq` or `true_false` slot whose payload carries a
 * `show` block saying how to present it (zoom out, evolution, odd one out, fake fact…). Answers stay WL answers: the
 * option id, or 'true' / 'false'.
 */

import type { WlBoardRow, WlDispatchEventPayload, WlRevealEventPayload } from '@/lib/realtime/socket.types';
import { KIND_LABEL } from '../show.copy';
import type { BoardRow } from '../show.sim';
import type { Localized, ShowArt, ShowOption, ShowQuestion, ShowQuestionKind, ShowStageDef } from '../show.types';
import type { RevealStats } from '../useShowSim';

/** The kinds a live show can play tonight: one tap each, scored by the server like WL multiple choice. */
export type LiveShowKind = Extract<ShowQuestionKind, 'true_false' | 'mcq' | 'zoom_out' | 'evolution' | 'odd_one_out' | 'fake_fact'>;
const LIVE_KINDS: readonly LiveShowKind[] = ['true_false', 'mcq', 'zoom_out', 'evolution', 'odd_one_out', 'fake_fact'];

export interface ShowRound {
  kind: LiveShowKind;
  count: number;
  /** Pack round title (the round card shows it instead of the kind label). */
  title?: { ka: string; en: string };
  /** Elimination at the end of this round. */
  cut?: { keep_percent?: number; keep_count?: number };
}

/** Big rounds: every cut closes one. Returns, per pack round, its 1-based big-round number, and the total. */
export function bigRounds(rounds: readonly ShowRound[] | null | undefined): { of: number[]; total: number } {
  const of: number[] = [];
  let n = 1;
  for (const r of rounds ?? []) { of.push(n); if (r.cut) n += 1; }
  return { of, total: Math.max(1, (rounds?.length ?? 0) > 0 && rounds![rounds!.length - 1]!.cut ? n - 1 : n) };
}

type I18n = Partial<Record<string, string>>;

function localized(v: unknown, fallback = ''): Localized {
  if (typeof v === 'string') return { en: v, ka: v };
  if (v && typeof v === 'object') {
    const r = v as I18n;
    const en = r.en ?? r.ka ?? fallback;
    return { en, ka: r.ka ?? en };
  }
  return { en: fallback, ka: fallback };
}

function urlOf(v: unknown): string | null {
  if (typeof v === 'string' && v.length > 0) return v;
  if (v && typeof v === 'object' && typeof (v as { url?: unknown }).url === 'string') return (v as { url: string }).url;
  return null;
}

function artOf(v: unknown, fit: 'cover' | 'contain' = 'cover'): ShowArt | undefined {
  const src = urlOf(v);
  if (!src) return undefined;
  // A payload may say how to fit its picture: crests and kits want 'contain', photos 'cover'.
  const declared = v && typeof v === 'object' ? (v as { fit?: unknown }).fit : undefined;
  return { kind: 'image', src, fit: declared === 'contain' || declared === 'cover' ? declared : fit };
}

export const TRUE_FALSE_OPTIONS: ShowOption[] = [
  { id: 'true', label: { en: 'True', ka: 'მართალია' } },
  { id: 'false', label: { en: 'False', ka: 'მცდარია' } },
];

function isLiveKind(v: unknown): v is LiveShowKind {
  return typeof v === 'string' && (LIVE_KINDS as readonly string[]).includes(v);
}

/** The show kind a dispatch is presented as (its `show.kind`, else the WL kind). */
export function showKindOf(d: Pick<WlDispatchEventPayload, 'kind' | 'question'>): LiveShowKind {
  const show = (d.question?.['show'] ?? null) as { kind?: unknown } | null;
  if (isLiveKind(show?.kind)) return show.kind;
  return d.kind === 'true_false' ? 'true_false' : 'mcq';
}

/**
 * A dispatch as a show question. `correctId` is only known at the reveal (live dispatches carry no answer key); pass
 * it from the reveal's evaluation so the right option lights up.
 */
export function toShowQuestion(d: Pick<WlDispatchEventPayload, 'attempt_id' | 'kind' | 'question'>, correctId: string | null): ShowQuestion {
  const q = d.question ?? {};
  const show = (q['show'] ?? {}) as Record<string, unknown>;
  const kind = showKindOf(d);
  const prompt = localized(q['prompt']);
  const rawOptions = Array.isArray(q['options']) ? (q['options'] as Array<Record<string, unknown>>) : [];
  const options: ShowOption[] = kind === 'true_false'
    ? TRUE_FALSE_OPTIONS
    : rawOptions.map((o) => ({
      id: String(o['id']),
      label: localized(o['text'] ?? o['label']),
      art: artOf(o['image'], 'contain'),
    }));
  const base = { id: d.attempt_id, prompt, options, correctId: correctId ?? '' };
  if (kind === 'zoom_out') {
    const focus = show['focus'] as { x?: unknown; y?: unknown } | undefined;
    const clamp = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5);
    return {
      ...base,
      kind: 'zoom_out',
      art: artOf(q['image'] ?? show['image']) ?? { kind: 'image', src: '' },
      focus: { x: clamp(focus?.x), y: clamp(focus?.y) },
    };
  }
  if (kind === 'evolution') {
    const eras = (Array.isArray(show['eras']) ? (show['eras'] as Array<Record<string, unknown>>) : [])
      .map((e) => ({ year: Number(e['year']), art: artOf(e['image'], 'contain') }))
      .filter((e): e is { year: number; art: ShowArt } => Number.isFinite(e.year) && e.art != null);
    return { ...base, kind: 'evolution', subject: show['subject_kind'] === 'shirt' ? 'shirt' : 'crest', eras };
  }
  const subjectRaw = show['subject'] as { name?: unknown; image?: unknown } | undefined;
  const subject = subjectRaw && subjectRaw.name != null
    ? { name: localized(subjectRaw.name), art: artOf(subjectRaw.image) }
    : undefined;
  // A plain multiple-choice question may carry a picture: show it as the subject art.
  const picture = !subject && kind === 'mcq' ? artOf(q['image'], 'contain') : undefined;
  return {
    ...base,
    kind,
    subject: subject ?? (picture ? { name: { en: '' }, art: picture } : undefined),
  };
}

export function correctIdOf(reveal: Pick<WlRevealEventPayload, 'evaluation'> | null | undefined): string | null {
  const v = reveal?.evaluation?.['correct_id'];
  return typeof v === 'string' ? v : typeof v === 'boolean' ? String(v) : null;
}

/** The reveal's answer split, as the show's reveal stats. */
export function toRevealStats(reveal: Pick<WlRevealEventPayload, 'answered' | 'distribution' | 'evaluation'>): RevealStats {
  const answered = Math.max(0, Number(reveal.answered) || 0);
  const dist = reveal.distribution ?? {};
  const total = Math.max(1, answered || Object.values(dist).reduce((s, n) => s + (Number(n) || 0), 0));
  const shares: Record<string, number> = {};
  for (const [id, n] of Object.entries(dist)) shares[id] = (Number(n) || 0) / total;
  const correct = correctIdOf(reveal);
  return {
    shares,
    answered,
    correctShare: correct != null ? shares[correct] ?? 0 : 0,
    values: [],
    minesFoundAvg: 0,
    minesHitShare: 0,
  };
}

const FALLBACK_NAME = { en: 'Player', ka: 'მოთამაშე' };

export function toBoard(rows: readonly WlBoardRow[], locale: 'en' | 'ka'): BoardRow[] {
  return [...rows]
    .sort((a, b) => a.rank - b.rank)
    .map((r) => ({
      id: r.user_id,
      name: r.nickname?.trim() || `${FALLBACK_NAME[locale]} ${r.rank}`,
      points: r.points,
      timeMs: r.time_ms_total,
      rank: r.rank,
    }));
}

/** Round definitions for headers and round cards: from the server layout, else from what has been dispatched. */
export function toStages(rounds: readonly ShowRound[] | null | undefined, seen: ReadonlyMap<number, ShowRound>): ShowStageDef[] {
  const layout: ShowRound[] = rounds && rounds.length > 0
    ? rounds.filter((r) => isLiveKind(r.kind) && r.count > 0)
    // Keep each round at its server index: a late joiner who first sees round 3 must not read it as round 1.
    : Array.from({ length: seen.size ? Math.max(...seen.keys()) + 1 : 0 }, (_, i) => seen.get(i) ?? { kind: 'mcq' as const, count: 1 });
  return layout.map((r, i) => ({
    id: `round-${i}`,
    title: r.title ? { en: r.title.en, ka: r.title.ka } : KIND_LABEL[r.kind],
    // The round card lists the kinds it plays; one is enough to label it.
    questions: Array.from({ length: r.count }, (_, q) => (
      { id: `round-${i}-${q}`, kind: r.kind, prompt: { en: '' }, options: [], correctId: '' } as unknown as ShowQuestion
    )),
  }));
}
