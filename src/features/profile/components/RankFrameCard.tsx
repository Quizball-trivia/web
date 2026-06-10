"use client";

import Image from "next/image";

import { AvatarPreview } from "@/components/AvatarPreview";
import { cn } from "@/lib/utils";
import { getTierAccent, getTierFrameSrc } from "@/utils/tierVisuals";
import type { AvatarCustomization } from "@/types/game";

interface RankFrameCardProps {
  /** Tier whose shield frame art is used as the backdrop. */
  tier: string;
  /** Translated tier name shown under the yellow divider. */
  tierLabel: string;
  /** RP line under the tier name, e.g. "769RP". Omit to hide. */
  rpLabel?: string;
  /** Player avatar layered inside the frame. */
  customization: AvatarCustomization;
  /** Optional small chip at the top of the card ("Current" / "Next" / "Achieved"). */
  caption?: string;
  /** Flip the avatar horizontally (opponent side on match screens). */
  mirrored?: boolean;
  /** Soft-blur the frame + avatar (used for the "next tier" preview). */
  blurred?: boolean;
  /** Tier glow halo (used for the GOAT max-rank card). */
  glow?: boolean;
  /** `next/image` sizes hint — keep in sync with the width set via
   *  `className`. Defaults to the profile card widths (96px / 160px). */
  sizes?: string;
  className?: string;
}

/**
 * FUT-style rank card matching the Figma 200×320 shield design:
 * avatar in the upper-middle, then a 140×3 yellow divider at y206,
 * tier name (Poppins 600, ~31px @200w) and RP ("1200RP", yellow ~16px).
 *
 * The root is a CSS container, so every label scales with the rendered
 * card width via cqw units — pass any width through `className`
 * (defaults to w-[96px] sm:w-[160px]).
 */
export function RankFrameCard({
  tier,
  tierLabel,
  rpLabel,
  customization,
  caption,
  mirrored = false,
  blurred = false,
  glow = false,
  sizes = "(min-width: 640px) 160px, 96px",
  className,
}: RankFrameCardProps) {
  const frameSrc = getTierFrameSrc(tier);
  // Figma shrinks long tier names (e.g. WORLD-CLASS, two-line Georgian names).
  const nameSize =
    tierLabel.length <= 8
      ? "text-[15.4cqw]"
      : tierLabel.length <= 12
        ? "text-[10.5cqw]"
        : "text-[9cqw]";
  // Single-word names (WORLD-CLASS, STARTING11) must stay on one line per
  // Figma — hyphens would otherwise create a break point. Multi-word names
  // (e.g. Georgian "ახალგაზრდა ტალანტი") are allowed to wrap to two lines.
  const singleWord = !tierLabel.trim().includes(" ");

  return (
    <div
      className={cn(
        "@container relative aspect-[200/320] w-[96px] select-none sm:w-[160px]",
        className,
      )}
    >
      {/* Frame + avatar — blurred together for the "next tier" preview.
          Glow uses a drop-shadow FILTER (not box-shadow) so it hugs the
          shield's alpha outline instead of drawing a rectangular halo. */}
      <div
        className={cn("absolute inset-0", blurred && "blur-[3px] opacity-80")}
        style={
          glow
            ? { filter: `drop-shadow(0 0 14px ${getTierAccent(tier)}66) drop-shadow(0 0 36px ${getTierAccent(tier)}40)` }
            : undefined
        }
      >
        <Image
          src={frameSrc}
          alt=""
          fill
          sizes={sizes}
          className="object-contain"
        />
        {/* Character: Figma x23 y37 w152 of 200×320 */}
        <div className="absolute left-1/2 top-[11.5%] w-[76%] -translate-x-1/2">
          <AvatarPreview
            customization={customization}
            width="100%"
            className={cn(mirrored && "-scale-x-100")}
          />
        </div>
      </div>

      {/* Label zone — Figma: divider y206, name y216, RP y248. Kept crisp when blurred. */}
      <div className="absolute inset-x-0 top-[64.4%] flex flex-col items-center text-center">
        <div className="h-[1.5cqw] min-h-px w-[70%] bg-brand-yellow" />
        <div
          className={cn(
            "mt-[3.5cqw] max-w-[92%] font-poppins font-semibold uppercase leading-none text-white [text-shadow:0_1.9cqw_1cqw_rgba(0,0,0,0.25)]",
            singleWord && "whitespace-nowrap",
            nameSize,
          )}
        >
          {tierLabel}
        </div>
        {rpLabel ? (
          <div className="mt-[1.5cqw] font-poppins text-[9.5cqw] font-semibold uppercase tabular-nums leading-none text-brand-yellow [text-shadow:0_1.9cqw_1cqw_rgba(0,0,0,0.25)]">
            {rpLabel}
          </div>
        ) : null}
      </div>

      {/* Context chip (profile: CURRENT / NEXT / ACHIEVED) */}
      {caption ? (
        <div className="absolute inset-x-0 top-[3.5%] flex justify-center">
          <span className="rounded-full bg-black/50 px-[5cqw] py-[1.5cqw] font-poppins text-[6.5cqw] font-semibold uppercase tracking-wide leading-none text-white/90">
            {caption}
          </span>
        </div>
      ) : null}
    </div>
  );
}
