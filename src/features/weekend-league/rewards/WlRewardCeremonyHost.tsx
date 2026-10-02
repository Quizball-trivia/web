"use client";

import { useEffect, useId, useRef } from "react";

import { wlAwardWeekLabel } from "@/components/shared/WlChampionAchievementCard";
import { useLocale } from "@/contexts/LocaleContext";
import { useMyEventAwards } from "@/lib/queries/eventAwards.queries";
import { useAckWlReward, useMyWlRewards } from "@/lib/queries/wlRewards.queries";
import { useAuthStore } from "@/stores/auth.store";

import { rewardSession, useRewardSessionVersion } from "./rewardSession";
import { useWlRewardPresenter } from "./useWlRewardPresenter";
import { WlRewardCeremony } from "./WlRewardCeremony";

const EXPECTED_POLL_MS = 5000;

/**
 * Reveals an unopened Weekend League reward on the next visit (a winner who
 * was offline, or who left before opening it on the result screen). Closing
 * it is remembered at once and acknowledged to the server, so it plays once.
 */
export function WlRewardCeremonyHost() {
  const { locale } = useLocale();
  const token = useId();
  useRewardSessionVersion();
  const { data: rewards, refetch, dataUpdatedAt } = useMyWlRewards();
  const badges = useMyEventAwards();
  const { mutate: ack } = useAckWlReward();

  // A tournament that just ended still owes this player a receipt: keep
  // checking, even though they have left the result screen.
  const expected = rewardSession.expected();
  const expectedKey = expected.join(",");
  useEffect(() => {
    if (!expectedKey) return;
    const poll = window.setInterval(() => {
      // Pruning publishes when the last expectation times out, which re-renders
      // this host and clears the interval.
      rewardSession.pruneExpected();
      if (rewardSession.expected().length > 0 && useAuthStore.getState().status === "authenticated") {
        void refetch();
      }
    }, EXPECTED_POLL_MS);
    return () => window.clearInterval(poll);
  }, [expectedKey, refetch]);
  // Also when an expectation appears for a receipt that is already here
  // (re-entering a finished tournament): nothing to wait for.
  useEffect(() => {
    for (const reward of rewards ?? []) rewardSession.fulfil(reward.tournamentId);
  }, [rewards, expectedKey]);

  // Closed here earlier but the server never heard (offline, failed request):
  // keep it closed, and tell the server again on every fresh fetch until it
  // sticks. Keyed on the fetch time, so one failed retry does not end it.
  const retriedAt = useRef(new Map<string, number>());
  useEffect(() => {
    for (const reward of rewards ?? []) {
      if (reward.seen || !rewardSession.isDismissed(reward.id)) continue;
      // Already accepted by the server: a fetch that still says "unseen" is
      // lagging, and answering it again would loop.
      if (rewardSession.isAcknowledged(reward.id)) continue;
      if (retriedAt.current.get(reward.id) === dataUpdatedAt) continue;
      retriedAt.current.set(reward.id, dataUpdatedAt);
      ack(reward.id);
    }
  }, [rewards, dataUpdatedAt, ack]);

  const revealable = (rewards ?? []).filter(
    (reward) => !reward.seen
      && !rewardSession.isDismissed(reward.id)
      && !rewardSession.isInlineOwned(reward.tournamentId),
  );
  // Stay on the receipt already being revealed: another one arriving in a
  // refetch must wait its turn, not interrupt and later restart this one.
  const revealingId = rewardSession.claimedReceipt(token);
  const pending = revealable.find((reward) => reward.id === revealingId) ?? revealable[0];
  const { customization, equip, acknowledge } = useWlRewardPresenter(pending);

  // The podium badge ceremony goes first. Wait for its data to load (so this
  // never starts and then gets interrupted) and for the player to close every
  // unseen badge; whether a badge's own acknowledgement reached the server is
  // not our concern. Decided from the badge data itself, not from a flag set
  // in another component's effect, so the order effects run in cannot matter.
  // "Settled" means not fetching right now: cached badge data from an earlier
  // visit must not let the reward start while a fresher badge is on its way.
  // Once this reveal is on screen it stays; a later badge waits behind it.
  const pendingId = pending?.id ?? null;
  const claimedBy = rewardSession.claimedBy();
  const badgesSettled = badges.isError || (badges.isFetched && !badges.isFetching && !badges.isStale);
  const badgeWaiting = (badges.data ?? []).some((award) => !award.seen && !rewardSession.isBadgeDismissed(award.id));
  const ready = Boolean(pending) && (claimedBy === token || (badgesSettled && !badgeWaiting));
  // A reward that turns up long after the badges were last loaded: refresh
  // them first rather than wait forever on data that has gone stale.
  const refetchBadges = badges.refetch;
  const badgesNeedRefresh = Boolean(pending) && badges.isStale && !badges.isFetching && !badges.isError;
  useEffect(() => {
    if (badgesNeedRefresh) void refetchBadges();
  }, [badgesNeedRefresh, refetchBadges]);

  // One reveal on screen per page: take the slot when it is free, give it
  // back when there is nothing to show or this host goes away.
  useEffect(() => {
    if (ready && pendingId) {
      // Free slot, or moving on to the next receipt after closing one.
      if (claimedBy === null || (claimedBy === token && revealingId !== pendingId)) {
        rewardSession.claim(pendingId, token);
      }
    } else if (claimedBy === token) {
      rewardSession.release(token);
    }
  }, [ready, pendingId, claimedBy, revealingId, token]);
  useEffect(() => () => rewardSession.release(token), [token]);

  if (!pending || !ready || revealingId !== pending.id) return null;

  return (
    <WlRewardCeremony
      key={pending.id}
      receipt={pending}
      open
      customization={customization}
      weekLabel={pending.weekKey ? wlAwardWeekLabel(`weekend-league-${pending.weekKey}`, locale) : undefined}
      onEquip={equip}
      onClose={acknowledge}
    />
  );
}
