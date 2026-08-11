import { GameStageRouter } from "@/features/game/GameStageRouter";
import { GameConnectionIndicator } from "@/features/game/GameConnectionIndicator";
import { SystemDegradedIndicator } from "@/features/game/SystemDegradedIndicator";

export default function GamePage() {
  return (
    <>
      <SystemDegradedIndicator />
      <GameConnectionIndicator />
      <GameStageRouter />
    </>
  );
}
