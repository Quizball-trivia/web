'use client';

import { useState } from 'react';
import { Clock3, Search, Swords } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { usePlayer } from '@/contexts/PlayerContext';
import type { FootballGridCriterionView, FootballGridState } from '@/lib/realtime/socket.types';
import {
  FOOTBALL_GRID_COPY,
  MatchBoard,
  PlayerSeat,
  SearchScreen,
} from './FootballGridFlowScreen';

function criterion(
  id: string,
  family: FootballGridCriterionView['family'],
  labelEn: string,
  labelKa: string,
  assetKey: string,
): FootballGridCriterionView {
  return { id, key: id, family, labelEn, labelKa, assetKey, difficulty: 'normal' };
}

const PREVIEW_STATE: FootballGridState = {
  matchId: 'preview-match',
  status: 'active',
  phase: 'turn',
  board: {
    boardId: 'preview-board',
    boardVersion: 1,
    checksum: 'preview',
    columns: [
      criterion('arsenal', 'club', 'Arsenal', 'არსენალი', 'arsenal'),
      criterion('brazil', 'country', 'Brazil', 'ბრაზილია', 'br'),
      criterion('premier-league', 'league', 'Premier League', 'პრემიერ ლიგა', 'premier-league'),
    ],
    rows: [
      criterion('barcelona', 'club', 'Barcelona', 'ბარსელონა', 'barcelona'),
      criterion('spain', 'country', 'Spain', 'ესპანეთი', 'es'),
      criterion('champions-league', 'trophy_award', 'Champions League winner', 'ჩემპიონთა ლიგის გამარჯვებული', 'champions-league'),
    ],
  },
  players: [
    { userId: 'preview-self', seat: 1, isBot: false, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
    { userId: 'preview-rival', seat: 2, isBot: true, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
  ],
  openerUserId: 'preview-self',
  currentPlayerUserId: 'preview-self',
  winnerUserId: null,
  turnNumber: 4,
  stateVersion: 8,
  claims: [
    { cellIndex: 0, footballPlayerId: 'thierry-henry', displayName: 'Thierry Henry', claimantUserId: 'preview-self', turnNumber: 1 },
    { cellIndex: 4, footballPlayerId: 'sergio-ramos', displayName: 'Sergio Ramos', claimantUserId: 'preview-rival', turnNumber: 2 },
  ],
  phaseDeadlineAt: null,
  turnDeadlineAt: null,
  turnRemainingMs: 16_000,
  pausedAt: null,
  pausedFromPhase: null,
  reconnectDeadlineAt: null,
  completionReason: null,
};

export function FootballGridDevPreview() {
  const { locale } = useLocale();
  const copy = FOOTBALL_GRID_COPY[locale];
  const { player } = usePlayer();
  const [screen, setScreen] = useState<'search' | 'match'>('match');
  const [selectedCell, setSelectedCell] = useState<number | null>(2);

  if (screen === 'search') {
    return (
      <div className="relative">
        <SearchScreen
          playerName={player.username}
          avatar={player.avatar}
          customization={player.avatarCustomization}
          status="searching"
          onCancel={() => setScreen('match')}
          copy={copy}
        />
        <button type="button" onClick={() => setScreen('match')} className="fixed right-4 top-4 z-50 rounded-xl bg-brand-yellow px-4 py-2 text-xs font-black uppercase text-surface-page">
          Board preview
        </button>
      </div>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-surface-page-alt px-3 py-3 text-white sm:px-5 sm:py-5">
      <div className="pointer-events-none fixed inset-0 opacity-50 [background:radial-gradient(circle_at_10%_5%,rgba(22,69,255,.28),transparent_35%),radial-gradient(circle_at_95%_70%,rgba(255,229,0,.08),transparent_32%)]" />
      <div className="relative mx-auto max-w-3xl">
        <header className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => setScreen('search')} className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black uppercase text-white/65"><Search className="size-4" /> Search</button>
          <div className="text-center"><p className="text-xs font-black uppercase tracking-[0.18em] text-brand-yellow">{copy.title}</p><p className="text-[10px] font-bold text-white/35">Visual preview</p></div>
          <div className="flex h-10 min-w-16 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 font-black"><Clock3 className="size-4" />16</div>
        </header>

        <div className="mb-3 flex gap-2">
          <PlayerSeat name={player.username} avatar={player.avatar} customization={player.avatarCustomization} active color="blue" label="You" />
          <PlayerSeat name="Giorgi 10" avatar="avatar-2" active={false} color="yellow" label="Opponent" />
        </div>
        <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
          <p className="font-black uppercase text-brand-yellow">{copy.yourTurn}</p>
          <p className="mt-0.5 text-xs text-white/45">{copy.pickCell}</p>
        </div>
        <MatchBoard state={PREVIEW_STATE} selfUserId="preview-self" locale={locale} selectedCell={selectedCell} onSelect={setSelectedCell} />
        {selectedCell !== null && (
          <div className="sticky bottom-3 z-20 mt-3 rounded-[24px] border border-brand-blue-light bg-surface-page/95 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
            <div className="flex gap-2">
              <input placeholder={copy.answerPlaceholder} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base font-bold outline-none placeholder:text-white/25 focus:border-brand-blue-light" />
              <button type="button" className="rounded-xl bg-brand-blue px-4 font-black uppercase sm:px-6"><Swords className="size-5 sm:hidden" /><span className="hidden sm:inline">{copy.submit}</span></button>
            </div>
            <div className="mt-2 text-right"><button type="button" className="text-xs font-black uppercase text-white/45">{copy.pass}</button></div>
          </div>
        )}
      </div>
    </main>
  );
}
