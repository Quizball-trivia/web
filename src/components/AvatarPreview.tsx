"use client";


import Image from "next/image";
import { AvatarLayers } from "./AvatarLayers";
import { resolveAvatarCustomization } from "@/lib/avatars";
import { getSkinPart } from "@/lib/avatars/parts";
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
      className={`relative shrink-0 ${className}`}
      style={{ width, aspectRatio: "495.25 / 543.03" }}
    >
      <AvatarLayers customization={final} placement="back" />
      <Image
        src={skinAsset}
        alt=""
        fill
        unoptimized
        sizes={typeof width === "number" ? `${width}px` : "240px"}
        className="object-contain"
      />
      <AvatarLayers customization={final} />
    </div>
  );
}
