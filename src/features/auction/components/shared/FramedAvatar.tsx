import Image from 'next/image';
import { AvatarPreview } from '@/components/AvatarPreview';
import { getTierFrameSrc } from '@/utils/tierVisuals';
import type { AvatarCustomization } from '@/types/game';

// Neutral default frame for players whose real tier isn't known yet on the
// search/countdown screens (we only have a seat + avatar seed at this point).
export const SEARCH_FRAME_TIER = 'Academy';

// Frame geometry, shared so the search and countdown screens can't drift:
//   - frame height = width * this ratio (the tier-frame art's aspect)
//   - the avatar sits in an inset box and renders at width * this fraction
const FRAME_ASPECT = 1.58;
const AVATAR_WIDTH_FRACTION = 0.64;

export function framedAvatarHeight(width: number): number {
  return Math.round(width * FRAME_ASPECT);
}

/**
 * A tier-framed avatar at a given width. `filled` renders the real avatar inside
 * the frame; `false` renders a dashed empty seat (a rival who hasn't joined yet).
 * Callers own any entrance animation — this only owns the frame + avatar render.
 */
export function FramedAvatar({
  width,
  filled = true,
  customization,
  avatarSeed,
  tier,
  rp,
}: {
  width: number;
  filled?: boolean;
  /** Layered avatar to render (preferred). Falls back to avatarSeed. */
  customization?: AvatarCustomization | null;
  avatarSeed?: string | null;
  /** Ranked tier → the card frame art. Falls back to the neutral frame. */
  tier?: string | null;
  /** Ranked points, shown FUT-rating style in the frame's top-left. */
  rp?: number | null;
}) {
  const height = framedAvatarHeight(width);
  if (!filled) {
    return (
      <div
        className="rounded-[10px] border border-dashed border-white/15 bg-white/[0.03]"
        style={{ width, height }}
      />
    );
  }
  const resolved: AvatarCustomization = customization ?? { base: avatarSeed || 'avatar-1' };
  return (
    <div className="relative" style={{ width, height }}>
      <Image
        src={getTierFrameSrc(tier ?? SEARCH_FRAME_TIER)}
        alt=""
        width={width}
        height={height}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain"
      />
      <div className="absolute inset-x-0 bottom-[8%] top-[22%] z-10 flex items-center justify-center overflow-hidden">
        <AvatarPreview customization={resolved} width={Math.round(width * AVATAR_WIDTH_FRACTION)} />
      </div>
      {rp != null && (
        <div
          className="absolute left-[13%] top-[10%] z-20 text-center font-black leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]"
          style={{ fontSize: Math.round(width * 0.14) }}
        >
          {rp}
          <div
            className="mt-0.5 font-bold uppercase tracking-wide text-white/80"
            style={{ fontSize: Math.round(width * 0.055) }}
          >
            RP
          </div>
        </div>
      )}
    </div>
  );
}
