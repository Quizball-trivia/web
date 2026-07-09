"use client";

/* eslint-disable @next/next/no-img-element -- Layered avatar overlays require raw img sizing and absolute positioning. */

import Image from "next/image";
import { customizationFromAvatarValue } from "@/lib/avatars";
import { AVATAR_SLOTS, getAvatarPart, getSkinPart } from "@/lib/avatars/parts";
import type { AvatarCustomization } from "@/types/game";

interface AvatarPreviewProps {
  customization: AvatarCustomization;
  /** Render at this width (height auto via canonical Figma aspect). Accepts px number or any CSS width (e.g. "100%"). */
  width?: number | string;
  className?: string;
}

/**
 * Full-body avatar preview at the canonical Figma 495.25×543.03 aspect ratio with all
 * equipped slots layered over the chosen skin.
 */
export function AvatarPreview({ customization, width = 240, className = "" }: AvatarPreviewProps) {
  const defaults = customizationFromAvatarValue(customization.base);
  const hasStructuredSlots = (["skin", "jersey", "hair", "glasses", "facialHair"] as const).some((slot) =>
    Object.prototype.hasOwnProperty.call(customization, slot),
  );
  const final: AvatarCustomization = {
    skin: customization.skin ?? defaults.skin,
    jersey: hasStructuredSlots ? customization.jersey : defaults.jersey,
    hair: hasStructuredSlots ? customization.hair : defaults.hair,
    glasses: hasStructuredSlots ? customization.glasses : defaults.glasses,
    facialHair: hasStructuredSlots ? customization.facialHair : defaults.facialHair,
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
        sizes={typeof width === "number" ? `${width}px` : "240px"}
        className="object-contain"
      />
      {AVATAR_SLOTS.map((slot) => {
        const partId = final[slot];
        const part = getAvatarPart(partId);
        if (!part) return null;
        // Jerseys anchor to the canvas bottom: the skin torso runs to the very
        // bottom edge, and jersey art heights vary by a few px, so top-anchoring
        // leaves a sliver of torso visible under lighter hems on darker skins.
        const anchor =
          slot === "jersey"
            ? { bottom: "0%" }
            : { top: `${part.position.top}%` };
        return (
          <img
            key={slot}
            src={part.asset}
            alt=""
            className="pointer-events-none absolute object-contain"
            style={{
              ...anchor,
              left: `${part.position.left}%`,
              width: `${part.position.width}%`,
            }}
          />
        );
      })}
    </div>
  );
}
