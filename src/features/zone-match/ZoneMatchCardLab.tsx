'use client';

/**
 * Card Lab (dev only): stage one duel around a single card — who plays it, from where, and how each side answers —
 * and watch it fire through the real match engine. The lab plays both sides itself, so every card shows on cue.
 */

import { useEffect, useState, type Dispatch, type MutableRefObject, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, FlaskConical, Play, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DuelSide } from '@/features/numeric-question/numericDuel';
import { otherZoneSide, type AttackZone, type Possession } from './zoneMatch.rules';
import { CARDS, CARD_BY_ID, DECK_SIZE, FLOODLIGHT_MS, type CardId } from './zoneMatch.cards';
import { cardBlocker, sabotageOn, unusedCategories, type Action, type Content, type MatchState } from './zoneMatch.machine';
import { CARD_TYPE_THEME, CardFace, PHASE_INFO, PlaystyleBadge, ROLE_INFO } from './ZoneMatchCardFace';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

export type LabSituation = 'attack-own' | 'attack-centre' | 'attack-shot' | 'defend-deep' | 'defend-centre' | 'defend-shot';
type Answer = 'right' | 'wrong';

const SITUATIONS: Record<LabSituation, { label: string; attacking: boolean; zone: AttackZone }> = {
  'attack-own': { label: 'Attacking from own side', attacking: true, zone: 'own' },
  'attack-centre': { label: 'Attacking from the centre', attacking: true, zone: 'centre' },
  'attack-shot': { label: 'Shot (from their side)', attacking: true, zone: 'opponent' },
  'defend-deep': { label: 'Defending high up (near their goal)', attacking: false, zone: 'own' },
  'defend-centre': { label: 'Defending at the centre', attacking: false, zone: 'centre' },
  'defend-shot': { label: 'Defending a shot', attacking: false, zone: 'opponent' },
};

export interface LabSetup {
  /** null: a plain duel, no card (the Animation tour's core cases). */
  card: CardId | null;
  /** Who plays the card (or, with no card, whose answers `ownerAnswer` sets). */
  owner: DuelSide;
  /** Seen from the card's owner. */
  situation: LabSituation;
  ownerAnswer: Answer;
  otherAnswer: Answer;
}

export interface LabRun extends LabSetup {
  runId: number;
  /** Set while running the Animation tour: which case this is. */
  tourIndex?: number;
}

export interface TourCase extends LabSetup {
  title: string;
  /** What to look for. */
  note: string;
}


/** Each card's showcase: the setup where its effect shows best. */
const DEMO: Record<CardId, Omit<LabSetup, 'card'>> = {
  'first-touch': { owner: 'player', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'right' },
  'fifty-fifty': { owner: 'player', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
  'golden-boot': { owner: 'player', situation: 'attack-shot', ownerAnswer: 'right', otherAnswer: 'right' },
  'captains-armband': { owner: 'player', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
  'second-ball': { owner: 'player', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
  'floodlight-failure': { owner: 'opponent', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
  'muddy-pitch': { owner: 'opponent', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'right' },
  fog: { owner: 'opponent', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'right' },
  'yellow-card': { owner: 'player', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
  'offside-trap': { owner: 'player', situation: 'defend-centre', ownerAnswer: 'wrong', otherAnswer: 'wrong' },
  'var-review': { owner: 'player', situation: 'defend-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
  'goalkeeper-gloves': { owner: 'player', situation: 'defend-shot', ownerAnswer: 'wrong', otherAnswer: 'right' },
  'park-the-bus': { owner: 'player', situation: 'defend-shot', ownerAnswer: 'wrong', otherAnswer: 'right' },
  'shin-pads': { owner: 'player', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
  'long-ball': { owner: 'player', situation: 'attack-own', ownerAnswer: 'right', otherAnswer: 'right' },
  'counter-attack': { owner: 'player', situation: 'defend-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
  substitution: { owner: 'opponent', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'right' },
  'home-advantage': { owner: 'player', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
  'dummy-run': { owner: 'opponent', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
  'tiki-taka': { owner: 'player', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
};

/** Cards that fill out a lab deck; the lab never plays them. */
const FILLER: CardId[] = ['second-ball', 'substitution', 'dummy-run', 'fog', 'tiki-taka', 'fifty-fifty', 'home-advantage'];

export function labDefaults(card: CardId): LabSetup & { card: CardId } {
  return { card, ...DEMO[card] };
}

/** What each card's case shows in the 3D view (on top of the shared beat: a ring in the card's colour, its icon over
 * the head and a hop on whoever it lands on — the owner, or a sabotage's victim). */
const CARD_LOOK: Record<CardId, string> = {
  'first-touch': 'Mint glow on your boots and a sparkle burst at your feet; both right, you flick it over them instead of a tiebreak',
  'fifty-fifty': 'Scissors snip across you and two faint balls pop and vanish — two answers gone',
  'golden-boot': 'Your boots glow gold through the shot, the ball trails gold and blasts the parked bus aside',
  'captains-armband': 'A glowing yellow "C" armband on your arm; you win: a sprint, and the arrow runs two zones',
  'second-ball': 'A spare ball bounces beside you; when your first answer misses it rolls in for the retry',
  'floodlight-failure': 'The lights cut out with a spotlight on the victim for the blackout',
  'muddy-pitch': 'Mud patches round the victim and a splat on the lens',
  fog: 'Fog rolls low across the pitch while it hides the answers',
  'yellow-card': 'The yellow card held up at the victim; they turn yellow with a lock over their head while they can\'t play cards',
  'offside-trap': 'A dashed yellow offside line across the pitch at your defensive line; the flag goes up and the attacker freezes',
  'var-review': 'The VAR screen checks, a scan line sweeps the player whose card is reviewed, then the card is crossed out',
  'goalkeeper-gloves': 'Big glowing gloves on your hands and a glove hovering by your goal; the save flashes them',
  'park-the-bus': 'A bus rolls in and parks across the attack; the attacker drives into it and the ball bounces back: no ground',
  'shin-pads': 'A shield round you; their sabotage card flies in, hits it and bounces off',
  'long-ball': 'A dotted flight path from your feet to the landing spot, the ball sailing high over the defender',
  'counter-attack': 'Ball won: speed lines and a trail as you break, and the arrow adds the extra zone',
  substitution: 'The substitution board goes up beside you and a whoosh sweeps across as the question swaps',
  'home-advantage': 'Flags in your colours wave in the stand behind you and the boards and crowd glow in your colour',
  'dummy-run': 'A see-through copy of them wearing a "?" runs off and dissolves: only a bluff',
  'tiki-taka': 'A passing triangle on the ground round you and three dots over your head, one per duel left; a ghost teammate plays a one-two',
};

/**
 * The Animation tour: every duel outcome without a card first, then each card's showcase — one staged duel per case,
 * stopping on the result.
 */
export const LAB_TOUR: TourCase[] = [
  { title: 'Win → advance', note: 'You right, they wrong: you dribble past them into their side', card: null, owner: 'player', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
  { title: 'Win from your own side', note: 'From your side to the centre: a dribble and a chase-back', card: null, owner: 'player', situation: 'attack-own', ownerAnswer: 'right', otherAnswer: 'wrong' },
  { title: 'Tackle — you lose it', note: 'You wrong, they right at the centre: slide tackle, they steal it and break on into your side', card: null, owner: 'player', situation: 'attack-centre', ownerAnswer: 'wrong', otherAnswer: 'right' },
  { title: 'Steal in your half → attack from the centre', note: 'Their shot: you put the keeper gloves on. ✓ over you, ✗ over them, then a blue arrow runs from your side to the centre: "✓ vs ✗ — clean steal: +1 zone"; the gloves come off after', card: null, owner: 'player', situation: 'defend-shot', ownerAnswer: 'right', otherAnswer: 'wrong' },
  { title: 'Steal at the centre → attack from their side', note: '✓ over you, ✗ over them; tackle, then you dribble on as the blue arrow runs centre → their side: "✓ vs ✗ — clean steal: +1 zone"', card: null, owner: 'player', situation: 'defend-centre', ownerAnswer: 'right', otherAnswer: 'wrong' },
  { title: 'Steal near their goal → score', note: '✓ / ✗, then the arrow runs from their side into their net: "✓ vs ✗ — clean steal near goal: straight in!" — tackle, shot, celebration', card: null, owner: 'player', situation: 'defend-deep', ownerAnswer: 'right', otherAnswer: 'wrong' },
  { title: 'Tiebreak won as defender → turn changes, same spot', note: 'Both right (✓ ✓), your guess closer: no arrow — a swap ring on the spot: "Tiebreak won — turn over, same spot"', card: null, owner: 'player', situation: 'defend-centre', ownerAnswer: 'right', otherAnswer: 'right' },
  { title: 'Both wrong', note: 'Loose ball off both players; the defender picks it up where it fell', card: null, owner: 'player', situation: 'attack-centre', ownerAnswer: 'wrong', otherAnswer: 'wrong' },
  { title: 'Number tiebreak', note: 'Both right: bullet time during the number question, then your closer guess wins it', card: null, owner: 'player', situation: 'attack-centre', ownerAnswer: 'right', otherAnswer: 'right' },
  { title: 'Goal', note: 'Your shot: strike, the keeper dives the wrong way, net ripples, celebration', card: null, owner: 'player', situation: 'attack-shot', ownerAnswer: 'right', otherAnswer: 'wrong' },
  { title: 'Shot saved', note: 'Your shot, you wrong and they right: the keeper saves and carries it up to the centre', card: null, owner: 'player', situation: 'attack-shot', ownerAnswer: 'wrong', otherAnswer: 'right' },
  { title: 'You concede', note: 'Their shot, they right and you wrong: you are in goal and they score', card: null, owner: 'opponent', situation: 'attack-shot', ownerAnswer: 'right', otherAnswer: 'wrong' },
  ...CARDS.map((card) => ({ ...labDefaults(card.id), title: card.name, note: `${CARD_LOOK[card.id]} · ${card.effect}` })),
];

/** Where the card can be played from, given its role. */
export function labSituations(card: CardId): LabSituation[] {
  switch (CARD_BY_ID[card].role) {
    case 'attack':
      return ['attack-own', 'attack-centre', 'attack-shot'];
    case 'shot':
      return ['attack-shot'];
    case 'defend':
      return ['defend-deep', 'defend-centre', 'defend-shot'];
    case 'any':
      return ['attack-own', 'attack-centre', 'attack-shot', 'defend-deep', 'defend-centre', 'defend-shot'];
  }
}

/** The card the other side plays, so a reaction or a counter has something to beat. */
function labTarget(setup: LabSetup): CardId | null {
  const ownerAttacks = SITUATIONS[setup.situation].attacking;
  switch (setup.card) {
    case 'shin-pads':
      return 'floodlight-failure';
    case 'var-review':
      return ownerAttacks ? 'counter-attack' : 'captains-armband';
    case 'park-the-bus':
      return 'captains-armband';
    case 'golden-boot':
      return 'park-the-bus';
    default:
      return null;
  }
}

const deckWith = (first: CardId | null, avoid: CardId | null): CardId[] =>
  [...(first ? [first] : []), ...FILLER.filter((id) => id !== first && id !== avoid)].slice(0, DECK_SIZE);

/** The LAB_DUEL action for a setup. */
export function labDuelAction(setup: LabSetup, categoryPool: MatchState['categoryPool'], content: Content): Action {
  const other = otherZoneSide(setup.owner);
  const target = labTarget(setup);
  const situation = SITUATIONS[setup.situation];
  const possession: Possession = { attacker: situation.attacking ? setup.owner : other, zone: situation.zone };
  const decks = { player: [] as CardId[], opponent: [] as CardId[] };
  decks[setup.owner] = deckWith(setup.card, target);
  decks[other] = deckWith(target, setup.card);
  return { type: 'LAB_DUEL', categoryPool, decks, possession, content, now: Date.now() };
}

/**
 * Plays both sides of a lab duel: the owner plays the card at its moment, the other side reveals the reaction's
 * target, both answer as set up (Second Ball misses once first), and the owner's number guess is the closer one.
 */
export function useLabDriver(
  lab: LabRun | null,
  state: MatchState,
  stateRef: MutableRefObject<MatchState>,
  contentRef: MutableRefObject<Content>,
  dispatch: Dispatch<Action>,
) {
  const playing = lab !== null && state.stage === 'play';
  const cardsKey = playing && state.battleStep === 'cards' ? `${lab.runId}-${state.duelNo}` : null;
  const revealKey = playing && state.battleStep === 'reveal' ? `${lab.runId}-${state.duelNo}` : null;
  const mcqKey = playing && state.battleStep === 'mcq' && state.mcq
    ? `${lab.runId}-${state.mcq.key}-${state.mcq.firstMiss.player}-${state.mcq.firstMiss.opponent}`
    : null;
  const numericKey = playing && state.numeric && !state.numeric.result ? `${lab.runId}-${state.numeric.key}` : null;

  useEffect(() => {
    if (!cardsKey || !lab) return;
    const id = window.setTimeout(() => {
      const s = stateRef.current;
      const target = labTarget(lab);
      for (const side of ['player', 'opponent'] as const) {
        if (s.choice[side] !== undefined) continue;
        const wanted = side === lab.owner ? lab.card : target;
        const card = wanted && CARD_BY_ID[wanted].phase === 'blind' && cardBlocker(s, side, wanted, 'blind') === null ? wanted : null;
        dispatch({ type: 'CHOOSE_CARD', side, card, now: Date.now() });
      }
    }, 900);
    return () => window.clearTimeout(id);
  }, [cardsKey, lab, stateRef, dispatch]);

  useEffect(() => {
    if (!revealKey || !lab) return;
    const timers: number[] = [];
    const reaction = lab.card && CARD_BY_ID[lab.card].phase === 'reaction' ? lab.card : null;
    if (reaction) {
      timers.push(window.setTimeout(() => dispatch({ type: 'PLAY_REACTION', side: lab.owner, card: reaction, now: Date.now() }), 1100));
    }
    if (lab.card === 'home-advantage' && lab.owner === 'player') {
      timers.push(
        window.setTimeout(() => {
          const pick = unusedCategories(stateRef.current, 'player').at(-1);
          if (pick) dispatch({ type: 'CHOOSE_HOME_CATEGORY', categoryId: pick.id });
        }, 900),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [revealKey, lab, stateRef, dispatch]);

  useEffect(() => {
    if (!mcqKey || !lab) return;
    const s = stateRef.current;
    const opened = s.mcq;
    if (!opened) return;
    const timers: number[] = [];
    const liveCard = lab.card && CARD_BY_ID[lab.card].phase === 'live' ? lab.card : null;
    if (liveCard && cardBlocker(s, lab.owner, liveCard, 'live') === null) {
      timers.push(window.setTimeout(() => dispatch({ type: 'PLAY_LIVE', side: lab.owner, card: liveCard, content: contentRef.current, now: Date.now() }), 900));
    }
    for (const side of ['player', 'opponent'] as const) {
      if (opened.answers[side] !== null) continue;
      const sabotage = sabotageOn(s, side);
      const retry = opened.firstMiss[side] !== null;
      let delay = retry ? 1600 : side === lab.owner ? 2400 : 2900;
      if (lab.card === 'fifty-fifty' && side === lab.owner) delay = 2800;
      if (sabotage.includes('floodlight-failure')) delay += FLOODLIGHT_MS;
      if (sabotage.includes('fog')) delay += 2200;
      if (sabotage.includes('muddy-pitch')) delay = 7400;
      timers.push(
        window.setTimeout(() => {
          const mcq = stateRef.current.mcq;
          if (!mcq || stateRef.current.battleStep !== 'mcq' || mcq.answers[side] !== null) return;
          const want = side === lab.owner ? lab.ownerAnswer : lab.otherAnswer;
          const missFirst = lab.card === 'second-ball' && side === lab.owner && mcq.firstMiss[side] === null;
          const wrong = [0, 1, 2, 3].filter((i) => i !== mcq.question.correctIndex && !mcq.hidden[side].includes(i) && mcq.firstMiss[side] !== i);
          const index = want === 'right' && !missFirst ? mcq.question.correctIndex : wrong[0] ?? mcq.question.correctIndex;
          dispatch({ type: 'ANSWER', side, index, now: Date.now() });
        }, delay),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [mcqKey, lab, stateRef, contentRef, dispatch]);

  useEffect(() => {
    if (!numericKey || !lab) return;
    const s = stateRef.current;
    const question = s.numeric?.question;
    if (!question) return;
    const timers = (['player', 'opponent'] as const).map((side) => {
      const dark = sabotageOn(s, side).includes('floodlight-failure') ? FLOODLIGHT_MS : 0;
      const value = side === lab.owner ? question.value : Math.round(question.value * 1.3 + question.step);
      return window.setTimeout(() => dispatch({ type: 'GUESS', side, value, now: Date.now() }), 1800 + dark + (side === lab.owner ? 0 : 400));
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [numericKey, lab, stateRef, dispatch]);
}

/** Pick a card and how its duel goes. */
export function LabPicker({
  initial,
  onPlay,
  onTour,
  onClose,
}: {
  initial: CardId | null;
  onPlay: (setup: LabSetup) => void;
  /** Start the Animation tour from its first case. */
  onTour: () => void;
  onClose: () => void;
}) {
  const [setup, setSetup] = useState<LabSetup & { card: CardId }>(() => labDefaults(initial ?? 'captains-armband'));
  const card = CARD_BY_ID[setup.card];
  const situations = labSituations(setup.card);
  const ownerLabel = setup.owner === 'player' ? 'You' : 'Opponent';
  const otherLabel = setup.owner === 'player' ? 'Opponent' : 'You';

  return (
    <div className="fixed inset-0 z-[97] overflow-y-auto bg-surface-page/97 px-4 pb-10 pt-5 text-white backdrop-blur">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-brand-yellow" />
          <div className="text-2xl uppercase" style={poppins}>Card Lab</div>
          <span className="text-[11px] uppercase tracking-wide text-white/45" style={poppins}>One staged duel per card</span>
          <button
            type="button"
            onClick={onTour}
            className="ml-2 flex items-center gap-1.5 rounded-full bg-brand-yellow px-3 py-1.5 text-[11px] uppercase text-surface-page hover:bg-brand-yellow/90"
            style={poppins}
          >
            <Play className="size-3.5 fill-current" /> Animation tour
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {CARDS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={`Lab card: ${c.name}`}
              onClick={() => setSetup(labDefaults(c.id))}
              className="flex justify-center transition hover:-translate-y-0.5"
            >
              <PlaystyleBadge id={c.id} size={54} showName={false} selected={c.id === setup.card} />
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-4 rounded-[24px] bg-white/[0.05] p-4 sm:flex-row">
          <div className="flex justify-center">
            <CardFace id={setup.card} width={170} size="full" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <div className="text-xl uppercase" style={poppins}>{card.name}</div>
              <div className="text-[10px] font-black uppercase tracking-wide" style={{ color: CARD_TYPE_THEME[card.type].color }}>
                {CARD_TYPE_THEME[card.type].label} · {PHASE_INFO[card.phase].long} · {ROLE_INFO[card.role].long}
              </div>
              <p className="mt-1 text-sm text-white/80">{card.effect}</p>
            </div>
            <Choice label="Played by" value={setup.owner} options={[['player', 'You'], ['opponent', 'Opponent']]} onChange={(owner) => setSetup({ ...setup, owner })} />
            <Choice
              label="Situation (for the card's owner)"
              value={setup.situation}
              options={situations.map((id) => [id, SITUATIONS[id].label] as const)}
              onChange={(situation) => setSetup({ ...setup, situation })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Choice label={`${ownerLabel} answers`} value={setup.ownerAnswer} options={[['right', 'Right'], ['wrong', 'Wrong']]} onChange={(ownerAnswer) => setSetup({ ...setup, ownerAnswer })} />
              <Choice label={`${otherLabel} answers`} value={setup.otherAnswer} options={[['right', 'Right'], ['wrong', 'Wrong']]} onChange={(otherAnswer) => setSetup({ ...setup, otherAnswer })} />
            </div>
            <button
              type="button"
              onClick={() => onPlay(setup)}
              className="mt-1 flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-green text-base uppercase shadow-[0_4px_0_#2D950B] hover:bg-brand-green-deep active:translate-y-0.5 active:shadow-none"
              style={poppins}
            >
              <Play className="size-4 fill-current" /> Play it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: ReadonlyArray<readonly [T, string]>; onChange: (value: T) => void }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-white/50" style={poppins}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn('rounded-full px-3 py-1.5 text-[11px] uppercase transition-colors', value === id ? 'bg-brand-blue text-white' : 'bg-white/10 text-white/70 hover:bg-white/20')}
            style={poppins}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * What is running, and Replay / another card / Exit — in the Animation tour, the case and what to look for, with
 * Prev / Next. Pulses once the duel has settled.
 */
export function LabBar({
  lab,
  settled,
  onReplay,
  onPick,
  onExit,
  onStep,
}: {
  lab: LabRun;
  settled: boolean;
  onReplay: () => void;
  onPick: () => void;
  onExit: () => void;
  /** Tour only: go to the case at this index. */
  onStep: (index: number) => void;
}) {
  if (lab.tourIndex !== undefined) {
    const index = lab.tourIndex;
    const tourCase = LAB_TOUR[index];
    return (
      <motion.div
        // Under the score on a phone; beside the sound button on desktop.
        className="fixed left-1/2 top-[78px] z-[96] w-[min(94vw,560px)] -translate-x-1/2 rounded-2xl bg-black/85 p-2 text-white shadow-2xl backdrop-blur lg:left-16 lg:top-4 lg:translate-x-0"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1, scale: settled ? [1, 1.03, 1] : 1 }}
        transition={{ scale: { duration: 0.5 } }}
      >
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-[10px] text-surface-page" style={poppins}>
            {index + 1}/{LAB_TOUR.length}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs uppercase" style={poppins}>{tourCase.title}</span>
          <LabButton onClick={() => onStep(Math.max(0, index - 1))} label="Prev">
            <ChevronLeft className="size-3.5" />
          </LabButton>
          <LabButton onClick={onReplay} label="Replay" highlight={settled}>
            <RotateCcw className="size-3.5" />
          </LabButton>
          <LabButton onClick={() => onStep(Math.min(LAB_TOUR.length - 1, index + 1))} label="Next" highlight={settled}>
            <ChevronRight className="size-3.5" />
          </LabButton>
          <LabButton onClick={onExit} label="Exit">
            <X className="size-3.5" />
          </LabButton>
        </div>
        <div className="mt-1 px-1 text-[11px] leading-snug text-white/75">{tourCase.note}</div>
      </motion.div>
    );
  }
  return (
    <motion.div
      // Under the score on a phone; beside the sound button on desktop.
      className="fixed left-1/2 top-[78px] z-[96] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/80 py-1 pl-3 pr-1 text-white shadow-2xl backdrop-blur lg:left-16 lg:top-4 lg:translate-x-0"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1, scale: settled ? [1, 1.06, 1] : 1 }}
      transition={{ scale: { duration: 0.5 } }}
    >
      <FlaskConical className="size-3.5 text-brand-yellow" />
      <span className="max-w-[9rem] truncate text-[10px] uppercase tracking-wide sm:max-w-none" style={poppins}>
        {lab.card ? CARD_BY_ID[lab.card].name : 'No card'} · {lab.owner === 'player' ? 'you' : 'opponent'} · {SITUATIONS[lab.situation].label}
      </span>
      <LabButton onClick={onReplay} label="Replay" highlight={settled}>
        <RotateCcw className="size-3.5" />
      </LabButton>
      <LabButton onClick={onPick} label="Cards">
        <FlaskConical className="size-3.5" />
      </LabButton>
      <LabButton onClick={onExit} label="Exit">
        <X className="size-3.5" />
      </LabButton>
    </motion.div>
  );
}

function LabButton({ onClick, label, highlight = false, children }: { onClick: () => void; label: string; highlight?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Card Lab: ${label}`}
      className={cn('flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] uppercase', highlight ? 'bg-brand-green' : 'bg-white/10 hover:bg-white/20')}
      style={poppins}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
