import { resolveAvatarUrl } from "@/lib/avatars";

export const BOT_NAME = "CoachBot";
export const BOT_AVATAR = resolveAvatarUrl("CoachBot");

/** How many categories to show in each ban phase (matches real ranked flow) */
export const BAN_CATEGORY_COUNT = 3;

/** CoachBot's fake rank — keep consistent everywhere he appears */
export const BOT_RANK_POINTS = 1200;
