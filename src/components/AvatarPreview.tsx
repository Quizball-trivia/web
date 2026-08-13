"use client";

/* eslint-disable @next/next/no-img-element -- Layered avatar overlays require raw img sizing and absolute positioning. */

import Image from "next/image";
import { resolveAvatarCustomization } from "@/lib/avatars";
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
  const final = resolveAvatarCustomization(customization);

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
