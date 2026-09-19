import { GameStageRouter } from "@/features/game/GameStageRouter";
import { GameConnectionIndicator } from "@/features/game/GameConnectionIndicator";

export default function GamePage() {
  return (
    <>
      <GameConnectionIndicator />
      <GameStageRouter />
    </>
  );
}
