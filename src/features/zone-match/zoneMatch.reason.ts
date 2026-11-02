/**
 * Why the ball moved: the cause → effect line shown with every duel result — in the 3D view (✓ / ✗ over each player,
 * an arrow along the pitch with this label) and on the 2D result card, so the two always agree. Everything is read off
 * the settled duel (outcome, outcomeFrom, outcomeNote, the answers, the result cards); no rule is re-derived here.
 */

import { CARD_BY_ID, type CardId } from './zoneMatch.cards';
import { GLOVES_SAVE_NOTE, type MatchState } from './zoneMatch.machine';
import { mirrorZone, otherZoneSide, pitchColumn, type AttackZone, type BattleOutcome, type Possession, type ZoneSide } from './zoneMatch.rules';

export type Mark = 'right' | 'wrong' | null;

export interface OutcomeReason {
  /** e.g. "✓ vs ✗ — clean steal: +1 zone". */
  line: string;
  /** Who answered right / wrong (null: no question was played, e.g. a Goalkeeper Gloves save). */
  marks: Record<ZoneSide, Mark>;
  /** Pitch columns (0 your side … 2 their side; −1 / 3 = inside your / their goal): where it was won → where it ends. */
  fromColumn: number;
  toColumn: number;
  /** The side the move favours (its colour on the pitch). */
  side: ZoneSide;
  /** forward: the ball travels; spot: the turn changes on the spot; held: no ground; goal: into the net. */
  kind: 'forward' | 'spot' | 'held' | 'goal';
  /** Zones travelled (forward and goal moves). */
  zones: number;
}

const ZONE_STEP: Record<AttackZone, number> = { own: 0, centre: 1, opponent: 2 };

/** How many zones a change of possession carried the ball forward (0: the turn changed on the spot). */
export function stealStep(from: Possession, outcome: BattleOutcome): number {
  if (outcome.kind !== 'turnover') return 0;
  return ZONE_STEP[outcome.next.zone] - ZONE_STEP[mirrorZone(from.zone)];
}

const zonesWord = (n: number) => `+${n} zone${n === 1 ? '' : 's'}`;

/** The reason for the settled duel on screen, or null outside a result. */
export function outcomeReason(state: Pick<MatchState, 'battleStep' | 'outcome' | 'outcomeFrom' | 'outcomeNote' | 'mcq' | 'numeric' | 'cardEvents' | 'duelNo'>): OutcomeReason | null {
  const outcome = state.outcome;
  const from = state.outcomeFrom;
  if (state.battleStep !== 'outcome' || !outcome || !from) return null;
  return describeOutcome(from, outcome, {
    note: state.outcomeNote,
    answers: state.mcq ? { player: state.mcq.answers.player, opponent: state.mcq.answers.opponent, correct: state.mcq.question.correctIndex } : null,
    tiebreak: Boolean(state.numeric?.result),
    results: state.cardEvents.filter((event) => event.duelNo === state.duelNo && event.phase === 'result').map((event) => ({ card: event.card, side: event.side })),
  });
}

export interface ReasonInput {
  note: string | null;
  /** The duel's answers (null: no question was played). */
  answers: { player: number | null; opponent: number | null; correct: number } | null;
  /** The number tiebreak decided it. */
  tiebreak: boolean;
  /** The cards that moved this result (the result card's chips). */
  results: { card: CardId; side: ZoneSide }[];
}

export function describeOutcome(from: Possession, outcome: BattleOutcome, input: ReasonInput): OutcomeReason {
  const attacker = from.attacker;
  const defender = otherZoneSide(attacker);
  const gloves = input.note === GLOVES_SAVE_NOTE;
  const marks: Record<ZoneSide, Mark> =
    gloves || !input.answers
      ? { player: null, opponent: null }
      : {
          player: input.answers.player === input.answers.correct ? 'right' : 'wrong',
          opponent: input.answers.opponent === input.answers.correct ? 'right' : 'wrong',
        };
  const has = (card: CardId, side: ZoneSide) => input.results.some((r) => r.card === card && r.side === side);

  // Who gained: the scorer, the side that keeps going, or the side that takes over.
  const gainer: ZoneSide = outcome.kind === 'goal' ? outcome.scorer : outcome.kind === 'advance' || outcome.kind === 'held' ? attacker : outcome.next.attacker;
  const loser = otherZoneSide(gainer);
  const symbol = (mark: Mark) => (mark === 'right' ? '✓' : mark === 'wrong' ? '✗' : '');

  // The cause.
  let cause: string;
  if (gloves) cause = 'Goalkeeper Gloves';
  else if (input.note === 'Golden Boot') cause = 'Golden Boot: both right, no tiebreak';
  else if (input.note === 'First Touch') cause = 'First Touch: both right, no tiebreak';
  else if (input.note === 'Long Ball lands') cause = 'Long Ball lands';
  else if (input.note === 'Long Ball cut out') cause = 'Long Ball cut out';
  else if (input.note === 'Offside trap!') cause = 'Offside!';
  else if (input.tiebreak) cause = 'Tiebreak won';
  else if (marks[gainer] && marks[loser]) cause = `${symbol(marks[gainer])} vs ${symbol(marks[loser])}`;
  else cause = 'Duel won';

  // The effect, and how far.
  const fromColumn: number = pitchColumn(from);
  let toColumn: number = fromColumn;
  let kind: OutcomeReason['kind'];
  let effect: string;
  let zones = 0;
  switch (outcome.kind) {
    case 'goal':
      kind = 'goal';
      toColumn = outcome.scorer === 'player' ? 3 : -1;
      zones = Math.abs(toColumn - fromColumn);
      effect = outcome.stolen ? 'clean steal near goal: straight in!' : from.zone === 'opponent' ? 'goal!' : `${zonesWord(zones)}: straight in!`;
      break;
    case 'advance':
      kind = 'forward';
      toColumn = pitchColumn(outcome.next);
      zones = Math.abs(toColumn - fromColumn);
      effect = zonesWord(zones);
      break;
    case 'held':
      kind = 'held';
      effect = 'Park the Bus: no ground';
      break;
    case 'turnover': {
      const step = stealStep(from, outcome);
      toColumn = pitchColumn(outcome.next);
      zones = Math.abs(toColumn - fromColumn);
      kind = zones > 0 ? 'forward' : 'spot';
      // A save can still carry the ball forward (the keeper's side breaking with Counter-Attack or Tiki-Taka): the line
      // follows the move worked out above, never an assumed "same spot".
      effect = gloves
        ? zones > 0 ? `saved: ${zonesWord(zones)}` : 'saved — turn over, same spot'
        : step > 0 && marks[defender] === 'right' && marks[attacker] === 'wrong' ? `clean steal: ${zonesWord(zones)}` : zones > 0 ? `ball won: ${zonesWord(zones)}` : 'turn over, same spot';
      break;
    }
    case 'bothWrong':
      toColumn = pitchColumn(outcome.next);
      zones = Math.abs(toColumn - fromColumn);
      kind = zones > 0 ? 'forward' : 'spot';
      effect = zones > 0 ? `turn over: ${zonesWord(zones)}` : 'turn over, same spot';
      break;
  }

  // The cards that added a zone.
  const extras: string[] = [];
  if (outcome.kind !== 'held') {
    if (has('captains-armband', gainer)) extras.push(`${CARD_BY_ID['captains-armband'].name} +1`);
    if (has('tiki-taka', gainer)) extras.push(`${CARD_BY_ID['tiki-taka'].name} +1`);
    if (has('counter-attack', gainer)) extras.push(`${CARD_BY_ID['counter-attack'].name} +1`);
  }
  const line = `${cause} — ${effect}${extras.length ? ` (${extras.join(', ')})` : ''}`;
  return { line, marks, fromColumn, toColumn, side: gainer, kind, zones };
}
