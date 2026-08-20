'use client';

import { FormEvent, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';
import type { FootballGridCriterionView, FootballGridState } from '@/lib/realtime/socket.types';
import { MiniGameShell, StatPill } from '@/features/mini-games/components/MiniGameShell';
import {
  FOOTBALL_GRID_COPY,
  FootballGridTurnPanel,
  MatchBoard,
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
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

  return (
    <MiniGameShell
      title={copy.title}
      subtitle={copy.subtitle}
      accent="#1CB0F6"
      headerRight={<StatPill label={copy.scoreLabel} value="1 · 1" color="#1CB0F6" />}
      onBack={() => setScreen('search')}
      disclaimer={false}
      backgroundImageUrl={footballGridAssetUrl('/assets/bg-pattern.webp')!}
    >
      <div className="mt-2 flex flex-1 flex-col">
        <MatchBoard state={PREVIEW_STATE} selfUserId="preview-self" locale={locale} selectedCell={selectedCell} onSelect={setSelectedCell} />
        <FootballGridTurnPanel
          state={PREVIEW_STATE}
          locale={locale}
          isMyTurn
          selectedCell={selectedCell}
          remaining={16_000}
          answer={answer}
          onAnswerChange={setAnswer}
          onSubmit={handleSubmit}
          onPass={() => { setSelectedCell(null); setAnswer(''); }}
        />
      </div>
    </MiniGameShell>
  );
}
