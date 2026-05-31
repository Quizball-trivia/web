"use client";

import { useEffect, useState } from "react";
import { MatchmakingMapScreen } from "@/components/match/MatchmakingMapScreen";
import type { OpponentInfo } from "@/lib/realtime/socket.types";

const DEV_OPPONENT: OpponentInfo = {
  id: "dev-opponent-tbilisi",
  username: "Fast Mapper",
  avatarUrl: null,
  city: "Tbilisi",
  country: "Georgia",
  countryCode: "GE",
  lat: 41.72,
  lon: 44.79,
};

export default function DevMatchmakingPage() {
  const [startedAt] = useState(() => Date.now());
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setOpponent(DEV_OPPONENT), 5500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <MatchmakingMapScreen
      matchType="ranked"
      rankedSearchStartedAt={startedAt}
      rankedFoundOpponent={opponent}
      onCancel={() => setOpponent(null)}
      onRestart={() => {
        setOpponent(null);
        window.setTimeout(() => setOpponent(DEV_OPPONENT), 1500);
      }}
    />
  );
}
