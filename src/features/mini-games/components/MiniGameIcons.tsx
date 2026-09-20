"use client";

/**
 * Hand-drawn-style line icons for the coin mini games' intro screens.
 * 48×48 viewBox, stroke = currentColor, so the tinted square sets the colour.
 */
const base = { viewBox: "0 0 48 48", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function FreeKicksIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className} aria-hidden>
      {/* goal frame in perspective, top right */}
      <path d="M25 22V6Q34 5 44 6V23M25 10H40V23" />
      {/* ball */}
      <circle cx="9" cy="39" r="5" />
      <path d="M7 37L10 36L12 39L10 42L7 41Z" />
      {/* two-man wall */}
      <path d="M26 26a2.5 2.5 0 1 0-5 0a2.5 2.5 0 1 0 5 0M23.5 29V34M20 31L23.5 30L27 31M23.5 34L21 38M23.5 34L26 38M36 26a2.5 2.5 0 1 0-5 0a2.5 2.5 0 1 0 5 0M33.5 29V34M30 31L33.5 30L37 31M33.5 34L31 38M33.5 34L36 38" />
      {/* curled flight over the wall */}
      <path d="M10 31C8 13 20 2 38 13" strokeDasharray="3 4" />
    </svg>
  );
}

export function RoadToGoalIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className} aria-hidden>
      {/* winding road */}
      <path d="M12 35C30 36 31 27 22 25C8 22 17 12 35 14" />
      {/* goal, top right */}
      <path d="M31 17V4L45 5V18M31 8L41 9V18" />
      {/* cones beside the road */}
      <path d="M5 27L8 20L11 27ZM34 30L37 23L40 30Z" />
      {/* ball at the start */}
      <circle cx="9" cy="40" r="5" />
      <path d="M7 38L10 37L12 40L10 43L7 42Z" />
    </svg>
  );
}

export function TriviaMinesIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className} aria-hidden>
      {/* 3×3 board */}
      <path d="M6 3H12Q15 3 15 6V12Q15 15 12 15H6Q3 15 3 12V6Q3 3 6 3ZM21 3H27Q30 3 30 6V12Q30 15 27 15H21Q18 15 18 12V6Q18 3 21 3ZM36 3H42Q45 3 45 6V12Q45 15 42 15H36Q33 15 33 12V6Q33 3 36 3ZM6 18H12Q15 18 15 21V27Q15 30 12 30H6Q3 30 3 27V21Q3 18 6 18ZM21 18H27Q30 18 30 21V27Q30 30 27 30H21Q18 30 18 27V21Q18 18 21 18ZM36 18H42Q45 18 45 21V27Q45 30 42 30H36Q33 30 33 27V21Q33 18 36 18ZM6 33H12Q15 33 15 36V42Q15 45 12 45H6Q3 45 3 42V36Q3 33 6 33ZM21 33H27Q30 33 30 36V42Q30 45 27 45H21Q18 45 18 42V36Q18 33 21 33ZM36 33H42Q45 33 45 36V42Q45 45 42 45H36Q33 45 33 42V36Q33 33 36 33Z" />
      {/* centre tile: football */}
      <circle cx="24" cy="24" r="4" />
      <path d="M23 22L26 23L25 26L22 25ZM23 22L22 20.5M26 23L28 22.5M25 26L25.5 27.5M22 25L20.5 26" />
      {/* a defender: shield */}
      <path d="M6 6.5L9 5.5L12 6.5V9Q12 11 9 12.5Q6 11 6 9Z" />
      {/* a hidden tile: question mark */}
      <path d="M36.8 7Q37 5 39 5Q41.5 5 41.5 7Q41.5 8.3 39 9V9.5" />
      <path d="M39 12.5V12.6" />
    </svg>
  );
}

export function SquadSpinIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className} aria-hidden>
      {/* three reels: crest · ball · flag */}
      <rect x="4" y="11" width="11.5" height="26" rx="3" />
      <rect x="18.25" y="11" width="11.5" height="26" rx="3" />
      <rect x="32.5" y="11" width="11.5" height="26" rx="3" />
      <path d="M9.75 19.5L13 20.5V23.5Q13 26 9.75 27.5Q6.5 26 6.5 23.5V20.5Z" />
      <circle cx="24" cy="24" r="3.6" />
      <path d="M22 22L26 26M26 22L22 26" />
      <path d="M35.5 28V20M35.5 20H42V25H35.5" />
      {/* base */}
      <path d="M8 42H40" />
    </svg>
  );
}

export const MINI_GAME_ICONS = {
  "mini-final-third": FreeKicksIcon,
  "mini-road-to-goal": RoadToGoalIcon,
  "mini-trivia-mines": TriviaMinesIcon,
  "mini-squad-spin": SquadSpinIcon,
} as const;
