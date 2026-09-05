import Image from "next/image";

import { DemoModeIcon } from "./DemoModeIcon";
import { FifaModeArt } from "@/features/fifa-universe/FifaModeArt";
import { isFifaSlug } from "@/features/fifa-universe/registry";

const SUPABASE_IMAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
const GAME_MODE_IMAGE_BASE = SUPABASE_IMAGE_BASE
  ? `${SUPABASE_IMAGE_BASE}/storage/v1/object/public/imgs/demos/game-modes/2026-08-17`
  : "/assets/demos/game-modes";

export const ILLUSTRATED_MODE_SLUGS = new Set([
  "weekend-league",
  "auction",
  "mini-final-third",
  "mini-road-to-goal",
  "mini-squad-spin",
  "mini-trivia-spin",
  "mini-penalty-shootout",
  "mini-daily-jackpot",
  "mini-pass-chain",
  "mini-accumulator",
  "mini-squad-collection",
  "mini-cash-out-ladder",
  "mini-bet-slip-booster",
  "mini-half-time-trivia",
  "mini-odds-board",
  "mini-football-grid",
  "mini-survivor",
  "mini-hi-lo-ride",
  "mini-trivia-mines",
  "mini-quiz-board",
  "mini-last-one-standing",
  "mini-golden-goal",
  "mini-career-race",
  "mini-stat-sniper",
  "mini-guess-the-goal",
  "daily-moneyDrop",
  "daily-trueFalse",
  "daily-countdown",
  "daily-imposter",
  "daily-careerPath",
  "daily-highLow",
  "daily-footballLogic",
]);

// Vibrant, dark-friendly gradient pairs. Each game maps to one stably (by slug
// hash) so its tile colour never changes, while the set gives the grid variety.
const GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ["#3B4CCA", "#7C3AED"], // indigo → violet
  ["#0EA5E9", "#2563EB"], // sky → blue
  ["#0F9D8C", "#0D7D6B"], // teal
  ["#F59E0B", "#EA580C"], // amber → orange
  ["#EC4899", "#BE185D"], // pink
  ["#65A30D", "#15803D"], // lime → green
  ["#8B5CF6", "#6D28D9"], // purple
  ["#06B6D4", "#3B82F6"], // cyan → blue
  ["#F97316", "#DC2626"], // orange → red
  ["#14B8A6", "#0891B2"], // teal → cyan
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * A designed "hero" tile for a demo card — the game's core-element glyph
 * (DemoModeIcon) on a vibrant gradient with a glow, dot pattern and an
 * oversized watermark of the same glyph. Conveys the game at a glance without
 * a screenshot. `className` controls the aspect ratio.
 */
export function DemoModeArt({ slug, className = "" }: { slug: string; className?: string }) {
  if (isFifaSlug(slug) || slug === "mini-guess-fifa-card") {
    return <FifaModeArt slug={slug} className={className} />;
  }
  if (ILLUSTRATED_MODE_SLUGS.has(slug)) {
    return (
      <div className={`relative overflow-hidden bg-[#07111f] ${className}`} aria-hidden>
        <Image
          src={`${GAME_MODE_IMAGE_BASE}/${slug}.webp`}
          alt=""
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-contain object-center"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
    );
  }

  const [from, to] = GRADIENTS[hash(slug) % GRADIENTS.length];

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden
    >
      {/* soft top-left highlight */}
      <div
        className="pointer-events-none absolute -left-8 -top-10 size-40 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.38), transparent 68%)" }}
      />
      {/* dotted texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px)",
          backgroundSize: "13px 13px",
        }}
      />
      {/* oversized watermark of the same glyph, bottom-right */}
      <DemoModeIcon
        slug={slug}
        className="pointer-events-none absolute -bottom-7 -right-6 size-40 text-white/12"
      />
      {/* main glyph */}
      <div className="absolute inset-0 flex items-center justify-center">
        <DemoModeIcon
          slug={slug}
          className="size-14 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)] sm:size-16"
        />
      </div>
      {/* bottom fade so overlaid text/badges keep contrast */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/25 to-transparent" />
    </div>
  );
}
