import { RoadToGoal } from "@/features/mini-games/components/RoadToGoal";
import { isRoadToGoalEnabled } from "@/lib/features/roadToGoal";

/** Authenticated Road to Goal mode backed by the server-authoritative game API. */
export default function RoadToGoalPage() {
  return (
    <RoadToGoal
      backHref="/mini-games"
      live
      newRunsEnabled={isRoadToGoalEnabled}
    />
  );
}
