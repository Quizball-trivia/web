'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Check,
  Clock3,
  Coins,
  Flag,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  UserRoundSearch,
  X,
  Zap,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { QuitMatchModal } from '@/components/match/QuitMatchModal';
import { useLocale } from '@/contexts/LocaleContext';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuthStore } from '@/stores/auth.store';
import type {
  FootballGridClaimState,
  FootballGridCompletionReason,
  FootballGridCriterionView,
  FootballGridState,
} from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';
import {
  trackFootballGridEngagementEnded,
  trackFootballGridPlayStarted,
  trackFootballGridViewed,
} from '@/features/mini-games/footballGrid.analytics';
import { MiniGameShell, StatPill } from '@/features/mini-games/components/MiniGameShell';
import { CriterionAsset } from './components/CriterionAsset';
import { useRealtimeFootballGrid } from './realtime/useRealtimeFootballGrid';

export const FOOTBALL_GRID_COPY = {
  en: {
    title: 'Football Tic Tac Toe',
    subtitle: 'Claim cells with players — three in a row wins',
    scoreLabel: 'You · Opponent',
    pickTurn: 'Your turn — pick a cell',
    opponentThinking: 'Opponent is thinking…',
    searching: 'Finding your opponent',
    searchingBody: "We're checking for a live player now. If nobody is available, a smart rank-matched opponent will step in.",
    cancel: 'Cancel search',
    matching: 'Building the board',
    ready: 'Opponent found',
    loading: 'Loading match',
    getReady: 'Get ready',
    yourTurn: 'Your move',
    theirTurn: "Opponent's move",
    pickCell: 'Pick an empty square, then name a footballer who matches both clues.',
    answerPlaceholder: 'Type a footballer…',
    submit: 'Go',
    pass: 'Pass',
    correct: 'Square claimed!',
    wrong: 'That answer does not match both clues.',
    ambiguous: 'Be more specific — add the full name.',
    alreadyUsed: 'That footballer has already been used.',
    paused: 'Match paused',
    pausedBody: 'Waiting for the connection to recover. Your turn time is protected.',
    interrupted: 'Match temporarily interrupted',
    interruptedBody: 'The match is safely paused while we restore the game service.',
    report: 'Report missing answer',
    reported: 'Reported — thank you',
    quit: 'Leave match',
    resultWin: 'You own the grid',
    resultLoss: 'Opponent takes it',
    resultDraw: 'Grid locked',
    rematch: 'Rematch',
    waitingRematch: 'Waiting for opponent…',
    rematchAccepted: 'Rematch accepted',
    declineRematch: 'Decline rematch',
    newOpponent: 'Find new opponent',
    backToPlay: 'Back to play',
    you: 'You',
    opponent: 'Opponent',
    claimed: 'Claimed',
    sampleAnswers: 'Other valid answers',
    xp: 'XP earned',
    coins: 'Coins earned',
    signIn: 'Sign in to play online',
    signInBody: 'Football Tic Tac Toe is a live 1v1 mode. Sign in to match with another player or a smart opponent.',
    goSignIn: 'Go to sign in',
    unavailable: 'Football Tic Tac Toe is temporarily unavailable',
    unavailableBody: 'We could not start matchmaking right now. Your account and progress are safe.',
    retry: 'Try again',
  },
  ka: {
    title: 'საფეხბურთო იქს-ნული',
    subtitle: 'დაიკავე უჯრები ფეხბურთელებით — სამი ზედიზედ იგებს',
    scoreLabel: 'შენ · მეტოქე',
    pickTurn: 'შენი ჯერია — აირჩიე უჯრა',
    opponentThinking: 'მეტოქე ფიქრობს…',
    searching: 'ვეძებთ მეტოქეს',
    searchingBody: 'ჯერ ონლაინ მოთამაშეს ვეძებთ. თუ ვერ მოიძებნა, შენს დონეზე მორგებული ჭკვიანი მეტოქე ჩაერთვება.',
    cancel: 'ძიების გაუქმება',
    matching: 'ვქმნით დაფას',
    ready: 'მეტოქე ნაპოვნია',
    loading: 'მატჩი იტვირთება',
    getReady: 'მოემზადე',
    yourTurn: 'შენი სვლაა',
    theirTurn: 'მეტოქის სვლაა',
    pickCell: 'აირჩიე ცარიელი უჯრა და ჩაწერე ფეხბურთელი, რომელიც ორივე პირობას აკმაყოფილებს.',
    answerPlaceholder: 'ჩაწერე ფეხბურთელი…',
    submit: 'წადი',
    pass: 'გამოტოვება',
    correct: 'უჯრა შენია!',
    wrong: 'პასუხი ორივე პირობას არ აკმაყოფილებს.',
    ambiguous: 'დააზუსტე — ჩაწერე სრული სახელი.',
    alreadyUsed: 'ეს ფეხბურთელი უკვე გამოყენებულია.',
    paused: 'მატჩი შეჩერებულია',
    pausedBody: 'კავშირის აღდგენას ველოდებით. სვლის დრო დაცულია.',
    interrupted: 'მატჩი დროებით შეჩერდა',
    interruptedBody: 'თამაშის აღდგენამდე მატჩი უსაფრთხოდ არის დაპაუზებული.',
    report: 'დაკარგული პასუხის შეტყობინება',
    reported: 'შეტყობინება მიღებულია',
    quit: 'მატჩიდან გასვლა',
    resultWin: 'ბადე შენია',
    resultLoss: 'მეტოქემ მოიგო',
    resultDraw: 'ფრე',
    rematch: 'რევანში',
    waitingRematch: 'ველოდებით მეტოქეს…',
    rematchAccepted: 'რევანში მიღებულია',
    declineRematch: 'რევანშზე უარი',
    newOpponent: 'ახალი მეტოქე',
    backToPlay: 'თამაშებზე დაბრუნება',
    you: 'შენ',
    opponent: 'მეტოქე',
    claimed: 'დაკავებულია',
    sampleAnswers: 'სხვა სწორი პასუხები',
    xp: 'მიღებული XP',
    coins: 'მიღებული მონეტები',
    signIn: 'ონლაინ სათამაშოდ შედი ანგარიშზე',
    signInBody: 'საფეხბურთო იქს-ნული არის 1v1 ონლაინ რეჟიმი. შედი ანგარიშზე და ითამაშე სხვა მოთამაშესთან ან ჭკვიან მეტოქესთან.',
    goSignIn: 'შესვლა',
    unavailable: 'საფეხბურთო იქს-ნული დროებით მიუწვდომელია',
    unavailableBody: 'მატჩის ძიება ახლა ვერ დავიწყეთ. შენი ანგარიში და პროგრესი უსაფრთხოდაა.',
    retry: 'თავიდან ცდა',
  },
} as const;

function useRemaining(deadlineAt: string | null, serverTimeOffsetMs: number): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const update = () => {
      const deadline = deadlineAt ? Date.parse(deadlineAt) : Number.NaN;
      setRemaining(Number.isFinite(deadline) ? Math.max(0, deadline - (Date.now() + serverTimeOffsetMs)) : 0);
    };
    update();
    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [deadlineAt, serverTimeOffsetMs]);
  return remaining;
}

const GRID_AVATAR_FALLBACK = footballGridAssetUrl('/assets/store/avatars/avatar_male_white.webp')!;
const GRID_BACKGROUND = footballGridAssetUrl('/assets/bg-pattern.webp')!;
const resolveGridAvatarAsset = (asset: string) => footballGridAssetUrl(asset) ?? GRID_AVATAR_FALLBACK;

function CriterionHeader({
  criterion,
  locale,
  axis,
}: {
  criterion: FootballGridCriterionView;
  locale: 'en' | 'ka';
  axis: 'column' | 'row';
}) {
  const label = locale === 'ka' ? criterion.labelKa || criterion.labelEn : criterion.labelEn;
  if (axis === 'row') {
    return (
      <div title={label} className="flex min-w-0 items-center justify-center overflow-hidden rounded-xl bg-brand-blue p-1.5">
        <CriterionAsset criterion={criterion} className="size-7 sm:size-8" />
        <span className="sr-only">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-brand-yellow px-1 py-1.5 text-center">
      <CriterionAsset criterion={criterion} className="size-6" />
      <span className="line-clamp-2 font-poppins text-[8px] font-black uppercase leading-tight tracking-wide text-black/80 sm:text-[9px]">{label}</span>
    </div>
  );
}

function ClaimedCell({ claim, isMine, claimedLabel }: { claim: FootballGridClaimState; isMine: boolean; claimedLabel: string }) {
  return (
    <motion.div
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden p-1"
    >
      <span className={cn('line-clamp-3 text-center font-poppins text-[9px] font-black leading-tight sm:text-[10px]', isMine ? 'text-brand-cyan' : 'text-brand-red-soft')}>
        {claim.displayName ?? claimedLabel}
      </span>
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-xl border-2"
        style={{ borderColor: isMine ? '#1CB0F6' : '#FF4B4B' }}
        initial={{ opacity: 0.9, scale: 1 }}
        animate={{ opacity: 0, scale: 1.22 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      />
    </motion.div>
  );
}

export function MatchBoard({
  state,
  selfUserId,
  locale,
  selectedCell,
  onSelect,
}: {
  state: FootballGridState;
  selfUserId: string;
  locale: 'en' | 'ka';
  selectedCell: number | null;
  onSelect: (cell: number) => void;
}) {
  const claims = useMemo(() => new Map(state.claims.map((claim) => [claim.cellIndex, claim])), [state.claims]);
  const isMyTurn = state.phase === 'turn' && state.currentPlayerUserId === selfUserId;
  return (
    <div className="grid grid-cols-[44px_repeat(3,minmax(0,1fr))] gap-1.5">
      <div />
      {state.board.columns.map((criterion) => <CriterionHeader key={criterion.id} criterion={criterion} locale={locale} axis="column" />)}
      {state.board.rows.flatMap((row, rowIndex) => [
        <CriterionHeader key={`row-${row.id}`} criterion={row} locale={locale} axis="row" />,
        ...state.board.columns.map((column, columnIndex) => {
          const cellIndex = rowIndex * 3 + columnIndex;
          const claim = claims.get(cellIndex);
          const selectable = isMyTurn && !claim;
          return (
            <button
              key={`${row.id}-${column.id}`}
              type="button"
              disabled={!selectable}
              onClick={() => onSelect(cellIndex)}
              aria-label={`${locale === 'ka' ? row.labelKa : row.labelEn} × ${locale === 'ka' ? column.labelKa : column.labelEn}`}
              className={cn(
                'relative aspect-square overflow-hidden rounded-xl border-2 p-1 text-center transition-colors',
                claim && (claim.claimantUserId === selfUserId
                  ? 'border-brand-cyan bg-brand-cyan/20'
                  : 'border-brand-red-soft bg-brand-red-soft/15'),
                !claim && 'border-white/10 bg-white/[0.03]',
                selectable && 'cursor-pointer hover:border-brand-cyan/50 hover:bg-brand-cyan/[0.06]',
                selectedCell === cellIndex && 'border-brand-cyan bg-brand-cyan/15',
                !selectable && !claim && 'opacity-60',
              )}
            >
              {claim ? <ClaimedCell claim={claim} isMine={claim.claimantUserId === selfUserId} claimedLabel={FOOTBALL_GRID_COPY[locale].claimed} /> : (
                <span className="absolute inset-0 grid place-items-center font-poppins text-lg font-black text-white/15">·</span>
              )}
            </button>
          );
        }),
      ])}
    </div>
  );
}

export function FootballGridTurnPanel({
  state,
  locale,
  isMyTurn,
  selectedCell,
  remaining,
  answer,
  onAnswerChange,
  onSubmit,
  onPass,
  pending = false,
  feedback,
  reportableAttempt,
  alreadyReported = false,
  onReport,
}: {
  state: FootballGridState;
  locale: 'en' | 'ka';
  isMyTurn: boolean;
  selectedCell: number | null;
  remaining: number;
  answer: string;
  onAnswerChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPass: () => void;
  pending?: boolean;
  feedback?: 'correct' | 'wrong' | 'ambiguous' | 'already_used' | 'pass';
  reportableAttempt?: string | null;
  alreadyReported?: boolean;
  onReport?: (attemptId: string) => void;
}) {
  const copy = FOOTBALL_GRID_COPY[locale];
  const selectedRow = selectedCell === null ? null : state.board.rows[Math.floor(selectedCell / 3)];
  const selectedColumn = selectedCell === null ? null : state.board.columns[selectedCell % 3];
  const fullTurnMs = Math.max(20_000, state.turnRemainingMs ?? 0);
  const remainingRatio = Math.min(1, Math.max(0, remaining / fullTurnMs));

  return (
    <div className="mt-3 flex-1">
      <AnimatePresence mode="wait">
        {!isMyTurn ? (
          <motion.div
            key="opponent-turn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border-2 border-brand-red-soft/30 bg-brand-red-soft/[0.06] p-3 text-center"
          >
            <span className="font-poppins text-sm font-black uppercase tracking-wide text-brand-red-soft">{copy.opponentThinking}</span>
          </motion.div>
        ) : selectedCell === null || !selectedRow || !selectedColumn ? (
          <motion.div
            key="pick-cell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-brand-blue/15 p-3 text-center"
          >
            <span className="font-poppins text-sm font-black uppercase tracking-wide text-white">{copy.pickTurn}</span>
          </motion.div>
        ) : (
          <motion.form
            key={`answer-${selectedCell}`}
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              'rounded-2xl border-2 p-3',
              feedback === 'wrong' || feedback === 'already_used'
                ? 'border-brand-red bg-brand-red/10'
                : 'border-brand-blue/60 bg-brand-blue/[0.08]',
            )}
          >
            <div className="mb-2 flex min-w-0 items-center justify-center gap-2">
              <CriterionAsset criterion={selectedRow} className="size-5 shrink-0" />
              <span className="truncate font-poppins text-[10px] font-black uppercase text-white/80">
                {locale === 'ka' ? selectedRow.labelKa || selectedRow.labelEn : selectedRow.labelEn}
              </span>
              <span className="font-poppins text-xs font-black text-white/35">×</span>
              <CriterionAsset criterion={selectedColumn} className="size-5 shrink-0" />
              <span className="truncate font-poppins text-[10px] font-black uppercase text-white/80">
                {locale === 'ka' ? selectedColumn.labelKa || selectedColumn.labelEn : selectedColumn.labelEn}
              </span>
            </div>
            <div className="mb-2.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn('h-full rounded-full transition-[width] duration-100', remainingRatio < 0.25 ? 'bg-brand-red' : 'bg-brand-cyan')}
                style={{ width: `${remainingRatio * 100}%` }}
              />
            </div>
            <div className="flex gap-2">
              <input
                autoFocus
                value={answer}
                onChange={(event) => onAnswerChange(event.target.value)}
                placeholder={copy.answerPlaceholder}
                maxLength={100}
                className="h-12 min-w-0 flex-1 rounded-xl border-none bg-brand-blue px-3 text-center text-base font-bold text-white outline-none placeholder:text-white/60"
              />
              <button
                type="submit"
                disabled={!answer.trim() || pending}
                className="h-12 rounded-xl bg-brand-green px-4 font-poppins font-black uppercase text-white transition-colors hover:bg-brand-green-deep disabled:opacity-50"
              >
                {pending ? <LoaderCircle className="size-5 animate-spin" /> : copy.submit}
              </button>
              <button
                type="button"
                onClick={onPass}
                disabled={pending}
                aria-label={copy.pass}
                className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-white/10 text-white/40 hover:text-white/70 disabled:opacity-40"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-2 min-h-4 text-center font-poppins text-[11px] font-bold">
              {feedback === 'correct' && <span className="text-brand-green-light"><Check className="mr-1 inline size-3.5" />{copy.correct}</span>}
              {feedback === 'wrong' && <span className="text-brand-red-soft">{copy.wrong}</span>}
              {feedback === 'ambiguous' && <span className="text-brand-yellow">{copy.ambiguous}</span>}
              {feedback === 'already_used' && <span className="text-brand-red-soft">{copy.alreadyUsed}</span>}
            </div>
            {reportableAttempt && feedback !== 'correct' && feedback !== 'pass' && onReport && (
              <button
                type="button"
                disabled={alreadyReported}
                onClick={() => onReport(reportableAttempt)}
                className="mt-1 w-full text-center font-poppins text-[10px] font-bold text-white/40 underline decoration-white/20 underline-offset-4 disabled:no-underline"
              >
                {alreadyReported ? copy.reported : copy.report}
              </button>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SearchScreen({
  playerName,
  avatar,
  customization,
  status,
  onCancel,
  copy,
}: {
  playerName: string;
  avatar: string;
  customization?: Parameters<typeof AvatarDisplay>[0]['customization'] | null;
  status: 'idle' | 'searching' | 'pairing' | 'matched';
  onCancel: () => void;
  copy: typeof FOOTBALL_GRID_COPY.en | typeof FOOTBALL_GRID_COPY.ka;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-surface-page-alt px-5 py-10 text-white">
      <div className="absolute inset-0 opacity-60 [background:radial-gradient(circle_at_50%_25%,rgba(22,69,255,.34),transparent_38%),linear-gradient(135deg,transparent_48%,rgba(255,229,0,.06)_48%_55%,transparent_55%)]" />
      <div className="relative z-10 w-full max-w-xl text-center">
        <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-brand-yellow">
          <Zap className="size-4" fill="currentColor" /> {copy.title}
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight sm:text-5xl">{status === 'pairing' ? copy.matching : copy.searching}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55 sm:text-base">{copy.searchingBody}</p>

        <div className="relative mx-auto my-10 grid max-w-sm grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="rounded-[28px] border border-brand-blue-light bg-brand-blue/15 p-4 shadow-[0_0_40px_rgba(22,69,255,.18)]">
            <AvatarDisplay customization={customization ?? { base: avatar }} size="lg" className="mx-auto" assetResolver={resolveGridAvatarAsset} />
            <p className="mt-2 truncate text-sm font-black">{playerName}</p>
          </div>
          <div className="relative grid size-12 place-items-center rounded-full bg-brand-yellow text-lg font-black text-surface-page">
            VS
            <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-brand-yellow/20" />
          </div>
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-4">
            <div className="mx-auto grid size-24 place-items-center rounded-full bg-white/5">
              <UserRoundSearch className="size-12 animate-pulse text-white/35" />
            </div>
            <div className="mx-auto mt-3 h-3 w-20 animate-pulse rounded-full bg-white/10" />
            <motion.span
              className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: [-100, 240] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
            />
          </div>
        </div>

        <div className="mx-auto mb-9 grid w-36 grid-cols-3 gap-2">
          {Array.from({ length: 9 }, (_, index) => (
            <motion.span
              key={index}
              className="aspect-square rounded-lg border border-white/10 bg-white/5"
              animate={{ backgroundColor: ['rgba(255,255,255,.04)', index % 2 ? '#1645ff' : '#ffe500', 'rgba(255,255,255,.04)'] }}
              transition={{ repeat: Infinity, duration: 1.6, delay: index * 0.08 }}
            />
          ))}
        </div>

        <button type="button" onClick={onCancel} className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-bold text-white/70 transition hover:bg-white/5 hover:text-white">
          {copy.cancel}
        </button>
      </div>
    </main>
  );
}

export function FootballGridNoticeScreen({
  kind,
  title,
  body,
  actionLabel,
  onAction,
}: {
  kind: 'auth' | 'unavailable' | 'loading';
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const Icon = kind === 'auth' ? UserRoundSearch : kind === 'loading' ? LoaderCircle : AlertTriangle;
  return (
    <main className="grid min-h-dvh place-items-center bg-surface-page-alt px-5 text-center text-white">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_24px_90px_rgba(0,0,0,.28)]">
        <Icon className={cn('mx-auto mb-4 size-14', kind === 'loading' ? 'animate-spin text-brand-blue-light' : 'text-brand-yellow')} />
        <h1 className="text-2xl font-black uppercase leading-tight">{title}</h1>
        {body && <p className="mt-3 text-sm leading-relaxed text-white/55">{body}</p>}
        {actionLabel && onAction && (
          <button type="button" onClick={onAction} className="mt-6 w-full rounded-2xl bg-brand-blue px-5 py-4 font-black uppercase text-white">
            {actionLabel}
          </button>
        )}
      </div>
    </main>
  );
}

export function PhaseOverlay({ state, remaining, copy }: { state: FootballGridState; remaining: number; copy: typeof FOOTBALL_GRID_COPY.en | typeof FOOTBALL_GRID_COPY.ka }) {
  if (state.phase === 'turn' || state.phase === 'terminal') return null;
  const isPaused = state.phase === 'paused';
  const isInterrupted = state.phase === 'service_interruption';
  const title = isInterrupted ? copy.interrupted : isPaused ? copy.paused : state.phase === 'countdown' ? copy.getReady : state.phase === 'handoff' ? copy.ready : copy.loading;
  const body = isInterrupted ? copy.interruptedBody : isPaused ? copy.pausedBody : null;
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-surface-page-alt/85 px-6 text-center backdrop-blur-md">
      <div>
        {isInterrupted ? <AlertTriangle className="mx-auto mb-4 size-12 text-brand-yellow" /> : isPaused ? <Clock3 className="mx-auto mb-4 size-12 text-brand-yellow" /> : <LoaderCircle className="mx-auto mb-4 size-12 animate-spin text-brand-blue-light" />}
        <h2 className="text-2xl font-black uppercase text-white">{title}</h2>
        {state.phase === 'countdown' && <p className="mt-3 text-6xl font-black tabular-nums text-brand-yellow">{Math.max(1, Math.ceil(remaining / 1_000))}</p>}
        {body && <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/55">{body}</p>}
      </div>
    </div>
  );
}

function completionTitle(reason: FootballGridCompletionReason | null, won: boolean, draw: boolean, copy: typeof FOOTBALL_GRID_COPY.en | typeof FOOTBALL_GRID_COPY.ka) {
  if (reason === 'administrative_cancel') return copy.interrupted;
  if (draw) return copy.resultDraw;
  return won ? copy.resultWin : copy.resultLoss;
}

export function FootballGridFlowScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const copy = FOOTBALL_GRID_COPY[locale];
  const { player } = usePlayer();
  const authUser = useAuthStore((current) => current.user);
  const authStatus = useAuthStore((current) => current.status);
  const selfUserId = authUser?.id ?? null;
  const source = searchParams.get('source') === 'friend_lobby' ? 'friend_lobby' : 'matchmaking';
  const grid = useRealtimeFootballGrid({
    enabled: authStatus === 'authenticated' && Boolean(selfUserId),
    selfUserId,
    locale,
    autoStart: source === 'matchmaking',
  });
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [showQuit, setShowQuit] = useState(false);
  const viewedRef = useRef(false);
  const engagementEndedRef = useRef(false);
  const engagementCleanupTimerRef = useRef<number | null>(null);
  const activeStartedAtRef = useRef<number | null>(null);
  const activeDurationMsRef = useRef(0);
  const startedMatchIdsRef = useRef(new Set<string>());
  const completedMatchIdsRef = useRef(new Set<string>());
  const visitStartedRef = useRef(0);
  const handledCommandIdsRef = useRef(new Set<string>());
  const handledTurnResolutionsRef = useRef(new Set<string>());
  const statsRef = useRef({ selections: 0, answers: 0, correct: 0, wrong: 0, passes: 0, timeouts: 0 });
  const latestStateRef = useRef(grid.state);
  const remaining = useRemaining(grid.state?.turnDeadlineAt ?? grid.state?.phaseDeadlineAt ?? null, grid.serverTimeOffsetMs);
  const isMyTurn = Boolean(grid.state?.phase === 'turn' && grid.state.currentPlayerUserId === selfUserId);

  useEffect(() => {
    latestStateRef.current = grid.state;
  }, [grid.state]);

  useEffect(() => {
    if (engagementCleanupTimerRef.current !== null) {
      window.clearTimeout(engagementCleanupTimerRef.current);
      engagementCleanupTimerRef.current = null;
    }
    if (!viewedRef.current) {
      viewedRef.current = true;
      visitStartedRef.current = Date.now();
      activeStartedAtRef.current = document.visibilityState === 'visible' ? Date.now() : null;
      trackFootballGridViewed({ surface: source, gridId: 'pending', opponentType: 'human' });
      trackFootballGridPlayStarted({ surface: source, gridId: 'pending', opponentType: 'human' });
    }

    const accrueActiveTime = (now: number) => {
      if (activeStartedAtRef.current === null) return;
      activeDurationMsRef.current += Math.max(0, now - activeStartedAtRef.current);
      activeStartedAtRef.current = null;
    };
    const handleVisibility = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible') {
        if (activeStartedAtRef.current === null) activeStartedAtRef.current = now;
      } else {
        accrueActiveTime(now);
      }
    };
    const finishEngagement = () => {
      if (engagementEndedRef.current) return;
      engagementEndedRef.current = true;
      const now = Date.now();
      accrueActiveTime(now);
      const snapshot = latestStateRef.current;
      const stats = statsRef.current;
      trackFootballGridEngagementEnded({
        surface: source,
        gridId: snapshot?.board.boardId ?? 'pending',
        opponentType: snapshot?.players.some((entry) => entry.isBot) ? 'bot' : 'human',
        elapsedSeconds: visitStartedRef.current ? (now - visitStartedRef.current) / 1_000 : 0,
        activeSeconds: activeDurationMsRef.current / 1_000,
        matchesStarted: startedMatchIdsRef.current.size,
        matchesCompleted: completedMatchIdsRef.current.size,
        cellSelections: stats.selections,
        answersSubmitted: stats.answers,
        correctAnswers: stats.correct,
        wrongAnswers: stats.wrong,
        passes: stats.passes,
        timeouts: stats.timeouts,
      });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', finishEngagement);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', finishEngagement);
      engagementCleanupTimerRef.current = window.setTimeout(finishEngagement, 0);
    };
  }, [source]);

  useEffect(() => {
    if (!grid.state || grid.state.phase === 'handoff' || grid.state.phase === 'loading') return;
    startedMatchIdsRef.current.add(grid.state.matchId);
  }, [grid.state]);

  useEffect(() => {
    if (!grid.completed) return;
    completedMatchIdsRef.current.add(grid.completed.matchId);
  }, [grid.completed]);

  useEffect(() => {
    if (!grid.commandResult) return;
    if (handledCommandIdsRef.current.has(grid.commandResult.commandId)) return;
    handledCommandIdsRef.current.add(grid.commandResult.commandId);
    if (grid.commandResult.outcome === 'correct') statsRef.current.correct += 1;
    if (grid.commandResult.outcome === 'wrong' || grid.commandResult.outcome === 'already_used') statsRef.current.wrong += 1;
  }, [grid.commandResult]);

  useEffect(() => {
    if (!grid.turnResolved || grid.turnResolved.outcome !== 'timeout') return;
    const resolutionKey = `${grid.turnResolved.matchId}:${grid.turnResolved.state.stateVersion}`;
    if (handledTurnResolutionsRef.current.has(resolutionKey)) return;
    handledTurnResolutionsRef.current.add(resolutionKey);
    statsRef.current.timeouts += 1;
  }, [grid.turnResolved]);

  const handleCancel = () => {
    grid.actions.cancelSearch();
    router.push('/play');
  };
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (selectedCell === null) return;
    if (grid.actions.submitAnswer(selectedCell, answer)) statsRef.current.answers += 1;
  };
  const handlePass = () => {
    if (grid.actions.pass()) statsRef.current.passes += 1;
  };
  const handleFindNew = () => {
    setSelectedCell(null);
    setAnswer('');
    grid.actions.startSearch();
  };

  if (authStatus === 'loading') {
    return <FootballGridNoticeScreen kind="loading" title={copy.loading} />;
  }

  if (!selfUserId) {
    return (
      <FootballGridNoticeScreen
        kind="auth"
        title={copy.signIn}
        body={copy.signInBody}
        actionLabel={copy.goSignIn}
        onAction={() => router.push('/auth')}
      />
    );
  }

  if (!grid.state && !grid.completed) {
    if (grid.error && grid.search.state === 'idle') {
      const unavailable = grid.error.code === 'GRID_UNAVAILABLE' || grid.error.code === 'GRID_QUEUE_UNAVAILABLE';
      return (
        <FootballGridNoticeScreen
          kind="unavailable"
          title={unavailable ? copy.unavailable : grid.error.message}
          body={unavailable ? copy.unavailableBody : undefined}
          actionLabel={copy.retry}
          onAction={grid.actions.startSearch}
        />
      );
    }
    return <SearchScreen playerName={player.username} avatar={player.avatar} customization={player.avatarCustomization} status={grid.search.state} onCancel={handleCancel} copy={copy} />;
  }

  if (grid.completed && grid.state?.phase === 'terminal') {
    const won = grid.state.winnerUserId === selfUserId;
    const draw = !grid.state.winnerUserId;
    const myClaims = grid.state.claims.filter((claim) => claim.claimantUserId === selfUserId).length;
    const theirClaims = grid.state.claims.length - myClaims;
    const rematchPending = grid.rematch?.status === 'pending';
    const accepted = Boolean(grid.rematch?.acceptedUserIds.includes(selfUserId));
    return (
      <main className="min-h-dvh overflow-y-auto bg-surface-page-alt px-5 py-10 text-white">
        <div className="mx-auto max-w-xl text-center">
          <div className={cn('mx-auto grid size-24 place-items-center rounded-[30px]', won ? 'bg-brand-yellow text-surface-page' : draw ? 'bg-white/10 text-white' : 'bg-brand-blue text-white')}>
            {won ? <Trophy className="size-12" /> : draw ? <RotateCcw className="size-11" /> : <Flag className="size-11" />}
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-white/40">{copy.title}</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight">{completionTitle(grid.state.completionReason, won, draw, copy)}</h1>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-brand-blue-light bg-brand-blue/15 p-4"><p className="text-xs font-bold uppercase text-white/45">{player.username}</p><p className="mt-1 text-4xl font-black">{myClaims}</p></div>
            <div className="rounded-2xl border border-brand-yellow/50 bg-brand-yellow/10 p-4"><p className="truncate text-xs font-bold uppercase text-white/45">{grid.opponent?.username ?? copy.opponent}</p><p className="mt-1 text-4xl font-black">{theirClaims}</p></div>
          </div>

          {grid.completed.rewards && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 p-4"><Sparkles className="size-5 text-brand-blue-light" /><span className="font-black">+{grid.completed.rewards.xp} {copy.xp}</span></div>
              {grid.completed.rewards.coins > 0 && <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 p-4"><Coins className="size-5 text-brand-yellow" /><span className="font-black">+{grid.completed.rewards.coins} {copy.coins}</span></div>}
            </div>
          )}

          {grid.completed.samples.length > 0 && (
            <div className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 text-left">
              <h2 className="text-sm font-black uppercase tracking-wide text-white/60">{copy.sampleAnswers}</h2>
              <div className="mt-3 space-y-2">
                {grid.completed.samples.slice(0, 3).map((sample) => (
                  <div key={sample.cellIndex} className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-blue text-xs font-black">{sample.cellIndex + 1}</span>
                    <span className="truncate text-sm font-bold text-white/75">{sample.players.map((answerItem) => answerItem.name).join(' · ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7 space-y-3">
            {rematchPending && (
              <button type="button" disabled={accepted} onClick={grid.actions.acceptRematch} className="w-full rounded-2xl bg-brand-yellow px-6 py-4 font-black uppercase text-surface-page disabled:opacity-60">
                {accepted ? copy.waitingRematch : copy.rematch}
              </button>
            )}
            {source === 'matchmaking' && (!rematchPending || grid.rematch?.status === 'declined' || grid.rematch?.status === 'expired') && (
              <button type="button" onClick={handleFindNew} className="w-full rounded-2xl bg-brand-blue px-6 py-4 font-black uppercase">{copy.newOpponent}</button>
            )}
            {rematchPending && !accepted && <button type="button" onClick={grid.actions.declineRematch} className="w-full rounded-2xl border border-white/15 px-6 py-4 font-bold text-white/70">{copy.declineRematch}</button>}
            <button type="button" onClick={() => { grid.actions.clear(); router.push('/play'); }} className="w-full rounded-2xl border border-white/15 px-6 py-4 font-bold text-white/70">{copy.backToPlay}</button>
          </div>
        </div>
      </main>
    );
  }

  const state = grid.state;
  if (!state) return null;
  const feedback = grid.commandResult?.outcome;
  const reportableAttempt = grid.commandResult?.attemptId ?? null;
  const alreadyReported = Boolean(reportableAttempt && grid.reportedAttemptIds.includes(reportableAttempt));
  const selectedCellIsClaimed = selectedCell !== null && state.claims.some((claim) => claim.cellIndex === selectedCell);
  const myClaims = state.claims.filter((claim) => claim.claimantUserId === selfUserId).length;
  const opponentClaims = state.claims.length - myClaims;

  return (
    <>
      <MiniGameShell
        title={copy.title}
        subtitle={copy.subtitle}
        accent="#1CB0F6"
        headerRight={<StatPill label={copy.scoreLabel} value={`${myClaims} · ${opponentClaims}`} color="#1CB0F6" />}
        onBack={() => setShowQuit(true)}
        disclaimer={false}
        backgroundImageUrl={GRID_BACKGROUND}
      >
        <div className="mt-2 flex flex-1 flex-col">
        <MatchBoard state={state} selfUserId={selfUserId} locale={locale} selectedCell={selectedCell} onSelect={(cell) => { statsRef.current.selections += 1; setSelectedCell(cell); setAnswer(''); grid.actions.clearCommandFeedback(); }} />
          <FootballGridTurnPanel
            state={state}
            locale={locale}
            isMyTurn={isMyTurn}
            selectedCell={selectedCellIsClaimed ? null : selectedCell}
            remaining={remaining}
            answer={answer}
            onAnswerChange={setAnswer}
            onSubmit={handleSubmit}
            onPass={handlePass}
            pending={Boolean(grid.pendingCommandId)}
            feedback={feedback}
            reportableAttempt={reportableAttempt}
            alreadyReported={alreadyReported}
            onReport={grid.actions.reportMissingAnswer}
          />
        {grid.error && <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-center text-xs font-bold text-red-200">{grid.error.message}</div>}
          <PhaseOverlay state={state} remaining={remaining} copy={copy} />
        </div>
      </MiniGameShell>
      <QuitMatchModal open={showQuit} onOpenChange={setShowQuit} onConfirm={() => { setShowQuit(false); grid.actions.forfeit(); }} description={copy.quit} />
    </>
  );
}
