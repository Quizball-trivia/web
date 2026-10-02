import type { MessageKey } from "@/lib/i18n/messages";

export type WlRewardBand = "participant" | "finalist" | "top10" | "third" | "second" | "winner";

export interface WlRewardItem {
  slug: string;
  avatarPartId: string;
  slot: "jersey";
}

/** A reward the server has already granted. Opening it only reveals it. */
export interface WlRewardReceipt {
  id: string;
  tournamentId: string;
  weekKey: string | null;
  band: WlRewardBand;
  finalRank: number | null;
  coins: number;
  items: WlRewardItem[];
  grantedAt: string;
  seen: boolean;
}

export type WlPackPlace = 1 | 2 | 3;

const BAND_PLACE: Partial<Record<WlRewardBand, WlPackPlace>> = { winner: 1, second: 2, third: 3 };

export function wlPackPlace(receipt: Pick<WlRewardReceipt, "band" | "items">): WlPackPlace | null {
  if (receipt.items.length === 0) return null;
  return BAND_PLACE[receipt.band] ?? null;
}

export const WL_PLACE_ACCENT: Record<WlPackPlace, { main: string; deep: string; ink: string }> = {
  1: { main: "#FFD700", deep: "#B8860B", ink: "#3D2E00" },
  2: { main: "#D8DEE3", deep: "#8D99A3", ink: "#232B31" },
  3: { main: "#FF9600", deep: "#B86400", ink: "#3A1F00" },
};

export const WL_PLACE_TITLE_KEY: Record<WlPackPlace, MessageKey> = {
  1: "wlRewards.placeTitle1",
  2: "wlRewards.placeTitle2",
  3: "wlRewards.placeTitle3",
};

export const WL_PACK_NAME_KEY: Record<WlPackPlace, MessageKey> = {
  1: "wlRewards.packName1",
  2: "wlRewards.packName2",
  3: "wlRewards.packName3",
};

export const WL_COIN_BAND_TITLE_KEY: Record<"top10" | "finalist" | "participant", MessageKey> = {
  top10: "wlRewards.bandTop10",
  finalist: "wlRewards.bandFinalist",
  participant: "wlRewards.bandParticipant",
};

export function wlBandTitleKey(receipt: Pick<WlRewardReceipt, "band" | "items">): MessageKey {
  const place = wlPackPlace(receipt);
  if (place) return WL_PLACE_TITLE_KEY[place];
  if (receipt.band === "top10" || receipt.band === "finalist") return WL_COIN_BAND_TITLE_KEY[receipt.band];
  // A podium band with no pack items still reads as its placement.
  const podium = BAND_PLACE[receipt.band];
  return podium ? WL_PLACE_TITLE_KEY[podium] : WL_COIN_BAND_TITLE_KEY.participant;
}
