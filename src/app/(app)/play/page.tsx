"use client";

import { useRouter } from "next/navigation";
import { ModeSelectionScreen } from "@/components/ModeSelectionScreen";
import { usePlayer } from "@/contexts/PlayerContext";

export default function PlayPage() {
  const router = useRouter();
  const { player } = usePlayer();

  return (
    <ModeSelectionScreen
      onSelectMode={(mode) => {
        if (mode === "solo") router.push("/career");
        else router.push("/game");
      }}
      onSelectFriendGameMode={() => {}}
      ticketsRemaining={player.tickets || 0}
    />
  );
}
