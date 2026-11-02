'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { getI18nText } from '@/lib/utils/i18n';
import { getTierAccent } from '@/utils/tierVisuals';
import { BanCategoryCard } from '@/components/shared/BanCategoryCard';
import {
  DraftPauseOverlay,
  PlayerHeader,
  type BanCategoryViewCategory,
  type BanCategoryViewPlayer,
} from '@/features/play/RankedCategoryBlockingScreen';
import { NumericPad } from '@/features/numeric-question/NumericPad';
import { NumericDuelReveal } from '@/features/numeric-question/NumericDuelReveal';
import type { DuelReason, DuelSide } from '@/features/numeric-question/numericDuel';
import type { I18nField } from '@/lib/realtime/socket.types';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0', lineHeight: 1 } as const;

const SIDE_BG: Record<DuelSide, string> = { player: 'bg-brand-blue', opponent: 'bg-brand-red-soft' };

/**
 * board    → the categories on offer, before anyone has answered
 * question → both players type a guess for the numeric question
 * reveal   → the answer, both guesses, and who won the first picks
 * pick     → the players take their picks
 * lineup   → the half's categories in play order, just before kickoff
 */
export type NumericDraftStep = 'board' | 'question' | 'reveal' | 'pick' | 'lineup';

export interface NumericDraftQuestionView {
  prompt: I18nField;
  unit: I18nField;
  /** Decimals a guess may carry. */
  precision: number;
}

export interface NumericDraftResultView {
  answer: number;
  guesses: Record<DuelSide, number | null>;
  diffs: Record<DuelSide, number | null>;
  winner: DuelSide;
  reason: DuelReason;
}

export interface NumericDraftPick {
  categoryId: string;
  by: DuelSide;
}

export interface NumericDraftViewProps {
  /** Which half the picks are for: 1 before kickoff, 2 at halftime. */
  half: 1 | 2;
  /** Which numeric question of the draft this is. */
  draftRound: { current: number; total: number };
  /** Picks per numeric question: the winner's, then the loser's. */
  picksPerRound: { winner: number; loser: number };
  /** The half's rounds — the lineup strip has this many slots. */
  slots: number;
  player: BanCategoryViewPlayer;
  opponent: BanCategoryViewPlayer;
  categories: BanCategoryViewCategory[];
  step: NumericDraftStep;
  /** Seconds left on the current step's clock; null hides the timer. */
  timeLeft: number | null;
  question: NumericDraftQuestionView | null;
  locked: Record<DuelSide, boolean>;
  result: NumericDraftResultView | null;
  /** Every pick so far this half, in play order. */
  picks: NumericDraftPick[];
  /** Who picks now, and how many picks they have left in this turn. */
  picker: DuelSide | null;
  picksLeft: number;
  /** Goals so far, shown at halftime when no clock is running. */
  scoreline?: { player: number; opponent: number } | null;
  paused?: boolean;
  pauseSeconds?: number | null;
  soundMuted: boolean;
  onToggleSound: () => void;
  onSubmitGuess: (value: number) => void;
  onPickCategory: (categoryId: string) => void;
}

/**
 * Category draft decided by numeric questions: the categories on offer appear, both players guess a number, the closer
 * guess picks first. Presentational only — every value comes in through props, so the live match and the
 * `/dev/zone-match` prototype render the same screen.
 */
export function NumericDraftView({
  half,
  draftRound,
  picksPerRound,
  slots,
  player,
  opponent,
  categories,
  step,
  timeLeft,
  question,
  locked,
  result,
  picks,
  picker,
  picksLeft,
  scoreline = null,
  paused = false,
  pauseSeconds = null,
  soundMuted,
  onToggleSound,
  onSubmitGuess,
  onPickCategory,
}: NumericDraftViewProps) {
  const { t, locale } = useLocale();
  const onBoard = step === 'board' || step === 'pick' || step === 'lineup';

  return (
    <div className="relative flex min-h-dvh flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      <DraftPauseOverlay paused={paused} pauseSeconds={pauseSeconds} />

      <div className="relative z-10 w-full">
        <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-5">
          <PlayerHeader
            info={player}
            tierColor={player.tier ? getTierAccent(player.tier) : '#94A3B8'}
            align="left"
            dimmed={step === 'pick' && picker === 'opponent'}
          />
          <CenterBadge timeLeft={timeLeft} scoreline={scoreline} />
          <PlayerHeader
            info={opponent}
            tierColor={opponent.tier ? getTierAccent(opponent.tier) : '#94A3B8'}
            align="right"
            dimmed={step === 'pick' && picker === 'player'}
          />
        </div>
        <button
          onClick={onToggleSound}
          aria-label={soundMuted ? t('common.unmute') : t('common.mute')}
          className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white sm:right-6 sm:top-5"
        >
          {soundMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center px-4 pb-10">
        {step !== 'lineup' && <PickSlots slots={slots} picks={picks} categories={categories} />}
        <AnimatePresence mode="wait">
          {onBoard && (
            <motion.div
              key={`board-${draftRound.current}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex w-full flex-1 flex-col items-center justify-center"
            >
              <BoardHeading
                half={half}
                step={step}
                draftRound={draftRound}
                picksPerRound={picksPerRound}
                picker={picker}
                picksLeft={picksLeft}
                opponentName={opponent.username}
              />
              {step === 'lineup' ? (
                <LineupList picks={picks} categories={categories} names={{ player: player.username, opponent: opponent.username }} />
              ) : (
                <CategoryBoard
                  categories={categories}
                  picks={picks}
                  interactive={step === 'pick' && picker === 'player' && !paused}
                  lineup={false}
                  onPick={onPickCategory}
                />
              )}
            </motion.div>
          )}

          {step === 'question' && question && (
            <motion.div
              key={`question-${draftRound.current}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex w-full max-w-md flex-1 flex-col justify-center"
            >
              <QuestionStage
                draftRound={draftRound}
                picksPerRound={picksPerRound}
                question={question}
                locked={locked}
                opponentName={opponent.username}
                disabled={paused || timeLeft === 0}
                onSubmitGuess={onSubmitGuess}
              />
            </motion.div>
          )}

          {step === 'reveal' && question && result && (
            <motion.div
              key={`reveal-${draftRound.current}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex w-full max-w-md flex-1 flex-col justify-center"
            >
              <NumericDuelReveal
                answer={result.answer}
                unit={getI18nText(question.unit, locale)}
                precision={question.precision}
                names={{ player: t('common.you'), opponent: opponent.username }}
                guesses={result.guesses}
                diffs={result.diffs}
                winner={result.winner}
                reason={result.reason}
                winnerLabels={{
                  player: t('numericDraft.youPickCount', { count: String(picksPerRound.winner) }),
                  opponent: t('numericDraft.opponentPicksCount', { name: opponent.username, count: String(picksPerRound.winner) }),
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CenterBadge({ timeLeft, scoreline }: { timeLeft: number | null; scoreline: { player: number; opponent: number } | null }) {
  if (timeLeft !== null) {
    return (
      <div
        className={cn(
          'flex h-14 min-w-[72px] items-center justify-center rounded-full px-6 text-3xl tabular-nums text-white transition-colors',
          timeLeft <= 5 ? 'animate-pulse bg-brand-red-soft' : 'bg-brand-blue',
        )}
        style={poppins}
      >
        {timeLeft}
      </div>
    );
  }
  if (scoreline) {
    return (
      <div className="flex h-14 min-w-[72px] items-center justify-center rounded-full bg-white/10 px-6 text-2xl tabular-nums text-white" style={poppins}>
        {scoreline.player} – {scoreline.opponent}
      </div>
    );
  }
  return <div className="h-14 min-w-[72px]" />;
}

/** The half's rounds in play order, filled in as the picks come. */
function PickSlots({ slots, picks, categories }: { slots: number; picks: NumericDraftPick[]; categories: BanCategoryViewCategory[] }) {
  const { locale } = useLocale();
  return (
    <div className="mb-4 grid w-full max-w-2xl gap-1.5" style={{ gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` }}>
      {Array.from({ length: slots }, (_, i) => {
        const pick = picks[i];
        const category = pick ? categories.find((c) => c.id === pick.categoryId) : null;
        return (
          <motion.div
            key={i}
            layout
            className={cn(
              'flex h-12 flex-col items-center justify-center rounded-xl px-1 text-center text-white',
              pick ? SIDE_BG[pick.by] : 'border border-dashed border-white/15 bg-white/[0.03]',
            )}
            title={category ? getI18nText(category.name, locale) : undefined}
          >
            <span className="text-[10px] tabular-nums text-white/70" style={poppins}>
              R{i + 1}
            </span>
            {category && (
              <span className="mt-0.5 line-clamp-2 w-full text-[9px] uppercase leading-tight" style={poppins}>
                {getI18nText(category.name, locale)}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function BoardHeading({
  half,
  step,
  draftRound,
  picksPerRound,
  picker,
  picksLeft,
  opponentName,
}: {
  half: 1 | 2;
  step: NumericDraftStep;
  draftRound: { current: number; total: number };
  picksPerRound: { winner: number; loser: number };
  picker: DuelSide | null;
  picksLeft: number;
  opponentName: string;
}) {
  const { t } = useLocale();
  const rule = t('numericDraft.draftRule', { first: String(picksPerRound.winner), second: String(picksPerRound.loser) });

  let title: string;
  let subtitle: string;
  let highlight = false;
  if (step === 'lineup') {
    title = half === 1 ? t('numericDraft.lineupHalf1') : t('numericDraft.lineupHalf2');
    subtitle = t('possession.getReady');
  } else if (step === 'pick' && picker === 'player') {
    title = t('numericDraft.yourPick');
    subtitle = `${t('numericDraft.pickHint')} · ${t('numericDraft.picksLeft', { count: String(picksLeft) })}`;
    highlight = true;
  } else if (step === 'pick') {
    title = t('numericDraft.opponentPicking', { name: opponentName });
    subtitle = t('numericDraft.picksLeft', { count: String(picksLeft) });
  } else {
    title = t('numericDraft.numberQuestionOf', { current: String(draftRound.current), total: String(draftRound.total) });
    subtitle = rule;
  }

  return (
    <div className="mb-5 px-4 text-center">
      <h2 className="text-2xl uppercase text-white sm:text-4xl" style={poppins}>
        {title}
      </h2>
      <p className={cn('mt-2 text-xs uppercase tracking-[0.1em] sm:text-sm', highlight ? 'text-brand-yellow' : 'text-white/55')} style={poppins}>
        {subtitle}
      </p>
    </div>
  );
}

/** Just before kickoff: the half's rounds in play order — each category, and who picked it. */
function LineupList({
  picks,
  categories,
  names,
}: {
  picks: NumericDraftPick[];
  categories: BanCategoryViewCategory[];
  names: Record<DuelSide, string>;
}) {
  const { locale } = useLocale();
  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-2.5 px-1 sm:grid-cols-2 sm:gap-3">
      {picks.map((pick, i) => {
        const category = categories.find((c) => c.id === pick.categoryId);
        const name = category ? getI18nText(category.name, locale) : '';
        return (
          <motion.div
            key={pick.categoryId}
            className="flex items-center gap-3 overflow-hidden rounded-[20px] bg-surface-page/90 p-2 pr-4 ring-1 ring-white/10"
            initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 260, damping: 24 }}
          >
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-2xl text-lg text-white', SIDE_BG[pick.by])} style={poppins}>
              R{i + 1}
            </span>
            {category?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- category art comes from the API at arbitrary sizes
              <img src={category.imageUrl} alt="" className="size-12 shrink-0 rounded-xl object-cover" draggable={false} />
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10 text-2xl">{category?.icon ?? '⚽'}</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base uppercase text-white" style={poppins}>{name}</span>
              <span className={cn('mt-1 block truncate text-[11px] uppercase', pick.by === 'player' ? 'text-brand-blue' : 'text-brand-red-soft')} style={poppins}>
                {names[pick.by]}
              </span>
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function CategoryBoard({
  categories,
  picks,
  interactive,
  lineup,
  onPick,
}: {
  categories: BanCategoryViewCategory[];
  picks: NumericDraftPick[];
  interactive: boolean;
  lineup: boolean;
  onPick: (categoryId: string) => void;
}) {
  const slotOf = new Map(picks.map((pick, i) => [pick.categoryId, { ...pick, slot: i + 1 }]));
  return (
    // Three rows of four cards should fit under the header and the round
    // strip, so the board's width follows the viewport height as well as its
    // width — but never below a readable size (short screens scroll instead).
    <div className="w-full px-1 sm:px-6" style={{ maxWidth: 'clamp(18rem, calc(100dvh - 21rem), 44rem)' }}>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {categories.map((category, i) => {
          const picked = slotOf.get(category.id);
          return (
            // The card's entrance animation pins an inline opacity, so fades
            // live on a wrapper instead of the card itself.
            <div
              key={category.id}
              className={cn(
                'relative transition-opacity duration-500',
                picked && !lineup && 'opacity-60',
                !picked && lineup && 'opacity-25',
              )}
            >
              <BanCategoryCard
                category={category}
                colorIndex={i}
                animationIndex={i}
                isBanned={false}
                disabled={!interactive || Boolean(picked)}
                onClick={onPick}
              />
              {picked && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className={cn(
                    'absolute right-1.5 top-1.5 z-30 flex size-7 items-center justify-center rounded-full text-sm text-white shadow-lg ring-2 ring-white/80',
                    SIDE_BG[picked.by],
                  )}
                  style={poppins}
                >
                  {picked.slot}
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionStage({
  draftRound,
  picksPerRound,
  question,
  locked,
  opponentName,
  disabled,
  onSubmitGuess,
}: {
  draftRound: { current: number; total: number };
  picksPerRound: { winner: number; loser: number };
  question: NumericDraftQuestionView;
  locked: Record<DuelSide, boolean>;
  opponentName: string;
  disabled: boolean;
  onSubmitGuess: (value: number) => void;
}) {
  const { t, locale } = useLocale();
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.14em] text-white/55" style={poppins}>
          {t('numericDraft.numberQuestionOf', { current: String(draftRound.current), total: String(draftRound.total) })}
        </div>
        <p className="mt-1.5 text-xs uppercase tracking-[0.14em] text-brand-yellow" style={poppins}>
          {t('numericDraft.draftRule', { first: String(picksPerRound.winner), second: String(picksPerRound.loser) })}
        </p>
      </div>
      <div
        className="flex items-center justify-center rounded-[24px] bg-surface-page px-5 py-5 text-center text-white"
        style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, lineHeight: 1.3, fontSize: 'clamp(16px, 2vw, 22px)' }}
      >
        {getI18nText(question.prompt, locale)}
      </div>
      <NumericPad
        precision={question.precision}
        unit={getI18nText(question.unit, locale)}
        locked={locked.player}
        disabled={disabled}
        onSubmit={onSubmitGuess}
      />
      <div className="grid grid-cols-2 gap-2">
        <LockChip label={t('common.you')} locked={locked.player} pendingLabel={t('numericDraft.typing')} />
        <LockChip label={opponentName} locked={locked.opponent} pendingLabel={t('numericDraft.thinking')} />
      </div>
    </div>
  );
}

export function LockChip({ label, locked, pendingLabel }: { label: string; locked: boolean; pendingLabel: string }) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        'flex min-w-0 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] uppercase transition-colors',
        locked ? 'bg-brand-green/20 text-brand-green-light' : 'bg-white/[0.05] text-white/50',
      )}
      style={poppins}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 text-white/40">·</span>
      <span className="shrink-0">{locked ? t('numericDraft.lockedIn') : pendingLabel}</span>
    </div>
  );
}
