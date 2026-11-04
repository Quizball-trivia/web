/**
 * Balance simulation (not part of the normal test run): plays whole zone matches headless on the real engine
 * (zoneMatch.machine's reducer, virtual clock) and writes the numbers to $ZM_SIM_OUT.
 *
 *   ZM_SIM=1 ZM_SIM_N=1000 ZM_SIM_OUT=/tmp/zm-sim.json npx vitest run src/features/zone-match/__sim__
 *
 * Knowledge: each bot has a base accuracy and its own strong and weak categories (±15%), knows whether it knows an
 * answer, and picks its strongest category to attack with. Card play is one of three policies:
 *   none   — never plays a card;
 *   random — the old scripted bot: plays something about half the time, loosely by situation;
 *   smart  — reads the situation (zone, attack or defence, score, time left, its own confidence, the cards the rival
 *            still holds), saves cards for the moments they decide, plays live cards only when they pay (50/50 or
 *            Substitution when it doesn't know, First Touch when it does), answers the rival's dangerous cards with
 *            VAR / Shin Pads, baits with Dummy Run, takes the category it knows best with Home Advantage.
 */

import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import { BLUFF_CARDS, CARDS, CARD_BY_ID, randomDeck, type CardId } from '../zoneMatch.cards';
import {
  IDLE,
  activeCards,
  attacksLeft,
  cardBlocker,
  reactionBlocker,
  reducer,
  revealedCard,
  sabotageOn,
  unusedCategories,
  type Category,
  type Content,
  type MatchState,
} from '../zoneMatch.machine';
import { otherZoneSide, type ZoneSide } from '../zoneMatch.rules';
import { MOVEMENT_CARDS, RULES, SABOTAGE_CARDS, setRules } from '../zoneMatch.playtest';

type Side = ZoneSide;
type Policy = 'none' | 'random' | 'smart';
const SIDES: Side[] = ['player', 'opponent'];
const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);
const pickOne = <T,>(items: readonly T[]): T | undefined => items[Math.floor(Math.random() * items.length)];
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/* ── content: 24 invented categories × 60 four-option questions ─────── */

const CATEGORIES: Category[] = Array.from({ length: 24 }, (_, i) => ({ id: `c${i}`, name: `Category ${i}`, icon: null, imageUrl: null }));
const q = (id: string, n: number): GameQuestion => ({ id, prompt: 'Q', options: ['a', 'b', 'c', 'd'], correctIndex: n % 4 });
const CONTENT: Content = {
  mcqByCategory: Object.fromEntries(CATEGORIES.map((c) => [c.id, Array.from({ length: 60 }, (_, n) => q(`${c.id}-q${n}`, n))])),
  fallbackMcqs: Array.from({ length: 60 }, (_, n) => q(`fb-q${n}`, n)),
};
const categoryOf = (questionId: string) => questionId.split('-q')[0];

/* ── a player: knowledge + card policy ────────────────────────────────── */

interface Bot {
  policy: Policy;
  base: number;
  /** Per-category knowledge offset. */
  strength: Record<string, number>;
  /** Number-question error band and answer speed. */
  error: [number, number];
  delayMs: [number, number];
}

function makeBot(policy: Policy, base: number): Bot {
  const strength: Record<string, number> = {};
  for (const c of CATEGORIES) strength[c.id] = (Math.random() * 2 - 1) * 0.15;
  return { policy, base, strength, error: base >= 0.8 ? [0, 0.1] : base >= 0.6 ? [0.05, 0.3] : [0.2, 0.6], delayMs: [2500, 7000] };
}

const accuracyIn = (bot: Bot, categoryId: string) => clamp(bot.base + (bot.strength[categoryId] ?? 0), 0.05, 0.97);

/* ── situation ────────────────────────────────────────────────────────── */

/** How much this duel matters to `side` (1 low … 3 decides a goal), raised when time runs out and it's tight. */
function stakes(s: MatchState, side: Side): number {
  const attacking = s.possession.attacker === side;
  const z = s.possession.zone;
  let v = z === 'opponent' ? 3 : z === 'centre' ? 2 : attacking ? 1 : 2;
  const left = attacksLeft(s, 'player') + attacksLeft(s, 'opponent');
  const diff = s.score[side] - s.score[otherZoneSide(side)];
  if (left <= 4 && diff <= 0) v += 0.5;
  if (left <= 2 && diff < 0) v += 0.5;
  return v;
}

const holds = (s: MatchState, side: Side, card: CardId) =>
  s.deck[side].includes(card) && (RULES.energy ? s.energy[side] >= CARD_BY_ID[card].energy : !s.used[side].includes(card));
/** What `side` believes the rival can still play: everything in their loadout, or with hidden loadouts only what they
 *  have shown (which, without energy, is already spent). */
const rivalCan = (s: MatchState, side: Side, card: CardId) => {
  const other = otherZoneSide(side);
  if (RULES.hiddenLoadouts && !s.used[other].includes(card)) return false;
  return holds(s, other, card);
};

/** Whether the rival may still hold a reaction: on show it's known; hidden, any reaction they haven't spent yet. */
const rivalMayReact = (s: MatchState, side: Side, ...cards: CardId[]) => {
  const other = otherZoneSide(side);
  return cards.some((c) => (RULES.hiddenLoadouts ? !s.used[other].includes(c) : holds(s, other, c)));
};

/** How much a blind card is worth to `side` right now under the plain rules (0: pointless). */
function baseValue(s: MatchState, side: Side, card: CardId, bot: Bot, roundAcc: number): number {
  const other = otherZoneSide(side);
  const attacking = s.possession.attacker === side;
  const z = s.possession.zone;
  const st = stakes(s, side);
  const rivalHas = (...cards: CardId[]) => cards.some((c) => rivalCan(s, side, c));
  void other;
  switch (card) {
    case 'golden-boot':
      return attacking && z === 'opponent' ? 3 + (rivalHas('goalkeeper-gloves', 'park-the-bus') ? 1 : 0) : 0;
    case 'captains-armband':
      return attacking ? (z === 'centre' ? 3 : z === 'own' ? 1.6 : 0) : 0;
    case 'long-ball':
      // All or nothing: only on a category it knows well.
      return attacking && roundAcc >= 0.7 ? (z === 'opponent' ? 3.2 : z === 'centre' ? 2.8 : 1.5) : 0;
    case 'tiki-taka':
      return attacking && roundAcc >= 0.65 ? (z === 'own' ? 2.2 : z === 'centre' ? 1.6 : 0) : 0;
    case 'counter-attack':
      return !attacking ? (z === 'centre' ? 2.6 : 1.2) : 0;
    case 'offside-trap':
      return !attacking ? (z === 'opponent' ? 2.6 : z === 'centre' ? 1.6 : 0.8) : 0;
    case 'goalkeeper-gloves':
      return !attacking && z === 'opponent' ? (rivalHas('golden-boot') ? 2 : 3.5) : 0;
    case 'park-the-bus':
      return !attacking ? (z === 'opponent' ? (rivalHas('golden-boot') ? 2 : 3) : z === 'centre' ? 2 : 0) : 0;
    case 'second-ball':
      return st >= 3 ? 2.4 : st >= 2 ? 1.4 : 0.4;
    case 'floodlight-failure':
      return st >= 3 ? 2.6 : st >= 2 ? 1.4 : 0.3;
    case 'muddy-pitch':
      return st >= 3 ? 2.3 : st >= 2 ? 1.3 : 0.3;
    case 'fog':
      return st >= 3 ? 2.2 : st >= 2 ? 1.2 : 0.3;
    case 'yellow-card':
      return st >= 2.5 && rivalHas('golden-boot', 'goalkeeper-gloves', 'park-the-bus', 'var-review', 'shin-pads', 'first-touch', 'fifty-fifty', 'long-ball') ? 2.6 : 0.5;
    case 'home-advantage': {
      const best = Math.max(...unusedCategories(s, side).map((c) => bot.strength[c.id] ?? 0));
      const gain = best - (s.roundCategory ? bot.strength[s.roundCategory.id] ?? 0 : 0);
      return gain > 0.08 ? 1 + st * 0.5 + gain * 6 : 0;
    }
    case 'dummy-run':
      // Bait their VAR / Shin Pads in a quiet duel, so a real sabotage lands later.
      return rivalMayReact(s, side, 'var-review', 'shin-pads') && CARDS.some((c) => c.type === 'sabotage' && holds(s, side, c.id)) ? 1.3 + st * 0.35 : 0.2;
    case 'nutmeg':
      // Worth it when a trap may be waiting: their Bus / Offside / Gloves.
      return attacking && z !== 'own' ? (rivalHas('park-the-bus', 'offside-trap', 'goalkeeper-gloves') || RULES.hiddenLoadouts ? 2.3 : 0.6) : 0;
    case 'bicycle-kick': {
      if (!attacking || z !== 'opponent') return 0;
      const behind = s.score[side] < s.score[otherZoneSide(side)];
      // Comeback: the blocker keeps it to when he's behind; Faster: both right goes to speed.
      return roundAcc >= 0.62 ? 3 + (behind ? 1 : 0) + (rivalHas('goalkeeper-gloves', 'park-the-bus') ? 1 : 0) : 0;
    }
    case 'screamer':
      return attacking && z === 'centre' && roundAcc >= 0.72 ? 3 : 0;
    case 'high-press':
      // Both right is about half the duels: win them on their ball near your goal.
      return !attacking ? (z === 'opponent' ? 2.8 : z === 'centre' ? 2.1 : 1) : 0;
    case 'super-sub': {
      const back = [...s.used[side]].reverse().find((id) => id !== 'super-sub');
      const strong: CardId[] = ['first-touch', 'golden-boot', 'goalkeeper-gloves', 'fifty-fifty', 'high-press', 'park-the-bus', 'captains-armband'];
      return back ? (strong.includes(back) ? 2 : 1.2) : 0;
    }
    case 'feint':
      // A bluff pays when they'd spend VAR on what it looks like: a big moment.
      return attacking && rivalMayReact(s, side, 'var-review') ? 1.2 + st * 0.4 : 0.2;
    case 'poker-face':
      return !attacking && rivalMayReact(s, side, 'var-review') ? 1.2 + st * 0.4 : 0.2;
    default:
      return 0;
  }
}

/** The card's worth under the rule variants in force. */
function blindValue(s: MatchState, side: Side, card: CardId, bot: Bot, roundAcc: number): number {
  let v = baseValue(s, side, card, bot, roundAcc);
  const attacking = s.possession.attacker === side;
  const z = s.possession.zone;
  const other = otherZoneSide(side);
  const st = stakes(s, side);
  if (RULES.counters) {
    // Defending: the bus / offside pay only if the attacker runs — likelier when they hold a run card and are deep.
    if (card === 'park-the-bus' || card === 'offside-trap') {
      const runs = MOVEMENT_CARDS.some((c) => rivalCan(s, side, c));
      const p = attacking ? 0 : runs ? (z === 'centre' ? 0.55 : z === 'own' ? 0.4 : 0.15) : RULES.hiddenLoadouts ? 0.2 : 0.02;
      v = p * 4.5;
    }
    // Attacking: a run into a waiting bus / offside is lost outright.
    if (MOVEMENT_CARDS.includes(card) && attacking) {
      const trap = rivalCan(s, side, 'park-the-bus') || rivalCan(s, side, 'offside-trap');
      v *= trap ? 0.45 : RULES.hiddenLoadouts ? 0.8 : 1.1;
    }
  }
  if (RULES.downsides) {
    if (card === 'captains-armband' || card === 'tiki-taka') v *= roundAcc >= 0.7 ? 1 : 0.6;
    // Sabotage backfires if they answer right anyway: aim it at the defender of your own (strong) category.
    if (SABOTAGE_CARDS.includes(card)) v *= attacking ? 1.25 : 0.55;
  }
  if (RULES.attackerWinsTies && !attacking && st >= 2) {
    // Any card in play stops the attacker winning a both-right duel outright.
    v = Math.max(v, st >= 3 ? 2.4 : 1.6);
  }
  if (RULES.energy) {
    // Reusable but paid for: keep enough for the next big moment.
    const left = s.energy[side] - CARD_BY_ID[card].energy;
    v -= CARD_BY_ID[card].energy * 0.25;
    if (st < 2.5 && left < 2) v -= 0.8;
  }
  void other;
  return v;
}

function chooseBlind(s: MatchState, side: Side, bot: Bot): CardId | null {
  const usable = s.deck[side].filter((id) => cardBlocker(s, side, id, 'blind') === null);
  if (usable.length === 0 || bot.policy === 'none') return null;
  if (bot.policy === 'random') {
    if (Math.random() > 0.55) return null;
    const attacking = s.possession.attacker === side;
    const prefer: CardId[] = !attacking && s.possession.zone === 'opponent'
      ? ['goalkeeper-gloves', 'park-the-bus', 'offside-trap']
      : attacking && s.possession.zone === 'opponent'
        ? ['golden-boot']
        : attacking
          ? ['captains-armband', 'tiki-taka', 'long-ball']
          : ['counter-attack', 'offside-trap'];
    return prefer.find((id) => usable.includes(id)) ?? pickOne(usable) ?? null;
  }
  const roundAcc = s.roundCategory ? accuracyIn(bot, s.roundCategory.id) : bot.base;
  const scored = usable.map((id) => ({ id, v: blindValue(s, side, id, bot, roundAcc) })).sort((a, b) => b.v - a.v);
  const best = scored[0];
  // Cards are one-use: hold them for the moments that decide, unless time is running out.
  const left = attacksLeft(s, 'player') + attacksLeft(s, 'opponent');
  const bar = left <= 2 ? 0.4 : left <= 5 ? 1.3 : 1.9;
  return best && best.v >= bar ? best.id : null;
}

/* ── one match ────────────────────────────────────────────────────────── */

type Plan = { at: number; act: () => MatchState };

interface DuelRecord {
  attacker: Side;
  zone: string;
  kind: string;
  stolen: boolean;
  note: string | null;
  active: Record<Side, CardId[]>;
  numeric: boolean;
}

interface MatchResult {
  score: Record<Side, number>;
  duels: DuelRecord[];
  decks: Record<Side, CardId[]>;
  plays: { side: Side; card: CardId; phase: 'blind' | 'live' | 'reaction' }[];
  stuck: string | null;
  /** Reactions spent on a bluff (Dummy Run, Feint). */
  baits?: number;
}

function playMatch(decks: Record<Side, CardId[]>, bots: Record<Side, Bot>): MatchResult {
  let now = 0;
  let s = reducer(IDLE, { type: 'RESTART', categoryPool: CATEGORIES, decks, windowMode: 'question', now });
  // The engine fills an empty loadout at random (a player who picked nothing); the experiments need truly empty ones.
  s = { ...s, deck: { player: [...decks.player], opponent: [...decks.opponent] } };
  const duels: DuelRecord[] = [];
  const plays: MatchResult['plays'] = [];
  let baits = 0;
  /** Whether each side knows the question on screen (rolled once per question). */
  const knows = new Map<string, boolean>();
  const know = (side: Side) => {
    const mcq = s.mcq!;
    const key = `${side}:${mcq.key}:${mcq.question.id}`;
    if (!knows.has(key)) {
      let acc = accuracyIn(bots[side], categoryOf(mcq.question.id));
      const sabotage = sabotageOn(s, side);
      if (sabotage.includes('floodlight-failure')) acc -= 0.05;
      if (sabotage.includes('muddy-pitch')) acc -= 0.08;
      if (sabotage.includes('fog')) acc -= 0.04;
      knows.set(key, Math.random() < acc);
    }
    return knows.get(key)!;
  };
  const answerOf = (side: Side): number => {
    const mcq = s.mcq!;
    const { correctIndex, options } = mcq.question;
    if (know(side) && mcq.firstMiss[side] !== correctIndex) return correctIndex;
    const open = options.map((_, i) => i).filter((i) => !mcq.hidden[side].includes(i) && i !== mcq.firstMiss[side]);
    return pickOne(open) ?? correctIndex;
  };
  let planKey = '';
  let plan: Plan[] = [];
  let lastDuelSeen = -1;
  let numericThisDuel = false;
  let steps = 0;
  while (s.stage !== 'fulltime') {
    if (++steps > 20000) return { score: s.score, duels, decks, plays, stuck: `loop at ${s.stage}/${s.battleStep}` };
    if (s.battleStep === 'numeric') numericThisDuel = true;
    if (s.battleStep === 'outcome' && s.outcome && s.duelNo !== lastDuelSeen) {
      lastDuelSeen = s.duelNo;
      const act = activeCards(s);
      duels.push({
        attacker: s.outcomeFrom!.attacker,
        zone: s.outcomeFrom!.zone,
        kind: s.outcome.kind,
        stolen: s.outcome.kind === 'goal' && !!s.outcome.stolen,
        note: s.outcomeNote,
        active: { player: [...act.player], opponent: [...act.opponent] },
        numeric: numericThisDuel,
      });
      numericThisDuel = false;
    }
    // A smart rival's Home Advantage takes the category it knows best (the engine picks theirs at random).
    if (s.battleStep === 'reveal' && s.choice.opponent === 'home-advantage' && !s.cancelled.opponent && bots.opponent.policy === 'smart' && s.choice.player !== 'home-advantage') {
      const best = [...unusedCategories(s, 'opponent')].sort((a, b) => bots.opponent.strength[b.id] - bots.opponent.strength[a.id])[0];
      if (best && s.homeCategoryId !== best.id) s = { ...s, homeCategoryId: best.id };
    }
    const key = `${s.stage}|${s.battleStep}|${s.duelNo}|${s.round}|${s.mcq?.key}|${s.mcq?.question.id}|${s.mcq?.firstMiss.player}|${s.mcq?.firstMiss.opponent}|${s.mcq?.hidden.player.length}|${s.mcq?.hidden.opponent.length}|${s.numeric?.key}`;
    if (key !== planKey) {
      planKey = key;
      plan = [];
      if (s.stage === 'play') {
        const attacker = s.possession.attacker;
        if (s.battleStep === 'category') {
          // Everyone attacks with a category they know (humans do); only the cards differ by policy.
          plan.push({
            at: now + 1500,
            act: () => {
              const open = unusedCategories(s, attacker);
              const c = [...open].sort((a, b) => bots[attacker].strength[b.id] - bots[attacker].strength[a.id])[0];
              return c ? reducer(s, { type: 'PICK_CATEGORY', side: attacker, categoryId: c.id, content: CONTENT, now }) : s;
            },
          });
        }
        if (s.battleStep === 'cards') {
          for (const side of SIDES) {
            if (s.choice[side] !== undefined) continue;
            plan.push({
              at: now + 1000 + Math.random() * 2000,
              act: () => {
                const card = chooseBlind(s, side, bots[side]);
                if (card) plays.push({ side, card, phase: 'blind' });
                return reducer(s, { type: 'CHOOSE_CARD', side, card, now });
              },
            });
          }
        }
        if (s.battleStep === 'reveal') {
          for (const side of SIDES) {
            const other = otherZoneSide(side);
            const bot = bots[side];
            if (bot.policy === 'none' || !s.choice[other] || s.cancelled[other]) continue;
            const seen = revealedCard(s, other);
            if (!seen) continue;
            const threat = CARD_BY_ID[seen].type === 'sabotage';
            let card: CardId | null = null;
            if (bot.policy === 'random') {
              card = reactionBlocker(s, side, 'shin-pads') === null && Math.random() < 0.75
                ? 'shin-pads'
                : reactionBlocker(s, side, 'var-review') === null && Math.random() < (threat ? 0.7 : 0.35) ? 'var-review' : null;
            } else {
              // With the loadouts on show, a card they don't have is a bluff: let it go.
              if (!RULES.hiddenLoadouts && !s.deck[other].includes(seen)) continue;
              // Cancel what hurts: the rival's card valued as the rival would value it.
              const danger = blindValue(s, other, seen, bots[other], s.roundCategory ? accuracyIn(bots[other], s.roundCategory.id) : bots[other].base);
              const st = stakes(s, side);
              if (threat && st >= 2 && reactionBlocker(s, side, 'shin-pads') === null) card = 'shin-pads';
              else if (reactionBlocker(s, side, 'var-review') === null && (danger >= 2.6 || (threat && st >= 3))) card = 'var-review';
            }
            if (card) {
              const c = card;
              if (BLUFF_CARDS.includes(s.choice[other]!)) baits++;
              plan.push({ at: now + 900 + Math.random() * 700, act: () => (plays.push({ side, card: c, phase: 'reaction' }), reducer(s, { type: 'PLAY_REACTION', side, card: c, now })) });
            }
          }
          if (s.choice.player === 'home-advantage' && !s.cancelled.player) {
            plan.push({
              at: now + 800,
              act: () => {
                const open = unusedCategories(s, 'player');
                const c = bots.player.policy === 'smart' ? [...open].sort((a, b) => bots.player.strength[b.id] - bots.player.strength[a.id])[0] : pickOne(open);
                return c ? reducer(s, { type: 'CHOOSE_HOME_CATEGORY', categoryId: c.id }) : s;
              },
            });
          }
        }
        if (s.battleStep === 'mcq' && s.mcq) {
          for (const side of SIDES) {
            const bot = bots[side];
            if (s.mcq.answers[side] !== null) continue;
            const retry = s.mcq.firstMiss[side] !== null;
            let live: CardId | null = null;
            if (!retry && bot.policy !== 'none') {
              const can = (id: CardId) => cardBlocker(s, side, id, 'live') === null;
              if (bot.policy === 'random') {
                const pick = (['fifty-fifty', 'first-touch', 'substitution', 'time-wasting'] as CardId[]).find(can);
                if (pick && Math.random() < (pick === 'fifty-fifty' ? 0.4 : 0.25)) live = pick;
              } else if (s.mcq.hidden[side].length === 0) {
                const st = stakes(s, side);
                const sure = know(side);
                if (st >= 2.5 && can('time-wasting')) live = 'time-wasting';
                else if (sure && st >= 2 && can('first-touch')) live = 'first-touch';
                else if (!sure && st >= 2 && can('fifty-fifty')) live = 'fifty-fifty';
                else if (!sure && st >= 2 && can('substitution')) live = 'substitution';
              }
            }
            if (live) {
              const c = live;
              plan.push({ at: now + 700, act: () => (plays.push({ side, card: c, phase: 'live' }), reducer(s, { type: 'PLAY_LIVE', side, card: c, content: CONTENT, now })) });
              // The answer follows once the card has changed the question (the plan is redone then).
              if (c !== 'first-touch' && c !== 'time-wasting') continue;
            }
            let delay = between(bot.delayMs) + (retry ? 1200 : 0);
            const sabotage = sabotageOn(s, side);
            if (sabotage.includes('floodlight-failure')) delay += 4000;
            if (sabotage.includes('fog')) delay += 900;
            plan.push({ at: now + delay, act: () => (s.mcq && s.battleStep === 'mcq' ? reducer(s, { type: 'ANSWER', side, index: answerOf(side), now }) : s) });
          }
        }
        if (s.battleStep === 'numeric' && s.numeric && !s.numeric.result) {
          for (const side of SIDES) {
            if (s.numeric.guesses[side].value !== null) continue;
            const qn = s.numeric.question;
            const off = qn.value * between(bots[side].error) * (Math.random() < 0.5 ? -1 : 1);
            const value = Math.max(0, Math.round((qn.value + off) / qn.step) * qn.step);
            const dark = sabotageOn(s, side).includes('floodlight-failure') ? 4000 : 0;
            plan.push({ at: now + between(bots[side].delayMs) + dark, act: () => reducer(s, { type: 'GUESS', side, value, now }) });
          }
        }
      }
    }
    plan.sort((a, b) => a.at - b.at);
    const next = plan[0];
    if (next && (s.advanceAt === null || next.at <= s.advanceAt)) {
      plan.shift();
      now = Math.max(now, next.at);
      s = next.act();
    } else if (s.advanceAt !== null) {
      now = Math.max(now, s.advanceAt);
      s = reducer(s, { type: 'ADVANCE', content: CONTENT, now });
    } else {
      return { score: s.score, duels, decks, plays, stuck: `no timer at ${s.stage}/${s.battleStep}` };
    }
  }
  return { score: s.score, duels, decks, plays, stuck: null, baits };
}

/* ── reports ──────────────────────────────────────────────────────────── */

const won = (d: DuelRecord, side: Side) =>
  d.attacker === side ? d.kind === 'advance' || d.kind === 'held' || (d.kind === 'goal' && !d.stolen) : d.kind === 'turnover' || (d.kind === 'goal' && d.stolen);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const hist = (xs: (number | string)[]) => xs.reduce<Record<string, number>>((h, x) => ((h[x] = (h[x] ?? 0) + 1), h), {});
/** The player's share: wins + half the draws, in %. */
const share = (rs: MatchResult[]) => +((100 * (rs.filter((r) => r.score.player > r.score.opponent).length + 0.5 * rs.filter((r) => r.score.player === r.score.opponent).length)) / rs.length).toFixed(1);

function summarise(name: string, results: MatchResult[]) {
  const goals = results.map((r) => r.score.player + r.score.opponent);
  const teamGoals = results.flatMap((r) => [r.score.player, r.score.opponent]);
  const duels = results.flatMap((r) => r.duels);
  const kinds = hist(duels.map((d) => (d.stolen ? 'stolenGoal' : d.kind)));
  const notes = hist(duels.filter((d) => d.note).map((d) => d.note!));
  const margin = results.map((r) => Math.abs(r.score.player - r.score.opponent));
  return {
    name,
    matches: results.length,
    stuck: results.filter((r) => r.stuck).length,
    playerShare: share(results),
    playerWin: +((100 * results.filter((r) => r.score.player > r.score.opponent).length) / results.length).toFixed(1),
    draw: +((100 * results.filter((r) => r.score.player === r.score.opponent).length) / results.length).toFixed(1),
    goalsPerMatch: { avg: +mean(goals).toFixed(2), max: Math.max(...goals), hist: hist(goals) },
    goalsPerTeam: { avg: +mean(teamGoals).toFixed(2), max: Math.max(...teamGoals) },
    biggestMargin: Math.max(...margin),
    avgMargin: +mean(margin).toFixed(2),
    duelsPerMatch: +mean(results.map((r) => r.duels.length)).toFixed(1),
    numericShare: +((100 * duels.filter((d) => d.numeric).length) / Math.max(1, duels.length)).toFixed(1),
    stolenGoalShare: +((100 * (kinds.stolenGoal ?? 0)) / Math.max(1, (kinds.goal ?? 0) + (kinds.stolenGoal ?? 0))).toFixed(1),
    outcomes: Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, +((100 * v) / duels.length).toFixed(1)])),
    notes,
    cardsPerMatch: +mean(results.map((r) => r.plays.length)).toFixed(1),
  };
}

function cardReport(results: MatchResult[]) {
  const per: Record<string, { decks: number; played: number; activeAtt: number; activeAttWins: number; activeDef: number; activeDefWins: number; goals: number }> = {};
  for (const c of CARDS) per[c.id] = { decks: 0, played: 0, activeAtt: 0, activeAttWins: 0, activeDef: 0, activeDefWins: 0, goals: 0 };
  const base = { att: [0, 0], def: [0, 0] };
  for (const r of results) {
    for (const side of SIDES) for (const c of r.decks[side]) per[c].decks++;
    for (const p of r.plays) per[p.card].played++;
    for (const d of r.duels) {
      for (const side of SIDES) {
        const att = d.attacker === side;
        const w = won(d, side);
        if (d.active[side].length === 0) {
          base[att ? 'att' : 'def'][0]++;
          if (w) base[att ? 'att' : 'def'][1]++;
        }
        for (const c of d.active[side]) {
          const p = per[c];
          if (att) {
            p.activeAtt++;
            if (w) p.activeAttWins++;
            if (d.kind === 'goal' && !d.stolen) p.goals++;
          } else {
            p.activeDef++;
            if (w) p.activeDefWins++;
            if (d.stolen) p.goals++;
          }
        }
      }
    }
  }
  const pct = (a: number, b: number) => (b ? +((100 * a) / b).toFixed(1) : null);
  return {
    baselineDuelWin: { attacking: pct(base.att[1], base.att[0]), defending: pct(base.def[1], base.def[0]) },
    cards: Object.fromEntries(
      Object.entries(per)
        .sort((a, b) => b[1].played - a[1].played)
        .map(([id, p]) => [id, { inDecks: p.decks, played: p.played, usedWhenHeld: pct(p.played, p.decks), duelWinAttacking: pct(p.activeAttWins, p.activeAtt), duelWinDefending: pct(p.activeDefWins, p.activeDef), goals: p.goals }]),
    ),
  };
}

function run(n: number, deckFor: (side: Side) => CardId[], botFor: (side: Side) => Bot) {
  return Array.from({ length: n }, () => playMatch({ player: deckFor('player'), opponent: deckFor('opponent') }, { player: botFor('player'), opponent: botFor('opponent') }));
}

/** A loadout of `size` different playstyles (ignores the budget: for "what if loadouts were bigger"). */
function bigDeck(size: number): CardId[] {
  return [...CARDS].sort(() => Math.random() - 0.5).slice(0, size).map((c) => c.id);
}

describe.runIf(process.env.ZM_SIM_VARIANTS)('rule variants: card skill against knowledge', () => {
  it('measures each variant', () => {
    const N = Number(process.env.ZM_SIM_N ?? 1000);
    const off = { counters: false, downsides: false, attackerWinsTies: false, energy: false, hiddenLoadouts: false };
    const variants: { name: string; rules: Partial<typeof RULES>; deck: number }[] = [
      { name: 'today', rules: {}, deck: 3 },
      { name: '1 counters', rules: { counters: true }, deck: 3 },
      { name: '2 downsides', rules: { downsides: true }, deck: 3 },
      { name: '4 hidden loadouts', rules: { hiddenLoadouts: true }, deck: 3 },
      { name: '5 attacker wins ties', rules: { attackerWinsTies: true }, deck: 3 },
      { name: '1+2+5', rules: { counters: true, downsides: true, attackerWinsTies: true }, deck: 3 },
      { name: '1+2+4+5', rules: { counters: true, downsides: true, attackerWinsTies: true, hiddenLoadouts: true }, deck: 3 },
      { name: '3 energy (4-card loadout)', rules: { energy: true }, deck: 4 },
      { name: '1+2+3+5', rules: { counters: true, downsides: true, attackerWinsTies: true, energy: true }, deck: 4 },
      { name: 'all 1+2+3+4+5', rules: { counters: true, downsides: true, attackerWinsTies: true, energy: true, hiddenLoadouts: true }, deck: 4 },
    ];
    const bot = (p: Policy, o: Policy, pb = 0.65, ob = 0.65) => (side: Side) => (side === 'player' ? makeBot(p, pb) : makeBot(o, ob));
    // ZM_SIM_ONLY="today,2 downsides,…" runs just those mixes (the energy ones are out: owner, 2026-11-03).
    const only = process.env.ZM_SIM_ONLY?.split(',');
    const extra: typeof variants = [
      { name: '1+2', rules: { counters: true, downsides: true }, deck: 3 },
      { name: '2+4', rules: { downsides: true, hiddenLoadouts: true }, deck: 3 },
      { name: '1+2+4', rules: { counters: true, downsides: true, hiddenLoadouts: true }, deck: 3 },
    ];
    const rows = [];
    for (const v of [...variants, ...extra].filter((x) => !only || only.includes(x.name))) {
      setRules({ ...off, ...v.rules });
      const deck = () => (v.deck === 3 ? randomDeck() : bigDeck(v.deck));
      const smartVsSmart = summarise(v.name, run(N, deck, bot('smart', 'smart')));
      rows.push({
        variant: v.name,
        smartVsRandom: share(run(N, deck, bot('smart', 'random'))),
        smartMinus10VsRandom: share(run(N, deck, bot('smart', 'random', 0.65, 0.75))),
        knowledgePlus10_noCards: share(run(N, () => [], bot('none', 'none', 0.75, 0.65))),
        draws: smartVsSmart.draw,
        teamMax: smartVsSmart.goalsPerTeam.max,
        avgMargin: smartVsSmart.avgMargin,
        stolenGoalShare: smartVsSmart.stolenGoalShare,
        notes: smartVsSmart.notes,
        goals: smartVsSmart.goalsPerMatch.avg,
        maxGoals: smartVsSmart.goalsPerMatch.max,
        numericShare: smartVsSmart.numericShare,
        cardsPerMatch: smartVsSmart.cardsPerMatch,
        stuck: smartVsSmart.stuck,
      });
    }
    setRules(off);
    writeFileSync(process.env.ZM_SIM_OUT ?? '/tmp/zm-sim-variants.json', JSON.stringify(rows, null, 2));
  }, 3_600_000);
});

describe.runIf(process.env.ZM_SIM_FINAL)('recommended rules + the new cards: balance', () => {
  it('checks every card and the bluffs', () => {
    const N = Number(process.env.ZM_SIM_N ?? 1000);
    const off = { counters: false, downsides: false, attackerWinsTies: false, energy: false, hiddenLoadouts: false };
    const bot = (p: Policy, o: Policy, pb = 0.65, ob = 0.65) => (side: Side) => (side === 'player' ? makeBot(p, pb) : makeBot(o, ob));
    const out: Record<string, unknown> = {};
    for (const [name, rules] of [
      ['hidden loadouts', { counters: true, downsides: true, hiddenLoadouts: true }],
      ['visible loadouts', { counters: true, downsides: true, hiddenLoadouts: false }],
    ] as const) {
      setRules({ ...off, ...rules });
      const games = run(N, () => randomDeck(), bot('smart', 'smart'));
      const forced: Record<string, number> = {};
      if (name === 'hidden loadouts') {
        for (const c of CARDS) {
          forced[c.id] = share(
            run(N, (side) => {
              if (side === 'opponent') return randomDeck();
              for (let tries = 0; tries < 80; tries++) {
                const deck = randomDeck();
                if (deck.includes(c.id)) return deck;
              }
              return [c.id];
            }, bot('smart', 'smart')),
          );
        }
      }
      out[name] = {
        summary: summarise(name, games),
        smartVsRandom: share(run(N, () => randomDeck(), bot('smart', 'random'))),
        smartMinus10VsRandom: share(run(N, () => randomDeck(), bot('smart', 'random', 0.65, 0.75))),
        bluffsBaited: games.reduce((n, r) => n + (r.baits ?? 0), 0),
        bluffsPlayed: games.reduce((n, r) => n + r.plays.filter((p) => BLUFF_CARDS.includes(p.card)).length, 0),
        cards: cardReport(games),
        forcedCardShare: Object.fromEntries(Object.entries(forced).sort((a, b) => b[1] - a[1])),
      };
    }
    setRules(off);
    writeFileSync(process.env.ZM_SIM_OUT ?? '/tmp/zm-sim-final.json', JSON.stringify(out, null, 2));
  }, 3_600_000);
});

describe.runIf(process.env.ZM_SIM_DECKS)('what bigger loadouts do to card skill', () => {
  it('measures card skill against knowledge by loadout size', () => {
    const N = Number(process.env.ZM_SIM_N ?? 1000);
    const rows = [];
    for (const size of [3, 5, 8]) {
      const deck = () => (size === 3 ? randomDeck() : bigDeck(size));
      const bot = (p: Policy, o: Policy, pb = 0.65, ob = 0.65) => (side: Side) => (side === 'player' ? makeBot(p, pb) : makeBot(o, ob));
      rows.push({
        size,
        smartVsRandom: share(run(N, deck, bot('smart', 'random'))),
        smartVsNone: share(run(N, (side) => (side === 'player' ? deck() : []), bot('smart', 'none'))),
        smartVsRandomPlus10: share(run(N, deck, bot('smart', 'random', 0.65, 0.75))),
      });
    }
    writeFileSync(process.env.ZM_SIM_OUT ?? '/tmp/zm-sim-decks.json', JSON.stringify(rows, null, 2));
  }, 1_800_000);
});

describe.runIf(process.env.ZM_SIM)('zone match balance simulation', () => {
  it('plays the experiments', () => {
    const N = Number(process.env.ZM_SIM_N ?? 1000);
    const t0 = Date.now();
    const bots = (p: Policy, o: Policy, pb = 0.65, ob = 0.65) => (side: Side) => (side === 'player' ? makeBot(p, pb) : makeBot(o, ob));
    const decks = (p: boolean, o: boolean) => (side: Side) => ((side === 'player' ? p : o) ? randomDeck() : []);

    const smartVsSmart = run(N, decks(true, true), bots('smart', 'smart'));
    const smartVsRandom = run(N, decks(true, true), bots('smart', 'random'));
    const smartVsNone = run(N, decks(true, false), bots('smart', 'none'));
    const randomVsNone = run(N, decks(true, false), bots('random', 'none'));
    const noCards = run(N, decks(false, false), bots('none', 'none'));
    // What a knowledge edge is worth, to price the cards in "answers".
    const knowledge = [0.02, 0.05, 0.1].map((gap) => ({ gap: `+${gap * 100}% accuracy`, share: share(run(N, decks(false, false), bots('none', 'none', 0.65 + gap, 0.65))) }));
    const smartVsBetterNoCards = [0.05, 0.1].map((gap) => ({ gap: `smart cards vs no cards but +${gap * 100}% accuracy`, share: share(run(N, decks(true, false), bots('smart', 'none', 0.65, 0.65 + gap))) }));
    // Each card forced into a smart player's loadout (rest random), smart rival with a random loadout.
    const forced: Record<string, number> = {};
    for (const c of CARDS) {
      forced[c.id] = share(
        run(N, (side) => {
          if (side === 'opponent') return randomDeck();
          for (let tries = 0; tries < 60; tries++) {
            const deck = randomDeck();
            if (deck.includes(c.id)) return deck;
          }
          return [c.id];
        }, bots('smart', 'smart')),
      );
    }
    const out = {
      ms: Date.now() - t0,
      smartVsSmart: summarise('smart vs smart (random loadouts, equal knowledge)', smartVsSmart),
      cards: cardReport(smartVsSmart),
      forcedCardShare: Object.fromEntries(Object.entries(forced).sort((a, b) => b[1] - a[1])),
      smartVsRandom: summarise('smart vs random card use (equal knowledge)', smartVsRandom),
      smartVsNone: summarise('smart cards vs no cards (equal knowledge)', smartVsNone),
      randomVsNone: summarise('random cards vs no cards (equal knowledge)', randomVsNone),
      noCards: summarise('no cards at all', noCards),
      knowledge,
      smartVsBetterNoCards,
    };
    writeFileSync(process.env.ZM_SIM_OUT ?? '/tmp/zm-sim.json', JSON.stringify(out, null, 2));
  }, 1_800_000);
});

describe.runIf(process.env.ZM_SIM_BICYCLE)('Bicycle Kick variants: is any of them overpowered?', () => {
  it('forces each variant into a loadout', () => {
    const N = Number(process.env.ZM_SIM_N ?? 1000);
    const off = { counters: false, downsides: false, attackerWinsTies: false, energy: false, hiddenLoadouts: false };
    const smart = (side: Side) => makeBot('smart', 0.65 + (side === 'player' ? 0 : 0));
    const forced = (card: CardId) => share(
      run(N, (side) => {
        if (side === 'opponent') return randomDeck();
        for (let tries = 0; tries < 80; tries++) {
          const deck = randomDeck();
          if (deck.includes(card)) return deck;
        }
        return [card];
      }, smart),
    );
    const out: Record<string, unknown> = {};
    const variants = (process.env.ZM_SIM_ONLY?.split(',') ?? ['comeback', 'faster']) as (typeof RULES.bicycle)[];
    for (const bicycle of variants) {
      setRules({ ...off, bicycle });
      const games = run(N, () => randomDeck(), smart);
      const kicks = games.flatMap((g) => g.plays.filter((p) => p.card === 'bicycle-kick'));
      out[bicycle] = {
        summary: summarise(bicycle, games),
        bicyclePlays: kicks.length,
        forcedShare: Object.fromEntries((['bicycle-kick', 'screamer', 'golden-boot', 'captains-armband', 'first-touch', 'long-ball'] as CardId[]).map((c) => [c, forced(c)])),
        cards: cardReport(games),
      };
    }
    setRules({ ...off, bicycle: 'comeback' });
    writeFileSync(process.env.ZM_SIM_OUT ?? '/tmp/zm-sim-bicycle.json', JSON.stringify(out, null, 2));
  }, 3_600_000);
});
