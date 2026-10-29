/**
 * Zone match 3D view: which playstyle (card) effects the duel scene shows, read off the match state with the
 * engine's own helpers (activeCards, sabotageOn, cardEvents, gloves) — no rule is re-derived here.
 *
 * One-shot effects follow `moment`: the card event the 2D CardMoments pop-up is showing right now (ZoneMatchStage
 * passes it in), so the scene and the pop-up play together. Result cards (`results`) shape the outcome animation.
 */

import { FLOODLIGHT_MS, TIKI_TAKA_DUELS, type CardId } from './zoneMatch.cards';
import { outcomeReason, type OutcomeReason } from './zoneMatch.reason';
import { activeCards, sabotageOn, type CardEvent, type MatchState } from './zoneMatch.machine';
import type { ZoneSide } from './zoneMatch.rules';

export interface ResultCard {
  card: CardId;
  side: ZoneSide;
  against: CardId | null;
}

export interface CardFx {
  duelNo: number;
  /** The card moment on screen (CardMoments), or null. */
  moment: CardEvent | null;
  /** Captain's Armband in play this duel. */
  armband: ZoneSide | null;
  /** Golden Boot in play this duel. */
  goldenBoot: ZoneSide | null;
  /** Goalkeeper Gloves on (until a shot uses them). */
  gloves: Record<ZoneSide, boolean>;
  /** Home Advantage's owner this duel (none when both played it). */
  home: ZoneSide | null;
  /** Fog on the player's view while the question is up. */
  fog: boolean;
  /** Sides whose pitch Muddy Pitch churns this duel. */
  mud: ZoneSide[];
  /** Floodlight Failure's blackout window (Date.now() ms), on `victim`. */
  dark: { victim: ZoneSide; from: number; until: number } | null;
  /** Cards that settled this duel's result (shown on the result card). */
  results: ResultCard[];
  /** Every card in play this duel (after VAR / Shin Pads): each fires its activation beat once. */
  active: { side: ZoneSide; card: CardId }[];
  /** First Touch in play: glowing boots. */
  firstTouch: ZoneSide | null;
  /** Second Ball in play (and not yet used): the spare ball. */
  secondBall: ZoneSide | null;
  /** Sides a Yellow Card has blocked from playing cards (this duel). */
  booked: ZoneSide[];
  /** Offside Trap's owner (its line is painted at their defensive line). */
  offside: ZoneSide | null;
  /** Park the Bus's owner: the bus is parked across their zone line. */
  bus: ZoneSide | null;
  /** A running Tiki-Taka: its owner and the duels left. */
  tiki: { side: ZoneSide; left: number } | null;
  /** Why the ball moved, at a result (zoneMatch.reason). */
  reason: OutcomeReason | null;
}

const SIDES: ZoneSide[] = ['player', 'opponent'];
const FOG_STEPS = ['reveal', 'mcq', 'mcqReveal'];

export function cardFx(state: MatchState, moment: CardEvent | null): CardFx {
  // A round's category pick still holds the last duel's cards: nothing is in play until the next duel's reveal.
  const playing = state.stage === 'play' && state.battleStep !== 'cards' && state.battleStep !== 'category';
  const active = playing ? activeCards(state) : { player: [], opponent: [] };
  const holder = (card: CardId): ZoneSide | null => SIDES.find((side) => active[side].includes(card)) ?? null;
  const homes = SIDES.filter((side) => active[side].includes('home-advantage'));
  const victims = (card: CardId) => (playing ? SIDES.filter((side) => sabotageOn(state, side).includes(card)) : []);

  let dark: CardFx['dark'] = null;
  const darkVictim = victims('floodlight-failure')[0];
  if (darkVictim) {
    const from =
      (state.battleStep === 'mcq' || state.battleStep === 'mcqReveal') && state.mcq
        ? state.mcq.startedAt
        : (state.battleStep === 'numeric' || state.battleStep === 'numericReveal') && state.numeric
          ? state.numeric.startedAt
          : null;
    if (from !== null) dark = { victim: darkVictim, from, until: from + FLOODLIGHT_MS };
  }

  return {
    duelNo: state.duelNo,
    moment: moment && moment.duelNo === state.duelNo ? moment : null,
    armband: holder('captains-armband'),
    goldenBoot: holder('golden-boot'),
    gloves: {
      player: state.gloves.player || active.player.includes('goalkeeper-gloves'),
      opponent: state.gloves.opponent || active.opponent.includes('goalkeeper-gloves'),
    },
    home: homes.length === 1 ? homes[0] : null,
    fog: FOG_STEPS.includes(state.battleStep) && victims('fog').includes('player'),
    mud: victims('muddy-pitch'),
    dark,
    active: SIDES.flatMap((side) => active[side].map((card) => ({ side, card }))),
    firstTouch: holder('first-touch'),
    // A Second Ball already spent on a miss is gone.
    secondBall: (() => {
      const side = holder('second-ball');
      return side && state.mcq?.firstMiss[side] == null ? side : null;
    })(),
    booked: SIDES.filter((side) => {
      const duel = state.battleStep === 'category' ? state.duelNo + 1 : state.duelNo;
      return state.stage === 'play' && state.yellowThrough[side] > 0 && duel <= state.yellowThrough[side];
    }),
    offside: holder('offside-trap'),
    bus: holder('park-the-bus'),
    tiki: (() => {
      if (state.stage !== 'play') return null;
      const side = SIDES.find((s) => state.tiki[s] > 0) ?? holder('tiki-taka');
      return side ? { side, left: state.tiki[side] > 0 ? state.tiki[side] : TIKI_TAKA_DUELS } : null;
    })(),
    reason: outcomeReason(state),
    results:
      state.battleStep === 'outcome'
        ? state.cardEvents
            .filter((event) => event.duelNo === state.duelNo && event.phase === 'result')
            .map((event) => ({ card: event.card, side: event.side, against: event.against?.card ?? null }))
        : [],
  };
}

/** The cards that shape an outcome animation (a stable value for the director's script). */
export interface ScriptCards {
  results: ResultCard[];
  /** MatchState.outcomeNote: 'Long Ball lands', 'Offside trap!', the Gloves save… */
  note: string | null;
  /** The defending keeper wears Goalkeeper Gloves (a Golden Boot goes through them). */
  keeperGloves: boolean;
  goldenBoot: boolean;
}

export const NO_CARDS: ScriptCards = { results: [], note: null, keeperGloves: false, goldenBoot: false };

export function hasResult(cards: ScriptCards, card: CardId, side?: ZoneSide): ResultCard | null {
  return cards.results.find((r) => r.card === card && (side === undefined || r.side === side)) ?? null;
}
