import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Trophy, Gavel } from 'lucide-react';
import { useRecentMatches } from '@/lib/queries/stats.queries';
import { COLLAPSED_MATCHES_COUNT, MAX_MATCHES_COUNT } from '@/lib/constants/matches';
import { formatMatchScore } from '@/utils/matchScore';
import { TierFrameAvatar } from '@/components/TierFrameAvatar';
import { buildProfileNavTarget } from '@/lib/hooks/useProfileNavigation';
import { useLocale } from '@/contexts/LocaleContext';

const rowBorder = (result: string) => {
  if (result === 'win') return 'border-brand-green';
  if (result === 'loss') return 'border-brand-red-deep';
  return 'border-brand-slate-deep';
};

const rpPillTone = (result: string) => {
  if (result === 'win') return 'bg-brand-green-deep text-white';
  if (result === 'loss') return 'bg-brand-red-rust text-white';
  return 'bg-brand-slate-deep text-white';
};

const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

interface HomeRecentMatchesProps {
  /** If true, only show collapsed count without expand option */
  collapsedOnly?: boolean;
}

export function HomeRecentMatches({ collapsedOnly = false }: HomeRecentMatchesProps) {
  const { t } = useLocale();
  const router = useRouter();
  const fetchCount = collapsedOnly ? COLLAPSED_MATCHES_COUNT : MAX_MATCHES_COUNT;
  const { data: recentMatches = [], isLoading, error } = useRecentMatches(fetchCount);
  const [isExpanded, setIsExpanded] = useState(false);

  const matches = useMemo(() =>
    recentMatches.map((match) => {
      const formatted = formatMatchScore(match);
      const isAuction = match.mode === 'auction';
      const modeLabel = isAuction
        ? t('recentMatches.modeAuction')
        : match.mode === 'ranked'
          ? t('recentMatches.modeRanked')
          : t('recentMatches.modeFriendly');
      return {
        id: match.matchId,
        result: match.result,
        opponent: match.opponent.username,
        opponentId: match.opponent.id,
        opponentIsAi: match.opponent.isAi,
        avatarUrl: match.opponent.avatarUrl,
        avatarCustomization: match.opponent.avatarCustomization,
        opponentTier: match.opponent.tier,
        isAuction,
        modeLabel,
        modeKind: match.mode,
        placement: match.placement,
        playerCount: match.playerCount,
        opponents: match.opponents,
        competition: match.competition,
        rpDelta: match.rpDelta,
        score: formatted.score,
        scoreSuffix: formatted.suffix,
        scoreBadge: formatted.badgeI18nKey ? t(formatted.badgeI18nKey) : formatted.badge,
        scoreBadgeVariant: formatted.badgeVariant,
        time: match.timeLabel,
      };
    }),
    [recentMatches, t]
  );

  const { visibleMatches, hiddenCount, canExpand } = useMemo(() => {
    const visible = isExpanded || collapsedOnly
      ? matches
      : matches.slice(0, COLLAPSED_MATCHES_COUNT);
    const hidden = matches.length - visible.length;
    return {
      visibleMatches: visible,
      hiddenCount: hidden,
      canExpand: !collapsedOnly && matches.length > COLLAPSED_MATCHES_COUNT,
    };
  }, [matches, isExpanded, collapsedOnly]);

  return (
    <div className="font-fun">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-poppins text-base text-white uppercase">
          {t('recentMatches.title')}
        </h2>
        <button
          type="button"
          onClick={() => router.push('/profile')}
          className="font-poppins flex items-center justify-center w-[120px] h-[40px] rounded-xl border-2 border-brand-green-light text-xs text-white uppercase tracking-wide hover:bg-brand-green-light/10 transition-colors"
        >
          {t('common.viewAll')}
        </button>
      </div>

      {/* Match rows */}
      <div className="space-y-2.5">
        {isLoading && (
          <div className="p-4 rounded-2xl bg-surface-card text-sm font-bold text-brand-slate">
            {t('recentMatches.loading')}
          </div>
        )}
        {!isLoading && error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-4 rounded-2xl bg-brand-red-soft/10 text-sm font-bold text-brand-red-soft"
          >
            {t('recentMatches.loadFailed')}
          </div>
        )}
        {!isLoading && !error && matches.length === 0 && (
          <div className="p-4 rounded-2xl bg-surface-card text-sm font-bold text-brand-slate">
            {t('recentMatches.empty')}
          </div>
        )}
        {!isLoading && !error && visibleMatches.map((match) => {
          const nav = buildProfileNavTarget(router, match.opponentId, match.opponentIsAi);
          return (
          <div
            key={match.id}
            {...nav.handlers}
            className={`flex items-center gap-3 rounded-[16px] min-h-[76px] md:min-h-[82px] px-4 md:px-5 border-2 bg-surface-row-deep ${rowBorder(match.result)} ${nav.className}`}
          >
            {/* Avatar — rank frame using the opponent's real tier; falls back to
                a neutral frame until the backend supplies opponent.tier. */}
            <TierFrameAvatar
              tier={match.opponentTier ?? 'Academy'}
              avatarCustomization={match.avatarCustomization ?? { base: match.avatarUrl ?? undefined }}
              size="sm"
              className="shrink-0"
            />

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="font-poppins text-[12px] md:text-[14px] font-semibold leading-none text-white uppercase truncate">
                {match.isAuction && match.opponents.length > 0
                  ? t('recentMatches.vs', { opponent: match.opponents.map((o) => o.username).join(', ') })
                  : t('recentMatches.vs', { opponent: match.opponent })}
              </div>
              {/* Mode label — larger, with a mode icon (trophy / gavel). */}
              <div className="mt-1.5 flex items-center gap-1.5 font-poppins text-[11px] md:text-[12px] font-bold leading-none tracking-[0.06em] text-white/85 uppercase">
                {match.isAuction ? (
                  <Gavel className="size-3.5 text-brand-yellow" />
                ) : match.modeKind === 'ranked' ? (
                  <Trophy className="size-3.5 text-brand-yellow" />
                ) : null}
                <span>{match.modeLabel}</span>
                <span className="text-white/40">· {match.time}</span>
              </div>
            </div>

            {/* RP + Score */}
            <div className="ml-auto flex items-center justify-end gap-3 md:gap-5 shrink-0 whitespace-nowrap">
              {/* Auction has no score/RP — show finishing placement ("1st of 3"). */}
              {match.isAuction ? (
                <span
                  className={`rounded-[8px] px-3 py-2 font-poppins text-[12px] md:text-[13px] font-black uppercase leading-none tabular-nums ${rpPillTone(match.result)}`}
                >
                  {match.placement
                    ? t('recentMatches.placementOf', {
                        place: ordinal(match.placement),
                        total: match.playerCount,
                      })
                    : '—'}
                </span>
              ) : match.competition === 'placement' ? (
                <span className="rounded-[8px] bg-white/10 px-3 py-2 font-poppins text-[10px] md:text-[11px] font-semibold uppercase leading-none text-white/70">
                  {t('recentMatches.placementMatch')}
                </span>
              ) : match.competition !== 'friendly' && match.rpDelta !== null ? (
                <span className={`rounded-[8px] px-3 py-2 font-poppins text-[10px] md:text-[11px] font-semibold leading-none tabular-nums ${rpPillTone(match.result)}`}>
                  {match.rpDelta >= 0 ? '+' : ''}{match.rpDelta} RP
                </span>
              ) : null}
              {/* Score (goals / points) — not shown for auction, which uses placement. */}
              {!match.isAuction && (
                <div className="flex items-center gap-1.5">
                  <span className="font-poppins text-[20px] md:text-[22px] font-semibold leading-none text-white tabular-nums">
                    {match.score}
                  </span>
                  {match.scoreSuffix && (
                    <span className="font-poppins text-[10px] md:text-[11px] font-medium text-white/70">
                      {match.scoreSuffix}
                    </span>
                  )}
                  {match.scoreBadge && (
                    <span className={`rounded-[8px] px-2 py-1 font-poppins text-[9px] md:text-[10px] font-semibold uppercase ${
                      match.scoreBadgeVariant === 'red'
                        ? 'bg-brand-red-rust-deep text-brand-red-light'
                        : 'bg-white/10 text-white/70'
                    }`}>
                      {match.scoreBadge}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          );
        })}

        {/* Expand/Collapse toggle — compact pill, mostly transparent. */}
        {!isLoading && !error && canExpand && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-slate transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="size-3.5" />
                  {t('recentMatches.showLess')}
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" />
                  {t('recentMatches.showMore', { count: hiddenCount })}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
