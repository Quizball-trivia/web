"use client";

/* eslint-disable @next/next/no-img-element -- Layered avatar overlays require raw img sizing and absolute positioning. */

import Image from "next/image";
import { customizationFromAvatarValue } from "@/lib/avatars";
import { AVATAR_SLOTS, getAvatarPart, getSkinPart } from "@/lib/avatars/parts";
import type { AvatarCustomization } from "@/types/game";

interface AvatarPreviewProps {
  customization: AvatarCustomization;
  /** Render at this width (height auto via canonical Figma aspect). */
  width?: number;
  className?: string;
}

/**
 * Full-body avatar preview at the canonical Figma 495.25×543.03 aspect ratio with all
 * equipped slots layered over the chosen skin.
 */
export function AvatarPreview({ customization, width = 240, className = "" }: AvatarPreviewProps) {
  const defaults = customizationFromAvatarValue(customization.base);
  const final: AvatarCustomization = {
    skin: customization.skin ?? defaults.skin,
    jersey: customization.jersey ?? defaults.jersey,
    hair: customization.hair ?? defaults.hair,
    glasses: customization.glasses ?? defaults.glasses,
    facialHair: customization.facialHair ?? defaults.facialHair,
  };

  const skinAsset = getSkinPart(final.skin).asset;

  return (
    <div
      className={`relative ${className}`}
      style={{ width, aspectRatio: "495.25 / 543.03" }}
    >
      <Image
        src={skinAsset}
        alt=""
        fill
        unoptimized
        sizes={`${width}px`}
        className="object-contain"
      />
      {AVATAR_SLOTS.map((slot) => {
        const partId = final[slot];
        const part = getAvatarPart(partId);
        if (!part) return null;
        return (
          <img
            key={slot}
            src={part.asset}
            alt=""
            className="pointer-events-none absolute object-contain"
            style={{
              top: `${part.position.top}%`,
              left: `${part.position.left}%`,
              width: `${part.position.width}%`,
            }}
          />
        );
      })}
    </div>
  );
}
