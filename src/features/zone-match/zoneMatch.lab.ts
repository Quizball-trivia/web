/**
 * The dev animation lab's catalog (/dev/zone-match/lab): every animation the zone match plays, one entry each, built
 * from the real rules (resolveBattle), the real outcome scripts (buildScript) and the real card effects (CardFx) — so
 * whatever is tweaked in the lab is what the match shows. Pure: no React, no DOM.
 */

import { CARD_BY_ID, CARDS, FLOODLIGHT_MS, TIKI_TAKA_DUELS, type CardId } from './zoneMatch.cards';
import type { GameQuestion } from '@/lib/domain';
import type { SampleNumericQuestion } from '@/features/numeric-question/sampleNumericQuestions';
import { GLOVES_SAVE_NOTE, IDLE, MCQ_MS, NUMERIC_MS, type MatchState } from './zoneMatch.machine';
import { otherZoneSide, resolveBattle, type AttackZone, type BattleMods, type BattleOutcome, type Possession, type ZoneSide } from './zoneMatch.rules';
import { CELEBRATIONS, buildScript, type DirectorMode } from './zoneMatch3d.director';
import { NO_CARDS, type CardFx, type ResultCard, type ScriptCards } from './zoneMatch3d.fx';
import {
  STAND,
  mixPose,
  backpedalPose,
  celebratePose,
  crouchPose,
  divePose,
  idlePose,
  jockeyPose,
  keeperSetPose,
  kneeSlidePose,
  runPose,
  slidePose,
  sprawlPose,
  stepOverPose,
  strikePose,
  type FullBodyPose,
} from './zoneMatch.fullBody';

export type LabGroup = 'duel' | 'outcome' | 'goal' | 'card' | 'question' | 'body';

export const LAB_GROUPS: { id: LabGroup; label: string }[] = [
  { id: 'outcome', label: 'Outcomes' },
  { id: 'goal', label: 'Shots & goals' },
  { id: 'card', label: 'Cards' },
  { id: 'question', label: 'Questions' },
  { id: 'duel', label: 'Duel & tiebreak' },
  { id: 'body', label: 'Body moves' },
];

/** A 3D scene: what the director plays, the card effects on top, and how long one run lasts (seconds). */
export interface LabScene {
  mode: DirectorMode;
  /** The duel's spot (idle / bullet / sky), or where an outcome started. */
  from: Possession;
  outcome: BattleOutcome | null;
  seed: number;
  cards: ScriptCards;
  fx: Partial<Omit<CardFx, 'duelNo' | 'moment'>>;
  /** A card fired at the start (its pop-up moment and activation beat). */
  moment: { side: ZoneSide; card: CardId } | null;
  /** Tiebreak reveal: show the sky-shot overlay, won by this side. */
  sky: ZoneSide | null;
  /** Idle: start at `from`'s spots, then jog to this duel's spots. */
  moveTo?: Possession;
  length: number;
}

export interface LabEntry {
  id: string;
  group: LabGroup;
  label: string;
  /** What to look for, and where the code lives. */
  about: string;
  source: string;
  /** A 3D scene (with the attacker the lab's "attacking" toggle picks), or a body move. */
  scene?: (attacker: ZoneSide) => LabScene;
  body?: { pose: (t: number) => FullBodyPose; loop: number; dribble?: { cycles: number; speed: number } };
  /** The question sheet over the scene: the match state `t` ms into the run (the question opened at `openedAt`). */
  question?: { state: (t: number, openedAt: number) => MatchState; length: number };
}

export function emptyFx(duelNo: number): CardFx {
  return {
    duelNo,
    moment: null,
    armband: null,
    goldenBoot: null,
    gloves: { player: false, opponent: false },
    home: null,
    fog: false,
    mud: [],
    dark: null,
    results: [],
    active: [],
    firstTouch: null,
    secondBall: null,
    booked: [],
    offside: null,
    bus: null,
    tiki: null,
    reason: null,
  };
}

/** A goal or an open-play result holds until the next duel; one run of the lab shows this much of it. */
const HOLD_S = 5.5;
const IDLE_S = 4;

function outcomeScene(zone: AttackZone, winner: 'A' | 'D' | null, mods: BattleMods, extra: Partial<Pick<LabScene, 'seed' | 'fx'>> & { note?: string; results?: (A: ZoneSide, D: ZoneSide) => ResultCard[]; keeperGloves?: boolean; goldenBoot?: boolean } = {}) {
  return (A: ZoneSide): LabScene => {
    const D = otherZoneSide(A);
    const from: Possession = { attacker: A, zone };
    const outcome = resolveBattle(from, winner === 'A' ? A : winner === 'D' ? D : null, mods);
    const cards: ScriptCards = {
      results: extra.results?.(A, D) ?? [],
      note: extra.note ?? null,
      keeperGloves: extra.keeperGloves ?? false,
      goldenBoot: extra.goldenBoot ?? false,
    };
    const seed = extra.seed ?? 0;
    const end = buildScript(from, outcome, seed, cards).end;
    return { mode: 'outcome', from, outcome, seed, cards, fx: extra.fx ?? {}, moment: null, sky: null, length: Number.isFinite(end) ? end + 0.8 : HOLD_S };
  };
}

const result = (card: CardId, side: ZoneSide, against: CardId | null = null): ResultCard => ({ card, side, against });

const OUTCOMES: LabEntry[] = [
  { id: 'advance-own', group: 'outcome', label: 'Dribble past · own half', about: 'Attacker wins the duel and carries the ball into midfield.', source: 'advanceScript', scene: outcomeScene('own', 'A', {}) },
  { id: 'advance-centre', group: 'outcome', label: 'Dribble past · midfield', about: 'Attacker wins in midfield and reaches the shooting zone.', source: 'advanceScript', scene: outcomeScene('centre', 'A', {}) },
  { id: 'advance-armband', group: 'outcome', label: "Sprint · Captain's Armband", about: 'Armband: a win moves two zones — a sprint with speed lines and a trail.', source: 'advanceScript (sprint)', scene: outcomeScene('own', 'A', { attackerSteps: 2 }, { results: (A) => [result('captains-armband', A)] }) },
  { id: 'advance-first-touch', group: 'outcome', label: 'Flick · First Touch', about: 'First Touch decided it: a flick past the defender.', source: 'advanceScript (flick)', scene: outcomeScene('centre', 'A', {}, { note: 'First Touch' }) },
  { id: 'advance-tiki', group: 'outcome', label: 'Passing move · Tiki-Taka', about: 'Tiki-Taka: ghost team-mates pass the ball upfield.', source: 'advanceScript (tiki)', scene: outcomeScene('own', 'A', { attackerSteps: 2 }, { results: (A) => [result('tiki-taka', A)] }) },
  { id: 'long-ball-lands', group: 'outcome', label: 'Long Ball lands', about: 'A long ball over the top, two zones forward.', source: 'longBallScript (lands)', scene: outcomeScene('own', 'A', { attackerSteps: 2 }, { note: 'Long Ball lands' }) },
  { id: 'long-ball-cut', group: 'outcome', label: 'Long Ball cut out', about: 'The defender reads the long ball and wins it.', source: 'longBallScript (cut out)', scene: outcomeScene('own', 'D', { defenderZone: 'centre' }, { note: 'Long Ball cut out' }) },
  { id: 'tackle', group: 'outcome', label: 'Slide tackle', about: 'Defender wins: slide tackle, the attacker sprawls.', source: 'tackleScript', scene: outcomeScene('centre', 'D', {}) },
  { id: 'tackle-counter', group: 'outcome', label: 'Tackle + Counter-Attack', about: 'Counter-Attack: the defender wins it and breaks forward.', source: 'tackleScript (counter)', scene: outcomeScene('centre', 'D', { defenderSteps: 1 }, { results: (_A, D) => [result('counter-attack', D)] }) },
  { id: 'offside', group: 'outcome', label: 'Offside trap', about: 'Offside Trap: the line steps up, the flag goes up.', source: 'offsideScript', scene: outcomeScene('centre', 'D', {}, { note: 'Offside trap!' }) },
  { id: 'loose', group: 'outcome', label: 'Loose ball (both wrong)', about: 'Both wrong: the ball squirts loose and changes sides.', source: 'looseBallScript', scene: outcomeScene('centre', null, {}) },
  { id: 'held', group: 'outcome', label: 'Held · Park the Bus (midfield)', about: 'The attacker won but the bus keeps the ball where it is.', source: 'blockedScript', scene: outcomeScene('centre', 'A', { holdGround: true }, { results: (_A, D) => [result('park-the-bus', D)] }) },
  { id: 'steal-score', group: 'outcome', label: 'Steal and score', about: 'Defender wins it near the attacker’s goal and scores at once.', source: 'stealScoreScript', scene: outcomeScene('own', 'D', { cleanSteal: true }) },
];

const CELEBRATION_LABEL: Record<string, string> = {
  celebrate_siu: 'Siu',
  celebrate_sky: 'Sky point',
  celebrate_samba: 'Samba',
  celebrate: 'Jump',
  celebrate_fold: 'Arms folded',
};

const GOALS: LabEntry[] = [
  ...CELEBRATIONS.map((name, seed): LabEntry => ({
    id: `goal-${seed}`,
    group: 'goal',
    label: `Goal · ${CELEBRATION_LABEL[name] ?? name}`,
    about: `Shot past the keeper, then the "${CELEBRATION_LABEL[name] ?? name}" celebration (the duel number picks it).`,
    source: `shotScript('goal') · ${name}`,
    scene: outcomeScene('opponent', 'A', {}, { seed }),
  })),
  { id: 'goal-golden', group: 'goal', label: 'Golden Boot goal', about: 'Golden Boot: a golden ball with a trail.', source: "shotScript('goal', golden)", scene: outcomeScene('opponent', 'A', {}, { results: (A) => [result('golden-boot', A)], goldenBoot: true }) },
  { id: 'goal-golden-bus', group: 'goal', label: 'Golden Boot through the bus', about: 'The golden shot goes through Park the Bus.', source: "shotScript('goal', throughBus)", scene: outcomeScene('opponent', 'A', {}, { results: (A) => [result('golden-boot', A, 'park-the-bus')], goldenBoot: true }) },
  { id: 'goal-golden-gloves', group: 'goal', label: 'Golden Boot through Gloves', about: 'The golden shot beats Goalkeeper Gloves.', source: "shotScript('goal', throughGloves)", scene: outcomeScene('opponent', 'A', {}, { results: (A) => [result('golden-boot', A)], goldenBoot: true, keeperGloves: true }) },
  { id: 'goal-lob', group: 'goal', label: 'Lob goal · Long Ball', about: 'A Long Ball from midfield lobbed over the keeper.', source: "shotScript('goal', lob)", scene: outcomeScene('centre', 'A', { attackerSteps: 2 }, { note: 'Long Ball lands' }) },
  { id: 'goal-armband', group: 'goal', label: 'Run-in goal · Armband', about: 'Armband from midfield: sprint through and score.', source: "shotScript('goal', sprint)", scene: outcomeScene('centre', 'A', { attackerSteps: 2 }, { results: (A) => [result('captains-armband', A)] }) },
  { id: 'save', group: 'goal', label: 'Keeper save', about: 'Keeper wins the duel: the dive and the catch.', source: "shotScript('save')", scene: outcomeScene('opponent', 'D', {}) },
  { id: 'save-gloves', group: 'goal', label: 'Goalkeeper Gloves save', about: 'Gloves stop the shot before any question.', source: "shotScript('save', gloves)", scene: outcomeScene('opponent', 'D', {}, { note: GLOVES_SAVE_NOTE, keeperGloves: true }) },
  { id: 'parry', group: 'goal', label: 'Parry (both wrong)', about: 'Both wrong on a shot: the keeper parries it away.', source: "shotScript('parry')", scene: outcomeScene('opponent', null, {}) },
  { id: 'block', group: 'goal', label: 'Block', about: 'Shot blocked: the attacker keeps the ball in the box.', source: "shotScript('block')", scene: outcomeScene('opponent', 'A', { holdGround: true }) },
  { id: 'block-bus', group: 'goal', label: 'Park the Bus wall', about: 'Park the Bus: a wall of ghost defenders blocks the shot.', source: "shotScript('block', wall)", scene: outcomeScene('opponent', 'A', { holdGround: true }, { results: (_A, D) => [result('park-the-bus', D)] }) },
];

function idleScene(mode: DirectorMode, zone: AttackZone, sky: 'A' | 'D' | null = null) {
  return (A: ZoneSide): LabScene => ({
    mode,
    from: { attacker: A, zone },
    outcome: null,
    seed: 0,
    cards: NO_CARDS,
    fx: {},
    moment: null,
    sky: sky === 'A' ? A : sky === 'D' ? otherZoneSide(A) : null,
    length: mode === 'sky' ? 6 : IDLE_S,
  });
}

function jogScene(fromZone: AttackZone, toZone: AttackZone) {
  return (A: ZoneSide): LabScene => ({ ...idleScene('idle', fromZone)(A), moveTo: { attacker: A, zone: toZone }, length: 4.5 });
}

const DUEL: LabEntry[] = [
  { id: 'jog-up', group: 'duel', label: 'Jog up the pitch', about: 'Attacker jogs forward to the next duel; the defender drops back facing them (backpedal).', source: "DuelDirector.settle · 'run' / 'backpedal'", scene: jogScene('own', 'centre') },
  { id: 'jog-up-far', group: 'duel', label: 'Jog up two zones', about: 'A longer run: own half to the shot (the defender heads for goal).', source: "DuelDirector.settle · 'run' / 'backpedal'", scene: jogScene('own', 'opponent') },
  { id: 'jog-back', group: 'duel', label: 'Jog back', about: 'Back from the shooting zone to midfield.', source: "DuelDirector.settle · 'run' / 'backpedal'", scene: jogScene('opponent', 'centre') },
  { id: 'idle-own', group: 'duel', label: 'Duel stance · own half', about: 'Attacker on the ball, defender jockeying.', source: 'DuelDirector.settle · duelSpots', scene: idleScene('idle', 'own') },
  { id: 'idle-centre', group: 'duel', label: 'Duel stance · midfield', about: 'The midfield duel spots.', source: 'DuelDirector.settle · duelSpots', scene: idleScene('idle', 'centre') },
  { id: 'idle-shot', group: 'duel', label: 'Duel stance · shot (keeper)', about: 'Shooting: the defender stands in goal as the keeper.', source: 'DuelDirector.settle · keeper', scene: idleScene('idle', 'opponent') },
  { id: 'bullet', group: 'duel', label: 'Bullet time (number question)', about: 'Both frozen shoulder to shoulder while the camera orbits.', source: 'DuelDirector.bulletFrame', scene: idleScene('bullet', 'centre') },
  { id: 'sky-attacker', group: 'duel', label: 'Sky shot · attacker closer', about: 'The tiebreak reveal: both kick a ball up the number scale.', source: 'DuelDirector.skyFrame · ZoneMatchSkyShot', scene: idleScene('sky', 'centre', 'A') },
  { id: 'sky-defender', group: 'duel', label: 'Sky shot · defender closer', about: 'Same reveal, the other side wins.', source: 'DuelDirector.skyFrame · ZoneMatchSkyShot', scene: idleScene('sky', 'centre', 'D') },
];

/** Which card state lights up while the card is in play, by the side that played it. */
function cardState(card: CardId, side: ZoneSide, victim: ZoneSide): Partial<CardFx> {
  switch (card) {
    case 'captains-armband': return { armband: side };
    case 'golden-boot': return { goldenBoot: side };
    case 'goalkeeper-gloves': return { gloves: { player: side === 'player', opponent: side === 'opponent' } };
    case 'home-advantage': return { home: side };
    case 'fog': return { fog: victim === 'player' };
    case 'muddy-pitch': return { mud: [victim] };
    case 'first-touch': return { firstTouch: side };
    case 'second-ball': return { secondBall: side };
    case 'yellow-card': return { booked: [victim] };
    case 'offside-trap': return { offside: side };
    case 'park-the-bus': return { bus: side };
    case 'tiki-taka': return { tiki: { side, left: TIKI_TAKA_DUELS } };
    default: return {};
  }
}

/** Where a card is shown: shot cards in front of goal, the rest in midfield. */
const SHOT_CARDS = new Set<CardId>(['golden-boot', 'goalkeeper-gloves']);

/** A card played by `side` with the duel standing still: its pop-up, activation beat and in-scene effect. */
function cardScene(card: CardId, side: ZoneSide): LabScene {
  const victim = otherZoneSide(side);
  const fx: Partial<CardFx> = { ...cardState(card, side, victim), active: [{ side, card }] };
  return {
    mode: 'idle',
    // Gloves belong to the keeper: its owner defends the shot.
    from: { attacker: card === 'goalkeeper-gloves' ? victim : side, zone: SHOT_CARDS.has(card) ? 'opponent' : 'centre' },
    outcome: null,
    seed: 0,
    cards: NO_CARDS,
    fx,
    moment: { side, card },
    sky: null,
    length: card === 'floodlight-failure' ? FLOODLIGHT_MS / 1000 + 1 : 4.5,
  };
}

const CARD_ENTRIES: LabEntry[] = CARDS.map((card): LabEntry => ({
  id: `card-${card.id}`,
  group: 'card',
  label: `${card.icon} ${card.name}`,
  about: `${card.type} · ${card.effect}`,
  source: 'CardEffectsEngine.takeMoment · CardExtras.onMoment / update',
  // The attacking toggle picks who plays the card; sabotage lands on the other side.
  scene: (A) => cardScene(card.id, A),
}));

/* ── questions ───────────────────────────────────────────────────────── */

// Made-up questions: the web repo is public, so no real answers here.
const DEMO_MCQ: GameQuestion = { id: 'lab-q1', prompt: 'Demo question — which answer is right?', options: ['Answer A', 'Answer B (right)', 'Answer C', 'Answer D'], correctIndex: 1 };
const DEMO_SUB: GameQuestion = { id: 'lab-q2', prompt: 'Substitute question — a fresh one flips in', options: ['New A', 'New B', 'New C (right)', 'New D'], correctIndex: 2 };
export const DEMO_NUMBER: SampleNumericQuestion = { id: 'lab-n1', prompt: { en: 'Demo number question — type any number' }, unit: { en: 'goals' }, value: 42, step: 1, precision: 0 };

interface McqScript {
  played?: Partial<Record<ZoneSide, CardId[]>>;
  /** ms into the run → what has happened by then. */
  you?: [number, number];
  rival?: [number, number];
  reveal: number;
  firstMiss?: [number, number];
  fifty?: [number, number[]];
  swap?: number;
}

function mcqState(script: McqScript, t: number, openedAt: number): MatchState {
  const at = (step?: [number, number]) => (step && t >= step[0] ? step[1] : null);
  const fifty = script.fifty && t >= script.fifty[0] ? script.fifty : null;
  return {
    ...IDLE,
    stage: 'play',
    battleStep: t >= script.reveal ? 'mcqReveal' : 'mcq',
    round: 2,
    duelInRound: 0,
    possession: { attacker: 'player', zone: 'centre' },
    played: { player: script.played?.player ?? [], opponent: script.played?.opponent ?? [] },
    cancelled: { player: false, opponent: false },
    mcq: {
      key: 1,
      question: script.swap !== undefined && t >= script.swap ? DEMO_SUB : DEMO_MCQ,
      categoryName: 'Demo',
      offCategory: false,
      answers: { player: at(script.you), opponent: at(script.rival) },
      firstMiss: { player: at(script.firstMiss), opponent: null },
      startedAt: openedAt,
      deadline: openedAt + MCQ_MS,
      hidden: { player: fifty ? fifty[1] : [], opponent: [] },
      hiddenAt: { player: fifty ? openedAt + fifty[0] : null, opponent: null },
    },
  };
}

function numberState(played: Partial<Record<ZoneSide, CardId[]>>, rivalLocks: number, t: number, openedAt: number): MatchState {
  return {
    ...IDLE,
    stage: 'play',
    battleStep: 'numeric',
    round: 2,
    possession: { attacker: 'player', zone: 'centre' },
    played: { player: played.player ?? [], opponent: played.opponent ?? [] },
    cancelled: { player: false, opponent: false },
    numeric: {
      key: 1,
      question: DEMO_NUMBER,
      guesses: { player: { value: null, lockedAtMs: null }, opponent: t >= rivalLocks ? { value: 40, lockedAtMs: openedAt + rivalLocks } : { value: null, lockedAtMs: null } },
      startedAt: openedAt,
      deadline: openedAt + NUMERIC_MS,
      result: null,
    },
  };
}

function plainScene(zone: AttackZone, mode: DirectorMode = 'idle'): LabScene {
  return { mode, from: { attacker: 'player', zone }, outcome: null, seed: 0, cards: NO_CARDS, fx: {}, moment: null, sky: null, length: 0 };
}

function mcqEntry(id: string, label: string, about: string, script: McqScript, card: { id: CardId; side: ZoneSide } | null, length: number): LabEntry {
  return {
    id,
    group: 'question',
    label,
    about,
    source: card ? 'McqPanel (ZoneMatchStage) · CardsInPlay' : 'McqPanel (ZoneMatchStage) → PossessionQuestionPanel',
    scene: () => ({ ...(card ? cardScene(card.id, card.side) : plainScene('centre')), length }),
    question: { state: (t, openedAt) => mcqState(script, t, openedAt), length },
  };
}

const QUESTIONS: LabEntry[] = [
  mcqEntry('q-right', 'Multiple choice · both right', 'Four answers, the timer, your pick, then the rival’s, then the reveal.', { you: [2200, 1], rival: [3000, 1], reveal: 4200 }, null, 6),
  mcqEntry('q-wrong', 'Multiple choice · you miss', 'You pick wrong; the reveal shows the right one.', { you: [2200, 3], rival: [3000, 1], reveal: 4200 }, null, 6),
  mcqEntry('q-fifty', '✂️ 50/50', 'Two wrong answers get struck out, then disappear.', { played: { player: ['fifty-fifty'] }, fifty: [1200, [0, 3]], you: [3600, 1], rival: [4000, 1], reveal: 4800 }, { id: 'fifty-fifty', side: 'player' }, 6.5),
  mcqEntry('q-fog', '🌫️ Fog (on you)', 'The answers are fogged until you tap to clear them.', { played: { opponent: ['fog'] }, rival: [3000, 1], reveal: 6500 }, { id: 'fog', side: 'opponent' }, 8),
  mcqEntry('q-floodlight', '💡 Floodlight Failure (on you)', 'Lights out: the sheet is black for the first seconds.', { played: { opponent: ['floodlight-failure'] }, you: [5200, 1], rival: [2500, 1], reveal: 6200 }, { id: 'floodlight-failure', side: 'opponent' }, 7.5),
  mcqEntry('q-mud', '🟫 Muddy Pitch (on you)', 'Mud splats over the answers and reshuffles them (2–6 s in).', { played: { opponent: ['muddy-pitch'] }, rival: [3000, 1], reveal: 7500 }, { id: 'muddy-pitch', side: 'opponent' }, 9),
  mcqEntry('q-second-ball', '🔁 Second Ball', 'Your first wrong answer is spent: one more try.', { played: { player: ['second-ball'] }, firstMiss: [1800, 0], you: [3400, 1], rival: [2600, 1], reveal: 4600 }, { id: 'second-ball', side: 'player' }, 6.5),
  mcqEntry('q-substitution', '🔄 Substitution', 'The question flips over to a new one.', { played: { player: ['substitution'] }, swap: 1800, you: [3600, 2], rival: [4000, 2], reveal: 4800 }, { id: 'substitution', side: 'player' }, 6.5),
  mcqEntry('q-chips', 'Cards in play (chips)', 'The chips over the question: your card and theirs.', { played: { player: ['captains-armband'], opponent: ['fifty-fifty'] }, you: [2600, 1], rival: [3000, 1], reveal: 4200 }, null, 6),
  {
    id: 'q-number',
    group: 'question',
    label: 'Number question (pad)',
    about: 'Both right: the closest guess wins. Type on the pad; the rival locks in.',
    source: 'NumericPanel (ZoneMatchStage) · NumericPad',
    scene: () => ({ ...plainScene('centre', 'bullet'), length: 9 }),
    question: { state: (t, openedAt) => numberState({}, 2500, t, openedAt), length: 9 },
  },
  {
    id: 'q-number-floodlight',
    group: 'question',
    label: '💡 Number question · Floodlight',
    about: 'Floodlight Failure on the number question: the pad starts dark.',
    source: 'NumericPanel · numericLightsOut',
    scene: () => ({ ...cardScene('floodlight-failure', 'opponent'), mode: 'bullet', length: 9 }),
    question: { state: (t, openedAt) => numberState({ opponent: ['floodlight-failure'] }, 2500, t, openedAt), length: 9 },
  },
];

/** A one-off move in the lab's loop: into it, a hold, back out to the stance (so the loop never jumps). */
function inAndOut(pose: (k: number, t: number) => FullBodyPose, inS: number, holdS: number, outS: number) {
  return (t: number) => {
    const k = t < inS ? t / inS : t < inS + holdS ? 1 : 1 - (t - inS - holdS) / outS;
    return mixPose(STAND, pose(Math.min(1, Math.max(0, k)), t), Math.min(1, Math.max(0, k)) ** 0.5);
  };
}

const BODY: LabEntry[] = [
  { id: 'body-stand', group: 'body', label: 'Stand', about: 'The resting pose (back boot turned out).', source: 'STAND', body: { pose: () => STAND, loop: 2 } },
  { id: 'body-idle', group: 'body', label: 'Idle weight shift', about: 'Standing, shifting weight foot to foot.', source: 'idlePose', body: { pose: (t) => idlePose(t), loop: (2 * Math.PI) / 1.3 } },
  { id: 'body-jog', group: 'body', label: 'Jog', about: 'The run cycle at jogging speed.', source: 'runPose(speed 0.4)', body: { pose: (t) => runPose(t * 2.4, 0.4), loop: 2.5 } },
  { id: 'body-sprint', group: 'body', label: 'Sprint', about: 'The run cycle flat out.', source: 'runPose(speed 1)', body: { pose: (t) => runPose(t * 3.2, 1), loop: 2.5 } },
  { id: 'body-dribble-jog', group: 'body', label: 'Dribble · jog', about: 'The jog with the ball: one touch every stride, the ball rolling ahead and caught up with.', source: 'runPose(speed 0.4) + ball', body: { pose: (t) => runPose(t * 2.4, 0.4), loop: 2.5, dribble: { cycles: 2.4, speed: 0.4 } } },
  { id: 'body-dribble-sprint', group: 'body', label: 'Dribble · sprint', about: 'Flat out with the ball.', source: 'runPose(speed 1) + ball', body: { pose: (t) => runPose(t * 3.2, 1), loop: 2.5, dribble: { cycles: 3.2, speed: 1 } } },
  { id: 'body-backpedal', group: 'body', label: 'Jog back (defending)', about: 'Dropping back while still facing the attacker.', source: 'backpedalPose', body: { pose: (t) => backpedalPose(t * 2.6), loop: 6 / 2.6 } },
  { id: 'body-jockey', group: 'body', label: 'Jockey', about: 'The defender: low, wide, on the toes.', source: 'jockeyPose', body: { pose: (t) => jockeyPose(t), loop: (4 * Math.PI) / 5 } },
  { id: 'body-keeper', group: 'body', label: 'Keeper set', about: 'Crouched, weight forward.', source: 'keeperSetPose', body: { pose: (t) => keeperSetPose(t), loop: (2 * Math.PI) / 1.8 } },
  { id: 'body-strike', group: 'body', label: 'Strike', about: 'Plant, wind-up, through the ball, follow-through.', source: 'strikePose', body: { pose: (t) => strikePose(t), loop: 2 } },
  { id: 'body-dive', group: 'body', label: 'Keeper dive', about: 'Push off, both legs stretched.', source: 'divePose', body: { pose: inAndOut((k) => divePose(k), 0.9, 0.5, 0.5), loop: 1.9 } },
  { id: 'body-slide', group: 'body', label: 'Slide tackle', about: 'Leading leg out, the other tucked.', source: 'slidePose', body: { pose: inAndOut((k) => slidePose(k), 0.6, 0.5, 0.5), loop: 1.6 } },
  { id: 'body-sprawl', group: 'body', label: 'Sprawl (tackled)', about: 'Legs thrown up as the body tips over.', source: 'sprawlPose', body: { pose: inAndOut((k, t) => sprawlPose(k, t), 0.7, 0.5, 0.6), loop: 1.8 } },
  { id: 'body-celebrate', group: 'body', label: 'Celebration jump', about: 'Crouch, spring, knees up, land.', source: 'celebratePose', body: { pose: (t) => celebratePose(t), loop: 2.55 } },
  { id: 'body-knee-slide', group: 'body', label: 'Knee slide', about: 'Kneeling, arms up.', source: 'kneeSlidePose', body: { pose: inAndOut(() => kneeSlidePose(), 0.5, 1, 0.5), loop: 2 } },
  { id: 'body-crouch', group: 'body', label: 'Crouch (sabotaged)', about: 'Ducking under a sabotage card.', source: 'crouchPose', body: { pose: inAndOut((k) => crouchPose(k), 0.5, 0.6, 0.5), loop: 1.6 } },
  { id: 'body-step-over', group: 'body', label: 'Step-over', about: 'The right leg circles over the ball.', source: 'stepOverPose', body: { pose: (t) => stepOverPose(t % 1), loop: 2 } },
];

export const LAB_ENTRIES: LabEntry[] = [...OUTCOMES, ...GOALS, ...CARD_ENTRIES, ...QUESTIONS, ...DUEL, ...BODY];

export const cardName = (id: CardId) => CARD_BY_ID[id].name;
