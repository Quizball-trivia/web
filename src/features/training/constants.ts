import { resolveAvatarUrl } from "@/lib/avatars";

export const BOT_NAME = "CoachBot";
export const BOT_AVATAR = resolveAvatarUrl("CoachBot", "opponent", 256);

/** How many categories to show in each ban phase (matches real ranked flow) */
export const BAN_CATEGORY_COUNT = 4;
