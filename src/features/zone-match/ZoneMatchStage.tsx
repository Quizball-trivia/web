'use client';

/**
 * The zone match's in-play screen, assembled from the live ranked match's pieces: PossessionMatchViewport (the HUD —
 * the pitch is left out until it gets zone-match visuals), PossessionQuestionPanel and PossessionFeed — with the card
 * UI around the question. Who attacks reads off the 3D scene; the round and category head the question sheet.
 */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { getI18nText } from '@/lib/utils/i18n';
import type { AnswerState, AnswerStateArray } from '@/lib/types/game.types';
import type { AvatarCustomization } from '@/types/game';
import { PossessionMatchViewport, type PossessionViewportModel } from '@/features/possession/components/PossessionMatchViewport';
import { PossessionQuestionPanel } from '@/components/game/PossessionQuestionPanel';
import { PossessionFeed } from '@/features/possession/components/PossessionFeed';
import { MatchHudIconButton } from '@/features/possession/components/MatchHudPrimitives';
import type { ShotMode } from '@/features/possession/components/pitch/pitch.types';
import { NumericPad } from '@/features/numeric-question/NumericPad';
import { LockChip } from '@/features/numeric-draft/NumericDraftView';
import type { DuelSide } from '@/features/numeric-question/numericDuel';
import { MATCH_ROUNDS, pitchColumn, pitchLabel, type BattleOutcome, type Possession } from './zoneMatch.rules';
import { outcomeReason, stealStep, type OutcomeReason } from './zoneMatch.reason';
import { SIDE_COLOR } from './zoneMatch3d.layout';
import { CARD_BY_ID, FLOODLIGHT_MS, type CardId, type CardPhase } from './zoneMatch.cards';
import {
  GLOVES_SAVE_NOTE,
  ATTACKS_EACH,
  NAMES,
  OVERLAY_IN_MS,
  activeCards,
  attackNumber,
  attacksLeft,
  sabotageOn,
  type CardEvent,
  type MatchState,
  type Mcq,
  type NumericDuel,
  unusedCategories,
} from './zoneMatch.machine';
import { CardClash, useDesktop } from './ZoneMatchCards';
import { AttackCounter, HudLoadouts, LiveCardChips, PlaystyleChoices } from './ZoneMatchHandUI';
import { CARD_TYPE_THEME, CardFace, CardGlyph } from './ZoneMatchCardFace';
import { ZoneMatch3D } from './ZoneMatch3D';
import { CategoryTile } from './ZoneMatchCategories';
import { SkyShot } from './ZoneMatchSkyShot';
import { FogWipe } from './ZoneMatchFogWipe';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

/** Pitch share for each zone column — the full visible travel of PitchVisualization's ball. */
const PITCH_POSITION = [30, 50, 70] as const;
/** How long a card stays up when it fires (shorter while several are queued). */
const MOMENT_MS = 1600;
/** 50/50: the two answers grey out for this long before they are cut. */
const FIFTY_CUT_MS = 900;
const MUD_SPLASH_MS = 1000;
const BLUE = 'linear-gradient(100deg, #1645FF 0%, #1CB0F6 100%)';
const RED = 'linear-gradient(100deg, #B8401D 0%, #FF4B4B 100%)';
const WHITE = '#FFFFFF';
const GOAL_YELLOW = '#FFE500';
const GOAL_INK = '#0E1E27';
const HELD_BG = 'rgba(40,52,64,0.92)';
const BOTH_WRONG_BG = '#0E1E27';
/** The question sheet and the result panel over the 3D view: dark, see-through, blurred behind. */
const SHEET_BG = 'rgba(9,18,27,0.8)';
/** The HUD's soft fade into the scene. */
const HUD_FADE = 'linear-gradient(to bottom, rgba(5,11,18,0.88) 0%, rgba(5,11,18,0.6) 70%, rgba(5,11,18,0) 100%)';
/** Space between the HUD and the result title. */
const RESULT_TITLE_GAP = 6;
/** The floating step card over the 3D view: dark, a little see-through, blurred behind the card only. */
export const STEP_CARD_BG = 'rgba(10,19,28,0.86)';
/** Desktop: the space kept between the card's edge and each player. */
const SPLIT_GAP = 24;
/** Phone: the band above the card kept for the players (the card's contents shrink rather than cover them). */
const PHONE_PLAYER_BAND = 150;
/** Sky shot: the share of the screen height kept above the players for the balls' flight. */
const SKY_SHARE = 0.42;

export interface ZoneMatchSeat {
  name: string;
  avatarCustomization: AvatarCustomization | null;
  rankPoints: number | null;
}

export function ZoneMatchStage({
  state,
  now,
  player,
  opponent,
  muted,
  onToggleMute,
  onQuit,
  onAnswer,
  onGuess,
  onChooseCard,
  onLiveCard,
  onReaction,
  onHomeCategory,
  onPickCategory,
}: {
  state: MatchState;
  now: number;
  player: ZoneMatchSeat;
  opponent: ZoneMatchSeat;
  muted: boolean;
  onToggleMute: () => void;
  onQuit: () => void;
  onAnswer: (index: number, questionId: string) => void;
  onGuess: (value: number) => void;
  onChooseCard: (card: CardId | null) => void;
  onLiveCard: (card: CardId) => void;
  onReaction: (card: CardId) => void;
  onHomeCategory: (categoryId: string) => void;
  /** Your attack: the category you pick for it. */
  onPickCategory: (categoryId: string) => void;
}) {
  const { locale } = useLocale();
  // One continuous match: the player's goal is always on the left.
  const mirrored = false;
  const outcome = state.battleStep === 'outcome' ? state.outcome : null;
  const goal = outcome?.kind === 'goal' ? outcome : null;
  const glovesSave = outcome !== null && state.outcomeNote === GLOVES_SAVE_NOTE;

  // A goal (or a Gloves save) replays from where the shot was taken; otherwise the ball shows where it is now.
  const shotFrom = (goal || glovesSave) && state.outcomeFrom ? state.outcomeFrom : null;
  const shownPossession = shotFrom ?? state.possession;


  // Stable between clock ticks, so the pitch never restarts the shot mid-flight.
  const shotAttacker = shotFrom?.attacker ?? null;
  const shotResult = goal ? 'goal' : glovesSave ? 'saved' : null;
  const shotMode: ShotMode | undefined = useMemo(
    () => (shotAttacker && shotResult
      ? { result: shotResult, ballOriginX: 250, isPlayerAttacker: shotAttacker === 'player', shotId: state.duelNo }
      : undefined),
    [shotAttacker, shotResult, state.duelNo],
  );
  const attackerIsMe = shotAttacker === 'player';

  const timeLeft = state.advanceAt === null ? null : Math.max(0, Math.ceil((state.advanceAt - now) / 1000));
  const clockRunning = ['category', 'cards', 'reveal', 'mcq', 'numeric'].includes(state.battleStep);
  const mcqOpen = state.battleStep === 'mcq' && state.mcq !== null;

  const viewportModel: PossessionViewportModel = useMemo(
    () => ({
      showMainUI: true,
      hud: {
        kind: 'possession',
        props: {
          playerGoals: state.score.player,
          opponentGoals: state.score.opponent,
          playerName: player.name,
          opponentName: opponent.name,
          playerAvatarUrl: '',
          opponentAvatarUrl: '',
          playerAvatarCustomization: player.avatarCustomization,
          opponentAvatarCustomization: opponent.avatarCustomization,
          playerRankPoints: player.rankPoints,
          opponentRankPoints: opponent.rankPoints,
          // Under each score: the attacks that side has left.
          renderPoints: (side) => <AttackCounter state={state} side={side} />,
          centerLabel: roundLabel(state),
          timeRemaining: clockRunning ? timeLeft : null,
          half: 1,
          questionInHalf: Math.min(state.round + 1, MATCH_ROUNDS),
          zone: shownPossession.zone,
          zoneColor: '',
          onQuit,
        },
      },
      pitchProps: {
        playerPosition: PITCH_POSITION[pitchColumn(shownPossession)],
        playerAvatarUrl: '',
        opponentAvatarUrl: '',
        playerAvatarCustomization: player.avatarCustomization,
        opponentAvatarCustomization: opponent.avatarCustomization,
        playerName: player.name,
        opponentName: opponent.name,
        shotMode,
        targetGoal: shotFrom ? (attackerIsMe !== mirrored ? 'right' : 'left') : undefined,
        mirrored,
        centerPossessionTrack: true,
        zoneTrack: { column: pitchColumn(shownPossession), attacker: shownPossession.attacker },
        simpleShotAnimation: true,
        opponentThinking: mcqOpen && state.mcq?.answers.opponent === null,
      },
      // No pitch for now, so no pitch-side celebration: the result card shows the goal.
      showPitch: false,
      goalCelebration: null,
      penaltySplash: null,
      muted,
      // The zones are drawn on the pitch itself (zoneTrack), so no meter beside it.
      renderMeter: () => null,
    }),
    [
      state, shownPossession, player, opponent, clockRunning, timeLeft,
      onQuit, shotMode, shotFrom, attackerIsMe, mirrored, mcqOpen, muted,
    ],
  );

  const handPhase: CardPhase | null =
    state.battleStep === 'cards' && state.choice.player === undefined
      ? 'blind'
      : state.battleStep === 'reveal'
        ? 'reaction'
        : state.battleStep === 'mcq' && state.mcq?.answers.player === null
          ? 'live'
          : null;
  const playCard = useCallback(
    (card: CardId) => (handPhase === 'blind' ? onChooseCard(card) : handPhase === 'reaction' ? onReaction(card) : onLiveCard(card)),
    [handPhase, onChooseCard, onReaction, onLiveCard],
  );
  // The card moment on screen, so the 3D duel plays the card's effect in step with the pop-up.
  const [moment, setMoment] = useState<CardEvent | null>(null);

  const panelKey = `${state.duelNo}-${
    state.battleStep === 'reveal' ? 'cards' : state.battleStep === 'mcqReveal' ? 'mcq' : state.battleStep
  }`;
  const numericDark = numericLightsOut(state, now);

  // Full-screen 3D underneath; each step (category, cards, question, tiebreak) opens as an overlay over it with the hand
  // at its foot, and goes once the answers have been shown, so the result plays out on the clear scene with its title.
  const showResult = state.battleStep === 'outcome' && state.outcome !== null;
  // The tiebreak's reveal is the sky shot: the card steps aside and the balls fly up over the scene.
  const skyShot = state.battleStep === 'numericReveal' && state.numeric?.result ? state.numeric : null;
  const overlayOpen = state.battleStep !== 'outcome' && state.battleStep !== 'numericReveal';
  // One overlay per opening (a new duel or round starts after every result): when the next step comes before the last
  // overlay has finished fading out (Next pressed quickly with timers off), the new one mounts fresh over it.
  const overlayKey = `overlay-${state.round}-${state.duelInRound}`;
  // Desktop (and tablet landscape): the card floats between the players, one each side. Phone: the players stand in the
  // band under the HUD and the card floats below them, over the hand.
  const desktop = useDesktop();
  const [hudRef, hudHeight] = useBoxHeight<HTMLDivElement>();
  const [titleRef, titleHeight] = useBoxHeight<HTMLDivElement>();
  const [resultRef, resultHeight] = useBoxHeight<HTMLDivElement>();
  const [areaRef, areaHeight] = useBoxHeight<HTMLDivElement>();
  const [cardRef, cardHeight, cardWidth] = useBoxSize<HTMLDivElement>();
  // The camera, from the real card: desktop keeps the players either side of it; phone frames them above it; at the
  // result, between the title and the bottom panel.
  const insets = useMemo(
    () =>
      skyShot
        ? // The players at the foot of the screen, the sky above them.
          { top: hudHeight + Math.round(window.innerHeight * SKY_SHARE), bottom: 0, left: 0, right: 0 }
        : showResult || !overlayOpen
        ? { top: hudHeight + (showResult ? titleHeight + RESULT_TITLE_GAP : 0), bottom: showResult ? resultHeight : 0, left: 0, right: 0 }
        : desktop
          ? { top: hudHeight, bottom: 0, left: 0, right: 0, split: cardWidth ? cardWidth / 2 + SPLIT_GAP : 0 }
          : { top: hudHeight, bottom: cardHeight ? cardHeight + 16 : 0, left: 0, right: 0, both: true },
    [skyShot, showResult, overlayOpen, hudHeight, titleHeight, resultHeight, desktop, cardWidth, cardHeight],
  );
  // The card's contents shrink to fit: on desktop the space between the HUD and the hand; on a phone that less the band.
  const cardMax = Math.max(0, areaHeight - 16 - (desktop ? 0 : PHONE_PLAYER_BAND));

  const overlayStyle: CSSProperties & { '--party-dock-height': string } = {
    // PossessionQuestionPanel scrolls its answers into view inside the card: the hand is below it, not over it.
    '--party-dock-height': '0.75rem',
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-surface-page text-white">
      {/* The duel, full screen behind everything (the 2D ball strip without WebGL). */}
      <div className="fixed inset-0 z-0">
        <ZoneMatch3D
          state={state}
          player={player}
          opponent={opponent}
          insets={insets}
          moment={moment}
          fallback={
            <div className="absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
              <div
                className="absolute flex items-center px-3 transition-[top,bottom] duration-300 ease-out"
                style={{ top: insets.top, bottom: insets.bottom, left: insets.left, right: insets.right }}
              >
                <div className="mx-auto w-full max-w-lg overflow-hidden rounded-[20px] bg-surface-page/80 pb-2">
                  <BallStrip possession={duelPossession(state)} />
                </div>
              </div>
            </div>
          }
        />
      </div>

      <MatchHudIconButton onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="fixed left-3 top-3 z-[70] sm:left-4 sm:top-4">
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </MatchHudIconButton>

      {/* Top: the slim HUD and any effects in play, over a soft gradient. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[45]" style={{ background: HUD_FADE }}>
        <div ref={hudRef} className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col pb-1.5">
          <PossessionMatchViewport model={viewportModel} />
          {/* Each side's playstyles, under its score (the hand lives in the step card now). */}
          <HudLoadouts state={state} opponentName={opponent.name} phase={handPhase} onPlay={playCard} />
          <div className="px-3 sm:px-4">
            <StandingEffects state={state} />
          </div>
        </div>
      </div>

      {/* The step overlay: over the 3D view, under the HUD; it fades in for each step, cross-fades between the steps
          of a duel, and fades out for the result. The first clock of the step it opens on starts once it is in
          (OVERLAY_IN_MS in the engine). */}
      <AnimatePresence>
        {overlayOpen && (
          <motion.div
            key={overlayKey}
            className="pointer-events-none fixed inset-0 z-40 flex flex-col"
            style={overlayStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: OVERLAY_IN_MS / 1000, ease: 'easeOut' }}
            data-zm-sheet={state.battleStep}
          >
            <div className="shrink-0" style={{ height: hudHeight }} aria-hidden />
            <div ref={areaRef} className={cn('flex min-h-0 flex-1 flex-col px-4 py-2', desktop ? 'justify-center' : 'justify-end')}>
              <motion.div
                ref={cardRef}
                className={cn(
                  'pointer-events-auto mx-auto max-h-full w-full overflow-y-auto overscroll-contain rounded-[26px] border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-md',
                  // Desktop: narrower on narrow screens, so the players beside it keep room (the camera fits the rest).
                  desktop ? 'max-w-[min(600px,calc(100vw-480px))]' : 'max-w-[600px]',
                )}
                style={{ background: STEP_CARD_BG }}
                initial={{ y: 24, scale: 0.97 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 12, scale: 0.98 }}
                transition={{ duration: OVERLAY_IN_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
                data-zm-step-card
              >
              {/* FitHeight shrinks the step when the space is too short for it (never covering the players). */}
              <FitHeight max={cardMax}>
                <div className="flex flex-col gap-2 px-4 py-2">
                  {/* The last result (through the card window) and the cards working on this question. */}
                  <OutcomeFeed outcome={state.lastOutcome} note={state.lastOutcomeNote} show={state.battleStep === 'cards' || state.battleStep === 'reveal'} />
                  <CardsInPlay state={state} now={now} opponentName={opponent.name} />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={panelKey}
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      {state.battleStep === 'category' && <CategoryPick state={state} opponentName={opponent.name} timeLeft={timeLeft} onPick={onPickCategory} />}
                      {(state.battleStep === 'cards' || state.battleStep === 'reveal') && (
                        <CardClash
                          state={state}
                          now={now}
                          opponentName={opponent.name}
                          onNoCard={() => onChooseCard(null)}
                          onReaction={onReaction}
                          onHomeCategory={onHomeCategory}
                        >
                          {handPhase === 'blind' && <PlaystyleChoices state={state} onChoose={onChooseCard} />}
                        </CardClash>
                      )}
                      {(state.battleStep === 'mcq' || state.battleStep === 'mcqReveal') && state.mcq && (
                        <McqPanel
                          state={state}
                          mcq={state.mcq}
                          now={now}
                          revealed={state.battleStep === 'mcqReveal'}
                          timeLeft={state.battleStep === 'mcq' ? timeLeft : null}
                          onAnswer={onAnswer}
                        />
                      )}
                      {handPhase === 'live' && <LiveCardChips state={state} onPlay={onLiveCard} />}
                      {state.battleStep === 'numeric' && state.numeric && (
                        <NumericPanel numeric={state.numeric} dark={numericDark} opponentName={opponent.name} onGuess={onGuess} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </FitHeight>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {skyShot?.result && (
        <SkyShot
          key={`sky-${state.duelNo}-${skyShot.key}`}
          result={skyShot.result}
          precision={skyShot.question.precision}
          unit={getI18nText(skyShot.question.unit, locale)}
          opponentName={opponent.name}
          top={hudHeight}
        />
      )}

      {/* The result, over the scene: the title under the HUD, why and where the ball went at the bottom. */}
      <AnimatePresence>
        {showResult && state.outcome && (
          <ResultOverlay
            key={`result-${state.duelNo}`}
            outcome={state.outcome}
            from={state.outcomeFrom ?? state.possession}
            note={state.outcomeNote}
            fired={state.cardEvents.filter((event) => event.duelNo === state.duelNo && event.phase === 'result')}
            opponentName={opponent.name}
            reason={outcomeReason(state)}
            top={hudHeight + RESULT_TITLE_GAP}
            titleRef={titleRef}
            panelRef={resultRef}
            attacks={state.outcome.roundOver ? { player: attacksLeft(state, 'player'), opponent: attacksLeft(state, 'opponent') } : null}
          />
        )}
      </AnimatePresence>

      <CardMoments state={state} opponentName={opponent.name} onMoment={setMoment} />
    </div>
  );
}

/** Below this the step scrolls instead of shrinking further. */
const FIT_MIN_SCALE = 0.72;

/**
 * Shrinks its content to fit `max` px of height (never enlarges): the shared question panel's roomy sizes can run
 * taller than a short screen leaves. Scaled as a whole, so nothing reflows.
 */
function FitHeight({ max, children }: { max: number; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState(0);
  useEffect(() => {
    const content = inner.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    // The observer reports once on observe, then whenever the content changes size.
    const observer = new ResizeObserver(() => setNatural(content.offsetHeight));
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  const scale = natural > 0 && max > 0 ? Math.max(FIT_MIN_SCALE, Math.min(1, max / natural)) : 1;
  const shrunk = scale < 0.995;
  return (
    <div style={shrunk ? { height: natural * scale } : undefined}>
      <div ref={inner} style={shrunk ? { transform: `scale(${scale})`, transformOrigin: 'top center' } : undefined}>
        {children}
      </div>
    </div>
  );
}

/** An element's border-box size (untransformed), kept up to date; 0 while it is not mounted. */
function useBoxSize<T extends HTMLElement>(): [(element: T | null) => void, number, number] {
  const [element, setElement] = useTrackedElement<T>();
  const [size, setSize] = useState({ height: 0, width: 0 });
  useEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0];
      const height = Math.round(box ? box.blockSize : (entry.target as HTMLElement).offsetHeight);
      const width = Math.round(box ? box.inlineSize : (entry.target as HTMLElement).offsetWidth);
      setSize((current) => (current.height === height && current.width === width ? current : { height, width }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, element?.isConnected ? size.height : 0, element?.isConnected ? size.width : 0];
}

/** An element's border-box height (untransformed), kept up to date; 0 while it is not mounted. */
function useBoxHeight<T extends HTMLElement>(): [(element: T | null) => void, number] {
  const [element, setElement] = useTrackedElement<T>();
  const [measured, setMeasured] = useState(0);
  useEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') return;
    // The observer reports once on observe, then on every change.
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0];
      setMeasured(Math.round(box ? box.blockSize : (entry.target as HTMLElement).offsetHeight));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, element?.isConnected ? measured : 0];
}

/**
 * A ref target that survives keyed AnimatePresence swaps: while the outgoing copy fades out the incoming one has
 * already attached, so the outgoing copy's detach (null) must not clear it.
 */
function useTrackedElement<T extends HTMLElement>(): [T | null, (element: T | null) => void] {
  const [element, setElement] = useState<T | null>(null);
  const track = useCallback((next: T | null) => setElement((current) => (next ? next : current?.isConnected ? current : null)), []);
  return [element, track];
}

/** The round pill is one line tall on phones: long category names are cut to fit. */
const PILL_CATEGORY_CHARS = 16;
function shortName(name: string): string {
  return name.length > PILL_CATEGORY_CHARS ? `${name.slice(0, PILL_CATEGORY_CHARS - 1).trimEnd()}…` : name;
}

/** Over the HUD clock: which of the ten rounds this is (the last one called out). */
function roundLabel(state: MatchState): string {
  if (state.stage === 'fulltime') return 'Full time';
  const round = Math.min(state.round + 1, MATCH_ROUNDS);
  return round === MATCH_ROUNDS ? 'Last round' : `Round ${round}/${MATCH_ROUNDS}`;
}

/** The attacker of the duel on screen: during the result, the side that just attacked (the next one comes after). */
function duelPossession(state: MatchState): Possession {
  return state.battleStep === 'outcome' && state.outcomeFrom ? state.outcomeFrom : state.possession;
}

/** The round's first step: the attacker picks one of their categories (yours to tap; theirs to watch). */
function CategoryPick({ state, opponentName, timeLeft, onPick }: { state: MatchState; opponentName: string; timeLeft: number | null; onPick: (categoryId: string) => void }) {
  const attacker = state.possession.attacker;
  const mine = attacker === 'player';
  const open = unusedCategories(state, attacker).map((c) => c.id);
  const lastAttack = attacksLeft(state, attacker) === 1;
  return (
    <div className="flex flex-col gap-2.5" data-zm-category-pick={attacker}>
      <div className="rounded-[20px] px-4 py-3 text-center text-white" style={{ background: mine ? BLUE : RED }}>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/80" style={poppins}>
          {mine ? 'Your' : 'Their'} attack {attackNumber(state.round)} of {ATTACKS_EACH}
          {timeLeft !== null ? ` · ${timeLeft}s` : ''}
        </div>
        <div className="mt-0.5 text-lg uppercase leading-tight sm:text-xl" style={poppins}>
          {mine ? 'Choose the category for your attack' : `${opponentName} is choosing…`}
        </div>
        {lastAttack && (
          <div className="mx-auto mt-1 w-fit rounded-full bg-brand-yellow px-2.5 py-0.5 text-[11px] uppercase text-surface-page" style={poppins} data-zm-last-attack>
            {mine ? 'Your last attack' : 'Their last attack'}
          </div>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {state.categories[attacker].map((category, index) => {
          const used = !open.includes(category.id);
          const tile = <CategoryTile category={category} side={attacker} used={used} layoutId={used ? undefined : `zm-cat-${category.id}`} />;
          return mine && !used ? (
            <motion.button
              key={category.id}
              type="button"
              onClick={() => onPick(category.id)}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.95 }}
              aria-label={`Attack with ${category.name}`}
            >
              {tile}
            </motion.button>
          ) : (
            <motion.div key={category.id} animate={!mine && !used ? { y: [0, -3, 0] } : undefined} transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.17 }}>
              {tile}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Where the ball is: your side, the centre or theirs, lit in the attacker's colour; the ball rolls when it moves.
 *  The 3D duel view replaces it; it stays as that view's fallback without WebGL. */
function BallStrip({ possession }: { possession: Possession }) {
  const column = pitchColumn(possession);
  const mine = possession.attacker === 'player';
  return (
    <div className="relative mx-3 mt-2 flex items-center gap-1">
      <span className="h-6 w-1 rounded-full bg-brand-blue/70" title="Your goal" />
      <div className="relative h-9 flex-1">
        <div className="absolute inset-0 grid grid-cols-3 gap-1">
          {['Your side', 'Centre', 'Their side'].map((label, zone) => (
            <div
              key={label}
              className={cn(
                'grid place-items-end justify-center rounded-lg pb-0.5 text-[9px] uppercase tracking-wide transition-colors duration-500',
                zone === column ? (mine ? 'bg-brand-blue/45 text-white' : 'bg-brand-red-soft/45 text-white') : 'bg-white/[0.06] text-white/45',
              )}
              style={poppins}
            >
              {label}
            </div>
          ))}
        </div>
        <motion.img
          src="/assets/brand/ball.webp"
          alt=""
          draggable={false}
          className="absolute top-[3px] size-5 -translate-x-1/2 drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
          initial={false}
          animate={{ left: `${((column + 0.5) / 3) * 100}%`, rotate: column * 180 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        />
      </div>
      <span className="h-6 w-1 rounded-full bg-brand-red-soft/70" title="Their goal" />
    </div>
  );
}

/** Standing card effects worth keeping in view (gloves on, a Tiki-Taka run, a yellow card). */
function StandingEffects({ state }: { state: MatchState }) {
  const chips: Array<{ key: string; card: CardId; label: string; side: DuelSide }> = [];
  for (const side of ['player', 'opponent'] as const) {
    const who = side === 'player' ? 'You' : NAMES[side];
    if (state.gloves[side]) chips.push({ key: `g-${side}`, card: 'goalkeeper-gloves', label: `${who}: gloves on`, side });
    if (state.tiki[side] > 0) chips.push({ key: `t-${side}`, card: 'tiki-taka', label: `${who}: Tiki-Taka ×${state.tiki[side]}`, side });
    // During a round's category pick the next duel is the one that counts.
    const duel = state.battleStep === 'category' ? state.duelNo + 1 : state.duelNo;
    if (state.yellowThrough[side] > 0 && duel <= state.yellowThrough[side]) chips.push({ key: `y-${side}`, card: 'yellow-card', label: `${who}: no cards`, side });
  }
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2">
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.span
            key={chip.key}
            layout
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className={cn('flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 text-[10px] uppercase text-white', chip.side === 'player' ? 'bg-brand-blue/30' : 'bg-brand-red-soft/30')}
            style={poppins}
          >
            <MiniGlyph id={chip.card} /> {chip.label}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

function MiniGlyph({ id }: { id: CardId }) {
  const theme = CARD_TYPE_THEME[CARD_BY_ID[id].type];
  return (
    <span className="grid size-[18px] shrink-0 place-items-center rounded-full text-[11px]" style={{ background: theme.color, color: theme.ink }}>
      <CardGlyph id={id} />
    </span>
  );
}

/** The cards working on this question, popping in as they are played (live cards and 50/50s included). */
export function CardsInPlay({ state, now, opponentName }: { state: MatchState; now: number; opponentName: string }) {
  const inQuestion = ['mcq', 'mcqReveal', 'numeric', 'numericReveal'].includes(state.battleStep);
  if (!inQuestion) return null;
  const active = activeCards(state);
  // Your sabotage works on their screen, which you can't see: say what it is doing to them right now.
  const openedAt = state.battleStep === 'numeric' ? state.numeric?.startedAt : state.battleStep === 'mcq' ? state.mcq?.startedAt : undefined;
  const lightsOut = openedAt !== undefined && now < openedAt + FLOODLIGHT_MS;
  const chips = (['player', 'opponent'] as const).flatMap((side) =>
    // Reactions did their work at the reveal; the rest are still shaping this question.
    active[side].filter((id) => CARD_BY_ID[id].phase !== 'reaction').map((id) => {
      const name = CARD_BY_ID[id].name;
      const sabotage = CARD_BY_ID[id].type === 'sabotage';
      const text = side === 'player'
        ? sabotage
          ? id === 'floodlight-failure' && lightsOut ? 'Their lights are out' : `${name} on them`
          : `You: ${name}`
        : sabotage
          ? `${name} on you`
          : `${opponentName}: ${name}`;
      return { key: `${side}-${id}`, id, side, text };
    }),
  );
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.span
            key={chip.key}
            layout
            initial={{ scale: 0.4, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            className={cn(
              'flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[10px] uppercase text-white shadow-md',
              chip.side === 'player' ? 'bg-brand-blue/35' : 'bg-brand-red-soft/35',
            )}
            style={poppins}
          >
            <MiniGlyph id={chip.id} /> {chip.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Floodlight Failure on the player's number question: the pad is dark for its first seconds. */
export function numericLightsOut(state: MatchState, now: number): boolean {
  return state.numeric !== null && sabotageOn(state, 'player').includes('floodlight-failure') && now < state.numeric.startedAt + FLOODLIGHT_MS;
}

/** The number tiebreak: the prompt and the pad (dark under Floodlight Failure), and who has locked in. */
export function NumericPanel({ numeric, dark, opponentName, onGuess }: { numeric: NumericDuel; dark: boolean; opponentName: string; onGuess: (value: number) => void }) {
  const { locale } = useLocale();
  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <p className="text-center text-xs uppercase tracking-[0.14em] text-brand-yellow" style={poppins}>
          Both right! Closest guess wins the duel
        </p>
        <div
          className="flex items-center justify-center rounded-[20px] bg-surface-page px-4 py-2.5 text-center text-white"
          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, lineHeight: 1.3, fontSize: 'clamp(15px, 1.9vw, 22px)' }}
        >
          {getI18nText(numeric.question.prompt, locale)}
        </div>
      </div>
      <NumericPad
        key={numeric.key}
        precision={numeric.question.precision}
        unit={getI18nText(numeric.question.unit, locale)}
        locked={numeric.guesses.player.value !== null}
        disabled={dark}
        compact
        onSubmit={onGuess}
      />
      {/* Short screens: the pad needs the room; the reveal says who locked in. */}
      <div className="grid grid-cols-2 gap-2 [@media(max-height:720px)]:hidden">
        <LockChip label="You" locked={numeric.guesses.player.value !== null} pendingLabel="Typing…" />
        <LockChip label={opponentName} locked={numeric.guesses.opponent.value !== null} pendingLabel="Thinking…" />
      </div>
      {dark && <Blackout />}
    </div>
  );
}

function Blackout() {
  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-[24px] bg-black text-sm uppercase text-white/60"
      style={poppins}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      💡 Floodlight failure…
    </motion.div>
  );
}

/**
 * PossessionQuestionPanel fed through an adapter: the cards' option effects (50/50 removals, Muddy Pitch's reshuffle,
 * Second Ball's spent miss) become a view of the question, and taps map back to the real option index.
 */
export function McqPanel({
  state,
  mcq,
  now,
  revealed,
  timeLeft,
  onAnswer,
}: {
  state: MatchState;
  mcq: Mcq;
  now: number;
  revealed: boolean;
  timeLeft: number | null;
  onAnswer: (index: number, questionId: string) => void;
}) {
  const sabotage = sabotageOn(state, 'player');
  const dark = !revealed && sabotage.includes('floodlight-failure') && now < mcq.startedAt + FLOODLIGHT_MS;
  // Fog: the whole question misted over until wiped clear (ZoneMatchFogWipe).
  const fogged = !revealed && sabotage.includes('fog');
  const panelRef = useRef<HTMLDivElement>(null);
  const muddy = sabotage.includes('muddy-pitch');
  const [shuffle, setShuffle] = useState<{ key: number; order: number[]; at: number } | null>(null);
  useEffect(() => {
    if (!muddy || revealed) return;
    const id = window.setTimeout(() => {
      const order = [0, 1, 2, 3];
      for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      setShuffle({ key: mcq.key, order, at: Date.now() });
    }, 2000 + Math.random() * 4000);
    return () => window.clearTimeout(id);
  }, [mcq.key, muddy, revealed]);

  const order = shuffle?.key === mcq.key ? shuffle.order : [0, 1, 2, 3];
  const splashing = !revealed && shuffle?.key === mcq.key && now < shuffle.at + MUD_SPLASH_MS;
  // 50/50: the two answers grey out for a beat, then go.
  const cutAt = mcq.hiddenAt.player;
  const cutting = !revealed && cutAt !== null && now < cutAt + FIFTY_CUT_MS;
  // Real option indexes in the order shown; 50/50 removals drop out (never at reveal: the answer must show).
  const visible = order.filter((i) => revealed || cutting || !mcq.hidden.player.includes(i));
  const toView = (index: number | null) => (index === null ? null : visible.indexOf(index) === -1 ? null : visible.indexOf(index));
  const { correctIndex } = mcq.question;
  const viewQuestion = useMemo(
    () => ({ ...mcq.question, options: visible.map((i) => mcq.question.options[i]), correctIndex: visible.indexOf(correctIndex) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mcq.question, visible.join(',')],
  );

  const mine = mcq.answers.player;
  const theirs = mcq.answers.opponent;
  const states: AnswerState[] = visible.map((real) => {
    if (revealed) return real === correctIndex ? 'correct' : real === mine ? 'wrong' : 'disabled';
    if (mine !== null) return real === mine ? (real === correctIndex ? 'correct' : 'wrong') : 'disabled';
    if (real === mcq.firstMiss.player) return 'wrong';
    return 'default';
  });
  while (states.length < 4) states.push('disabled');
  const answerStates = states.slice(0, 4) as AnswerStateArray;

  // The shared panel has no look for a struck-out option, so the cut is styled here, scoped to this question.
  const cutViews = cutting ? mcq.hidden.player.map((real) => visible.indexOf(real)).filter((i) => i >= 0) : [];
  const cutScope = `cut-${mcq.key}`;

  return (
    <div ref={panelRef} className="relative" data-fifty-cut={cutScope}>
      {cutViews.length > 0 && <style>{fiftyCutStyle(cutScope, cutViews)}</style>}
      {mcq.offCategory && (
        <div className="mb-1.5 truncate text-center text-[10px] uppercase tracking-[0.06em] text-brand-orange" style={poppins}>
          No {shortName(mcq.categoryName)} questions left · general question
        </div>
      )}
      {/* A Substitution flips the question over to the new one. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mcq.question.id}
          style={{ transformPerspective: 900 }}
          initial={{ rotateX: -75, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 75, opacity: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <PossessionQuestionPanel
            phase={revealed ? 'reveal' : 'playing'}
            isPenaltyPhase={false}
            isShotPhase={false}
            isLastAttackPhase={false}
            question={viewQuestion}
            qIndex={state.round}
            totalQuestions={MATCH_ROUNDS}
            counterLabel={`R${Math.min(state.round + 1, MATCH_ROUNDS)}/${MATCH_ROUNDS} · ${shortName(mcq.categoryName)}${state.duelInRound > 0 ? ` · duel ${state.duelInRound + 1}` : ''}`}
            timeRemaining={timeLeft}
            showOptions={!dark}
            selectedAnswer={toView(mine)}
            answerStates={answerStates}
            opponentAnswer={mine !== null || revealed ? toView(theirs) : null}
            onAnswer={(viewIndex) => {
              const real = visible[viewIndex];
              // Tagged with this question: the outgoing one stays tappable while a Substitution flips it away.
              if (real !== undefined) onAnswer(real, mcq.question.id);
            }}
          />
        </motion.div>
      </AnimatePresence>
      {mcq.firstMiss.player !== null && mine === null && !revealed && (
        <div className="mt-2 text-center text-xs uppercase tracking-[0.12em] text-brand-yellow" style={poppins}>
          Second Ball · one more try
        </div>
      )}
      <AnimatePresence>{fogged && <FogWipe key={`fog-${mcq.key}-${mcq.question.id}`} panelRef={panelRef} seed={mcq.key * 97 + 13} />}</AnimatePresence>
      <AnimatePresence>{splashing && <MudSplash key={shuffle?.at} />}</AnimatePresence>
      {dark && <Blackout />}
    </div>
  );
}

/** 50/50: the two answers fade and a red slash runs through each before they go. */
function fiftyCutStyle(scope: string, viewIndexes: number[]): string {
  const target = (i: number) => `[data-fifty-cut="${scope}"] [data-mcq-option-index="${i}"]`;
  return [
    ...viewIndexes.map((i) => `${target(i)}{opacity:.3!important;transform:scale(.94)!important;border-color:rgba(255,255,255,.25)!important;transition:opacity .3s,transform .3s}`),
    ...viewIndexes.map(
      (i) =>
        `${target(i)}::after{content:'';position:absolute;left:8%;right:8%;top:50%;height:4px;border-radius:4px;background:#FF4B4B;transform:rotate(-10deg) scaleX(0);transform-origin:left center;animation:zm-fifty-cut .35s .1s ease-out forwards}`,
    ),
    '@keyframes zm-fifty-cut{to{transform:rotate(-10deg) scaleX(1)}}',
  ].join('');
}

const MUD_BLOBS = [
  { x: '8%', y: '18%', size: 54 }, { x: '28%', y: '52%', size: 70 }, { x: '52%', y: '12%', size: 46 }, { x: '70%', y: '48%', size: 64 },
  { x: '86%', y: '16%', size: 40 }, { x: '40%', y: '72%', size: 38 }, { x: '14%', y: '66%', size: 34 }, { x: '62%', y: '78%', size: 30 },
];

/** Muddy Pitch: mud splats over the answers as they reshuffle under it. */
function MudSplash() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 bottom-0 top-[45%] z-20 grid place-items-center overflow-hidden rounded-[24px]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
    >
      {MUD_BLOBS.map((blob, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ left: blob.x, top: blob.y, width: blob.size, height: blob.size, background: 'radial-gradient(circle at 35% 35%, #9A6A3A, #4A2C12 75%)' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.035, type: 'spring', stiffness: 520, damping: 16 }}
        />
      ))}
      <motion.span
        className="relative rounded-full bg-black/65 px-3 py-1 text-xs uppercase text-white"
        style={poppins}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        Mud! Your answers moved
      </motion.span>
    </motion.div>
  );
}

/** A card event's line, from the player's seat: `{them}`/`{their}` become they/their or you/your. */
function eventEffect(event: CardEvent): string {
  const mine = event.side === 'player';
  const text = event.effect.replace(/\{them\}/g, mine ? 'they' : 'you').replace(/\{their\}/g, mine ? 'their' : 'your');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * A card firing: whenever a card does something, it pops up big with a burst in its colour and one line on what it
 * did, one at a time. Results show in the outcome card instead.
 */
function CardMoments({ state, opponentName, onMoment }: { state: MatchState; opponentName: string; onMoment: (event: CardEvent | null) => void }) {
  const [baseline] = useState(() => state.cardEvents[state.cardEvents.length - 1]?.id ?? 0);
  const [doneUpTo, setDoneUpTo] = useState(0);
  const queue = state.cardEvents.filter(
    (event) => event.id > Math.max(baseline, doneUpTo) && event.duelNo === state.duelNo && event.phase !== 'result',
  );
  const current = queue[0] ?? null;
  const hold = queue.length > 2 ? MOMENT_MS * 0.6 : MOMENT_MS;
  const currentId = current?.id ?? null;
  useEffect(() => {
    onMoment(current);
  }, [current, onMoment]);
  useEffect(() => {
    if (currentId === null) return;
    const id = window.setTimeout(() => setDoneUpTo(currentId), hold);
    return () => window.clearTimeout(id);
  }, [currentId, hold]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          className="pointer-events-none fixed inset-x-0 top-[22%] z-[66] flex flex-col items-center px-4"
          initial={{ opacity: 0, scale: 0.4, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -24, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 360, damping: 22 }}
        >
          <div className="relative grid place-items-center">
            {current.against && (
              <motion.div
                className="absolute"
                initial={{ x: 0, rotate: 0, scale: 0.9 }}
                animate={{ x: current.side === 'player' ? 78 : -78, rotate: current.side === 'player' ? 20 : -20, scale: 0.78 }}
                transition={{ delay: 0.22, type: 'spring', stiffness: 300, damping: 15 }}
              >
                <motion.div animate={{ filter: 'grayscale(1) brightness(0.55)' }} transition={{ delay: 0.3, duration: 0.3 }}>
                  <CardFace id={current.against.card} width={104} size="compact" showCost={false} />
                </motion.div>
                <motion.span
                  className="absolute inset-x-0 top-[42%] flex justify-center"
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.45, type: 'spring', stiffness: 420, damping: 16 }}
                >
                  <span className="-rotate-12 rounded-md bg-brand-red-soft px-2 py-0.5 text-[10px] font-black uppercase text-white">Beaten</span>
                </motion.span>
              </motion.div>
            )}
            <motion.div
              className="absolute size-[280px] rounded-full"
              style={{ background: `radial-gradient(circle, ${CARD_TYPE_THEME[CARD_BY_ID[current.card].type].color}b0 0%, transparent 62%)` }}
              initial={{ scale: 0.3, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            <motion.div initial={{ rotate: current.side === 'player' ? -14 : 14 }} animate={{ rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}>
              <CardFace id={current.card} width={118} size="compact" showCost={false} playable />
            </motion.div>
          </div>
          <div className="mt-2 max-w-md rounded-2xl px-4 py-2 text-center text-white shadow-xl" style={{ background: current.side === 'player' ? BLUE : RED }}>
            <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/80" style={poppins}>
              <span className="rounded-full bg-black/25 px-1.5 py-px text-[9px] tracking-[0.1em] text-white">
                {current.against ? 'Countered' : current.phase === 'result' ? 'Took effect' : 'Activated'}
              </span>
              {current.side === 'player' ? 'You' : opponentName} · {CARD_BY_ID[current.card].name}
            </div>
            <div className="text-[15px] uppercase leading-tight" style={poppins}>{eventEffect(current)}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function OutcomeFeed({ outcome, note, show }: { outcome: BattleOutcome | null; note: string | null; show: boolean }) {
  if (!outcome || !show) return null;
  const next = outcome.next.attacker;
  const message = {
    advance: next === 'player' ? 'You moved forward' : `${NAMES.opponent} moved forward`,
    held: 'Held up — no ground',
    goal: outcome.kind === 'goal' ? (outcome.stolen ? (outcome.scorer === 'player' ? 'You stole it and scored!' : `${NAMES.opponent} stole it and scored`) : outcome.scorer === 'player' ? 'You scored!' : `${NAMES.opponent} scored`) : '',
    turnover: next === 'player' ? 'You won the ball' : 'You lost the ball',
    bothWrong: next === 'player' ? 'Both wrong — your ball' : 'Both wrong — their ball',
  }[outcome.kind];
  const good = next === 'player' ? outcome.kind !== 'goal' : outcome.kind === 'goal';
  return (
    <PossessionFeed
      message={`Last duel: ${note ? `${note} · ` : ''}${message}`}
      direction={good ? 'forward' : 'backward'}
      side={good ? 'left' : 'right'}
    />
  );
}

/** Where the ball sits on a three-zone strip, your goal on the left: -1 and 3 are inside the goals. */
const trackLeft = (column: number) => `${[4, 16.7, 50, 83.3, 96][column + 1]}%`;

/** The ball moving from where the duel started to where the next one starts (or into the net). */
function ZoneTrack({ from, outcome }: { from: Possession; outcome: BattleOutcome }) {
  const fromColumn = pitchColumn(from);
  const toColumn = outcome.kind === 'goal' ? (outcome.scorer === 'player' ? 3 : -1) : pitchColumn(outcome.next);
  const nextIsMe = outcome.next.attacker === 'player';
  return (
    <div className="relative mx-auto mt-3 h-10 w-full max-w-[300px]">
      <div className="absolute inset-y-1 left-0 w-1.5 rounded-full bg-white/50" />
      <div className="absolute inset-y-1 right-0 w-1.5 rounded-full bg-white/50" />
      <div className="absolute inset-y-0 left-3 right-3 grid grid-cols-3 gap-1">
        {['Your side', 'Centre', 'Their side'].map((label, column) => (
          <div
            key={label}
            className={cn(
              'grid place-items-end justify-center rounded-lg pb-0.5 text-[8px] uppercase tracking-wide transition-colors duration-500',
              column === toColumn ? (nextIsMe ? 'bg-brand-blue/50 text-white' : 'bg-brand-red-soft/50 text-white') : 'bg-black/20 text-white/50',
            )}
            style={poppins}
          >
            {label}
          </div>
        ))}
      </div>
      <motion.img
        src="/assets/brand/ball.webp"
        alt=""
        draggable={false}
        className="absolute top-[38%] size-6 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_3px_4px_rgba(0,0,0,0.5)]"
        initial={{ left: trackLeft(fromColumn) }}
        animate={{ left: trackLeft(toColumn), rotate: (toColumn - fromColumn) * 180 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 110, damping: 16 }}
      />
    </div>
  );
}

/** The result's headline: title, the line under it and its colour. */
function outcomeView(outcome: BattleOutcome, from: Possession): { title: string; detail: string; background: string; ink: string } {
  const next = outcome.next;
  const who = next.attacker === 'player' ? 'You attack' : `${NAMES.opponent} attacks`;
  const side = next.attacker === 'player' ? BLUE : RED;
  switch (outcome.kind) {
    case 'advance':
      return { title: next.attacker === 'player' ? 'Forward!' : 'Pushed back', detail: `${who} from ${pitchLabel(next)}`, background: side, ink: WHITE };
    case 'held':
      return { title: 'Held up', detail: 'Park the Bus — no ground gained', background: HELD_BG, ink: WHITE };
    case 'goal':
      return {
        title: outcome.stolen ? 'Stolen and scored!' : 'GOAL!',
        detail: outcome.stolen ? `${outcome.scorer === 'player' ? 'You' : NAMES.opponent} won it near goal and went straight in` : outcome.scorer === 'player' ? 'You scored' : `${NAMES.opponent} scored`,
        background: GOAL_YELLOW,
        ink: GOAL_INK,
      };
    case 'turnover':
      return stealStep(from, outcome) > 0
        ? { title: next.attacker === 'player' ? 'Ball stolen!' : 'Ball stolen', detail: `${who} from ${pitchLabel(next)}`, background: side, ink: WHITE }
        : { title: next.attacker === 'player' ? 'Ball won!' : 'Ball lost', detail: `${who} from here — ${pitchLabel(next)}`, background: side, ink: WHITE };
    case 'bothWrong':
      return { title: 'Both wrong', detail: `${who} from ${pitchLabel(next)}`, background: BOTH_WRONG_BG, ink: WHITE };
  }
}

/**
 * The result over the full-screen duel: the big title under the HUD, and at the bottom the cards that moved it, the
 * reason line (the same one the ✓ / ✗ marks and the arrow on the pitch show) and the zone strip.
 */
function ResultOverlay({
  outcome,
  from,
  note,
  fired,
  opponentName,
  reason,
  top,
  titleRef,
  panelRef,
  attacks,
}: {
  outcome: BattleOutcome;
  from: Possession;
  note: string | null;
  /** The cards that decided or moved this duel. */
  fired: CardEvent[];
  opponentName: string;
  reason: OutcomeReason | null;
  /** Where the title sits: just under the HUD. */
  top: number;
  titleRef: (element: HTMLDivElement | null) => void;
  panelRef: (element: HTMLDivElement | null) => void;
  /** Once the round is over: the attacks each side has left. */
  attacks: { player: number; opponent: number } | null;
}) {
  const v = outcomeView(outcome, from);
  return (
    <>
      <motion.div
        ref={titleRef}
        className="pointer-events-none fixed inset-x-0 z-[35] flex justify-center px-4"
        style={{ top }}
        initial={{ opacity: 0, scale: 0.6, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, y: -16, transition: { duration: 0.2 } }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        data-zm-result-title
      >
        <div className="max-w-full rounded-[22px] border-2 border-white/70 px-6 py-1.5 text-center shadow-[0_8px_30px_rgba(0,0,0,0.45)]" style={{ background: v.background, color: v.ink }}>
          <div className="text-[28px] uppercase leading-tight sm:text-4xl" style={poppins}>{v.title}</div>
          {v.detail && <div className="text-[11px] uppercase tracking-[0.1em] opacity-85" style={poppins}>{v.detail}</div>}
        </div>
      </motion.div>

      <motion.div
        ref={panelRef}
        className="fixed inset-x-0 bottom-0 z-[35] mx-auto max-w-[680px] rounded-t-[28px] border-x border-t border-white/10 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 text-center text-white shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        style={{ background: SHEET_BG }}
        initial={{ y: '105%' }}
        animate={{ y: 0 }}
        exit={{ y: '105%', transition: { duration: 0.2 } }}
        transition={{ delay: 0.25, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        data-zm-result
      >
        {fired.length > 0 ? (
          <div className="mb-2 flex flex-col items-center gap-1.5">
            {fired.map((event, i) => (
              <motion.div
                key={event.id}
                className="flex max-w-full items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-left text-[11px] uppercase leading-tight"
                style={poppins}
                initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.4 + i * 0.2, type: 'spring', stiffness: 380, damping: 16 }}
              >
                <MiniGlyph id={event.card} />
                <span>
                  <span className="opacity-75">{event.side === 'player' ? 'You' : opponentName} · {CARD_BY_ID[event.card].name}:</span> {eventEffect(event)}
                </span>
                {event.against && (
                  <span className="relative shrink-0 opacity-70 grayscale" title={`${CARD_BY_ID[event.against.card].name} beaten`}>
                    <MiniGlyph id={event.against.card} />
                    <span className="absolute inset-x-[-2px] top-1/2 h-0.5 -rotate-45 rounded bg-brand-red-soft" />
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          note && (
            <div className="mx-auto mb-2 w-fit rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em]" style={poppins}>
              {note}
            </div>
          )
        )}
        {reason && (
          <motion.div
            className="mx-auto w-fit max-w-full rounded-full border-2 border-white/80 px-3 py-1 text-[12px] uppercase leading-tight shadow-[0_4px_14px_rgba(0,0,0,0.4)]"
            style={{ ...poppins, background: SIDE_COLOR[reason.side] }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 360, damping: 20 }}
            data-zm-reason
          >
            {reason.line}
          </motion.div>
        )}
        <ZoneTrack from={from} outcome={outcome} />
        {attacks && (
          <div className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-white/70" style={poppins} data-zm-attacks-after>
            {attacks.player + attacks.opponent === 0
              ? 'That was the last attack'
              : `Attacks left · you ${attacks.player} · ${opponentName} ${attacks.opponent}`}
          </div>
        )}
      </motion.div>
    </>
  );
}
