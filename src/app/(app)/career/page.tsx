"use client";

import { useRouter } from "next/navigation";
import { CareerModeScreen } from "@/features/career/CareerModeScreen";
import { usePlayer } from "@/contexts/PlayerContext";

export default function CareerPage() {
  const router = useRouter();
  const { player } = usePlayer();

  return (
    <CareerModeScreen
      onBack={() => router.push("/")}
      onSelectLevel={() => router.push("/game")}
      completedLevels={new Set(player.completedLevels || [])}
    />
  );
}
