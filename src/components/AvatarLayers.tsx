/* eslint-disable @next/next/no-img-element -- Avatar overlays share absolute geometry. */
'use client';

import { usePartTuning, tunedPosition, frontHairMask, partTransformStyle, tunedFrontHairPercent } from '@/lib/avatars/usePartTuning';
import { useId } from 'react';
import { AVATAR_SLOTS, getAvatarPart } from '@/lib/avatars/parts';
import type { AvatarCustomization } from '@/types/game';

const TINTS = {
  platinum: [243, 220, 157],
  ginger: [198, 85, 30],
  silver: [203, 214, 229],
  blue_tips: [18, 168, 240],
  pink_streaks: [240, 69, 157],
} as const;

/** Shared by full previews, purchase modals, profile thumbnails and game avatars. */
export function AvatarLayers({ customization, placement = "front", assetResolver }: { assetResolver?: (asset: string) => string; customization: AvatarCustomization; placement?: "front" | "back" }) {
  const tuning = usePartTuning();
  const filterId = useId().replaceAll(':', '');
  const color = customization.hairColor;
  const tint = color && color !== 'natural' ? TINTS[color] : undefined;
  const hideHair = getAvatarPart(customization.headwear)?.hideHair;
  const partial = color === 'blue_tips' || color === 'pink_streaks';
  return <>
    {tint && <svg width="0" height="0" aria-hidden="true" className="absolute">
      <defs><filter id={filterId} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values={`.12 .24 .04 0 ${tint[0]/255*.75} .12 .24 .04 0 ${tint[1]/255*.75} .12 .24 .04 0 ${tint[2]/255*.75} 0 0 0 1 0`} />
      </filter></defs>
    </svg>}
    {AVATAR_SLOTS.map(slot => {
      const part = getAvatarPart(customization[slot]);
      if (!part || (slot === 'hair' && hideHair)) return null;
      const frontPercent = slot === 'hair' ? tunedFrontHairPercent(part, tuning) : undefined;
      const splitHair = frontPercent !== undefined;
      const hairBehindFace = slot === 'hair' && tuning.hairBehindFace?.[part.id] === true;
      if (placement === 'back' && part.id !== 'earwear_headphones' && !hairBehindFace && !splitHair) return null;
      if (placement === 'front' && hairBehindFace && !splitHair) return null;
      const colored = slot === 'hair' && part.id !== 'hair_zidane' && tint;
      const pos = tunedPosition(part, tuning);
      const position = { ...partTransformStyle(part, tuning), maskImage: splitHair && placement === "front" ? frontHairMask(frontPercent) : undefined, clipPath: part.id === 'earwear_headphones' && placement === 'front' ? 'inset(0 60% 0 0)' : part.clipPath, top: `${pos.top}%`, left: `${pos.left}%`, width: `${pos.width}%` };
      return <span key={slot} data-avatar-slot={slot} data-part-id={part.id}>
        <img src={assetResolver?.(part.asset) ?? part.asset} alt="" className="pointer-events-none absolute object-contain" style={{ ...position, filter: colored && !partial ? `url(#${filterId})` : undefined }} />
        {colored && partial && <img src={assetResolver?.(part.asset) ?? part.asset} alt="" className="pointer-events-none absolute object-contain" style={{ ...position, filter: `url(#${filterId})`, clipPath: color === 'blue_tips' ? 'inset(0 0 58% 0)' : 'polygon(38% 0, 53% 0, 65% 100%, 50% 100%)' }} />}
      </span>;
    })}
  </>;
}
