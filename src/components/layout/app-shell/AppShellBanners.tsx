'use client';

/**
 * The six match/lobby banners that sit at the top of the main scroll
 * area in both desktop and mobile layouts. Each layout uses subtly
 * different sizing (px-6/px-4, h-9/h-10, side-by-side vs stacked
 * buttons), so this component takes a `variant` prop and switches
 * the relevant class slices.
 *
 * Order matters and must match the original AppShell:
 *   1. Forfeit pending
 *   2. Completed match
 *   3. Draft
 *   4. Rejoin (active or rejoin-available)
 *   5. Lobby (friendly)
 *   6. Ranked lobby
 *
 * Visibility is driven entirely by the view-model's show* flags.
 */

import { ArrowRight, Gamepad2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/contexts/LocaleContext';
import { formatRejoinCopy } from './appShell.helpers';
import type { useAppShellViewModel } from './useAppShellViewModel';

type AppShellViewModel = ReturnType<typeof useAppShellViewModel>;

interface AppShellBannersProps {
  variant: 'desktop' | 'mobile';
  vm: AppShellViewModel;
}

export function AppShellBanners({ variant, vm }: AppShellBannersProps) {
  const { t } = useLocale();
  const isDesktop = variant === 'desktop';
  const pad = isDesktop ? 'px-6 pt-4' : 'px-4 pt-4';
  const card = isDesktop ? 'px-5 py-4' : 'px-4 py-3';
  const iconSize = isDesktop ? 'size-10' : 'size-9';
  const iconGlyph = isDesktop ? 'size-5' : 'size-4';
  const btnH = isDesktop ? 'h-9' : 'h-10';
  const rowLayout = isDesktop ? 'flex-wrap items-center justify-between gap-3' : 'flex-col gap-3';
  const buttonRow = isDesktop ? 'flex items-center gap-2' : 'flex gap-2';
  const buttonExtra = isDesktop ? '' : 'flex-1';
  const arrow = <ArrowRight className="ml-2 size-4" />;
  const xIcon = <X className="ml-2 size-4" />;

  const {
    activeDraftBanner,
    activeMatchBanner,
    completedMatchBanner,
    forfeitPending,
    partyDropout,
    forfeitPendingTitle,
    forfeitPendingDescription,
    completedByForfeit,
    completedPartyQuiz,
    rejoinReconnectsLeft,
    lobby,
    lobbyCode,
    draftOpponent,
    socketConnected,
    showLobbyBanner,
    showRankedLobbyBanner,
    showDraftBanner,
    showRejoinBanner,
    showCompletedMatchBanner,
    showForfeitPendingBanner,
    showPartyDropoutBanner,
    handleReturnToLobby,
    handleReturnToRankedLobby,
    handleLeaveLobby,
    handleRejoinMatch,
    handleReturnToDraft,
    handleForfeitRejoin,
    handleViewCompletedMatch,
    handleDismissCompletedMatch,
    handleDismissPartyDropout,
  } = vm;

  const matchFinishedLabel = isDesktop ? 'appShell.matchFinishedAgainst' : 'appShell.matchFinishedVs';
  const completedDescKey = completedPartyQuiz
    ? (isDesktop ? 'appShell.partyQuizFinishedDesc' : 'appShell.partyQuizFinishedCompactDesc')
    : completedByForfeit
      ? (isDesktop ? 'appShell.completedByForfeit' : 'appShell.completedByForfeitCompact')
      : (isDesktop ? 'appShell.viewFinalResult' : 'appShell.matchFinishedCompactDesc');
  const draftActiveKey = isDesktop ? 'appShell.draftActiveAgainst' : 'appShell.draftActiveVs';
  const draftDescKey = isDesktop ? 'appShell.returnToCategoryBanning' : 'appShell.returnToCategoryBanningShort';
  const rejoinActiveKey = isDesktop ? 'appShell.matchStillActiveAgainst' : 'appShell.matchActiveVs';
  const rejoinDescKey = isDesktop ? 'appShell.returnToLiveMatch' : 'appShell.returnToContinue';
  const rejoinLabel = isDesktop ? 'appShell.rejoinMatch' : 'appShell.rejoin';
  const rankedDescKey = isDesktop
    ? 'appShell.returnToMatchmakingOrLeave'
    : 'appShell.returnToMatchmakingOrLeaveShort';
  const rankedReturnLabel = isDesktop ? 'appShell.returnToMatchmaking' : 'appShell.return';
  const lobbyReturnLabel = isDesktop ? 'appShell.returnToLobby' : 'appShell.return';
  const completedDismissLabel = isDesktop ? 'Dismiss' : t('appShell.dismiss');

  return (
    <>
      {showForfeitPendingBanner && forfeitPending && (
        <div className={pad}>
          <div className={`rounded-2xl border-2 border-brand-red-soft bg-brand-red-soft/10 ${card}`}>
            <div className={isDesktop ? 'flex flex-wrap items-center justify-between gap-3' : 'flex items-center gap-3'}>
              <div className="flex items-center gap-3">
                <div className={`${iconSize} rounded-full bg-brand-red-soft/20 text-brand-red-soft flex items-center justify-center`}>
                  <Gamepad2 className={iconGlyph} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{forfeitPendingTitle}</p>
                  <p className="text-xs text-white/70">{forfeitPendingDescription}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPartyDropoutBanner && partyDropout && (
        <div className={pad}>
          <div className={`rounded-2xl border-2 border-brand-orange bg-brand-orange/10 ${card}`}>
            <div className={`flex ${rowLayout}`}>
              <div className="flex items-center gap-3">
                <div className={`${iconSize} rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center`}>
                  <Gamepad2 className={iconGlyph} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t('appShell.partyQuizLeft')}</p>
                  <p className="text-xs text-white/70">{partyDropout.message || t('appShell.partyQuizLeftDesc')}</p>
                </div>
              </div>
              <Button
                size="sm"
                className={`${btnH} bg-brand-orange text-white hover:bg-brand-orange-light`}
                onClick={handleDismissPartyDropout}
              >
                {t('appShell.dismiss')} {isDesktop && xIcon}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCompletedMatchBanner && (
        <div className={pad}>
          <div className={`rounded-2xl border-2 border-brand-green bg-brand-green/10 ${card}`}>
            <div className={`flex ${rowLayout}`}>
              <div className="flex items-center gap-3">
                <div className={`${iconSize} rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center`}>
                  <Gamepad2 className={iconGlyph} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {completedPartyQuiz ? (
                      t('appShell.partyQuizFinished')
                    ) : (
                      <>
                        {t(matchFinishedLabel)}{' '}
                        <span className="text-white">{completedMatchBanner?.opponent.username ?? t('appShell.opponentFallback')}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-white/70">{t(completedDescKey)}</p>
                </div>
              </div>
              <div className={buttonRow}>
                <Button
                  size="sm"
                  className={`${btnH} ${buttonExtra} bg-brand-green text-white hover:bg-brand-green-deep`}
                  onClick={handleViewCompletedMatch}
                >
                  {t('appShell.viewResults')} {isDesktop && arrow}
                </Button>
                <Button
                  size="sm"
                  className={`${btnH} ${buttonExtra} bg-brand-red-soft text-white hover:bg-brand-red-soft/90`}
                  onClick={handleDismissCompletedMatch}
                >
                  {completedDismissLabel} {isDesktop && xIcon}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDraftBanner && (
        <div className={pad}>
          <div className={`rounded-2xl border-2 border-brand-orange bg-brand-orange/10 ${card}`}>
            <div className={`flex ${rowLayout}`}>
              <div className="flex items-center gap-3">
                <div className={`${iconSize} rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center`}>
                  <Gamepad2 className={iconGlyph} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {t(draftActiveKey)}{' '}
                    <span className="text-white">{activeDraftBanner?.opponent?.username ?? t('appShell.opponentFallback')}</span>
                  </p>
                  <p className="text-xs text-white/70">{t(draftDescKey)}</p>
                </div>
              </div>
              <Button
                size="sm"
                className={`${btnH} bg-brand-orange text-white hover:bg-brand-orange-light`}
                onClick={handleReturnToDraft}
              >
                {t('appShell.returnToDraft')} {isDesktop && arrow}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRejoinBanner && (
        <div className={pad}>
          <div className={`rounded-2xl border-2 border-brand-yellow bg-brand-yellow/10 ${card}`}>
            <div className={`flex ${rowLayout}`}>
              <div className="flex items-center gap-3">
                <div className={`${iconSize} rounded-full bg-brand-yellow/20 text-brand-yellow flex items-center justify-center`}>
                  <Gamepad2 className={iconGlyph} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {t(rejoinActiveKey)}{' '}
                    <span className="text-white">{activeMatchBanner?.opponent.username ?? t('appShell.opponentFallback')}</span>
                  </p>
                  <p className="text-xs text-white/70">
                    {activeMatchBanner?.source === 'rejoin'
                      ? formatRejoinCopy(t, rejoinReconnectsLeft, !isDesktop)
                      : t(rejoinDescKey)}
                  </p>
                </div>
              </div>
              <div className={buttonRow}>
                <Button
                  size="sm"
                  className={`${btnH} ${buttonExtra} bg-brand-yellow text-surface-page hover:bg-brand-yellow-deep`}
                  onClick={handleRejoinMatch}
                >
                  {t(rejoinLabel)} {isDesktop && arrow}
                </Button>
                <Button
                  size="sm"
                  className={`${btnH} ${buttonExtra} bg-brand-red-soft text-white hover:bg-brand-red-soft/90`}
                  onClick={handleForfeitRejoin}
                >
                  {t('appShell.forfeit')} {isDesktop && xIcon}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLobbyBanner && (
        <div className={pad}>
          <div className={`rounded-2xl border-2 border-brand-green bg-brand-green/10 ${card}`}>
            <div className={`flex ${rowLayout}`}>
              <div className="flex items-center gap-3">
                <div className={`${iconSize} rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center`}>
                  <Gamepad2 className={iconGlyph} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {t('appShell.stillInLobby')}{' '}
                    <span className="text-white">{lobby?.displayName ?? t('appShell.lobbyFallback')}</span>
                  </p>
                  <p className="text-xs text-white/70">
                    {t('appShell.code')}{' '}
                    <span className="font-mono font-bold text-white">{lobbyCode || '...'}</span>
                    {!socketConnected && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-yellow/20 px-2 py-0.5 text-[10px] font-semibold text-brand-yellow">
                        {t('appShell.reconnecting')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className={buttonRow}>
                <Button
                  size="sm"
                  className={`${btnH} ${buttonExtra} bg-brand-green text-white hover:bg-brand-green-deep`}
                  onClick={handleReturnToLobby}
                  disabled={!lobbyCode}
                >
                  {t(lobbyReturnLabel)} {isDesktop && arrow}
                </Button>
                <Button
                  size="sm"
                  className={`${btnH} ${buttonExtra} bg-brand-red-soft text-white hover:bg-brand-red-soft/90`}
                  onClick={handleLeaveLobby}
                >
                  {t('appShell.leave')} {isDesktop && xIcon}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRankedLobbyBanner && (
        <div className={pad}>
          <div className={`rounded-2xl border-2 border-brand-blue bg-brand-blue/10 ${card}`}>
            <div className={`flex ${rowLayout}`}>
              <div className="flex items-center gap-3">
                <div className={`${iconSize} rounded-full bg-brand-blue/20 text-brand-blue flex items-center justify-center`}>
                  <Gamepad2 className={iconGlyph} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {t('appShell.rankedMatchPreparing')}
                  </p>
                  <p className="text-xs text-white/70">
                    {draftOpponent
                      ? <>{t('appShell.opponentFound')}<span className="text-white">{draftOpponent.username}</span></>
                      : t(rankedDescKey)}
                    {!socketConnected && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-yellow/20 px-2 py-0.5 text-[10px] font-semibold text-brand-yellow">
                        {t('appShell.reconnecting')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className={buttonRow}>
                <Button
                  size="sm"
                  className={`${btnH} ${buttonExtra} bg-brand-blue text-white hover:bg-brand-blue/90`}
                  onClick={handleReturnToRankedLobby}
                >
                  {t(rankedReturnLabel)} {isDesktop && arrow}
                </Button>
                <Button
                  size="sm"
                  className={`${btnH} ${buttonExtra} bg-brand-red-soft text-white hover:bg-brand-red-soft/90`}
                  onClick={handleLeaveLobby}
                >
                  {t('appShell.leave')} {isDesktop && xIcon}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
