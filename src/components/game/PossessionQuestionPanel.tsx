'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, X } from 'lucide-react';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { AnswerStateArray, Phase } from '@/lib/types/game.types';
import { ArenaScoreSplash } from '@/components/game/ArenaScoreSplash';
import { AdaptiveAnswerText, isLongAnswerSet } from '@/components/game/AdaptiveAnswerText';
import { QuestionImageCard } from '@/components/game/QuestionImageCard';
import { MatchHudIconButton } from '@/features/possession/components/MatchHudPrimitives';
import { MAX_PENALTY_ROUNDS } from '@/features/possession/types/possession.types';
import { useLocale } from '@/contexts/LocaleContext';

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

export interface PartyPickInfo {
  userId: string;
  username: string;
  selectedIndex: number | null;
  isCorrect?: boolean | null;
  /**
   * Per-player accent color (hex) for the pick chip. In party-quiz mode this
   * is wired to the standings rank-color so each chip matches its row.
   */
  accentColor?: string;
}

interface PossessionQuestionPanelProps {
  phase: Phase;
  isPenaltyPhase: boolean;
  isShotPhase: boolean;
  isLastAttackPhase: boolean;
  /** Penalty round to display (1..5 in regulation, 1 in sudden death). */
  penaltyDisplayRound?: number;
  /** Penalty round total to display (5 in regulation, 1 in sudden death). */
  penaltyDisplayTotal?: number;
  isPenaltySuddenDeath?: boolean;

  question: GameQuestion | null;
  qIndex: number;
  totalQuestions: number;
  timeRemaining: number | null;

  showOptions: boolean;
  selectedAnswer: number | null;
  answerStates: AnswerStateArray;
  opponentAnswer: number | null;

  /**
   * Optional list of other players' picks (party-quiz mode). When provided,
   * each card renders stacked chips on the right edge for every player who
   * picked that option. Replaces the single-opponent notch.
   */
  partyPicks?: PartyPickInfo[];

  showPlayerSplash?: boolean;
  showOpponentSplash?: boolean;
  playerSplashPoints?: number | null;
  opponentSplashPoints?: number | null;
  playerSplashVariant?: 'pending' | 'points';
  opponentSplashVariant?: 'pending' | 'points';
  onPlayerSplashComplete?: () => void;
  onOpponentSplashComplete?: () => void;

  onAnswer: (index: number) => void;

  /** Party quiz mobile: mute · question · timer · quit in one aligned row. */
  partyMatchHeader?: {
    muted: boolean;
    onToggleMute: () => void;
    onQuit: () => void;
  };
}

// Mini-notch matching the production possession opponent notch (white outer
// pill with a colored stripe inside) but small enough to stack 3 on one
// side, 2 on the other. White outer keeps every color legible — including
// yellow on a green correct-answer fill.
function renderPartyPickChip(
  pick: PartyPickInfo,
  side: 'left' | 'right',
  t: ReturnType<typeof useLocale>['t'],
) {
  const fill = pick.accentColor ?? 'rgba(255,255,255,0.85)';
  const initialX = side === 'right' ? 8 : -8;
  const wrapperRadius = side === 'right' ? 'rounded-l-md' : 'rounded-r-md';
  const stripeRadius = side === 'right' ? 'rounded-l-sm' : 'rounded-r-sm';
  const justify = side === 'right' ? 'justify-end pr-[2px]' : 'justify-start pl-[2px]';

  return (
    <motion.span
      key={pick.userId}
      initial={{ x: initialX, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      className={`flex h-5 w-[8px] items-center bg-white ${wrapperRadius} ${justify}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
      aria-label={t('possession.partyPickSelected', { username: pick.username })}
      title={pick.username}
    >
      <span
        className={`block h-3 w-[3px] ${stripeRadius}`}
        style={{ backgroundColor: fill }}
      />
    </motion.span>
  );
}

function getButtonState(
  index: number,
  selectedAnswer: number | null,
  answerStates: AnswerStateArray,
  correctIndex: number | undefined,
  showOptions: boolean,
  revealCorrectAnswer: boolean,
): 'default' | 'selected-correct' | 'selected-wrong' | 'reveal-correct' {
  const state = answerStates[index];
  if (state === 'correct') return 'selected-correct';
  if (state === 'wrong') return 'selected-wrong';

  // After round resolves, reveal the correct answer (even if not selected by player)
  if (revealCorrectAnswer && !showOptions && correctIndex === index) return 'reveal-correct';

  return 'default';
}

export function PossessionQuestionPanel({
  phase,
  isPenaltyPhase,
  isShotPhase,
  penaltyDisplayRound,
  penaltyDisplayTotal,
  isPenaltySuddenDeath = false,
  question,
  qIndex,
  totalQuestions,
  timeRemaining,
  showOptions,
  selectedAnswer,
  answerStates,
  opponentAnswer,
  partyPicks,
  showPlayerSplash = false,
  showOpponentSplash = false,
  playerSplashPoints = null,
  opponentSplashPoints = null,
  playerSplashVariant = 'points',
  opponentSplashVariant = 'points',
  onPlayerSplashComplete,
  onOpponentSplashComplete,
  onAnswer,
  partyMatchHeader,
}: PossessionQuestionPanelProps) {
  const { t } = useLocale();

  // Image MCQs push the options below the fold on mobile (the image eats
  // vertical space). Scroll the answer grid into view as soon as the image
  // question renders so the options are visible without manual scrolling. The
  // grid is always mounted (empty slots during the read phase), so we don't
  // wait for showOptions. Mobile only — desktop's split layout already fits.
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const hasImage = Boolean(question?.image?.url);
  const questionId = question?.id ?? null;
  useEffect(() => {
    if (!hasImage) return;
    const grid = optionsRef.current;
    if (!grid || grid.offsetParent === null) return; // hidden (e.g. desktop split layout)
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) return; // lg+: panel fits
    // Wait a frame so the image + prompt have laid out before measuring.
    const raf = requestAnimationFrame(() => {
      grid.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(raf);
  }, [hasImage, questionId]);

  if (phase === 'goal') return null;
  if (!question) return null;

  const isPlaying = isPenaltyPhase
    ? phase === 'penalty-playing'
    : isShotPhase
      ? phase === 'shot' && selectedAnswer === null
      : phase === 'playing';

  const correctIndex = question.correctIndex;
  const displayQuestionNum = qIndex + 1;
  const displayTimer = timeRemaining ?? 0;
  const timerLabel = displayTimer >= 10 ? `${displayTimer}` : `0${displayTimer}`;
  // Image MCQs render a photo band above the prompt; everything below it uses
  // a compact variant so the options grid stays above the fold.
  const hasQuestionImage = Boolean(question.image) && !isPenaltyPhase && !isShotPhase;
  // Variant C: stack answers in one full-width column when any is long, so long
  // sentences read well; otherwise keep the compact 2×2 grid.
  const stackedAnswers = isLongAnswerSet(question.options);

  const questionPillClass =
    'flex items-center justify-center rounded-[16px] bg-brand-blue text-white';
  const timerPillClass =
    'flex shrink-0 items-center justify-center rounded-[16px] bg-brand-blue text-white tabular-nums';

  const questionCounterLabel = isPenaltyPhase
    ? isPenaltySuddenDeath
      // Sudden death restarts as a one-shot set; no "sudden death" wording.
      ? t('possession.questionCounter', { current: 1, total: 1 })
      : t('possession.penaltyRound', {
        round: penaltyDisplayRound ?? 1,
        max: penaltyDisplayTotal ?? MAX_PENALTY_ROUNDS,
      })
    : t('possession.questionCounter', {
      current: displayQuestionNum,
      total: totalQuestions,
    });

  const questionPill = (
    <div
      className={`${questionPillClass} h-[40px] min-w-0 flex-1 px-3 sm:h-[52px] sm:px-5 md:h-[62px] lg:h-[72px] ${
        partyMatchHeader ? '' : 'px-5'
      }`}
      style={{
        ...poppins,
        fontSize: partyMatchHeader ? 'clamp(12px, 3vw, 18px)' : 'clamp(14px, 2.2vw, 26px)',
      }}
    >
      {questionCounterLabel}
    </div>
  );

  const timerPill = (
    <div
      className={`${timerPillClass} h-[40px] w-[64px] sm:h-[52px] sm:w-[92px] md:h-[62px] md:w-[116px] lg:h-[72px] lg:w-[136px]`}
      style={{ ...poppins, fontSize: 'clamp(14px, 2.2vw, 26px)' }}
    >
      {timerLabel}
    </div>
  );

  const mobileTimerCircle = (
    <div
      className={`${timerPillClass} size-10 shrink-0 rounded-full sm:size-12`}
      style={{ ...poppins, fontSize: 'clamp(14px, 4vw, 20px)' }}
    >
      {timerLabel}
    </div>
  );

  return (
    <div className="mt-1.5 px-3 sm:px-4">
      {partyMatchHeader ? (
        <>
          <div className="flex h-10 items-center gap-2 sm:h-[52px] sm:gap-2.5 lg:hidden">
            <MatchHudIconButton
              onClick={partyMatchHeader.onToggleMute}
              className="shrink-0"
              aria-label={
                partyMatchHeader.muted ? t('possession.unmuteAudio') : t('possession.muteAudio')
              }
              aria-pressed={partyMatchHeader.muted}
              title={partyMatchHeader.muted ? t('common.unmute') : t('common.mute')}
            >
              {partyMatchHeader.muted ? (
                <VolumeX className="size-4 sm:size-5" />
              ) : (
                <Volume2 className="size-4 sm:size-5" />
              )}
            </MatchHudIconButton>

            <div className="flex min-w-0 flex-1 items-stretch justify-start gap-2 sm:gap-2.5">
              {questionPill}
              {timerPill}
            </div>

            <MatchHudIconButton
              onClick={partyMatchHeader.onQuit}
              className="shrink-0"
              data-testid="party-match-quit"
              title={t('partyResults.leaveMatch')}
              aria-label={t('partyResults.leaveMatch')}
            >
              <X className="size-4 sm:size-5" />
            </MatchHudIconButton>
          </div>

          <div className="hidden items-stretch gap-2.5 lg:flex">
            <div
              className={`${questionPillClass} h-[40px] min-w-0 flex-1 px-5 sm:h-[52px] md:h-[62px] lg:h-[72px]`}
              style={{ ...poppins, fontSize: 'clamp(14px, 2.2vw, 26px)' }}
            >
              {questionCounterLabel}
            </div>
            {timerPill}
          </div>
        </>
      ) : (
        <div className="flex items-stretch gap-2.5">
          {questionPill}
          {timerPill}
        </div>
      )}

      {/* Question card — popLayout pops exiting question out of flow to prevent height doubling */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`question-${question.id}`}
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="relative mt-3"
        >
          {hasQuestionImage && (
            <QuestionImageCard image={question.image!} />
          )}
          {/* Compact when an image is shown: the photo band already eats a lot
              of vertical space, so the prompt box tightens (smaller min-height,
              padding, font) to keep the options grid above the fold. */}
          <div
            className={
              hasQuestionImage
                ? 'flex items-center rounded-[24px] bg-surface-page px-5 py-3.5 text-white sm:px-6 sm:py-4 md:px-8 md:py-5'
                : 'flex items-center rounded-[24px] bg-surface-page px-5 py-5 text-white sm:px-6 sm:py-6 md:px-8 md:py-7'
            }
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: hasQuestionImage
                ? 'clamp(14px, 1.6vw, 21px)'
                : 'clamp(15px, 1.9vw, 26px)',
              minHeight: hasQuestionImage
                ? 'clamp(72px, 9vw, 112px)'
                : 'clamp(108px, 15vw, 176px)',
            }}
          >
            <p className="leading-snug">{question.prompt}</p>
          </div>

          {/* +points floating splash — player on left, opponent on right.
              The data-splash-anchor attribute lets `usePossessionBarBattleFlights`
              measure these exact screen positions so a `+N` flight ghost can
              launch from here onto the pitch.
              The min-size is critical: when `ArenaScoreSplash` is hidden
              (e.g. before the player has answered) the wrapper would collapse
              to 0×0 and `findVisibleRect` would reject it — silently breaking
              the flight in production matches. A 1×1 anchor keeps the flight
              launch position findable without affecting layout. */}
          <div
            data-splash-anchor="player"
            className="pointer-events-none absolute left-[-12px] top-1/2 z-10 -translate-y-1/2"
            style={{ minWidth: 1, minHeight: 1 }}
          >
            <ArenaScoreSplash
              show={showPlayerSplash}
              points={playerSplashPoints}
              variant={playerSplashVariant}
              side="left"
              onComplete={onPlayerSplashComplete}
            />
          </div>
          <div
            data-splash-anchor="opponent"
            className="pointer-events-none absolute right-[-12px] top-1/2 z-10 -translate-y-1/2"
            style={{ minWidth: 1, minHeight: 1 }}
          >
            <ArenaScoreSplash
              show={showOpponentSplash}
              points={opponentSplashPoints}
              variant={opponentSplashVariant}
              side="right"
              onComplete={onOpponentSplashComplete}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Answer cards — 2x2 grid. Cards are visible during the read phase
          (yellow-bordered empty slots) so the layout is stable; only the
          answer text inside fades in when showOptions flips true. */}
      <div
        ref={optionsRef}
        className={`mt-2.5 gap-2.5 ${
          stackedAnswers ? 'flex flex-col' : 'grid grid-cols-2 items-stretch'
        } ${showOptions ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!showOptions}
      >
        {question.options.map((opt, i) => {
          const buttonState = getButtonState(
            i,
            selectedAnswer,
            answerStates,
            correctIndex,
            showOptions,
            phase === 'reveal',
          );
          const isWinningAnswer = buttonState === 'selected-correct' || buttonState === 'reveal-correct';
          const isWrongPick = buttonState === 'selected-wrong';

          const isPlayerPicked = selectedAnswer === i;
          const opponentPickedThis = !partyPicks && opponentAnswer === i;
          const opponentPickCorrect = opponentAnswer !== null && correctIndex !== undefined
            ? opponentAnswer === correctIndex
            : null;
          // Party-mode chips: every other player who picked this option.
          // After reveal we tint based on isCorrect; before reveal stays neutral.
          const partyPicksForThis = partyPicks
            ? partyPicks.filter((pick) => pick.selectedIndex === i)
            : [];

          return (
            <motion.button
              key={`${question.id}-${i}`}
              type="button"
              data-mcq-option-index={i}
              disabled={!showOptions || !isPlaying}
              onClick={() => {
                if (!showOptions || !isPlaying) return;
                onAnswer(i);
              }}
              initial={false}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 24,
                mass: 0.75,
              }}
              className={`relative flex items-center justify-center overflow-hidden rounded-[16px] transition-shadow duration-150 ${
                stackedAnswers
                  ? 'min-h-[64px]'
                  : hasQuestionImage
                    ? 'min-h-[78px] sm:min-h-[88px] md:min-h-[96px] lg:min-h-[108px]'
                    : 'min-h-[88px] sm:min-h-[104px] md:min-h-[116px] lg:min-h-[136px]'
              }`}
              style={{
                ...poppins,
                textTransform: 'uppercase',
                color: isWrongPick ? '#FB3101' : '#FFFFFF',
                backgroundColor: isWinningAnswer ? '#38B60E' : 'transparent',
                border: isWinningAnswer
                  ? 'none'
                  : isWrongPick
                    ? '2px solid #FB3101'
                    : '2px solid #FFE500',
                boxShadow: isWinningAnswer
                  ? '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)'
                  : isWrongPick
                    ? '0 1.76px 6.334px 1.32px rgba(251,49,1,0.25)'
                    : '0 0 6.334px 1.32px rgba(255,229,0,0.25)',
                cursor: !showOptions || !isPlaying ? 'default' : 'pointer',
              }}
            >
              {/* Player's pick notch (left) */}
              {isPlayerPicked && (
                <motion.div
                  initial={{ x: -14, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="absolute left-0 top-1/2 z-10 h-12 w-[6px] -translate-y-1/2 rounded-r-md"
                  style={{ backgroundColor: '#FFFFFF' }}
                />
              )}
              {/* Opponent's pick notch (right) — 1v1 modes only */}
              {opponentPickedThis && opponentPickCorrect !== null && (
                <motion.div
                  initial={{ x: 14, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="absolute right-0 top-1/2 z-10 flex h-12 w-[10px] -translate-y-1/2 items-center justify-end rounded-l-md bg-white pr-[2px]"
                  aria-label={t('possession.opponentSelected')}
                >
                  <span
                    className="h-9 w-[4px] rounded-l-sm"
                    style={{ backgroundColor: opponentPickCorrect ? '#38B60E' : '#FB3101' }}
                  />
                </motion.div>
              )}

              {/* Party-quiz: pick chips for each other player who selected
                  this option. Split max 3 on the right edge and max 2 on the
                  left edge to keep the card from stacking too tall. The green
                  chip (rank-1 / "you") gets a white pill wrapper for emphasis;
                  the rest render as a flat colored bar. */}
              {partyPicksForThis.length > 0 && (
                <>
                  <div className="pointer-events-none absolute right-0 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1">
                    {partyPicksForThis.slice(0, 3).map((pick) => renderPartyPickChip(pick, 'right', t))}
                  </div>
                  {partyPicksForThis.length > 3 && (
                    <div className="pointer-events-none absolute left-0 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1">
                      {partyPicksForThis.slice(3, 5).map((pick) => renderPartyPickChip(pick, 'left', t))}
                    </div>
                  )}
                </>
              )}

              <motion.span
                className={`relative z-[1] flex w-full items-center justify-center px-5 py-4 ${
                  stackedAnswers ? '' : 'h-full overflow-hidden'
                }`}
                initial={false}
                animate={{ opacity: showOptions ? 1 : 0, y: showOptions ? 0 : 6 }}
                transition={{ duration: 0.25, delay: showOptions ? i * 0.08 : 0, ease: 'easeOut' }}
              >
                <AdaptiveAnswerText
                  stacked={stackedAnswers}
                  gridMaxFontSize={hasQuestionImage ? 22 : 28}
                  gridMinFontSize={hasQuestionImage ? 9 : 11}
                  stackedFontSize={16}
                >
                  {opt}
                </AdaptiveAnswerText>
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
