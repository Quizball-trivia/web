"use client";

import { useRouter } from "next/navigation";
import { ProfileScreen } from "@/components/ProfileScreen";
import { usePlayer } from "@/contexts/PlayerContext";

export default function ProfilePage() {
  const router = useRouter();
  const { player, updateStats } = usePlayer();

  return (
    <ProfileScreen
      player={player}
      onNavigateToStore={() => router.push("/store")}
      onNavigateToSettings={() => router.push("/settings")}
      onFeatureFlagsChange={() => {}}
      onNameChange={(name) => updateStats({ username: name })}
    />
  );
}
