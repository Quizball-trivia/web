import type { SVGProps } from "react";

type DemoModeIconProps = SVGProps<SVGSVGElement> & {
  slug: string;
};

function IconArtwork({ slug }: { slug: string }) {
  switch (slug) {
    case "auction":
      return (
        <>
          <path d="m13 16 9 9M18 11l9 9-5 5-9-9 5-5ZM25 22l10 10" />
          <path d="m31 29 5 5-4 4-5-5M9 38h18M12 34h12v4H12z" />
          <circle cx="35" cy="13" r="4" />
          <path d="M31 13h8M35 9v8" />
        </>
      );
    case "daily-moneyDrop":
      return (
        <>
          <path d="M18 13h12l-2.5 5c5.5 3.7 9.5 9.2 9.5 15 0 5-5.8 7-13 7s-13-2-13-7c0-5.8 4-11.3 9.5-15L18 13Z" />
          <path d="M18 18h12M24 22v14M28 25.5c-1-1-2.3-1.5-4-1.5-2 0-3.5 1-3.5 2.5 0 4 7.5 1.5 7.5 5.5 0 1.5-1.5 2.5-4 2.5-1.8 0-3.3-.5-4.5-1.5" />
          <path d="M34 8v7M31 11l3 4 3-4" />
        </>
      );
    case "daily-trueFalse":
      return (
        <>
          <path d="m24 8 14 5v10c0 8.7-5.5 14.7-14 18-8.5-3.3-14-9.3-14-18V13l14-5Z" />
          <path d="m15 24 5 5 8-10M31 26l6 6M37 26l-6 6" />
        </>
      );
    case "daily-countdown":
      return (
        <>
          <circle cx="24" cy="27" r="14" />
          <path d="M19 8h10M24 8v5M35 16l3-3M24 18v9l-6 4" />
          <path d="M24 27h.01M12 27h3M33 27h3M24 36v3" />
          <path d="M9 12h7" opacity=".55" />
        </>
      );
    case "daily-imposter":
      return (
        <>
          <circle cx="17" cy="17" r="5" />
          <circle cx="31" cy="17" r="5" />
          <path d="M7 37c.7-7 4-11 10-11s9.3 4 10 11M21 37c.7-7 4-11 10-11s9.3 4 10 11" />
          <path d="M14 16c2.2-2 4.2-2 6 0M28 16c2.2-2 4.2-2 6 0" />
          <path d="m27 11 4-3 4 3" opacity=".55" />
        </>
      );
    case "daily-careerPath":
      return (
        <>
          <circle cx="10" cy="36" r="3" />
          <path d="M13 36h7c5 0 5-7 10-7h8M20 36c5 0 5-15 10-15h5" strokeDasharray="3 3" />
          <path d="M35 16v13M35 16h8l-3 4 3 4h-8" />
          <path d="m24 8 4 3-2 5h-4l-2-5 4-3Z" />
        </>
      );
    case "daily-highLow":
      return (
        <>
          <path d="M9 39V28h7v11M20 39V20h7v19M31 39V12h7v27M7 39h34" />
          <path d="m10 22 9-8 7 5 12-11M32 8h6v6" />
          <path d="m11 12 4 4 4-4" opacity=".55" />
        </>
      );
    case "daily-footballLogic":
      return (
        <>
          <rect x="7" y="10" width="14" height="13" rx="2" />
          <rect x="27" y="10" width="14" height="13" rx="2" />
          <path d="m9 20 4-4 3 3 3-4M29 20l4-5 6 5M15 28l7 5M33 28l-7 5" />
          <circle cx="24" cy="36" r="5" />
          <path d="m24 33 2 2-1 3h-2l-1-3 2-2Z" />
        </>
      );
    case "mini-squad-spin":
      return (
        <>
          <rect x="7" y="12" width="34" height="25" rx="4" />
          <path d="M18 12v25M30 12v25" />
          <path d="m10 21 4-3 4 3M22 18h4M24 16v7M33 19h5M35.5 17v4" />
          <path d="M10 30h5M22 30h4M33 30h5" />
          <path d="m38 8 3 3-3 3M41 11h-8" />
        </>
      );
    case "mini-trivia-spin":
      return (
        <>
          <circle cx="24" cy="25" r="16" />
          <circle cx="24" cy="25" r="4" />
          <path d="M24 9v12M38 17l-10 6M38 33l-10-6M24 41V29M10 33l10-6M10 17l10 6" />
          <path d="m21 7 3-4 3 4" />
        </>
      );
    case "mini-penalty-shootout":
      return (
        <>
          <path d="M8 38V13h32v25M8 19h32M14 38V25h20v13" />
          <circle cx="24" cy="32" r="5" />
          <path d="m24 28 3 2-1 4h-4l-1-4 3-2ZM12 34c2-10 9-15 20-16" strokeDasharray="3 3" />
          <path d="m29 15 4 3-5 2" />
        </>
      );
    case "mini-road-to-goal":
      return (
        <>
          <path d="M7 37h34M10 37V14M38 37V14M10 18h28" />
          <circle cx="13" cy="31" r="4" />
          <circle cx="24" cy="25" r="4" />
          <circle cx="35" cy="19" r="4" />
          <path d="m16 30 5-3M27 24l5-3" strokeDasharray="3 2" />
          <path d="m34 8 4 3-2 5h-4l-2-5 4-3Z" />
        </>
      );
    case "mini-daily-jackpot":
      return (
        <>
          <path d="M12 20h24l-3 19H15l-3-19Z" />
          <path d="M9 16h30M18 16l-3-6M30 16l3-6" />
          <circle cx="24" cy="28" r="5" />
          <path d="M24 25v6M21.5 27h5M7 8h6M35 8h6M24 5v6" />
        </>
      );
    case "mini-pass-chain":
      return (
        <>
          <circle cx="10" cy="24" r="4" />
          <circle cx="24" cy="12" r="4" />
          <circle cx="38" cy="24" r="4" />
          <circle cx="24" cy="37" r="4" />
          <path d="m13 21 8-6M27 15l8 6M35 27l-8 7M21 34l-8-7" strokeDasharray="4 3" />
          <path d="m24 21 4 3-1.5 5h-5L20 24l4-3Z" />
        </>
      );
    case "mini-accumulator":
      return (
        <>
          <rect x="10" y="8" width="25" height="31" rx="3" />
          <path d="M16 15h13M16 22h13M16 29h13M16 36h9" />
          <path d="m32 28 4 4 6-8" />
          <path d="M14 12 10 8M35 12l4-4M35 35l4 4" opacity=".55" />
        </>
      );
    case "mini-squad-collection":
      return (
        <>
          <rect x="15" y="8" width="22" height="31" rx="3" />
          <path d="m15 13-6 3 8 25 11-3M37 13l5 3-7 25-10-3" opacity=".65" />
          <circle cx="26" cy="18" r="4" />
          <path d="M20 31c.5-5 2.5-8 6-8s5.5 3 6 8M20 35h12" />
        </>
      );
    case "mini-cash-out-ladder":
      return (
        <>
          <path d="M8 39h8v-7h8v-7h8v-7h8" />
          <path d="m15 27 9-9 7 4 10-12M35 10h6v6" />
          <circle cx="12" cy="13" r="5" />
          <path d="M12 10v6M9.5 12h5" />
        </>
      );
    case "mini-bet-slip-booster":
      return (
        <>
          <path d="M9 8h25v32l-4-2-4 2-4-2-4 2-4-2-5 2V8Z" />
          <path d="M15 16h12M15 22h9M15 28h7" />
          <path d="m29 26 9-9M33 16h6v6M29 33h10" />
        </>
      );
    case "mini-half-time-trivia":
      return (
        <>
          <rect x="7" y="11" width="34" height="26" rx="3" />
          <path d="M24 11v26M7 24h34" />
          <circle cx="24" cy="24" r="5" />
          <path d="M12 18h6M30 30h6M13 30l5-5M30 18l5 5" />
          <path d="M20 6h8" opacity=".55" />
        </>
      );
    case "mini-odds-board":
      return (
        <>
          <rect x="7" y="9" width="34" height="30" rx="3" />
          <path d="M7 18h34M18 18v21M30 18v21" />
          <path d="m11 33 4-5M22 33l4-7M34 33l4-11" />
          <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
          <circle cx="17" cy="14" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case "mini-final-third":
      return (
        <>
          <path d="M6 14h36v12H6zM6 20h36M13 14v-4h22v4" />
          <circle cx="15" cy="34" r="5" />
          <path d="m15 30 2.5 2-1 3.5h-3l-1-3.5L15 30Z" />
          <path d="M24 34h14M31 30v8M28 32l6 4M34 32l-6 4" opacity=".7" />
        </>
      );
    case "mini-football-grid":
      return (
        <>
          <path d="M18 8v32M30 8v32M8 18h32M8 30h32" />
          <path d="m11 11 4 4M15 11l-4 4" />
          <circle cx="35" cy="13" r="3" />
          <path d="m33 33 4 4M37 33l-4 4" />
          <circle cx="24" cy="24" r="3" />
        </>
      );
    case "mini-survivor":
      return (
        <>
          <path d="M9 11h30M14 20h20M19 29h10" />
          <circle cx="24" cy="38" r="4" />
          <path d="m24 35 2 1.5-.8 3h-2.4l-.8-3L24 35Z" />
          <path d="M40 9v6M43 12h-6" opacity=".7" />
        </>
      );
    case "mini-hi-lo-ride":
      return (
        <>
          <rect x="14" y="9" width="20" height="30" rx="3" />
          <path d="M20 24h8" />
          <path d="m24 13 4 5h-8l4-5Z" />
          <path d="m24 35-4-5h8l-4 5Z" />
          <path d="M39 15v-6h-6M9 33v6h6" opacity=".6" />
        </>
      );
    case "mini-trivia-mines":
      return (
        <>
          <rect x="7" y="7" width="34" height="34" rx="3" />
          <path d="M7 19h34M7 30h34M18 7v34M30 7v34" opacity=".55" />
          <circle cx="24" cy="24" r="4.5" />
          <path d="M24 24v-6M24 15l3-2M28 20l3-1M24 24l4 3" />
        </>
      );
    case "mini-quiz-board":
      return (
        <>
          <rect x="7" y="9" width="34" height="30" rx="3" />
          <path d="M7 19h34M18 19v20M30 19v20" />
          <path d="M11 14h4M22 14h4M33 14h4" />
          <path d="m21 27 2.5 4.5L26 27l-1.5 6M12 27h-2v6h2M36 27h-2l2 3-2 3h2" />
        </>
      );
    case "mini-last-one-standing":
      return (
        <>
          <circle cx="11" cy="21" r="2.5" opacity=".55" />
          <circle cx="19" cy="21" r="2.5" opacity=".55" />
          <circle cx="29" cy="21" r="2.5" opacity=".55" />
          <circle cx="37" cy="21" r="2.5" opacity=".55" />
          <circle cx="24" cy="33" r="5" />
          <path d="m17 12 3 3 4-5 4 5 3-3v5H17v-5Z" />
        </>
      );
    case "mini-golden-goal":
      return (
        <>
          <path d="M8 38V14h32v24M8 20h32M14 38V26h20v12" />
          <path d="m26 9-6 8h5l-2 7 7-9h-5l1-6Z" />
          <circle cx="24" cy="32" r="4" />
        </>
      );
    case "mini-career-race":
      return (
        <>
          <path d="M11 8v32" />
          <path d="M11 10h17l-3 5 3 5H11z" />
          <path d="M20 34h18M31 30v8" strokeDasharray="3 3" opacity=".7" />
          <circle cx="36" cy="16" r="4" />
          <path d="M36 12v2M36 18v2M32 16h2M38 16h2" opacity=".7" />
        </>
      );
    case "mini-stat-sniper":
      return (
        <>
          <circle cx="24" cy="19" r="12" />
          <circle cx="24" cy="19" r="4.5" />
          <path d="M24 4v6M24 28v6M9 19h6M33 19h6" />
          <path d="M9 39h30" />
          <circle cx="28" cy="39" r="3" />
        </>
      );
    case "lab-own-goal":
      // Grid of agent cards, one marked with a skull-ish cross (the Own Goal).
      return (
        <>
          <rect x="7" y="10" width="10" height="8" rx="1.5" />
          <rect x="19" y="10" width="10" height="8" rx="1.5" />
          <rect x="31" y="10" width="10" height="8" rx="1.5" />
          <rect x="7" y="21" width="10" height="8" rx="1.5" />
          <rect x="19" y="21" width="10" height="8" rx="1.5" />
          <rect x="31" y="21" width="10" height="8" rx="1.5" />
          <path d="m21.5 23.5 5 5M26.5 23.5l-5 5" />
          <path d="M14 34h20M17 38h14" opacity=".55" />
        </>
      );
    case "lab-say-it-with-memes":
      // Two picture cards feeding a speech bubble with a question mark.
      return (
        <>
          <rect x="6" y="12" width="13" height="13" rx="2" />
          <path d="m8.5 22 3-3.5 2.5 2.5 2-2 2.5 3" />
          <circle cx="15" cy="16" r="1.5" />
          <path d="M22 18.5h5" strokeDasharray="2 2" />
          <path d="M30 9h12v11H36l-3.5 4v-4H30V9Z" />
          <path d="M34.5 13c.5-1.5 3.5-1.5 3.5.5 0 1.5-2 1.5-2 3M36 20h.01" />
          <path d="M10 31h28M14 36h20" opacity=".55" />
        </>
      );
    case "lab-draft-battle":
      // Spin wheel of squads feeding a drafted shirt.
      return (
        <>
          <circle cx="18" cy="21" r="12" />
          <path d="M18 9v24M6 21h24M9.5 12.5l17 17M26.5 12.5l-17 17" opacity=".55" />
          <circle cx="18" cy="21" r="3" />
          <path d="m35 27 4-2 4 2v5l-2 1v7h-4v-7l-2-1v-5Z" />
        </>
      );
    case "lab-top-10-knockout":
      // Ranked list with hearts (lives) alongside.
      return (
        <>
          <path d="M8 13h20M8 22h20M8 31h13" />
          <circle cx="4" cy="13" r="1.5" />
          <circle cx="4" cy="22" r="1.5" />
          <circle cx="4" cy="31" r="1.5" />
          <path d="M36 11c1.8-2.2 5-1 5 1.6 0 2.6-3.5 4.4-5 5.8-1.5-1.4-5-3.2-5-5.8 0-2.6 3.2-3.8 5-1.6Z" />
          <path d="M36 26c1.5-1.8 4-.8 4 1.3 0 2.1-2.8 3.5-4 4.7-1.2-1.2-4-2.6-4-4.7 0-2.1 2.5-3.1 4-1.3Z" opacity=".55" />
        </>
      );
    case "lab-missing-xi":
      // Pitch with a 4-3-3 shape, two shirts still blank.
      return (
        <>
          <rect x="8" y="7" width="32" height="34" rx="2" />
          <path d="M8 24h32" />
          <circle cx="24" cy="24" r="5" />
          <circle cx="24" cy="13" r="2.5" />
          <circle cx="14" cy="34" r="2.5" />
          <circle cx="34" cy="34" r="2.5" />
          <path d="M21.5 33h5M24 31.5v3" opacity=".7" />
        </>
      );
    case "lab-ball-knowledge":
      // Gem with a rarity percentage spark.
      return (
        <>
          <path d="M16 10h16l7 9-15 19L9 19l7-9Z" />
          <path d="M9 19h30M16 10l8 9 8-9M24 19v19" opacity=".7" />
          <path d="M38 8v6M35 11h6" />
        </>
      );
    case "lab-bingo-battle":
      // 3x3 card with a completed diagonal line.
      return (
        <>
          <rect x="9" y="9" width="30" height="30" rx="2" />
          <path d="M19 9v30M29 9v30M9 19h30M9 29h30" opacity=".55" />
          <circle cx="14" cy="14" r="3" />
          <circle cx="24" cy="24" r="3" />
          <circle cx="34" cy="34" r="3" />
          <path d="m12 12 24 24" opacity=".7" />
        </>
      );
    case "lab-connections-race":
      // 4x4 grid with one group of four locked together.
      return (
        <>
          <rect x="7" y="9" width="34" height="8" rx="2" />
          <rect x="7" y="20" width="7.5" height="8" rx="1.5" />
          <rect x="16.5" y="20" width="7.5" height="8" rx="1.5" />
          <rect x="26" y="20" width="7.5" height="8" rx="1.5" />
          <rect x="35.5" y="20" width="5.5" height="8" rx="1.5" />
          <rect x="7" y="31" width="7.5" height="8" rx="1.5" opacity=".55" />
          <rect x="16.5" y="31" width="7.5" height="8" rx="1.5" opacity=".55" />
          <rect x="26" y="31" width="7.5" height="8" rx="1.5" opacity=".55" />
          <rect x="35.5" y="31" width="5.5" height="8" rx="1.5" opacity=".55" />
        </>
      );
    case "lab-stat-501":
      // Dartboard with an arrow landing near the bullseye.
      return (
        <>
          <circle cx="22" cy="26" r="14" />
          <circle cx="22" cy="26" r="8" opacity=".6" />
          <circle cx="22" cy="26" r="2.5" />
          <path d="M22 12v4M22 36v4M8 26h4M32 26h4" opacity=".55" />
          <path d="m26 22 12-12M34 10h6v6" />
        </>
      );
    case "match":
      return (
        <>
          <path d="M8 24h32M24 8v32" />
          <circle cx="24" cy="24" r="6" />
          <path d="M8 16h8v16H8M40 16h-8v16h8" />
          <path d="m24 20 3 2-1 4h-4l-1-4 3-2Z" />
        </>
      );
    case "weekend-league":
      return (
        <>
          <path d="M16 8h16v8c0 7-3 11-8 13-5-2-8-6-8-13V8ZM20 29h8v5h5v5H15v-5h5v-5Z" />
          <path d="M16 12H9c0 7 3 10 9 10M32 12h7c0 7-3 10-9 10" />
          <path d="m24 13 2 4 4 .5-3 3 .8 4.5-3.8-2-3.8 2 .8-4.5-3-3 4-.5 2-4Z" />
        </>
      );
    case "daily-clues":
      return (
        <>
          <circle cx="21" cy="19" r="10" />
          <path d="m28 27 10 10M18 17c.5-3 5-4 7-1 2.5 4-4 4-4 8M21 28h.01" />
          <path d="M35 9v8M31 13h8" />
        </>
      );
    case "daily-putInOrder":
      return (
        <>
          <path d="M12 12h25M12 24h18M12 36h11" />
          <circle cx="8" cy="12" r="2" />
          <circle cx="8" cy="24" r="2" />
          <circle cx="8" cy="36" r="2" />
          <path d="m32 30 5 5 5-5M37 35V18" />
        </>
      );
    default:
      return (
        <>
          <circle cx="24" cy="24" r="15" />
          <path d="m24 15 3 6 7 .8-5 4.8 1.5 7-6.5-3.5-6.5 3.5 1.5-7-5-4.8 7-.8 3-6Z" />
        </>
      );
  }
}

export function DemoModeIcon({ slug, className, ...props }: DemoModeIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <IconArtwork slug={slug} />
    </svg>
  );
}
