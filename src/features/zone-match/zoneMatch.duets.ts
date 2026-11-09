/**
 * Showdown duets: when a playstyle lands, both avatars play it out — your golden-boot shot flies over to their card and
 * beats their dive, your mud lands on them, their run is stopped by your flag. A draft per card for the duets lab
 * (dev/zone-match/duets), to decide how the reveal could work for two avatars.
 *
 * The owner plays the card; the rival is the other seat. Each side plays either its card reaction (cardMotion — for a
 * sabotage that's the victim slipping in the mud, so the rival plays it) or a duet move (zoneMatch.duetMoves). Props
 * fly between the two cards. Anchors are in a figure's own art units (496 × 840, facing the other card); `mid` is the
 * gap between the cards (x from its centre, in the same units).
 */

import type { CardId } from './zoneMatch.cards';
import { CHEST_CONTROL_CATCH, KICK_LONG_CONTACT, KICK_TWO_CONTACT, NUTMEGGED_BALL, type DuetMove } from './zoneMatch.duetMoves';
import { BICYCLE_KICK_STRIKE, FIRST_TOUCH_CATCH, GOLDEN_BOOT_STRIKE, SECOND_BALL_CATCH } from './ZoneMatchFutReactions';
import { NUTMEG, NUTMEG_POKE_POINT, PRESS, PRESS_NICK_POINT, SCREAM_BALL, SCREAM_CONTACT_AT, SUPER } from './zoneMatch.cardMoves';

/**
 * `ballFrom` / `ballUntil`: the card reaction's own ball shows only in that window (s into it) — a prop carries it
 * before and after; `ball2From` the same for its second ball. `goldBall`: the move's ball is the golden one.
 */
export type DuetActor = ({ card: CardId; ballFrom?: number; ballUntil?: number; ball2From?: number } | { move: DuetMove; goldBall?: boolean }) & { at: number };
export type DuetAnchor = { on: 'owner' | 'rival' | 'mid'; x: number; y: number };
export type DuetPropKind = 'ball' | 'gold-ball' | 'mud' | 'fog' | 'notes' | 'clang' | 'bolt' | 'icon' | 'flash';

export interface DuetProp {
  kind: DuetPropKind;
  /** Start and length (s). */
  at: number;
  dur: number;
  from: DuetAnchor;
  /** Omitted: it pops up where it is and fades. */
  to?: DuetAnchor;
  /** How high it arcs on the way (art units). */
  arc?: number;
  /** The sticker for 'icon' (a bluff's fake, the VAR screen…). */
  card?: CardId;
  /** Shown whole from the first frame to the last (no fade or pop): a ball handed on to the next prop or a card's
   * own ball at the same spot. */
  solid?: boolean;
  /** Size (art units) instead of the kind's own. */
  size?: number;
}

export interface Duet {
  /** What happens, in one line. */
  line: string;
  owner: DuetActor;
  rival: DuetActor;
  props: DuetProp[];
  /** The lights go out on the rival's card. */
  blackout?: { at: number; dur: number };
  /** The playstyle goes on the owner's card only as its reaction starts, every replay: its gear (Second Ball's pair on
   * the floor) would give the duet away. Otherwise it stays on between replays (no gear thrown off and back on). */
  freshSlot?: boolean;
}

const O = (x: number, y: number): DuetAnchor => ({ on: 'owner', x, y });
const R = (x: number, y: number): DuetAnchor => ({ on: 'rival', x, y });
const M = (x: number, y: number): DuetAnchor => ({ on: 'mid', x, y });

/** Points on a figure (facing the other card). */
const FRONT_FOOT = 420;
const FEET = 790;
/** Second Ball: each ball's time in the air, timed so they land on the boots at the juggle's first two touches. */
const SB_FLIGHT_R = 1.25;
const SB_OWNER_AT = KICK_TWO_CONTACT.first + SB_FLIGHT_R - SECOND_BALL_CATCH.R.at;
const SB_FLIGHT = { R: SB_FLIGHT_R, L: SB_OWNER_AT + SECOND_BALL_CATCH.L.at - KICK_TWO_CONTACT.second };
/** Nutmeg: the poke's roll to their legs. Screamer: the rocket's flight to the top corner. */
const NUTMEG_ROLL = 0.55;
const SCREAM_FLIGHT = 0.6;
/** Bicycle Kick: the volley's time in the air, from over his head to their chest. */
const BK_FLIGHT = 0.6;
/** Golden Boot: the shot's time in the air, to their chest. */
const GB_FLIGHT = 0.55;
/** First Touch: the long ball's time in the air, timed so it lands on the boot as the catch comes. */
const FT_FLIGHT = 1.3;
const FT_OWNER_AT = KICK_LONG_CONTACT.at + FT_FLIGHT - FIRST_TOUCH_CATCH.at;

export const DUETS: Record<CardId, Duet> = {
  'first-touch': {
    line: 'They hoof it up the pitch — it drops onto your boot and you kill it dead.',
    owner: { card: 'first-touch', at: FT_OWNER_AT, ballFrom: FIRST_TOUCH_CATCH.at },
    rival: { move: 'kick-long', at: 0 },
    props: [
      { kind: 'ball', solid: true, at: 0, dur: KICK_LONG_CONTACT.at, from: R(...KICK_LONG_CONTACT.ball) },
      { kind: 'ball', solid: true, at: KICK_LONG_CONTACT.at, dur: FT_FLIGHT, from: R(...KICK_LONG_CONTACT.ball), to: O(...FIRST_TOUCH_CATCH.point), arc: 950 },
    ],
  },
  'fifty-fifty': {
    line: 'A loose ball between you — both go for it, a coin flip who wins it.',
    owner: { card: 'fifty-fifty', at: 0 },
    rival: { move: 'shuffle', at: 0 },
    props: [
      { kind: 'ball', at: 0.15, dur: 0.6, from: M(-60, FEET), to: M(60, FEET), arc: 140 },
      { kind: 'ball', at: 0.75, dur: 0.6, from: M(60, FEET), to: M(-60, FEET), arc: 140 },
    ],
  },
  'golden-boot': {
    line: 'Your golden-boot shot flies across — they take it on the chest, kill it and put a boot on it.',
    owner: { card: 'golden-boot', at: 0, ballUntil: GOLDEN_BOOT_STRIKE.at },
    rival: { move: 'chest-control', goldBall: true, at: GOLDEN_BOOT_STRIKE.at + GB_FLIGHT - CHEST_CONTROL_CATCH.at },
    props: [{ kind: 'gold-ball', solid: true, at: GOLDEN_BOOT_STRIKE.at, dur: GB_FLIGHT, from: O(...GOLDEN_BOOT_STRIKE.ball), to: R(...CHEST_CONTROL_CATCH.point), arc: 120 }],
  },
  'captains-armband': {
    line: 'Armband on, chest out — they take a step back.',
    owner: { card: 'captains-armband', at: 0 },
    rival: { move: 'step-back', at: 0.8 },
    props: [],
  },
  'second-ball': {
    line: 'They knock two balls over to you, one after the other — you take both and juggle them.',
    owner: { card: 'second-ball', at: SB_OWNER_AT, ballFrom: SECOND_BALL_CATCH.R.at, ball2From: SECOND_BALL_CATCH.L.at },
    rival: { move: 'kick-two', at: 0 },
    freshSlot: true,
    props: [
      // The first sits at his boot; the second waits behind and is rolled into place for the second strike.
      { kind: 'ball', solid: true, at: 0, dur: KICK_TWO_CONTACT.first, from: R(...KICK_TWO_CONTACT.ball) },
      { kind: 'ball', solid: true, at: 0, dur: KICK_TWO_CONTACT.first + 0.12, from: R(KICK_TWO_CONTACT.ball[0] - 120, KICK_TWO_CONTACT.ball[1]) },
      { kind: 'ball', solid: true, at: KICK_TWO_CONTACT.first + 0.12, dur: 0.35, from: R(KICK_TWO_CONTACT.ball[0] - 120, KICK_TWO_CONTACT.ball[1]), to: R(...KICK_TWO_CONTACT.ball) },
      { kind: 'ball', solid: true, at: KICK_TWO_CONTACT.first + 0.47, dur: KICK_TWO_CONTACT.second - KICK_TWO_CONTACT.first - 0.47, from: R(...KICK_TWO_CONTACT.ball) },
      // A high one to the right boot, then a flatter, quicker one to the left.
      { kind: 'ball', solid: true, at: KICK_TWO_CONTACT.first, dur: SB_FLIGHT.R, from: R(...KICK_TWO_CONTACT.ball), to: O(...SECOND_BALL_CATCH.R.point), arc: 720 },
      { kind: 'ball', solid: true, at: KICK_TWO_CONTACT.second, dur: SB_FLIGHT.L, from: R(...KICK_TWO_CONTACT.ball), to: O(...SECOND_BALL_CATCH.L.point), arc: 420 },
    ],
  },
  'floodlight-failure': {
    line: 'You cut the floodlights — their half goes dark.',
    owner: { move: 'confident', at: 0 },
    rival: { card: 'floodlight-failure', at: 0.7 },
    props: [{ kind: 'bolt', at: 0.25, dur: 0.45, from: O(420, 180), to: R(248, 60), arc: 120 }],
    blackout: { at: 0.65, dur: 1.7 },
  },
  'muddy-pitch': {
    line: 'You throw the mud — they slip in it.',
    owner: { move: 'throw', at: 0 },
    rival: { card: 'muddy-pitch', at: 0.7 },
    props: [{ kind: 'mud', at: 0.3, dur: 0.5, from: O(430, 480), to: R(260, FEET), arc: 180 }],
  },
  fog: {
    line: 'You blow the fog over — they’re lost in it.',
    owner: { move: 'blow', at: 0 },
    rival: { card: 'fog', at: 0.55 },
    props: [{ kind: 'fog', at: 0.2, dur: 1.0, from: O(430, 380), to: R(248, 480) }],
  },
  'yellow-card': {
    line: 'You show them a yellow — no card for them next duel.',
    owner: { card: 'yellow-card', at: 0 },
    rival: { move: 'sulk', at: 0.75 },
    props: [],
  },
  'offside-trap': {
    line: 'They run in behind — flag up, offside.',
    owner: { card: 'offside-trap', at: 0 },
    rival: { move: 'halted', at: 0.05 },
    props: [],
  },
  'var-review': {
    line: 'VAR checks their card — they freeze, and it’s cancelled.',
    owner: { move: 'confident', at: 0 },
    rival: { card: 'var-review', at: 0.4 },
    props: [{ kind: 'icon', card: 'var-review', at: 0.15, dur: 1.8, from: M(0, 330) }],
  },
  'goalkeeper-gloves': {
    line: 'They shoot — you fly across and save it.',
    owner: { card: 'goalkeeper-gloves', at: 0.35 },
    rival: { move: 'shoot', at: 0 },
    props: [{ kind: 'ball', at: 0.55, dur: 0.45, from: R(FRONT_FOOT, FEET), to: O(330, 420), arc: 90 }],
  },
  'park-the-bus': {
    line: 'The bus parks in front of your goal — they run straight into it.',
    owner: { card: 'park-the-bus', at: 0 },
    rival: { move: 'run-bounce', at: 0.9 },
    props: [],
  },
  'shin-pads': {
    line: 'Pads on — their kick clangs off, and they hop about.',
    owner: { card: 'shin-pads', at: 0 },
    rival: { move: 'kick-hurt', at: 1.0 },
    props: [{ kind: 'clang', at: 1.5, dur: 0.6, from: O(330, 700) }],
  },
  'long-ball': {
    line: 'One long ball over the top — over their head and gone.',
    owner: { card: 'long-ball', at: 0 },
    rival: { move: 'beaten-over', at: 0.75 },
    props: [{ kind: 'ball', at: 0.75, dur: 1.0, from: O(FRONT_FOOT, FEET), to: R(-300, -260), arc: 560 }],
  },
  'counter-attack': {
    line: 'You win it and break the other way — they’re spun round.',
    owner: { card: 'counter-attack', at: 0 },
    rival: { move: 'dizzy', at: 0.5 },
    props: [],
  },
  substitution: {
    line: 'You go off, a fresh you comes on — they look around for you.',
    owner: { card: 'substitution', at: 0 },
    rival: { move: 'look-around', at: 0.4 },
    props: [],
  },
  'home-advantage': {
    line: 'Your crowd gets loud — they’re rattled.',
    owner: { card: 'home-advantage', at: 0 },
    rival: { move: 'rattled', at: 1.1 },
    props: [{ kind: 'notes', at: 0.8, dur: 1.2, from: O(300, 140), to: R(248, 160), arc: 80 }],
  },
  'dummy-run': {
    line: 'You fake one way — they bite and go the wrong way.',
    owner: { card: 'dummy-run', at: 0 },
    rival: { move: 'fooled', at: 0.25 },
    props: [],
  },
  'tiki-taka': {
    line: 'Pass, pass, pass with your team-mates — they chase shadows.',
    owner: { card: 'tiki-taka', at: 0 },
    rival: { move: 'chasing', at: 0.5 },
    props: [],
  },
  nutmeg: {
    line: 'He drags it left, then slips it through their legs — they turn to watch it go.',
    owner: { card: 'nutmeg', at: 0, ballUntil: NUTMEG.poke },
    rival: { move: 'nutmegged', at: NUTMEG.poke + NUTMEG_ROLL - NUTMEGGED_BALL.from },
    props: [{ kind: 'ball', solid: true, at: NUTMEG.poke, dur: NUTMEG_ROLL, from: O(...NUTMEG_POKE_POINT), to: R(NUTMEGGED_BALL.enterX, FEET - 4) }],
  },


  'bicycle-kick': {
    line: 'Up and over — your bicycle kick flies across; they take it on the chest, kill it and put a boot on it.',
    owner: { card: 'bicycle-kick', at: 0, ballUntil: BICYCLE_KICK_STRIKE.at },
    rival: { move: 'chest-control', at: BICYCLE_KICK_STRIKE.at + BK_FLIGHT - CHEST_CONTROL_CATCH.at },
    props: [{ kind: 'ball', solid: true, at: BICYCLE_KICK_STRIKE.at, dur: BK_FLIGHT, from: O(...BICYCLE_KICK_STRIKE.point), to: R(...CHEST_CONTROL_CATCH.point), arc: 70 }],
  },
  'high-press': {
    line: 'You press them high — rushed, their touch runs away from them and you nick it.',
    owner: { card: 'high-press', at: 0, ballFrom: PRESS.nick },
    rival: { move: 'crowded', at: 0.35 },
    props: [
      { kind: 'ball', solid: true, at: 0, dur: 0.6, from: R(FRONT_FOOT - 30, FEET + 6) },
      { kind: 'ball', solid: true, at: 0.6, dur: PRESS.nick - 0.6, from: R(FRONT_FOOT - 30, FEET + 6), to: O(...PRESS_NICK_POINT) },
    ],
  },

  'time-wasting': {
    line: 'You sit on the ball and check your watch — they can’t wait.',
    owner: { card: 'time-wasting', at: 0 },
    rival: { move: 'impatient', at: 0.5 },
    props: [{ kind: 'icon', card: 'time-wasting', at: 0.45, dur: 2.0, from: R(40, -45), size: 230 }],
  },

  'super-sub': {
    line: 'Your star is back on — hands on heads over there.',
    owner: { card: 'super-sub', at: 0 },
    rival: { move: 'groan', at: SUPER.arrive },
    props: [],
  },

  feint: {
    line: 'You shape to shoot — they throw themselves at it — and you drag it back the other way.',
    owner: { card: 'feint', at: 0 },
    rival: { move: 'block-slide', at: 0.3 },
    props: [{ kind: 'icon', card: 'golden-boot', at: 0.45, dur: 0.9, from: O(440, -10), size: 170 }],
  },

  screamer: {
    line: 'The run-up, then a rocket from the halfway line — over the keeper’s fingertips into the top corner.',
    owner: { card: 'screamer', at: 0, ballUntil: SCREAM_CONTACT_AT },
    rival: { move: 'dive-beaten', at: SCREAM_CONTACT_AT + SCREAM_FLIGHT - 0.85 },
    props: [
      { kind: 'gold-ball', solid: true, at: SCREAM_CONTACT_AT, dur: SCREAM_FLIGHT, from: O(...SCREAM_BALL), to: R(46, -60), arc: 260 },
      { kind: 'flash', at: SCREAM_CONTACT_AT + SCREAM_FLIGHT - 0.04, dur: 0.45, from: R(46, -60) },
    ],
  },


  'poker-face': {
    line: 'Arms folded, not a flicker — they line it up twice and daren’t shoot.',
    owner: { card: 'poker-face', at: 0 },
    rival: { move: 'hesitate', at: 0 },
    props: [
      { kind: 'icon', card: 'goalkeeper-gloves', at: 0.15, dur: 1.2, from: O(440, -10), size: 170 },
    ],
  },

};

/** How long a duet runs (s): both actors and every prop done. */
export function duetLength(duet: Duet, length: (actor: DuetActor) => number): number {
  return Math.max(duet.owner.at + length(duet.owner), duet.rival.at + length(duet.rival), ...duet.props.map((p) => p.at + p.dur), duet.blackout ? duet.blackout.at + duet.blackout.dur : 0);
}
