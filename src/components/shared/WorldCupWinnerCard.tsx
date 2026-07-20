import { RankFrameCard } from "@/features/profile/components/RankFrameCard";
import { WorldCupMedal, type MedalPlace } from "@/components/shared/WorldCupMedal";
import { cn } from "@/lib/utils";
import type { AvatarCustomization } from "@/types/game";

interface WorldCupWinnerCardProps {
  place: MedalPlace;
  tier: string;
  tierLabel: string;
  rpLabel?: string;
  customization: AvatarCustomization;
  className?: string;
}

/**
 * Figma winner card (node 1661-24533): the player's tier shield with the
 * tournament medal hanging off the bottom vertex. Extra bottom padding
 * reserves room for the overhang so surrounding layout doesn't clip it.
 */
export function WorldCupWinnerCard({
  place,
  tier,
  tierLabel,
  rpLabel,
  customization,
  className,
}: WorldCupWinnerCardProps) {
  return (
    <div className={cn("relative w-fit pb-[15%]", className)}>
      <RankFrameCard
        tier={tier}
        tierLabel={tierLabel}
        rpLabel={rpLabel}
        customization={customization}
      />
      <div className="absolute bottom-0 left-1/2 w-[35%] -translate-x-1/2 drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]">
        <WorldCupMedal place={place} />
      </div>
    </div>
  );
}
