"use client";

import { StoreScreen } from "@/components/StoreScreen";
import { usePlayer } from "@/contexts/PlayerContext";
import type { AvatarCustomization } from "@/types/game";

export default function StorePage() {
  const { player, updateCoins, unlockItem, updateStats } = usePlayer();

  const unlockedItems = {
    heads: player.ownedItems,
    jerseys: player.ownedItems,
    accessories: player.ownedItems,
  };

  return (
    <StoreScreen
      currentCoins={player.coins}
      currentAvatar={player.avatarCustomization || { base: player.avatar }}
      unlockedItems={unlockedItems}
      isPremium={false}
      onPurchaseItem={(type, id, cost) => {
        if (player.coins >= cost) {
          updateCoins(-cost);
          unlockItem(id);
          console.log(`Purchased ${type}: ${id}`);
        }
      }}
      onEquipItem={(type, id) => {
        const current = player.avatarCustomization || { base: player.avatar };
        const updates: AvatarCustomization = { ...current };

        if (type === "head") updates.base = id;
        if (type === "jersey") updates.hat = id;
        if (type === "accessory") updates.accessory = id;

        updateStats({ avatarCustomization: updates });
      }}
      onPurchasePremium={(tier) => console.log("Purchase premium:", tier)}
      onPurchaseCoins={(pkg, _price, coins) => {
        console.log("Purchase coins:", pkg);
        updateCoins(coins);
      }}
    />
  );
}
