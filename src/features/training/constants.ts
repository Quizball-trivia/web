import { resolveAvatarUrl } from "@/lib/avatars";

import type { AvatarCustomization } from "@/types/game";

export const BOT_NAME = "CoachBot";
export const BOT_AVATAR = resolveAvatarUrl("CoachBot");
/** The coach must never look like the player's default kit: gold champion jersey, cap, silver hair. */
export const BOT_AVATAR_CUSTOMIZATION: AvatarCustomization = {
  jersey: "jersey_gold_champion",
  headwear: "headwear_cech",
  hair: "hair_gullit",
  hairColor: "silver",
  earwear: "earwear_studs",
};

/** How many categories to show in each ban phase (matches real ranked flow) */
export const BAN_CATEGORY_COUNT = 3;

/**
 * The tutorial always shows the same three ranked categories (owner call,
 * 2026-09-11), fetched live so artwork and questions are the real ones. The
 * middle one survives both scripted bans and feeds the questions.
 * "champios-leage" is the catalogue's actual Champions League slug.
 */
export const TRAINING_BAN_CATEGORY_SLUGS = ["premier-league", "world-cup", "champios-leage"] as const;

/** CoachBot's fake rank — keep consistent everywhere he appears */
export const BOT_RANK_POINTS = 1200;
