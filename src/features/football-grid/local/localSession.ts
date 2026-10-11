import type { GridSoloBoard } from '@/lib/football-grid/soloApi';
import type { FootballGridOption } from '@/lib/realtime/socket.types';
import { recordLocalGame, type LocalGame, type LocalSeat, type LocalSeries, type LocalSettings } from './localGame';

export const LOCAL_SESSION_KEY = 'qb-grid-local-session-v1';

/** The series on screen, kept for this tab so a reload (or a pull to refresh) does not throw the game away. */
export interface LocalSnapshot {
  v: 1;
  stage: 'play' | 'between' | 'done';
  settings: LocalSettings;
  names: Record<LocalSeat, string>;
  deal: GridSoloBoard;
  game: LocalGame;
  series: LocalSeries;
  opener: LocalSeat;
  blocked: Record<LocalSeat, FootballGridOption[]>;
  typing: Record<LocalSeat, boolean>;
  played: string[];
  /** The running turn's clock: which turn it belongs to and when it runs out. A reload does not refill it. */
  deadline: { turn: string; at: number } | null;
}

/**
 * What to keep for the screen as it is now; null when there is nothing worth coming back to. A game that has just
 * ended but is still on screen (its winning line is being shown) is kept as already counted, so a reload in that
 * moment cannot take the win back.
 */
export function localSnapshotOf(screen: Omit<LocalSnapshot, 'v' | 'stage' | 'deal' | 'game'> & { stage: string; deal: GridSoloBoard | null; game: LocalGame | null }): LocalSnapshot | null {
  const { stage, deal, game } = screen;
  if ((stage !== 'play' && stage !== 'between' && stage !== 'done') || !deal || !game) return null;
  if (stage === 'play' && game.endReason) {
    const series = recordLocalGame(screen.series, game, screen.settings.rounds);
    return { ...screen, v: 1, deal, game, series, stage: series.finished ? 'done' : 'between', deadline: null };
  }
  return { ...screen, v: 1, deal, game, stage, deadline: stage === 'play' ? screen.deadline : null };
}

export function parseLocalSnapshot(raw: string | null, now: number): LocalSnapshot | null {
  try {
    const saved = JSON.parse(raw ?? 'null') as LocalSnapshot | null;
    if (!saved || saved.v !== 1 || !saved.deal?.ticket || !saved.game || !saved.series || !saved.settings) return null;
    // A ticket begins with the moment the server stops accepting it; a board that is about to lapse is not resumed.
    if (!(Number(saved.deal.ticket.split('.')[0]) > now + 60_000)) return null;
    return saved;
  } catch {
    return null;
  }
}
