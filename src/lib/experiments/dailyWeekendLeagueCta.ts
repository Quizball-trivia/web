export type DailyWeekendLeagueCtaState = 'qualifying' | 'qualified' | 'entered';
export type DailyWeekendLeagueCtaAction = 'play_ranked' | 'join_league' | 'view_league';

export const DEFAULT_WEEKEND_LEAGUE_QP_TARGET = 200;

export interface DailyWeekendLeagueCtaDecision {
  state: DailyWeekendLeagueCtaState;
  action: DailyWeekendLeagueCtaAction;
  currentQp: number;
  targetQp: number;
  nextPath: string;
}

export function resolveDailyWeekendLeagueCta({
  points,
  target,
  qualified,
  entered,
  tournamentStatus,
}: {
  points?: number | null;
  target?: number | null;
  qualified?: boolean | null;
  entered?: boolean | null;
  tournamentStatus?: string | null;
}): DailyWeekendLeagueCtaDecision {
  const currentQp = Math.max(0, points ?? 0);
  const targetQp = Math.max(1, target ?? DEFAULT_WEEKEND_LEAGUE_QP_TARGET);
  const isEntered = entered ?? false;
  const isQualified = qualified ?? currentQp >= targetQp;
  const state: DailyWeekendLeagueCtaState = isEntered
    ? 'entered'
    : isQualified
      ? 'qualified'
      : 'qualifying';
  const canEnter = tournamentStatus === 'entry_open' && !isEntered;
  const action: DailyWeekendLeagueCtaAction = state === 'qualifying'
    ? 'play_ranked'
    : canEnter
      ? 'join_league'
      : 'view_league';

  return {
    state,
    action,
    currentQp,
    targetQp,
    nextPath: action === 'play_ranked'
      ? '/play?mode=ranked&source=daily-weekend-league'
      : '/events?tab=weekend-league&source=daily-completion',
  };
}
