"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { updateMe } from "@/lib/api/endpoints";
import { customizationFromAvatarValue } from "@/lib/avatars";
import { queryKeys } from "@/lib/queries/queryKeys";
import { useAckWlReward } from "@/lib/queries/wlRewards.queries";
import { useAuthStore } from "@/stores/auth.store";
import type { AvatarCustomization } from "@/types/game";

import { rewardSession } from "./rewardSession";
import type { WlRewardItem, WlRewardReceipt } from "./wlRewards";

/** What a reward reveal needs from the signed-in user: their avatar, an equip
 *  that goes through the normal owned-item profile update, and the ack. */
export function useWlRewardPresenter(receipt: WlRewardReceipt | undefined) {
  const queryClient = useQueryClient();
  const avatarCustomization = useAuthStore((state) => state.user?.avatar_customization);
  const avatarUrl = useAuthStore((state) => state.user?.avatar_url);
  const { mutate: ack } = useAckWlReward();

  const customization = useMemo<AvatarCustomization>(
    () => avatarCustomization ?? customizationFromAvatarValue(avatarUrl),
    [avatarCustomization, avatarUrl],
  );

  // The coins and items are already in the account when a receipt exists, so
  // the navbar wallet and the avatar picker should show them straight away.
  const refreshedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!receipt || refreshedFor.current === receipt.id) return;
    refreshedFor.current = receipt.id;
    void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.store.inventory() });
  }, [receipt, queryClient]);

  const equip = useCallback(async (item: WlRewardItem) => {
    // Read the account at the moment of the tap, and merge the result into
    // whatever it is when the request returns: the profile can change (or the
    // player can sign out) while the save is in flight.
    const before = useAuthStore.getState().user;
    if (!before) throw new Error("Not signed in");
    const current = before.avatar_customization ?? customizationFromAvatarValue(before.avatar_url);
    const next: AvatarCustomization = { ...current, [item.slot]: item.avatarPartId };
    const updated = await updateMe({ avatar_customization: next });
    const latest = useAuthStore.getState();
    if (latest.user && latest.user.id === before.id) {
      latest.setAuthenticated({ ...latest.user, avatar_customization: updated.avatar_customization ?? next });
    }
  }, []);

  const acknowledge = useCallback(() => {
    if (!receipt) return;
    rewardSession.dismiss(receipt.id);
    if (!receipt.seen) ack(receipt.id);
  }, [receipt, ack]);

  return { customization, equip, acknowledge };
}
