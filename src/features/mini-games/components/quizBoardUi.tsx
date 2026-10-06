'use client';

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Check, X, Zap } from 'lucide-react';
import { money } from '../lib/odds';
import { useMiniT } from '../lib/i18n';

/** Quiz Board visuals shared by the demo (client-side AI) and the Freecroco screen (server-driven). */

export const QUIZ_BOARD_ACCENT = '#CE82FF';
export const QUIZ_BOARD_ROWS = 3;

export type QuizBoardTileOwner = 'player' | 'ai' | 'none' | null;

/** "partner" = the Freecroco screen, in the blue / yellow daily-games look; "default" = the quizball.io board. */
export type QuizBoardVariant = 'default' | 'partner';

function gridTileClass(
  variant: QuizBoardVariant,
  { isActive, owner, isUsed, canPick }: { isActive: boolean; owner: QuizBoardTileOwner; isUsed: boolean; canPick: boolean },
): string {
  if (variant === 'partner') {
    return `flex h-12 items-center justify-center gap-1 rounded-[16px] border-2 font-poppins text-base font-semibold sm:h-14 sm:text-lg tabular-nums transition-colors ${
      isActive
        ? 'border-brand-yellow bg-brand-yellow text-black'
        : owner === 'player'
          ? 'border-brand-green/30 bg-brand-green/[0.08] text-brand-green/80'
          : isUsed
            ? 'border-white/5 bg-white/[0.01] text-white/15'
            : canPick
              ? 'border-brand-yellow bg-transparent text-white shadow-[0_0_6px_1px_hsl(var(--brand-yellow)/0.25)] hover:bg-brand-yellow/10'
              : 'border-brand-yellow/30 bg-transparent text-white/50'
    }`;
  }
  return `flex h-12 items-center justify-center gap-1 rounded-lg border-2 font-poppins text-base font-black tabular-nums transition-colors ${
    isActive
      ? 'border-brand-purple bg-brand-purple/25 text-brand-purple'
      : owner === 'player'
        ? 'border-brand-green/30 bg-brand-green/[0.08] text-brand-green/80'
        : owner === 'ai'
          ? 'border-brand-red-soft/25 bg-brand-red-soft/[0.06] text-brand-red-soft/70'
          : isUsed
            ? 'border-white/5 bg-white/[0.01] text-white/15'
            : canPick
              ? 'border-brand-purple/30 bg-brand-purple/[0.06] text-white hover:border-brand-purple'
              : 'border-white/10 bg-white/[0.03] text-white/50'
  }`;
}

export interface QuizBoardGridTile {
  /** category * 3 + row */
  tile: number;
  value: number;
  owner: QuizBoardTileOwner;
}

export function QuizBoardGrid({
  categories,
  tiles,
  activeTile,
  canPick,
  onPick,
  variant = 'default',
}: {
  categories: string[];
  tiles: QuizBoardGridTile[];
  activeTile: number | null;
  canPick: boolean;
  onPick: (tile: number) => void;
  variant?: QuizBoardVariant;
}) {
  const byIndex = new Map(tiles.map((t) => [t.tile, t]));
  const partner = variant === 'partner';
  return (
    <div className={partner ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-3 gap-1.5'} data-testid="quiz-board-grid">
      {categories.map((cat, i) => (
        <div
          key={`${i}-${cat}`}
          className={
            partner
              ? 'flex min-h-[2.25rem] items-center justify-center rounded-[12px] bg-brand-blue px-1.5 py-1.5 text-center font-poppins text-[10px] font-semibold uppercase leading-tight text-white'
              : 'rounded-lg bg-white/[0.05] py-1.5 text-center font-poppins text-[9px] font-black uppercase tracking-wider text-brand-purple'
          }
        >
          {cat}
        </div>
      ))}
      {Array.from({ length: QUIZ_BOARD_ROWS }, (_, row) =>
        categories.map((_, cat) => {
          const i = cat * QUIZ_BOARD_ROWS + row;
          const tile = byIndex.get(i);
          if (!tile) return <div key={i} />;
          const isUsed = tile.owner !== null;
          const isActive = activeTile === i;
          return (
            <button
              key={i}
              type="button"
              disabled={!canPick || isUsed}
              onClick={() => onPick(i)}
              data-testid={`quiz-board-tile-${i}`}
              data-owner={tile.owner ?? 'open'}
              className={gridTileClass(variant, { isActive, owner: tile.owner, isUsed, canPick })}
            >
              {tile.owner === 'player' || tile.owner === 'ai' ? (
                <span className={partner ? 'text-sm' : 'text-xs'}>{tile.owner === 'player' ? '+' : ''}{tile.value}</span>
              ) : isUsed ? (
                ''
              ) : (
                tile.value
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}

export function QuizBoardBanner({
  tone,
  children,
  variant = 'default',
}: {
  tone: 'player' | 'ai';
  children: ReactNode;
  variant?: QuizBoardVariant;
}) {
  if (variant === 'partner') {
    return (
      <div className={`rounded-[16px] px-4 py-3 text-center ${tone === 'player' ? 'bg-brand-blue' : 'bg-brand-red-soft/20'}`}>
        <span className="font-poppins text-sm font-semibold uppercase text-white">{children}</span>
      </div>
    );
  }
  return (
    <div
      className={`rounded-2xl border-2 p-3 text-center ${
        tone === 'player' ? 'border-brand-purple/30 bg-brand-purple/[0.07]' : 'border-brand-red-soft/30 bg-brand-red-soft/[0.06]'
      }`}
    >
      <span
        className={`font-poppins text-sm font-black uppercase tracking-wide ${
          tone === 'player' ? 'text-brand-purple' : 'text-brand-red-soft'
        }`}
      >
        {children}
      </span>
    </div>
  );
}

export function QuizBoardAiCard({
  value,
  prompt,
  result,
}: {
  value: number;
  prompt: string;
  result: 'correct' | 'wrong' | null;
}) {
  const t = useMiniT();
  return (
    <div className="rounded-2xl border-2 border-brand-red-soft/30 bg-white/[0.03] p-3" data-testid="quiz-board-ai-card">
      <div className="mb-1.5 font-poppins text-[10px] font-black uppercase tracking-wider text-brand-red-soft">
        {t('AI plays for {v}', { v: value })}
      </div>
      {/* No prompt while its question is a pending steal: the AI's turn shows without it. */}
      {prompt ? <p className="mb-2 font-poppins text-[13px] font-bold leading-snug text-white">{prompt}</p> : null}
      <div
        className={`py-2 text-center font-poppins text-sm font-black uppercase ${
          result === 'correct' ? 'text-brand-red-soft' : result === 'wrong' ? 'text-brand-yellow' : 'text-white/40'
        }`}
      >
        {result === 'correct' ? t('AI banks it') : result === 'wrong' ? t('AI is wrong — steal it!') : t('AI answering…')}
      </div>
    </div>
  );
}

type OptionState = 'idle' | 'picked' | 'dim' | 'correct' | 'wrong';

function optionState(i: number, selected: number | null, correctIndex: number | null): OptionState {
  const isPicked = selected === i;
  if (correctIndex === null) return isPicked ? 'picked' : selected === null ? 'idle' : 'dim';
  return i === correctIndex ? 'correct' : isPicked ? 'wrong' : 'dim';
}

export function QuizBoardQuestionCard({
  value,
  steal,
  prompt,
  image,
  options,
  selected,
  correctIndex,
  onAnswer,
  footer,
  variant = 'default',
}: {
  value: number;
  steal: boolean;
  prompt: string;
  image?: { url: string; width: number; height: number } | null;
  options: string[];
  selected: number | null;
  /** Null until the answer is known; then the options show right / wrong. */
  correctIndex: number | null;
  onAnswer: (index: number) => void;
  footer?: ReactNode;
  variant?: QuizBoardVariant;
}) {
  const t = useMiniT();
  const revealed = correctIndex !== null;
  if (variant === 'partner') {
    return (
      <div data-testid="quiz-board-question">
        <div className="flex flex-col items-center gap-1.5 rounded-[24px] border border-white/10 bg-white/5 px-5 py-3 text-center sm:py-4">
          <span className="font-poppins text-[11px] font-semibold uppercase text-brand-yellow">{t('For {v}', { v: value })}</span>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- question images come from the content CDN at any size
            <img src={image.url} width={image.width} height={image.height} alt="" className="max-h-36 w-auto rounded-lg object-contain" />
          ) : null}
          <p className="font-poppins text-sm font-bold leading-snug text-white sm:text-[15px]">{prompt}</p>
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-2">
          {options.map((opt, i) => {
            const state = optionState(i, selected, correctIndex);
            return (
              <button
                key={i}
                type="button"
                disabled={selected !== null || revealed}
                onClick={() => onAnswer(i)}
                data-testid={`quiz-board-option-${i}`}
                data-state={state}
                className={`flex min-h-[46px] items-center justify-between gap-2 rounded-[16px] border-2 px-4 py-2 sm:min-h-[52px] text-left font-poppins text-sm font-semibold transition-colors ${
                  state === 'idle'
                    ? 'border-brand-yellow text-white shadow-[0_0_6px_1px_hsl(var(--brand-yellow)/0.25)] hover:bg-brand-yellow/10'
                    : state === 'picked'
                      ? 'border-brand-yellow bg-brand-yellow/20 text-white'
                      : state === 'correct'
                        ? 'border-brand-green bg-brand-green text-white'
                        : state === 'wrong'
                          ? 'border-brand-red text-brand-red'
                          : 'border-white/10 text-white/35'
                }`}
              >
                <span className="min-w-0 truncate">{opt}</span>
                {state === 'correct' && <Check className="size-4 shrink-0 text-white" />}
                {state === 'wrong' && <X className="size-4 shrink-0 text-brand-red" />}
              </button>
            );
          })}
        </div>
        {footer}
      </div>
    );
  }
  return (
    <div
      className={`rounded-2xl border-2 p-3 ${steal ? 'border-brand-yellow/50 bg-brand-yellow/[0.05]' : 'border-brand-purple/40 bg-white/[0.03]'}`}
      data-testid="quiz-board-question"
    >
      <div
        className={`mb-1.5 flex items-center gap-1.5 font-poppins text-[10px] font-black uppercase tracking-wider ${
          steal ? 'text-brand-yellow' : 'text-brand-purple'
        }`}
      >
        {steal && <Zap className="size-3.5" />}
        {steal ? t('STEAL for {v}!', { v: value }) : t('For {v}', { v: value })}
      </div>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- question images come from the content CDN at any size
        <img
          src={image.url}
          width={image.width}
          height={image.height}
          alt=""
          className="mx-auto mb-2 max-h-36 w-auto rounded-lg object-contain"
        />
      ) : null}
      <p className="mb-2 font-poppins text-[13px] font-bold leading-snug text-white">{prompt}</p>
      <div className="grid grid-cols-1 gap-1.5">
        {options.map((opt, i) => {
          const state = optionState(i, selected, correctIndex);
          return (
            <button
              key={i}
              type="button"
              disabled={selected !== null || revealed}
              onClick={() => onAnswer(i)}
              data-testid={`quiz-board-option-${i}`}
              data-state={state}
              className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 text-left font-poppins text-xs font-bold transition-colors ${
                state === 'idle'
                  ? 'border-white/10 bg-white/[0.03] text-white hover:border-brand-purple/60'
                  : state === 'picked'
                    ? 'border-brand-purple bg-brand-purple/15 text-white'
                    : state === 'correct'
                      ? 'border-brand-green bg-brand-green/15 text-white'
                      : state === 'wrong'
                        ? 'border-brand-red bg-brand-red/15 text-white'
                        : 'border-white/5 bg-white/[0.02] text-white/35'
              }`}
            >
              <span className="min-w-0 truncate">{opt}</span>
              {state === 'correct' && <Check className="size-3.5 shrink-0 text-brand-green" />}
              {state === 'wrong' && <X className="size-3.5 shrink-0 text-brand-red" />}
            </button>
          );
        })}
      </div>
      {footer}
    </div>
  );
}

export function QuizBoardOverCard({
  you,
  ai,
  action,
}: {
  you: number;
  ai: number;
  action: ReactNode;
}) {
  const t = useMiniT();
  const result = you > ai ? 'you' : ai > you ? 'ai' : 'draw';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2 rounded-2xl border-2 border-white/10 bg-white/[0.04] p-4 text-center"
      data-testid="quiz-board-over"
    >
      <div className="text-3xl">{result === 'you' ? '🏆' : result === 'ai' ? '🤖' : '🤝'}</div>
      <div
        className={`font-poppins text-xl font-black uppercase ${
          result === 'you' ? 'text-brand-green-light' : result === 'ai' ? 'text-brand-red' : 'text-white/70'
        }`}
      >
        {result === 'you' ? t('You win!') : result === 'ai' ? t('AI wins') : t('Draw')}
      </div>
      <p className="font-poppins text-xs font-semibold text-white/50">
        {t('Final banks — you {a}, AI {b}.', { a: money(you), b: money(ai) })}
      </p>
      {action}
    </motion.div>
  );
}
