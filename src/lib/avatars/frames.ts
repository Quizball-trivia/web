/**
 * Weekend League podium frames: the card drawn AROUND an avatar, not a layer
 * on the figure, so they live outside the part/slot layer lists (AvatarLayers
 * would otherwise draw them inside the figure). Earned only, never sold; the
 * backend owns them as products with slot "frame".
 */
export type WlFramePlace = 1 | 2 | 3;

export const WL_FRAME_PARTS = [
  { id: 'frame_wl_champion', place: 1, productSlug: 'avatar_frame_wl_champion', nameKey: 'wlRewards.frameName1', unlockKey: 'wlRewards.frameUnlock1' },
  { id: 'frame_wl_runnerup', place: 2, productSlug: 'avatar_frame_wl_runnerup', nameKey: 'wlRewards.frameName2', unlockKey: 'wlRewards.frameUnlock2' },
  { id: 'frame_wl_podium', place: 3, productSlug: 'avatar_frame_wl_podium', nameKey: 'wlRewards.frameName3', unlockKey: 'wlRewards.frameUnlock3' },
] as const;

export type WlFramePart = (typeof WL_FRAME_PARTS)[number];

export function wlFramePart(id: string | null | undefined): WlFramePart | null {
  return WL_FRAME_PARTS.find((frame) => frame.id === id) ?? null;
}

/** Podium place of a frame id; null for anything unknown (old or foreign ids). */
export function wlFramePlace(id: string | null | undefined): WlFramePlace | null {
  return wlFramePart(id)?.place ?? null;
}
