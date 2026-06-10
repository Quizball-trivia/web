'use client';

/**
 * Stadium image + tinted zone bands for the PitchVisualization scenes.
 * Zone bands are hidden during penalty mode so they don't fight the
 * close-up goal art.
 */

interface ZoneBand {
  x: number;
  w: number;
  fill: string;
  rx?: number;
}

interface PitchBackgroundProps {
  uid: (name: string) => string;
  isPenalty: boolean;
  zoneBands: ZoneBand[];
}

export function PitchBackground({ uid, isPenalty, zoneBands }: PitchBackgroundProps) {
  return (
    <>
      {/* Field background — stadium image stretches to fill the full
          500×290 viewBox so the green + yellow boundary lines reach the
          edges of the Figma-matched aspect frame. */}
      <image
        href="/assets/stadium-green.webp"
        x="0"
        y="-30"
        width="500"
        height="290"
        preserveAspectRatio="none"
        clipPath={`url(#${uid('fieldClip')})`}
      />

      {/* Zone bands — hidden during penalties */}
      {!isPenalty && (
        <>
          {zoneBands.map((z, i) => (
            <rect key={i} x={z.x} y="-30" width={z.w} height="290" fill={z.fill} rx={z.rx} />
          ))}
        </>
      )}
    </>
  );
}
