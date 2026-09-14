import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Small illustrated icons in the Quizball art style (flat cartoon, bold
 * outlines), used where the UI previously fell back to system emoji so the
 * look no longer depends on the visitor's platform font.
 */
const SOURCES = {
  trophy: "/assets/brand/result-trophy.webp",
  ball: "/assets/brand/ball.webp",
  "medal-gold": "/assets/brand/icons/medal-gold.webp",
  "medal-silver": "/assets/brand/icons/medal-silver.webp",
  "medal-bronze": "/assets/brand/icons/medal-bronze.webp",
  calendar: "/assets/brand/icons/calendar.webp",
  ticket: "/assets/brand/icons/ticket.webp",
  megaphone: "/assets/brand/icons/megaphone.webp",
  robot: "/assets/brand/icons/robot.webp",
  globe: "/assets/brand/icons/globe.webp",
  target: "/assets/brand/icons/target.webp",
  lightning: "/assets/brand/icons/lightning.webp",
  "player-silhouette": "/assets/brand/icons/player-silhouette.webp",
} as const;

export type BrandIconName = keyof typeof SOURCES;

export function BrandIcon({ name, className, dimmed = false }: { name: BrandIconName; className?: string; dimmed?: boolean }) {
  return (
    <Image
      src={SOURCES[name]}
      alt=""
      aria-hidden="true"
      width={128}
      height={128}
      sizes="64px"
      className={cn("inline-block size-6 shrink-0 object-contain", dimmed && "opacity-40 grayscale", className)}
    />
  );
}
