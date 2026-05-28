'use client';

/**
 * SVG <defs> block for the PitchVisualization scenes. Owns the
 * scoped-id filters (blue/red player glow, white ball glow), the
 * stadium clipPath, the momentum-meter clipPath, and the goal-net
 * pattern used for penalty/shot ripple decoration.
 *
 * Every id is prefixed by the caller-supplied `uid()` factory so
 * multiple PitchVisualization instances on the same page don't
 * collide. Consumers reference the same ids via `url(#${uid(name)})`.
 */

interface PitchSvgDefsProps {
  uid: (name: string) => string;
}

export function PitchSvgDefs({ uid }: PitchSvgDefsProps) {
  return (
    <defs>
      <clipPath id={uid('fieldClip')}>
        {/* Square clip — matches Figma's sharp-cornered stadium frame. */}
        <rect x="0" y="-30" width="500" height="290" />
      </clipPath>
      <filter id={uid('blueGlow')} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feFlood floodColor="#1CB0F6" floodOpacity="0.5" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id={uid('redGlow')} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feFlood floodColor="#FF4B4B" floodOpacity="0.5" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id={uid('ballGlow')} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feFlood floodColor="#ffffff" floodOpacity="0.6" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      {/* Dual momentum meter clip */}
      <clipPath id={uid('meterClip')}>
        <rect x="125" y="34" width="250" height="9" rx="4.5" />
      </clipPath>
      {/* Goal net pattern (penalty only) */}
      <pattern id={uid('penNet')} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        <line x1="0" y1="0" x2="6" y2="0" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
      </pattern>
    </defs>
  );
}
