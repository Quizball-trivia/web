'use client';

/* eslint-disable @next/next/no-img-element -- Player art is restricted to the reviewed first-party Grid CDN. */

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Check, LoaderCircle, UserRound, UserRoundSearch } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { QuitMatchModal } from '@/components/match/QuitMatchModal';
import { useLocale } from '@/contexts/LocaleContext';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';
import {
  loadGridTypeaheadRoster,
  searchGridPlayers,
  type GridTypeaheadPreparedPlayer,
} from '@/lib/football-grid/typeahead';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuthStore } from '@/stores/auth.store';
import type {
  FootballGridClaimState,
  FootballGridCompletionReason,
  FootballGridCompletedPayload,
  FootballGridCriterionView,
  FootballGridState,
  OpponentInfo,
  FootballGridCommandResultPayload,
  FootballGridSeriesInfo,
} from '@/lib/realtime/socket.types';
import type { FootballGridLastGameResult } from '@/stores/footballGrid.store';
import { useFootballGridStore } from '@/stores/footballGrid.store';
import { useFootballGridAnalytics } from './hooks/useFootballGridAnalytics';
import { useFootballGridAudio } from './hooks/useFootballGridAudio';
import { useFootballGridBoardPreload } from './hooks/useFootballGridBoardPreload';
import { AuctionAudioControl } from '@/features/auction/components/shared/AuctionAudioControl';
import { AuctionLeaveControl } from '@/features/auction/components/shared/AuctionLeaveControl';
import { KickoffCountdownOverlay } from '@/features/possession/components/KickoffCountdownOverlay';
import { MatchHudAvatar } from '@/features/possession/components/MatchHudPrimitives';
import { ShowdownScreen } from '@/components/ShowdownScreen';
import type { AvatarCustomization } from '@/types/game';
import { cn } from '@/lib/utils';
import {
  trackFootballGridEngagementEnded,
  trackFootballGridPlayStarted,
  trackFootballGridViewed,
} from '@/features/mini-games/footballGrid.analytics';
import { MiniGameShell } from '@/features/mini-games/components/MiniGameShell';
import { useRealtimeConnectionHealth } from '@/lib/realtime/connection-health';
import { AnimatedCounter } from '@/features/game/results/AnimatedCounter';
import { CoinRewardChip, RewardChip } from '@/features/game/results/RankedProgressionPanel';
import { CriterionAsset } from './components/CriterionAsset';
import { useRealtimeFootballGrid } from './realtime/useRealtimeFootballGrid';
import type { Locale } from '@/lib/i18n/messages';

export const FOOTBALL_GRID_COPY = {
  en: {
    title: 'Football Tic Tac Toe',
    opponentThinking: 'Opponent is thinking…',
    searching: 'Finding your opponent',
    searchingBody: 'Looking for a player…',
    cancel: 'Cancel search',
    cancelPick: 'Cancel',
    matching: 'Building the board…',
    ready: 'Opponent found',
    loading: 'Loading match',
    getReady: 'Get ready',
    yourTurn: 'Your move',
    theirTurn: "Opponent's move",
    pickCell: 'Pick an empty square, then name a footballer who matches both clues.',
    answerPlaceholder: 'Type a footballer…',
    submit: 'Submit',
    submitShort: 'Submit',
    correct: 'Square claimed!',
    wrong: 'That answer does not match both clues.',
    ambiguous: 'Be more specific — add the full name.',
    alreadyUsed: 'That footballer has already been used.',
    paused: 'Match paused',
    pausedBody: 'Waiting for the connection to recover. Your turn time is protected.',
    opponentDisconnected: 'Opponent disconnected',
    opponentDisconnectedBody: 'If they do not return before the timer runs out, you win the match.',
    selfDisconnected: 'Connection lost',
    selfDisconnectedBody: 'Reconnecting… get back before the timer runs out or the match is forfeited.',
    reconnectingStrip: 'Reconnecting…',
    reconnectWindow: 'Time left to reconnect',
    interrupted: 'Match temporarily interrupted',
    interruptedBody: 'The match is safely paused while we restore the game service.',
    report: 'Report missing answer',
    reported: 'Reported — thank you',
    quit: 'Leave match',
    resultWin: 'You own the grid',
    resultLoss: 'Opponent takes it',
    resultDraw: 'Grid locked',
    noteOpponentLeft: 'Opponent left the match',
    noteYouLeft: 'You left the match',
    noteOpponentDisconnected: 'Opponent lost connection',
    noteYouDisconnected: 'Connection was lost',
    noteOpponentIdle: 'Opponent missed 3 turns in a row — series forfeited',
    noteYouIdle: 'You missed 3 turns in a row — the series was forfeited',
    noteOpponentNoShow: 'Opponent never joined',
    noteYouNoShow: 'You did not join in time',
    noteBothDisconnected: 'Both players disconnected',
    noteNoShow: 'The match did not start in time',
    turnPillYou: 'Your turn',
    turnPillOpponent: "Opponent's turn",
    skip: 'Skip',
    requestDraw: 'Request draw',
    drawRequested: 'Draw requested…',
    drawLocked: 'Declined — try again in a few turns',
    drawOfferTitle: 'Opponent offers a draw',
    drawOfferBody: 'Accept to end this game as a draw and move to the next board.',
    acceptDraw: 'Accept',
    declineDraw: 'Decline',
    drawDeclinedNote: 'Draw declined',
    gameOf: 'Game {n} of {m}',
    seriesLead: 'You lead',
    seriesTrail: 'Opponent leads',
    seriesLevel: 'All square',
    nextGameSoon: 'Next board coming up…',
    gameWon: 'You take game {n}',
    gameLost: 'Opponent takes game {n}',
    gameDrawn: 'Game {n} drawn',
    noteBoardDead: 'No line left for either player',
    noteDrawAgreed: 'Draw agreed',
    seriesWin: 'You take the series',
    seriesLoss: 'Opponent takes the series',
    seriesDraw: 'Series drawn',
    tapCellHint: 'Tap a cell, then name a footballer who fits both',
    rematch: 'Rematch',
    waitingRematch: 'Waiting for opponent…',
    rematchAccepted: 'Rematch accepted',
    declineRematch: 'Decline rematch',
    newOpponent: 'Find new opponent',
    backToPlay: 'Back to home',
    you: 'You',
    opponent: 'Opponent',
    claimed: 'Claimed',
    sampleAnswers: 'Other valid answers',
    sampleAnswersBody: 'Different examples for each intersection',
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
    title: 'იქს ნული',
    opponentThinking: 'მეტოქე ფიქრობს…',
    searching: 'ვეძებთ მეტოქეს',
    searchingBody: 'ვეძებთ მოთამაშეს…',
    cancel: 'ძიების გაუქმება',
    cancelPick: 'გაუქმება',
    matching: 'ვქმნით დაფას…',
    ready: 'მეტოქე ნაპოვნია',
    loading: 'მატჩი იტვირთება',
    getReady: 'მოემზადე',
    yourTurn: 'შენი სვლაა',
    theirTurn: 'მეტოქის სვლაა',
    pickCell: 'აირჩიე ცარიელი უჯრა და ჩაწერე ფეხბურთელი, რომელიც ორივე პირობას აკმაყოფილებს.',
    answerPlaceholder: 'ჩაწერე ფეხბურთელი…',
    submit: 'დადასტურება',
    submitShort: 'დასტ.',
    correct: 'უჯრა შენია!',
    wrong: 'პასუხი ორივე პირობას არ აკმაყოფილებს.',
    ambiguous: 'დააზუსტე — ჩაწერე სრული სახელი.',
    alreadyUsed: 'ეს ფეხბურთელი უკვე გამოყენებულია.',
    paused: 'მატჩი შეჩერებულია',
    pausedBody: 'კავშირის აღდგენას ველოდებით. სვლის დრო დაცულია.',
    opponentDisconnected: 'მეტოქე გაითიშა',
    opponentDisconnectedBody: 'თუ დროის ამოწურვამდე არ დაბრუნდა, მატჩს შენ მოიგებ.',
    selfDisconnected: 'კავშირი გაწყდა',
    selfDisconnectedBody: 'ვუკავშირდებით… დაბრუნდი დროის ამოწურვამდე, თორემ მატჩი ჩაგეთვლება.',
    reconnectingStrip: 'ვუკავშირდებით…',
    reconnectWindow: 'დარჩენილი დრო',
    interrupted: 'მატჩი დროებით შეჩერდა',
    interruptedBody: 'თამაშის აღდგენამდე მატჩი უსაფრთხოდ არის დაპაუზებული.',
    report: 'დაკარგული პასუხის შეტყობინება',
    reported: 'შეტყობინება მიღებულია',
    quit: 'მატჩიდან გასვლა',
    resultWin: 'ბადე შენია',
    resultLoss: 'მეტოქემ მოიგო',
    resultDraw: 'ფრე',
    noteOpponentLeft: 'მეტოქემ დატოვა მატჩი',
    noteYouLeft: 'მატჩი დატოვე',
    noteOpponentDisconnected: 'მეტოქეს კავშირი გაუწყდა',
    noteYouDisconnected: 'კავშირი გაწყდა',
    noteOpponentIdle: 'მეტოქემ ზედიზედ 3 სვლა გამოტოვა — სერია ჩათვლით მოიგე',
    noteYouIdle: 'ზედიზედ 3 სვლა გამოტოვე — სერია ჩათვლით წაგებულია',
    noteOpponentNoShow: 'მეტოქე არ შემოვიდა',
    noteYouNoShow: 'დროულად ვერ შემოხვედი',
    noteBothDisconnected: 'ორივე მოთამაშე გაითიშა',
    noteNoShow: 'მატჩი დროულად ვერ დაიწყო',
    turnPillYou: 'შენი სვლა',
    turnPillOpponent: 'მეტოქის სვლა',
    skip: 'გამოტოვება',
    requestDraw: 'ფრეს შეთავაზება',
    drawRequested: 'ფრე შეთავაზებულია…',
    drawLocked: 'უარყოფილია — სცადე რამდენიმე სვლის შემდეგ',
    drawOfferTitle: 'მეტოქე ფრეს გთავაზობს',
    drawOfferBody: 'დათანხმდი, რომ ეს თამაში ფრედ დასრულდეს და შემდეგ დაფაზე გადახვიდეთ.',
    acceptDraw: 'დათანხმება',
    declineDraw: 'უარყოფა',
    drawDeclinedNote: 'ფრე უარყოფილია',
    gameOf: 'თამაში {n} / {m}',
    seriesLead: 'შენ ლიდერობ',
    seriesTrail: 'მეტოქე ლიდერობს',
    seriesLevel: 'თანაბარია',
    nextGameSoon: 'შემდეგი დაფა მალე…',
    gameWon: 'შენ მოიგე {n}-ე თამაში',
    gameLost: 'მეტოქემ მოიგო {n}-ე თამაში',
    gameDrawn: '{n}-ე თამაში ფრედ დასრულდა',
    noteBoardDead: 'ხაზი ვერცერთს აღარ გამოსდის',
    noteDrawAgreed: 'ფრეზე შეთანხმდით',
    seriesWin: 'სერია შენია',
    seriesLoss: 'სერია მეტოქემ წაიღო',
    seriesDraw: 'სერია ფრედ დასრულდა',
    tapCellHint: 'აირჩიე უჯრა და დაასახელე ფეხბურთელი, რომელიც ორივეს შეესაბამება',
    rematch: 'რევანში',
    waitingRematch: 'ველოდებით მეტოქეს…',
    rematchAccepted: 'რევანში მიღებულია',
    declineRematch: 'რევანშზე უარი',
    newOpponent: 'ახალი მეტოქე',
    backToPlay: 'მთავარზე დაბრუნება',
    you: 'შენ',
    opponent: 'მეტოქე',
    claimed: 'დაკავებულია',
    sampleAnswers: 'სხვა სწორი პასუხები',
    sampleAnswersBody: 'განსხვავებული მაგალითები თითოეული უჯრისთვის',
    xp: 'მიღებული XP',
    coins: 'მიღებული მონეტები',
    signIn: 'ონლაინ სათამაშოდ შედი ანგარიშზე',
    signInBody: 'იქს ნული არის 1v1 ონლაინ რეჟიმი. შედი ანგარიშზე და ითამაშე ონლაინ.',
    goSignIn: 'შესვლა',
    unavailable: 'იქს ნული დროებით მიუწვდომელია',
    unavailableBody: 'მატჩის ძიება ახლა ვერ დავიწყეთ. შენი ანგარიში და პროგრესი უსაფრთხოდაა.',
    retry: 'თავიდან ცდა',
  },
  es: {
    title: 'Fútbol: Tres en raya',
    opponentThinking: 'El oponente está pensando…',
    searching: 'Buscando a tu oponente',
    searchingBody: 'Buscando un jugador…',
    cancel: 'Cancelar búsqueda',
    cancelPick: 'Cancelar',
    matching: 'Creando el tablero…',
    ready: 'Oponente encontrado',
    loading: 'Cargando partido',
    getReady: 'Prepárate',
    yourTurn: 'Tu turno',
    theirTurn: 'Turno del oponente',
    pickCell: 'Elige una casilla vacía y nombra a un futbolista que coincida con ambas pistas.',
    answerPlaceholder: 'Escribe un futbolista…',
    submit: 'Enviar',
    submitShort: 'Enviar',
    correct: '¡Casilla reclamada!',
    wrong: 'Esa respuesta no coincide con ambas pistas.',
    ambiguous: 'Sé más específico — añade el nombre completo.',
    alreadyUsed: 'Ese futbolista ya se ha usado.',
    paused: 'Partido pausado',
    pausedBody: 'Esperando a que se recupere la conexión. Tu tiempo de turno está protegido.',
    reconnectWindow: 'Tiempo para reconectar',
    interrupted: 'Partido temporalmente interrumpido',
    interruptedBody: 'El partido está pausado de forma segura mientras restauramos el servicio.',
    report: 'Informar de una respuesta no reconocida',
    reported: 'Informe enviado — gracias',
    quit: 'Abandonar partido',
    resultWin: 'Controlas el tablero',
    resultLoss: 'El oponente gana',
    resultDraw: 'Tablero bloqueado',
    rematch: 'Revancha',
    waitingRematch: 'Esperando al oponente…',
    rematchAccepted: 'Revancha aceptada',
    declineRematch: 'Rechazar revancha',
    newOpponent: 'Buscar nuevo oponente',
    backToPlay: 'Volver al inicio',
    you: 'Tú',
    opponent: 'Oponente',
    claimed: 'Reclamado',
    sampleAnswers: 'Otras respuestas válidas',
    sampleAnswersBody: 'Diferentes ejemplos para cada intersección',
    xp: 'XP ganados',
    coins: 'Monedas ganadas',
    signIn: 'Inicia sesión para jugar online',
    signInBody: 'Fútbol: Tres en raya es un modo 1 contra 1 en vivo. Inicia sesión para enfrentarte a otro jugador o a un oponente inteligente.',
    goSignIn: 'Ir a iniciar sesión',
    unavailable: 'Fútbol: Tres en raya no está disponible temporalmente',
    unavailableBody: 'No hemos podido iniciar la búsqueda de oponentes. Tu cuenta y tu progreso están seguros.',
    retry: 'Intentar de nuevo',
    noteOpponentLeft: 'El rival abandonó el partido',
    noteYouLeft: 'Abandonaste el partido',
    noteOpponentDisconnected: 'El rival perdió la conexión',
    noteYouDisconnected: 'Se perdió la conexión',
    noteOpponentIdle: 'El rival no jugó 3 turnos seguidos — serie ganada por abandono',
    noteYouIdle: 'No jugaste 3 turnos seguidos — la serie se perdió por abandono',
    noteOpponentNoShow: 'El rival nunca se unió',
    noteYouNoShow: 'No te uniste a tiempo',
    noteBothDisconnected: 'Ambos jugadores se desconectaron',
    noteNoShow: 'El partido no empezó a tiempo',
    turnPillYou: 'Tu turno',
    turnPillOpponent: 'Turno del rival',
    skip: 'Saltar',
    requestDraw: 'Pedir tablas',
    drawRequested: 'Tablas pedidas…',
    drawLocked: 'Rechazadas — inténtalo en unas jugadas',
    drawOfferTitle: 'El rival ofrece tablas',
    drawOfferBody: 'Acepta para terminar esta partida en tablas y pasar al siguiente tablero.',
    acceptDraw: 'Aceptar',
    declineDraw: 'Rechazar',
    drawDeclinedNote: 'Tablas rechazadas',
    gameOf: 'Partida {n} de {m}',
    seriesLead: 'Vas ganando',
    seriesTrail: 'El rival va ganando',
    seriesLevel: 'Empate',
    nextGameSoon: 'Siguiente tablero en breve…',
    gameWon: 'Ganas la partida {n}',
    gameLost: 'El rival gana la partida {n}',
    gameDrawn: 'Partida {n} en tablas',
    noteBoardDead: 'Ningún jugador puede completar una línea',
    noteDrawAgreed: 'Tablas acordadas',
    seriesWin: 'Te llevas la serie',
    seriesLoss: 'El rival se lleva la serie',
    seriesDraw: 'Serie empatada',
    tapCellHint: 'Toca una casilla y nombra a un futbolista que encaje en ambas',
    opponentDisconnected: 'Rival desconectado',
    opponentDisconnectedBody: 'Si no vuelve antes de que acabe el tiempo, ganas el partido.',
    selfDisconnected: 'Conexión perdida',
    selfDisconnectedBody: 'Reconectando… vuelve antes de que acabe el tiempo o perderás el partido.',
    reconnectingStrip: 'Reconectando…',
  },
} as const;

type FootballGridCopy = (typeof FOOTBALL_GRID_COPY)[keyof typeof FOOTBALL_GRID_COPY];


// ── Match HUD (top of the board): players · series score · turn · clock · actions ──
export function GridHud({
  state,
  series,
  selfUserId,
  selfName,
  selfCustomization,
  opponent,
  remaining,
  isMyTurn,
  copy,
  pendingCommand,
  myOfferPending,
  onSkip,
  onOfferDraw,
  selfRankPoints = null,
  opponentRankPoints = null,
}: {
  state: FootballGridState;
  series: FootballGridSeriesInfo | null;
  selfUserId: string | null;
  selfName: string;
  selfCustomization: Parameters<typeof AvatarDisplay>[0]['customization'];
  selfRankPoints?: number | null;
  opponentRankPoints?: number | null;
  opponent: OpponentInfo | null;
  remaining: number;
  isMyTurn: boolean;
  copy: FootballGridCopy;
  pendingCommand: boolean;
  myOfferPending: boolean;
  onSkip: () => void;
  onOfferDraw: () => void;
}) {
  const seconds = Math.max(0, Math.ceil(remaining / 1_000));
  const fullTurnMs = Math.max(40_000, state.turnRemainingMs ?? 0);
  const ratio = state.phase === 'turn' ? Math.min(1, Math.max(0, remaining / fullTurnMs)) : 0;
  const myWins = selfUserId ? series?.wins[selfUserId] ?? 0 : 0;
  const theirWins = opponent ? series?.wins[opponent.id] ?? 0 : 0;
  const me = state.players.find((player) => player.userId === selfUserId);
  const offerLocked = Boolean(me && (me.drawOfferLockedUntilTurn ?? 0) > state.turnNumber);
  const offerByOpponent = Boolean(state.drawOffer && state.drawOffer.byUserId !== selfUserId);
  const canOffer = state.phase === 'turn' && !state.drawOffer && !offerLocked && !pendingCommand;
  const live = state.phase === 'turn';
  return (
    <div className="px-1 py-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <MatchHudAvatar customization={selfCustomization ?? null} side="player" rankPoints={selfRankPoints} />
          <span className="truncate font-poppins text-xs font-black uppercase text-white">{selfName}</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex h-9 min-w-[88px] items-center justify-center rounded-xl bg-brand-blue px-3 font-poppins text-xl font-black tabular-nums text-white">
            {myWins}<span className="mx-1.5 text-white/60">–</span>{theirWins}
          </div>
          {series && series.format === 'bo3' && (
            <span className="mt-0.5 font-poppins text-[10px] font-bold uppercase tracking-wide text-white/50">
              {fill(copy.gameOf, { n: series.gameIndex, m: 3 })}
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate font-poppins text-xs font-black uppercase text-white">{opponent?.username ?? copy.opponent}</span>
          <MatchHudAvatar
            customization={opponent?.avatarCustomization ?? { base: opponent?.avatarUrl ?? undefined }}
            side="opponent"
            flipped
            rankPoints={opponentRankPoints}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1 font-poppins text-[11px] font-black uppercase tracking-wide',
            isMyTurn ? 'bg-brand-yellow text-black' : 'bg-white/10 text-white/70',
          )}
          aria-live="polite"
        >
          {isMyTurn ? copy.turnPillYou : copy.turnPillOpponent}
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn('h-full rounded-full transition-[width] duration-100', ratio < 0.25 ? 'bg-brand-red' : 'bg-brand-yellow')}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          <span className={cn('w-8 text-right font-poppins text-lg font-black tabular-nums', ratio < 0.25 && live ? 'text-brand-red' : 'text-brand-yellow')}>
            {live ? seconds : '–'}
          </span>
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={onSkip}
          disabled={!isMyTurn || pendingCommand}
          className="h-10 flex-1 rounded-xl border-2 border-brand-red-soft/60 font-poppins text-xs font-black uppercase tracking-wide text-brand-red-soft transition-colors hover:bg-brand-red-soft/10 disabled:opacity-35"
        >
          {copy.skip}
        </button>
        <button
          type="button"
          onClick={onOfferDraw}
          disabled={!canOffer || offerByOpponent}
          title={offerLocked ? copy.drawLocked : undefined}
          className="h-10 flex-1 rounded-xl border-2 border-brand-orange/70 font-poppins text-xs font-black uppercase tracking-wide text-brand-orange transition-colors hover:bg-brand-orange/10 disabled:opacity-35"
        >
          {myOfferPending ? copy.drawRequested : copy.requestDraw}
        </button>
      </div>
      {offerLocked && !state.drawOffer && (
        <p className="mt-1.5 text-center font-poppins text-[10px] font-bold text-white/45">{copy.drawLocked}</p>
      )}
    </div>
  );
}

// ── Incoming draw offer ────────────────────────────────────────────────────────
export function DrawOfferPrompt({ copy, pending, onRespond }: { copy: FootballGridCopy; pending: boolean; onRespond: (accept: boolean) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      role="dialog"
      aria-live="assertive"
      className="mt-3 rounded-2xl border-2 border-brand-orange bg-brand-orange/10 p-3 text-center"
    >
      <p className="font-poppins text-sm font-black uppercase tracking-wide text-brand-orange">{copy.drawOfferTitle}</p>
      <p className="mt-1 font-poppins text-[12px] font-semibold text-white/70">{copy.drawOfferBody}</p>
      <div className="mt-2.5 flex gap-2">
        <button type="button" disabled={pending} onClick={() => onRespond(true)} className="h-10 flex-1 rounded-xl bg-brand-green font-poppins text-xs font-black uppercase text-white hover:bg-brand-green-deep disabled:opacity-50">{copy.acceptDraw}</button>
        <button type="button" disabled={pending} onClick={() => onRespond(false)} className="h-10 flex-1 rounded-xl border-2 border-white/15 font-poppins text-xs font-black uppercase text-white/80 hover:bg-white/5 disabled:opacity-50">{copy.declineDraw}</button>
      </div>
    </motion.div>
  );
}

// ── Between games of a series ──────────────────────────────────────────────────
export function SeriesSplash({
  result,
  selfUserId,
  selfName,
  selfCustomization,
  opponent,
  countdownSeconds,
  copy,
}: {
  result: FootballGridLastGameResult;
  selfUserId: string | null;
  selfName: string;
  selfCustomization: Parameters<typeof AvatarDisplay>[0]['customization'];
  opponent: OpponentInfo | null;
  countdownSeconds: number | null;
  copy: FootballGridCopy;
}) {
  const series = result.series;
  const myWins = selfUserId ? series.wins[selfUserId] ?? 0 : 0;
  const theirWins = opponent ? series.wins[opponent.id] ?? 0 : 0;
  const gameTitle = !result.winnerUserId
    ? fill(copy.gameDrawn, { n: series.gameIndex })
    : result.winnerUserId === selfUserId
      ? fill(copy.gameWon, { n: series.gameIndex })
      : fill(copy.gameLost, { n: series.gameIndex });
  const lead = myWins === theirWins ? copy.seriesLevel : myWins > theirWins ? copy.seriesLead : copy.seriesTrail;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface-page-alt bg-cover bg-center bg-no-repeat px-5 py-10 text-center font-poppins text-white" style={GRID_BACKGROUND_STYLE}>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">{fill(copy.gameOf, { n: series.gameIndex + 1, m: 3 })}</p>
      <h1 className={cn('mt-2 text-[2.2rem] font-black uppercase leading-[1.2] sm:text-[2.8rem]', !result.winnerUserId ? 'text-brand-yellow' : result.winnerUserId === selfUserId ? 'text-brand-green' : 'text-brand-red')}>
        {gameTitle}
      </h1>
      {completionNote(result.completionReason, result.winnerUserId === selfUserId, !result.winnerUserId, copy) && (
        <p className="mt-1 text-sm font-semibold text-white/60">{completionNote(result.completionReason, result.winnerUserId === selfUserId, !result.winnerUserId, copy)}</p>
      )}
      <div className="mt-7 grid w-full max-w-md grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 flex-col items-center gap-2">
          <AvatarDisplay customization={selfCustomization} size="lg" shape="square" assetResolver={resolveGridAvatarAsset} />
          <span className="w-full truncate text-sm font-semibold uppercase">{selfName}</span>
        </div>
        <div className="flex h-[51px] min-w-[120px] items-center justify-center rounded-[20px] bg-brand-blue px-6 text-[32px] font-semibold tabular-nums">
          {myWins}<span className="mx-1.5 text-white/60">–</span>{theirWins}
        </div>
        <div className="flex min-w-0 flex-col items-center gap-2">
          <AvatarDisplay customization={opponent?.avatarCustomization ?? { base: opponent?.avatarUrl ?? undefined }} size="lg" shape="square" className="-scale-x-100" assetResolver={resolveGridAvatarAsset} />
          <span className="w-full truncate text-sm font-semibold uppercase">{opponent?.username ?? copy.opponent}</span>
        </div>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-brand-yellow">{lead}</p>
      <div className="mt-8 flex items-center gap-2 text-white/60">
        {countdownSeconds !== null ? (
          <span className="font-poppins text-3xl font-black tabular-nums text-brand-yellow">{countdownSeconds}</span>
        ) : (
          <>
            <LoaderCircle className="size-4 animate-spin text-brand-yellow" aria-hidden="true" />
            <span className="text-sm font-semibold">{copy.nextGameSoon}</span>
          </>
        )}
      </div>
    </main>
  );
}

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
const GRID_BACKGROUND_STYLE = { backgroundImage: `url(${GRID_BACKGROUND})` };
/** Mode accent — matches the Tic Tac Toe card on /play (colors.red.mid). */
const GRID_ACCENT = '#E04242';
const FOOTBALL_GRID_BOARD_REVEAL_MS = 3_000;

const resolveGridAvatarAsset = (asset: string) => footballGridAssetUrl(asset) ?? GRID_AVATAR_FALLBACK;

/** Fixed roster the opponent card cycles through while searching (deterministic — no hydration drift). */
const SEARCH_CYCLE_AVATARS: AvatarCustomization[] = [
  { skin: 'skin_male_white', hair: 'hair_ronaldo_goat', jersey: 'jersey_real' },
  { skin: 'skin_male_dark', hair: 'hair_cornrows', jersey: 'jersey_barcelona' },
  { skin: 'skin_male_white_alt', hair: 'hair_wave', jersey: 'jersey_liverpool', facialHair: 'beard' },
  { skin: 'skin_male_dark_alt', hair: 'hair_buzz', jersey: 'jersey_brazil_retro' },
  { skin: 'skin_male_white', hair: 'hair_curly_crop', jersey: 'jersey_milan', glasses: 'glasses_wayfarer' },
  { skin: 'skin_male_dark', hair: 'hair_hamsik', jersey: 'jersey_psg_retro' },
];

// The board assembles during the 5s pre-match countdown: headers and cells
// pop in one by one (mount-time stagger — the board is hidden behind the
// loading overlay until the countdown phase reveals it).
const BOARD_BUILD_CONTAINER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
} as const;
const BOARD_BUILD_ITEM = {
  hidden: { opacity: 0, scale: 0.5, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 26 } },
} as const;

function CriterionHeader({
  criterion,
  locale,
  axis,
}: {
  criterion: FootballGridCriterionView;
  locale: Locale;
  axis: 'column' | 'row';
}) {
  const label = locale === 'ka' ? criterion.labelKa || criterion.labelEn : criterion.labelEn;
  const portrait = criterion.family === 'manager' || criterion.family === 'teammate';
  if (axis === 'row') {
    return (
      <div
        title={label}
        className="flex min-w-0 items-center justify-center overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-b from-brand-blue to-brand-blue/75 p-1.5 shadow-[0_10px_24px_rgba(11,51,190,.28)]"
      >
        <span className={cn('grid size-11 place-items-center sm:size-14', portrait && 'overflow-hidden rounded-full')}>
          <CriterionAsset criterion={criterion} className={portrait ? 'size-full' : 'size-9 sm:size-11'} />
        </span>
        <span className="sr-only">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex min-h-[78px] min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] border border-yellow-200/40 bg-gradient-to-b from-brand-yellow-soft to-brand-yellow px-1.5 py-2 text-center shadow-[0_10px_24px_rgba(255,214,0,.13)] sm:min-h-[82px]">
      <span className={cn('grid size-11 place-items-center sm:size-12', portrait && 'overflow-hidden rounded-full')}>
        <CriterionAsset criterion={criterion} className={portrait ? 'size-full' : 'size-9 sm:size-10'} />
      </span>
      <span lang={locale} className="line-clamp-3 hyphens-auto break-words font-poppins text-[9px] font-black uppercase leading-[1.1] text-black/80 [overflow-wrap:anywhere] sm:text-[10px]">{label}</span>
    </div>
  );
}

function FootballGridPortrait({
  source,
  className,
}: {
  source: string | null | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = footballGridAssetUrl(source);
  if (!resolved || failed) {
    return (
      <span aria-hidden="true" className={cn('grid place-items-center rounded-full bg-white/10 text-white/55 ring-2 ring-white/15', className)}>
        <UserRound className="size-1/2" />
      </span>
    );
  }
  return (
    <img
      src={resolved}
      alt=""
      className={cn('rounded-full object-cover ring-2 ring-white/25', className)}
      onError={() => setFailed(true)}
    />
  );
}

function ClaimedCell({ claim, isMine, claimedLabel }: { claim: FootballGridClaimState; isMine: boolean; claimedLabel: string }) {
  return (
    <motion.div
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-1 overflow-hidden p-1"
    >
      <FootballGridPortrait
        source={claim.imageUrl}
        className="size-11 shadow-[0_5px_15px_rgba(0,0,0,.35)] sm:size-12"
      />
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
  locale: Locale;
  selectedCell: number | null;
  onSelect: (cell: number) => void;
}) {
  const claims = useMemo(() => new Map(state.claims.map((claim) => [claim.cellIndex, claim])), [state.claims]);
  const isMyTurn = state.phase === 'turn' && state.currentPlayerUserId === selfUserId;
  return (
    <motion.div
      variants={BOARD_BUILD_CONTAINER}
      initial="hidden"
      // Held hidden while the loading overlay covers the screen; the switch to
      // the countdown phase reveals the board and fires the build-in stagger.
      animate={state.phase === 'handoff' || state.phase === 'loading' ? 'hidden' : 'visible'}
      className="grid grid-cols-[50px_repeat(3,minmax(0,1fr))] gap-2 sm:grid-cols-[64px_repeat(3,minmax(0,1fr))]"
    >
      <div />
      {state.board.columns.map((criterion) => <CriterionHeader key={criterion.id} criterion={criterion} locale={locale} axis="column" />)}
      {state.board.rows.flatMap((row, rowIndex) => [
        <CriterionHeader key={`row-${row.id}`} criterion={row} locale={locale} axis="row" />,
        ...state.board.columns.map((column, columnIndex) => {
          const cellIndex = rowIndex * 3 + columnIndex;
          const claim = claims.get(cellIndex);
          const selectable = isMyTurn && !claim;
          return (
            <motion.button
              key={`${row.id}-${column.id}`}
              variants={BOARD_BUILD_ITEM}
              type="button"
              disabled={!selectable}
              onClick={() => onSelect(cellIndex)}
              aria-label={`${locale === 'ka' ? row.labelKa : row.labelEn} × ${locale === 'ka' ? column.labelKa : column.labelEn}`}
              className={cn(
                'relative aspect-square overflow-hidden rounded-[18px] border-2 p-1 text-center transition-colors sm:rounded-[20px]',
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
            </motion.button>
          );
        }),
      ])}
    </motion.div>
  );
}

/** Ranked-style animated reward chips (spring-in, rolling counter, shine). */
export function GridRewardChips({ xp, tp, coins }: { xp: number; tp: number; coins: number }) {
  if (xp <= 0 && tp <= 0 && coins <= 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {xp > 0 && <RewardChip amount={xp} delay={0.7} bg="#1CB0F6" suffix="XP" />}
      {tp > 0 && <RewardChip amount={tp} delay={0.9} bg="#58CC02" suffix="TP" />}
      {coins > 0 && <CoinRewardChip amount={coins} delay={1.1} />}
    </div>
  );
}

export function ResultSampleGallery({
  samples,
  board,
  locale,
  title,
  body,
}: {
  samples: FootballGridCompletedPayload['samples'];
  board: FootballGridState['board'];
  locale: Locale;
  title: string;
  body: string;
}) {
  const shown = samples.slice(0, 3);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSample = shown[Math.min(activeIndex, Math.max(0, shown.length - 1))];
  const labelFor = (criterion: FootballGridCriterionView) => (
    locale === 'ka' ? criterion.labelKa || criterion.labelEn : criterion.labelEn
  );

  const renderCard = (sample: (typeof shown)[number]) => {
    const row = board.rows[Math.floor(sample.cellIndex / 3)];
    const column = board.columns[sample.cellIndex % 3];
    return (
      <article
        key={sample.cellIndex}
        className="relative overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-b from-brand-blue to-brand-blue/75 p-3 shadow-[0_10px_28px_rgba(11,51,190,.3)]"
      >
        <div className="flex items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-yellow font-poppins text-xs font-black text-black shadow-[0_6px_18px_rgba(255,229,0,.3)] sm:size-10">
            {sample.cellIndex + 1}
          </span>
          <p className="line-clamp-3 pt-0.5 font-poppins text-[11px] font-black uppercase leading-tight text-white/80 sm:text-xs">
            {row && column ? `${labelFor(row)} × ${labelFor(column)}` : `#${sample.cellIndex + 1}`}
          </p>
        </div>
        <div className="mt-3 space-y-2">
          {sample.players.slice(0, 3).map((answerItem) => (
            <div key={answerItem.playerId} className="flex min-w-0 items-center gap-2.5 rounded-[18px] bg-black/25 p-1.5 pr-2.5">
              <FootballGridPortrait
                source={answerItem.imageUrl ?? answerItem.imageAssetKey}
                className="size-12 shrink-0 bg-surface-input shadow-[0_5px_16px_rgba(0,0,0,.3)] sm:size-14"
              />
              <span className="line-clamp-2 min-w-0 font-poppins text-[11px] font-bold leading-tight text-white/90 sm:text-xs">
                {answerItem.name}
              </span>
            </div>
          ))}
        </div>
      </article>
    );
  };

  return (
    <section className="mt-7 text-left">
      <div className="px-1">
        <h2 className="font-poppins text-sm font-black uppercase tracking-wide text-white/75">{title}</h2>
        <p className="mt-1 text-xs font-semibold text-white/35">{body}</p>
      </div>
      {/* Mobile: one card + segmented switcher (same pattern as the auction
          squad-pitch tabs) instead of three stacked cards. */}
      <div className="mt-4 sm:hidden">
        {shown.length > 1 && (
          <div className="mx-auto mb-3 flex max-w-[240px] rounded-full bg-white/[0.06] p-1">
            {shown.map((sample, index) => (
              <button
                key={sample.cellIndex}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-pressed={index === activeIndex}
                className={cn(
                  'min-w-0 flex-1 rounded-full px-2 py-1.5 font-poppins text-[11px] font-black uppercase transition-colors',
                  index === activeIndex ? 'bg-brand-yellow text-black' : 'text-white/60',
                )}
              >
                {sample.cellIndex + 1}
              </button>
            ))}
          </div>
        )}
        {activeSample && renderCard(activeSample)}
      </div>
      {/* Desktop: full 3-up grid. */}
      <div className="mt-4 hidden gap-3 sm:grid sm:grid-cols-3">
        {shown.map(renderCard)}
      </div>
    </section>
  );
}

/** Three dots that fade in sequence — the "opponent is thinking" pulse. */
function ThinkingDots() {
  return (
    <span aria-hidden className="ml-0.5 inline-flex gap-[3px]">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="size-[3px] self-center rounded-full bg-current"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: index * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

/** Loads the release roster once per page and keeps it for every turn. */
function useGridTypeaheadRoster(): GridTypeaheadPreparedPlayer[] {
  const [roster, setRoster] = useState<GridTypeaheadPreparedPlayer[]>([]);
  useEffect(() => {
    let cancelled = false;
    let timerId: number | null = null;
    // An empty roster means the fetch failed with nothing stored (typically a
    // session still being recovered); the loader does not cache that, so a
    // few spaced retries pick it up without a remount.
    const attempt = (retriesLeft: number) => {
      void loadGridTypeaheadRoster().then((players) => {
        if (cancelled) return;
        if (players.length > 0) setRoster(players);
        else if (retriesLeft > 0) timerId = window.setTimeout(() => attempt(retriesLeft - 1), 4_000);
      });
    };
    attempt(3);
    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, []);
  return roster;
}

export function FootballGridTurnPanel({
  state,
  locale,
  isMyTurn,
  selectedCell,
  answer,
  onAnswerChange,
  onSubmit,
  pending = false,
  feedback,
  reportableAttempt,
  alreadyReported = false,
  onReport,
  onCancel,
}: {
  state: FootballGridState;
  locale: Locale;
  isMyTurn: boolean;
  selectedCell: number | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending?: boolean;
  feedback?: FootballGridCommandResultPayload['outcome'];
  reportableAttempt?: string | null;
  alreadyReported?: boolean;
  onReport?: (attemptId: string) => void;
  onCancel?: () => void;
}) {
  const copy = FOOTBALL_GRID_COPY[locale];
  const roster = useGridTypeaheadRoster();
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const suggestions = useMemo(() => (
    pending || suggestionsDismissed ? [] : searchGridPlayers(roster, answer, locale === 'es' ? 'en' : locale, 6)
  ), [roster, answer, locale, pending, suggestionsDismissed]);

  // Picking a suggestion FILLS the box; the player still presses submit. The
  // list spans the whole roster (it cannot be filtered to the cell's valid
  // answers without handing out the answers), so auto-submitting turned a
  // mistaken tap into an instantly spent turn — "Neymar" is one keystroke away
  // on an Arsenal x France cell.
  const pickSuggestion = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    const text = locale === 'ka' && suggestion.nameKa ? suggestion.nameKa : suggestion.nameEn;
    setSuggestionsDismissed(true);
    setHighlightIndex(-1);
    onAnswerChange(text);
  };

  const handleAnswerChange = (value: string) => {
    setSuggestionsDismissed(false);
    setHighlightIndex(-1);
    onAnswerChange(value);
  };

  const handleAnswerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === 'Enter' && highlightIndex >= 0) {
      event.preventDefault();
      pickSuggestion(highlightIndex);
    } else if (event.key === 'Escape') {
      setSuggestionsDismissed(true);
      setHighlightIndex(-1);
    }
  };
  const selectedRow = selectedCell === null ? null : state.board.rows[Math.floor(selectedCell / 3)];
  const selectedColumn = selectedCell === null ? null : state.board.columns[selectedCell % 3];
  const cellPicked = selectedCell !== null && Boolean(selectedRow) && Boolean(selectedColumn);
  // The form no longer remounts per cell, so refocus the box on every pick.
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (isMyTurn && cellPicked) answerInputRef.current?.focus();
  }, [cellPicked, isMyTurn, selectedCell]);
  // iOS lays fixed elements against the layout viewport, so the on-screen
  // keyboard would cover the sheet's buttons; track the visual viewport instead.
  const [keyboardInset, setKeyboardInset] = useState(0);
  useEffect(() => {
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!viewport || !(isMyTurn && cellPicked)) return;
    const update = () => setKeyboardInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    const frame = window.requestAnimationFrame(update);
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      window.cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      setKeyboardInset(0);
    };
  }, [cellPicked, isMyTurn]);

  const criterionLabel = (criterion: FootballGridCriterionView) => (
    locale === 'ka' ? criterion.labelKa || criterion.labelEn : criterion.labelEn
  );

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
            <span className="inline-flex items-baseline font-poppins text-sm font-black uppercase tracking-wide text-brand-red-soft">
              <span aria-hidden>{copy.opponentThinking.replace(/[….]+$/, '')}</span>
              <ThinkingDots />
              <span className="sr-only">{copy.opponentThinking}</span>
            </span>
          </motion.div>
        ) : (
          <motion.div key="my-turn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
            {!cellPicked && (
              <p className="font-poppins text-[11px] font-bold uppercase tracking-wide text-white/60">{copy.tapCellHint}</p>
            )}
            <div className="mt-2 min-h-4 font-poppins text-[11px] font-bold">
              {feedback === 'correct' && <span className="text-brand-green-light"><Check className="mr-1 inline size-3.5" />{copy.correct}</span>}
              {feedback === 'wrong' && <span className="text-brand-red-soft">{copy.wrong}</span>}
              {feedback === 'ambiguous' && <span className="text-brand-yellow">{copy.ambiguous}</span>}
              {feedback === 'already_used' && <span className="text-brand-red-soft">{copy.alreadyUsed}</span>}
            </div>
            {reportableAttempt && feedback !== 'correct' && feedback !== 'pass' && !feedback?.startsWith('draw_') && onReport && (
              <button
                type="button"
                disabled={alreadyReported}
                onClick={() => onReport(reportableAttempt)}
                className="mt-1 w-full text-center font-poppins text-[10px] font-bold text-white/40 underline decoration-white/20 underline-offset-4 disabled:no-underline"
              >
                {alreadyReported ? copy.reported : copy.report}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player search sheet — slides up from the bottom once a cell is picked
          (Tiki-Taka-Toe style): criteria recap, search box, inline suggestions,
          cancel + submit. Closes when the turn resolves or the player cancels. */}
      <AnimatePresence>
        {isMyTurn && cellPicked && selectedRow && selectedColumn && (
          <motion.div
            key="answer-sheet"
            className="fixed inset-x-0 top-0 z-[100] flex items-end justify-center sm:items-center"
            style={{ bottom: keyboardInset }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onKeyDown={(event) => {
              // Escape closes the sheet once the suggestion list is already gone.
              if (event.key === 'Escape' && suggestions.length === 0) { event.preventDefault(); onCancel?.(); }
            }}
          >
            <button type="button" aria-label={copy.cancelPick} onClick={onCancel} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
            <motion.form
              role="dialog"
              aria-modal="true"
              onSubmit={(event) => { if (!cellPicked) { event.preventDefault(); return; } onSubmit(event); }}
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 48, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className={cn(
                'relative w-full max-w-md rounded-t-3xl border-t-2 bg-surface-card-deep px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-2xl shadow-black/50 sm:rounded-3xl sm:border-2 sm:pb-4',
                feedback === 'wrong' || feedback === 'already_used' ? 'border-brand-red/70' : 'border-white/10',
              )}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
              <div className="flex min-w-0 items-center justify-center gap-2">
                <CriterionAsset key={`row-${selectedRow.id}`} criterion={selectedRow} className="size-7 shrink-0" />
                <span className="truncate font-poppins text-xs font-black uppercase text-white">{criterionLabel(selectedRow)}</span>
                <span className="font-poppins text-sm font-black text-white/35">×</span>
                <CriterionAsset key={`col-${selectedColumn.id}`} criterion={selectedColumn} className="size-7 shrink-0" />
                <span className="truncate font-poppins text-xs font-black uppercase text-white">{criterionLabel(selectedColumn)}</span>
              </div>
              <input
                ref={answerInputRef}
                autoFocus
                value={answer}
                onChange={(event) => handleAnswerChange(event.target.value)}
                onKeyDown={handleAnswerKeyDown}
                placeholder={copy.answerPlaceholder}
                maxLength={100}
                autoComplete="off"
                role="combobox"
                aria-expanded={suggestions.length > 0}
                aria-controls="grid-typeahead-listbox"
                className="mt-3 h-12 w-full rounded-xl border-none bg-brand-blue px-3 text-base font-bold text-white outline-none placeholder:text-white/60"
              />
              <ul
                id="grid-typeahead-listbox"
                role="listbox"
                className={cn('mt-2 max-h-56 overflow-y-auto rounded-xl bg-white/[0.04]', suggestions.length === 0 && 'hidden')}
              >
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion.id} role="option" aria-selected={index === highlightIndex}>
                    <button
                      type="button"
                      onMouseDown={(event) => { event.preventDefault(); pickSuggestion(index); }}
                      onMouseEnter={() => setHighlightIndex(index)}
                      className={cn(
                        'flex w-full items-baseline justify-between gap-2 border-b border-white/5 px-3 py-3 text-left last:border-b-0',
                        index === highlightIndex ? 'bg-brand-blue/40' : 'hover:bg-white/5',
                      )}
                    >
                      <span className="truncate font-poppins text-sm font-bold text-white">
                        {locale === 'ka' && suggestion.nameKa ? suggestion.nameKa : suggestion.nameEn}
                      </span>
                      {locale === 'ka' && suggestion.nameKa && (
                        <span className="shrink-0 font-poppins text-[10px] font-semibold text-white/40">{suggestion.nameEn}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="h-12 flex-1 rounded-xl border-2 border-white/15 font-poppins text-xs font-black uppercase tracking-wide text-white/80 hover:bg-white/5"
                >
                  {copy.cancelPick}
                </button>
                <button
                  type="submit"
                  disabled={!answer.trim() || pending}
                  className="h-12 flex-[1.4] rounded-xl bg-brand-green font-poppins text-xs font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green-deep disabled:opacity-50"
                >
                  {pending ? <LoaderCircle className="mx-auto size-5 animate-spin" /> : copy.submit}
                </button>
              </div>
            </motion.form>
          </motion.div>
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
  opponent,
  countdownSeconds = null,
  queuedAt = null,
  onCancel,
  copy,
}: {
  playerName: string;
  avatar: string;
  customization?: Parameters<typeof AvatarDisplay>[0]['customization'] | null;
  status: 'idle' | 'searching' | 'pairing' | 'matched';
  opponent?: OpponentInfo | null;
  /** Kickoff countdown (seconds). When set, replaces the mini-grid animation — ranked-showdown style. */
  countdownSeconds?: number | null;
  /** Server queue time; a restored/reloaded search resumes its clock instead of restarting at 0:00. */
  queuedAt?: string | null;
  onCancel: () => void;
  copy: FootballGridCopy;
}) {
  const paired = status === 'pairing' || status === 'matched';
  const [cycleIndex, setCycleIndex] = useState(0);
  useEffect(() => {
    if (opponent || paired) return;
    const interval = window.setInterval(() => setCycleIndex((index) => (index + 1) % SEARCH_CYCLE_AVATARS.length), 650);
    return () => window.clearInterval(interval);
  }, [opponent, paired]);
  // Elapsed search clock (ranked/auction parity): starts when the search
  // screen mounts, freezes once an opponent is locked in.
  // Stamped inside the effect: Date.now() during render is impure (and lints).
  const searchStartRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (opponent || paired) return;
    const queuedAtMs = queuedAt ? Date.parse(queuedAt) : Number.NaN;
    searchStartRef.current ??= Number.isFinite(queuedAtMs) ? Math.min(queuedAtMs, Date.now()) : Date.now();
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - (searchStartRef.current ?? Date.now())) / 1000));
    }, 500);
    return () => window.clearInterval(interval);
  }, [opponent, paired, queuedAt]);
  const elapsedLabel = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
  const opponentCustomization = opponent
    ? opponent.avatarCustomization ?? { base: opponent.avatarUrl ?? undefined }
    : SEARCH_CYCLE_AVATARS[cycleIndex];
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-surface-page-alt bg-cover bg-center bg-no-repeat px-5 py-10 text-white" style={GRID_BACKGROUND_STYLE}>
      <div className="relative z-10 w-full max-w-xl text-center">
        <h1 className="text-3xl font-black uppercase tracking-tight sm:text-5xl">{opponent || status === 'pairing' ? copy.ready : copy.searching}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55 sm:text-base">{opponent ? copy.getReady : status === 'pairing' ? copy.matching : copy.searchingBody}</p>
        {!opponent && !paired && (
          <p className="mt-2 font-poppins text-lg font-black tabular-nums text-white/70">{elapsedLabel}</p>
        )}

        <div className="relative mx-auto my-10 grid max-w-sm grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="rounded-[28px] bg-brand-blue p-4 shadow-[0_14px_40px_rgba(22,69,255,.35)]">
            <AvatarDisplay customization={customization ?? { base: avatar }} size="lg" className="mx-auto" assetResolver={resolveGridAvatarAsset} />
            <p className="mt-2 truncate text-sm font-black text-white">{playerName}</p>
          </div>
          <div className="relative z-10 grid place-items-center">
            <motion.div
              className="relative grid size-12 place-items-center rounded-full bg-white text-lg font-black text-surface-page shadow-[0_10px_30px_rgba(0,0,0,.4)]"
              animate={opponent ? { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] } : { scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            >
              VS
            </motion.div>
          </div>
          <div className="relative overflow-hidden rounded-[28px] bg-brand-yellow p-4 text-surface-page shadow-[0_14px_40px_rgba(255,229,0,.22)]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={opponent ? 'opponent' : paired ? 'silhouette' : cycleIndex}
                initial={{ opacity: 0, rotateY: 90, scale: 0.8 }}
                animate={{ opacity: opponent ? 1 : 0.85, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, rotateY: -90, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                style={{ transformPerspective: 600 }}
              >
                <AvatarDisplay
                  customization={opponentCustomization}
                  size="lg"
                  className={cn('mx-auto -scale-x-100', !opponent && paired && 'opacity-50 brightness-0')}
                  assetResolver={resolveGridAvatarAsset}
                />
              </motion.div>
            </AnimatePresence>
            {opponent ? (
              <p className="mt-2 truncate text-sm font-black">{opponent.username}</p>
            ) : (
              <div className="mx-auto mt-3 h-3 w-20 animate-pulse rounded-full bg-black/15" />
            )}
          </div>
        </div>

        {countdownSeconds !== null ? (
          <div className="mb-9 grid h-24 place-items-center">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={countdownSeconds}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="text-7xl font-black tabular-nums text-brand-yellow"
              >
                {countdownSeconds}
              </motion.p>
            </AnimatePresence>
          </div>
        ) : (
          <div className="mx-auto mb-9 grid w-36 grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, index) => (
              <motion.span
                key={index}
                className="aspect-square rounded-lg bg-white/[0.06]"
                animate={{
                  backgroundColor: ['rgba(255,255,255,.06)', index % 2 ? '#1645ff' : '#ffe500', 'rgba(255,255,255,.06)'],
                  scale: [1, 1.12, 1],
                }}
                transition={{ repeat: Infinity, duration: 1.8, delay: (index % 3) * 0.14 + Math.floor(index / 3) * 0.14, ease: 'easeInOut' }}
              />
            ))}
          </div>
        )}

        {!opponent && (
          <button type="button" onClick={onCancel} className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-bold text-white/70 transition hover:bg-white/5 hover:text-white">
            {copy.cancel}
          </button>
        )}
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
    <main className="grid min-h-dvh place-items-center bg-surface-page-alt bg-cover bg-center bg-no-repeat px-5 text-center text-white" style={GRID_BACKGROUND_STYLE}>
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

export function PhaseOverlay({ state, remaining, copy, selfDisconnected = false }: { state: FootballGridState; remaining: number; copy: FootballGridCopy; selfDisconnected?: boolean }) {
  if (state.phase === 'turn' || state.phase === 'terminal') return null;
  const isPaused = state.phase === 'paused';
  const isInterrupted = state.phase === 'service_interruption';
  // A pause always means someone lost presence. If OUR transport is degraded,
  // we are (or may be) the absent one — otherwise it is the opponent, and the
  // grace copy tells the waiting player they win on timeout (ranked parity).
  const pausedTitle = selfDisconnected ? copy.selfDisconnected : copy.opponentDisconnected;
  const pausedBody = selfDisconnected ? copy.selfDisconnectedBody : copy.opponentDisconnectedBody;
  const title = isInterrupted ? copy.interrupted : isPaused ? pausedTitle : state.phase === 'countdown' ? copy.getReady : state.phase === 'handoff' ? copy.ready : copy.loading;
  const body = isInterrupted ? copy.interruptedBody : isPaused ? pausedBody : null;
  // Paused matches carry a hard reconnect deadline — show it ticking down so the
  // waiting player knows how long the match can stay frozen (parity with ranked).
  const pausedSeconds = isPaused ? Math.max(0, Math.ceil(remaining / 1_000)) : null;

  // Paused / interrupted use the ranked "waiting for ready" card treatment,
  // tinted with the mode's own accent (the Tic Tac Toe card colour on /play).
  if (isPaused || isInterrupted) {
    return (
      <div className="absolute inset-0 z-30 grid place-items-center bg-surface-page-alt/55 px-6 text-center backdrop-blur-[1.5px]">
        <motion.div
          initial={{ y: 12, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 25 }}
          className="relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-[20px] px-6 py-7 shadow-2xl sm:px-7"
          style={{ backgroundColor: GRID_ACCENT }}
        >
          <div className="font-poppins text-[11px] font-black uppercase leading-tight tracking-[0.2em] text-white/70">
            {copy.title}
          </div>
          <div className="mt-2 max-w-[18rem] text-balance font-poppins text-2xl font-black uppercase leading-tight text-white">
            {title}
          </div>
          <div className="mt-5 flex size-20 items-center justify-center rounded-full border border-white/20 bg-black/15">
            {isInterrupted ? (
              <AlertTriangle className="size-9 text-white" />
            ) : (
              <span className="font-poppins text-3xl font-black tabular-nums text-white">{pausedSeconds}</span>
            )}
          </div>
          {!isInterrupted && (
            <div className="mt-3 font-poppins text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
              {copy.reconnectWindow}
            </div>
          )}
          {body && (
            <div className="mt-4 max-w-[17rem] text-balance font-poppins text-sm font-semibold leading-snug text-white/85">
              {body}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Countdown: keep the board VISIBLE — it is assembling underneath (the
  // build-in stagger) — and float the get-ready banner above it instead of
  // blurring everything out.
  if (state.phase === 'countdown') {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center">
        <motion.div
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          className="flex items-center gap-3 rounded-2xl bg-black/60 px-5 py-2.5 shadow-xl shadow-black/30 backdrop-blur-sm"
        >
          <span className="font-poppins text-sm font-black uppercase tracking-wide text-white">{title}</span>
          <span className="font-poppins text-2xl font-black tabular-nums text-brand-yellow">{Math.max(1, Math.ceil(remaining / 1_000))}</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-surface-page-alt/85 px-6 text-center backdrop-blur-md">
      <div>
        <LoaderCircle className="mx-auto mb-4 size-12 animate-spin text-brand-blue-light" />
        <h2 className="text-2xl font-black uppercase text-white">{title}</h2>
      </div>
    </div>
  );
}

function completionTitle(
  reason: FootballGridCompletionReason | null,
  won: boolean,
  draw: boolean,
  copy: FootballGridCopy,
  series?: FootballGridSeriesInfo | null,
  selfUserId?: string | null,
) {
  if (reason === 'administrative_cancel') return copy.interrupted;
  if (series?.finished && series.format === 'bo3') {
    if (!series.winnerUserId) return copy.seriesDraw;
    return series.winnerUserId === selfUserId ? copy.seriesWin : copy.seriesLoss;
  }
  if (draw) return copy.resultDraw;
  return won ? copy.resultWin : copy.resultLoss;
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

// Why the match ended, when it didn't play out on the board (ranked parity:
// a forfeit/disconnect win should never look like an earned 0:0).
function completionNote(reason: FootballGridCompletionReason | null, won: boolean, draw: boolean, copy: FootballGridCopy) {
  switch (reason) {
    case 'forfeit':
      return won ? copy.noteOpponentLeft : copy.noteYouLeft;
    case 'disconnect_timeout':
      return won ? copy.noteOpponentDisconnected : copy.noteYouDisconnected;
    case 'no_action_timeouts':
      return won ? copy.noteOpponentIdle : copy.noteYouIdle;
    case 'board_dead':
      return copy.noteBoardDead;
    case 'draw_agreed':
      return copy.noteDrawAgreed;
    case 'loading_no_show':
      // No winner means neither side was credited; blaming "you" would be wrong
      // for the player who did join in time.
      if (draw) return copy.noteNoShow;
      return won ? copy.noteOpponentNoShow : copy.noteYouNoShow;
    case 'simultaneous_disconnect':
      return copy.noteBothDisconnected;
    default:
      return null;
  }
}

export function FootballGridFlowScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const copy = FOOTBALL_GRID_COPY[locale];
  const contentLocale = locale === 'es' ? 'en' : locale;
  const { player } = usePlayer();
  const authUser = useAuthStore((current) => current.user);
  const authStatus = useAuthStore((current) => current.status);
  const selfUserId = authUser?.id ?? null;
  const source = searchParams.get('source') === 'friend_lobby' ? 'friend_lobby' : 'matchmaking';
  const packParam = searchParams?.get('pack') ?? null;
  const theme = ['european', 'england', 'spain', 'italy', 'germany', 'france', 'brazil', 'turkey', 'argentina', 'georgia'].includes(packParam ?? '')
    ? packParam!
    : 'european';
  const boardPreload = useFootballGridBoardPreload(useFootballGridStore((current) => current.state));
  const grid = useRealtimeFootballGrid({
    enabled: authStatus === 'authenticated' && Boolean(selfUserId),
    selfUserId,
    locale: contentLocale,
    theme,
    autoStart: source === 'matchmaking',
    assetsReady: boardPreload.ready,
  });
  useFootballGridAnalytics({
    selfUserId,
    theme,
    search: grid.search,
    state: grid.state,
    opponent: grid.opponent,
    series: grid.series,
    completed: grid.completed,
    commandResult: grid.commandResult,
  });
  useFootballGridAudio({
    search: grid.search,
    state: grid.state,
    commandResult: grid.commandResult,
    enabled: authStatus === 'authenticated',
  });
  const connectionHealth = useRealtimeConnectionHealth();
  const connectionDegraded =
    connectionHealth.phase === 'reconnecting' || connectionHealth.phase === 'disconnected' || connectionHealth.phase === 'error';
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [showQuit, setShowQuit] = useState(false);
  // The match this player has already seen the showdown intro for.
  const [showdownMatchId, setShowdownMatchId] = useState<string | null>(null);
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
  const remaining = useRemaining(
    grid.state?.turnDeadlineAt ?? grid.state?.phaseDeadlineAt ?? grid.state?.reconnectDeadlineAt ?? null,
    grid.serverTimeOffsetMs,
  );
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
    if (grid.actions.submitAnswer(selectedCell, answer)) {
      statsRef.current.answers += 1;
      setAnswer('');
    }
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
    return <SearchScreen playerName={player.username} avatar={player.avatar} customization={player.avatarCustomization} status={grid.search.state} queuedAt={grid.search.queuedAt} onCancel={handleCancel} copy={copy} />;
  }

  // The server countdown is 8 s: the kickoff gate holds for the first 5, then
  // the board mounts and builds in over the last 3 before the first turn.
  // A missing/zero deadline means "no countdown data": show the board rather than a frozen gate.
  const boardRevealing = grid.state?.phase === 'countdown' && (remaining <= 0 || remaining <= FOOTBALL_GRID_BOARD_REVEAL_MS);
  const gateSeconds = Math.max(1, Math.ceil((remaining - FOOTBALL_GRID_BOARD_REVEAL_MS) / 1_000));
  if (grid.state && (grid.state.phase === 'handoff' || grid.state.phase === 'loading' || (grid.state.phase === 'countdown' && !boardRevealing))) {
    const firstGame = (grid.series?.gameIndex ?? 1) === 1;
    if (firstGame && grid.opponent && showdownMatchId !== grid.state.matchId) {
      const opponent = grid.opponent;
      const matchId = grid.state.matchId;
      return (
        <ShowdownScreen
          matchType="friendly"
          playerUsername={player.username}
          playerAvatar={player.avatar}
          opponentUsername={opponent.username}
          opponentAvatar={opponent.avatarUrl ?? ''}
          onComplete={() => setShowdownMatchId(matchId)}
          playerInfo={{
            username: player.username,
            avatar: player.avatar,
            avatarCustomization: player.avatarCustomization,
            level: player.level,
          }}
          opponentInfo={{
            username: opponent.username,
            avatar: opponent.avatarUrl ?? '',
            avatarCustomization: opponent.avatarCustomization,
            isAi: opponent.isAiOpponent,
            pingMs: opponent.pingMs,
          }}
        />
      );
    }
    if (grid.lastGameResult && grid.series && grid.lastGameResult.series.seriesId === grid.series.seriesId) {
      return (
        <SeriesSplash
          result={grid.lastGameResult}
          selfUserId={selfUserId}
          selfName={player.username}
          selfCustomization={player.avatarCustomization ?? { base: player.avatar }}
          opponent={grid.opponent}
          countdownSeconds={grid.state.phase === 'countdown' ? gateSeconds : null}
          copy={copy}
        />
      );
    }
    return (
      <>
        {/* The pre-board screens froze silently when the transport dropped
            (observed: countdown stuck at 1) — surface the drop here too. */}
        {connectionDegraded && (
          <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center">
            <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-1.5 shadow-lg backdrop-blur-sm">
              <LoaderCircle className="size-3.5 animate-spin text-brand-yellow" aria-hidden="true" />
              <span className="font-poppins text-[11px] font-black uppercase tracking-wide text-white">{copy.reconnectingStrip}</span>
            </div>
          </div>
        )}
        {/* Ranked's kickoff gate: tier-framed avatars with ready ticks, 5 s puck. */}
        <KickoffCountdownOverlay
          countdownDisplay={grid.state.phase === 'countdown' ? gateSeconds : 5}
          phase="kickoff"
          waiting={grid.state.phase !== 'countdown'}
          waitingLabel={copy.ready}
          durationMs={5_000}
          runKey={`${grid.state.matchId}:${grid.state.phase}`}
          playerName={player.username}
          opponentName={grid.opponent?.username ?? copy.opponent}
          playerAvatarBase={player.avatar}
          opponentAvatarBase={grid.opponent?.avatarUrl ?? undefined}
          playerAvatarCustomization={player.avatarCustomization}
          opponentAvatarCustomization={grid.opponent?.avatarCustomization ?? null}
          playerRankPoints={player.rankPoints ?? null}
          opponentRankPoints={grid.opponent?.rp ?? null}
          playerReady={grid.state.phase === 'countdown' || Boolean(grid.state.players.find((p) => p.userId === selfUserId)?.ready)}
          opponentReady={grid.state.phase === 'countdown' || Boolean(grid.state.players.find((p) => p.userId !== selfUserId)?.ready)}
          className="h-dvh min-h-dvh w-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
        />
      </>
    );
  }

  if (grid.completed && grid.state?.phase === 'terminal' && grid.lastGameResult && grid.lastGameResult.matchId === grid.completed.matchId) {
    return (
      <SeriesSplash
        result={grid.lastGameResult}
        selfUserId={selfUserId}
        selfName={player.username}
        selfCustomization={player.avatarCustomization ?? { base: player.avatar }}
        opponent={grid.opponent}
        countdownSeconds={null}
        copy={copy}
      />
    );
  }

  if (grid.completed && grid.state?.phase === 'terminal') {
    const won = grid.state.winnerUserId === selfUserId;
    const draw = !grid.state.winnerUserId;
    const seriesDone = grid.completed.series?.finished && grid.completed.series.format === 'bo3' ? grid.completed.series : null;
    const myClaims = seriesDone
      ? (selfUserId ? seriesDone.wins[selfUserId] ?? 0 : 0)
      : grid.state.claims.filter((claim) => claim.claimantUserId === selfUserId).length;
    const theirClaims = seriesDone
      ? (grid.opponent ? seriesDone.wins[grid.opponent.id] ?? 0 : 0)
      : grid.state.claims.length - myClaims;
    const rematchPending = grid.rematch?.status === 'pending';
    const accepted = Boolean(grid.rematch?.acceptedUserIds.includes(selfUserId));
    return (
      <main className="min-h-dvh overflow-y-auto bg-surface-page-alt bg-cover bg-center bg-no-repeat px-5 py-10 text-white" style={GRID_BACKGROUND_STYLE}>
        <div className="mx-auto max-w-3xl text-center font-poppins">
          <div className="mx-auto max-w-xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">{copy.title}</p>
          <h1
            className={cn(
              'mt-2 font-poppins text-[2.5rem] font-black uppercase leading-[1.3] tracking-[0] sm:text-[3rem]',
              seriesDone
                ? (!seriesDone.winnerUserId ? 'text-brand-yellow' : seriesDone.winnerUserId === selfUserId ? 'text-brand-green' : 'text-brand-red')
                : won ? 'text-brand-green' : draw ? 'text-brand-yellow' : 'text-brand-red',
            )}
          >
            {completionTitle(grid.state.completionReason, won, draw, copy, grid.completed.series, selfUserId)}
          </h1>
          {completionNote(grid.state.completionReason, won, draw, copy) && (
            <p className="mt-1 font-poppins text-sm font-semibold text-white/60">
              {completionNote(grid.state.completionReason, won, draw, copy)}
            </p>
          )}

          {/* Player · score · opponent — mirrors the ranked results hero. */}
          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
            <div className="flex min-w-0 flex-col items-center gap-2">
              <AvatarDisplay
                customization={player.avatarCustomization ?? { base: player.avatar }}
                size="lg"
                shape="square"
                assetResolver={resolveGridAvatarAsset}
              />
              <span className="w-full truncate text-sm font-semibold uppercase text-white">{player.username}</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex h-[44px] min-w-[110px] items-center justify-center rounded-[20px] bg-brand-blue px-5 text-2xl font-semibold tabular-nums text-white sm:h-[51px] sm:min-w-[133px] sm:px-6 sm:text-[36px]">
                <AnimatedCounter from={0} to={myClaims} delay={0.25} />
                <span className="mx-1 sm:mx-1.5">:</span>
                <AnimatedCounter from={0} to={theirClaims} delay={0.25} />
              </div>
            </div>

            <div className="flex min-w-0 flex-col items-center gap-2">
              <AvatarDisplay
                customization={grid.opponent?.avatarCustomization ?? { base: grid.opponent?.avatarUrl ?? undefined }}
                size="lg"
                shape="square"
                className="-scale-x-100"
                assetResolver={resolveGridAvatarAsset}
              />
              <span className="w-full truncate text-sm font-semibold uppercase text-white">{grid.opponent?.username ?? copy.opponent}</span>
            </div>
          </div>

          {grid.completed.rewards && (
            <GridRewardChips
              xp={grid.completed.rewards.xp}
              tp={grid.completed.rewards.tp ?? 0}
              coins={grid.completed.rewards.coins}
            />
          )}
          </div>

          {grid.completed.samples.length > 0 && (
            <ResultSampleGallery
              samples={grid.completed.samples}
              board={grid.state.board}
              locale={locale}
              title={copy.sampleAnswers}
              body={copy.sampleAnswersBody}
            />
          )}

          <div className="mx-auto mt-7 max-w-xl space-y-3">
            {rematchPending && (
              <button type="button" disabled={accepted} onClick={grid.actions.acceptRematch} className="w-full rounded-2xl bg-brand-green px-6 py-4 font-black uppercase text-white transition-colors hover:bg-brand-green-deep disabled:opacity-60">
                {accepted ? copy.waitingRematch : copy.rematch}
              </button>
            )}
            {/* Hide "find new" while a rematch window is live or the series
                has already started its next match, so a public search cannot
                race the pending rematch handoff. */}
            {source === 'matchmaking' && (!grid.rematch || grid.rematch.status === 'declined' || grid.rematch.status === 'expired') && (
              <button type="button" onClick={handleFindNew} className="w-full rounded-2xl bg-brand-green px-6 py-4 font-black uppercase text-white transition-colors hover:bg-brand-green-deep">{copy.newOpponent}</button>
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
  return (
    <>
      <MiniGameShell
        title={copy.title}
        accent="#1CB0F6"
        hideHeader
        disclaimer={false}
        backgroundImageUrl={GRID_BACKGROUND}
        wide
        scrollable
      >
        <div className="mx-auto mt-14 flex w-full max-w-[26rem] flex-1 flex-col sm:mt-16 sm:max-w-[28rem]">
        <GridHud
          selfRankPoints={player.rankPoints ?? null}
          opponentRankPoints={grid.opponent?.rp ?? null}
          state={state}
          series={grid.series}
          selfUserId={selfUserId}
          selfName={player.username}
          selfCustomization={player.avatarCustomization ?? { base: player.avatar }}
          opponent={grid.opponent}
          remaining={remaining}
          isMyTurn={isMyTurn}
          copy={copy}
          pendingCommand={Boolean(grid.pendingCommandId)}
          myOfferPending={state.drawOffer?.byUserId === selfUserId}
          onSkip={handlePass}
          onOfferDraw={() => { grid.actions.offerDraw(); }}
        />
        <AnimatePresence>
          {state.drawOffer && state.drawOffer.byUserId !== selfUserId && state.phase === 'turn' && (
            <DrawOfferPrompt key="draw-offer" copy={copy} pending={Boolean(grid.pendingCommandId)} onRespond={(accept) => { grid.actions.respondToDraw(accept); }} />
          )}
        </AnimatePresence>
        <div className="mt-3" />
        <MatchBoard state={state} selfUserId={selfUserId} locale={locale} selectedCell={selectedCell} onSelect={(cell) => { statsRef.current.selections += 1; setSelectedCell(cell); setAnswer(''); grid.actions.clearCommandFeedback(); }} />
          <FootballGridTurnPanel
            state={state}
            locale={locale}
            isMyTurn={isMyTurn}
            selectedCell={selectedCellIsClaimed ? null : selectedCell}
            answer={answer}
            onAnswerChange={setAnswer}
            onSubmit={handleSubmit}
            onCancel={() => { setSelectedCell(null); setAnswer(''); }}
            pending={Boolean(grid.pendingCommandId)}
            feedback={feedback}
            reportableAttempt={reportableAttempt}
            alreadyReported={alreadyReported}
            onReport={grid.actions.reportMissingAnswer}
          />
        {grid.error && <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-center text-xs font-bold text-red-200">{grid.error.message}</div>}
          {/* Non-blocking transport warning during live play (auction parity):
              the paused overlay only appears once the SERVER pauses the match,
              which lags the local drop — this strip covers that gap. */}
          {connectionDegraded && state.phase !== 'paused' && (
            <div className="pointer-events-none absolute inset-x-0 top-2 z-40 flex justify-center">
              <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-1.5 shadow-lg backdrop-blur-sm">
                <LoaderCircle className="size-3.5 animate-spin text-brand-yellow" aria-hidden="true" />
                <span className="font-poppins text-[11px] font-black uppercase tracking-wide text-white">{copy.reconnectingStrip}</span>
              </div>
            </div>
          )}
          <PhaseOverlay state={state} remaining={remaining} copy={copy} selfDisconnected={connectionDegraded} />
        </div>
      </MiniGameShell>
      <AuctionLeaveControl ariaLabel={copy.quit} onClick={() => setShowQuit(true)} />
      <AuctionAudioControl />
      <QuitMatchModal open={showQuit} onOpenChange={setShowQuit} onConfirm={() => { setShowQuit(false); grid.actions.forfeit(); }} description={copy.quit} />
    </>
  );
}
