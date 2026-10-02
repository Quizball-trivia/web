"use client";

import { useEffect, useId, useState } from "react";

import { wlAwardWeekLabel } from "@/components/shared/WlChampionAchievementCard";
import { useLocale } from "@/contexts/LocaleContext";
import { useMyWlRewards } from "@/lib/queries/wlRewards.queries";
import { useAuthStore } from "@/stores/auth.store";

import { rewardSession, useRewardSessionVersion } from "./rewardSession";
import { useWlRewardPresenter } from "./useWlRewardPresenter";
import { WlRewardCeremony } from "./WlRewardCeremony";
import { WlRewardsEarnedCard } from "./WlRewardsEarnedCard";

/** Settlement runs a few seconds after the final. Past this, stop promising a
 *  reward here; the app-wide reveal keeps watching for it. */
const PENDING_WINDOW_MS = 60_000;
/** A little longer than the reveal's closing fade. */
const EXIT_FADE_MS = 320;

/** "Your rewards" on the final result screen, for the tournament just played. */
export function WlFinalRewards({ tournamentId }: { tournamentId: string }) {
  const { locale } = useLocale();
  const token = useId();
  useRewardSessionVersion();
  const [timedOut, setTimedOut] = useState(false);
  /** The receipt the player opened the reveal for, if any. */
  const [openFor, setOpenFor] = useState<string | null>(null);

  const { data: rewards, refetch } = useMyWlRewards();
  const receipt = rewards?.find((reward) => reward.tournamentId === tournamentId);
  const waiting = !receipt && !timedOut;
  const { customization, equip, acknowledge } = useWlRewardPresenter(receipt);

  // While this screen is up it owns the reveal, so the app-wide one stays out.
  useEffect(() => rewardSession.ownInline(tournamentId), [tournamentId]);
  useEffect(() => {
    if (receipt) rewardSession.fulfil(tournamentId);
    else rewardSession.expect(tournamentId);
  }, [receipt, tournamentId]);

  useEffect(() => {
    if (!waiting) return;
    const poll = window.setInterval(() => {
      if (useAuthStore.getState().status === "authenticated") void refetch();
    }, 3000);
    const stop = window.setTimeout(() => setTimedOut(true), PENDING_WINDOW_MS);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stop);
    };
  }, [waiting, refetch]);

  // Shown only for the receipt it was opened for, and only until that receipt
  // is closed anywhere: here, in another tab, or on the server. If the receipt
  // goes away (the account changed), the reveal goes with it.
  const closed = !receipt || receipt.seen || rewardSession.isDismissed(receipt.id);
  // It must also still hold the reveal slot: a receipt that went away and came
  // back (an account switch and back) does not reopen on its own.
  const showing = Boolean(receipt) && openFor === receipt?.id && !closed
    && rewardSession.claimedReceipt(token) === receipt?.id;
  // The slot is handed back once the closing fade has finished, so the next
  // reveal never starts on top of this one.
  useEffect(() => {
    if (showing) return;
    const timer = window.setTimeout(() => rewardSession.release(token), EXIT_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [showing, token]);
  useEffect(() => () => rewardSession.release(token), [token]);

  if (!receipt) return <WlRewardsEarnedCard receipt={undefined} none={!waiting} onOpen={() => undefined} />;

  const weekLabel = receipt.weekKey ? wlAwardWeekLabel(`weekend-league-${receipt.weekKey}`, locale) : undefined;
  return (
    <>
      <WlRewardsEarnedCard
        receipt={{ ...receipt, seen: closed }}
        onOpen={() => { if (rewardSession.claim(receipt.id, token)) setOpenFor(receipt.id); }}
      />
      <WlRewardCeremony
        receipt={receipt}
        open={showing}
        customization={customization}
        weekLabel={weekLabel}
        onEquip={equip}
        onClose={acknowledge}
      />
    </>
  );
}
