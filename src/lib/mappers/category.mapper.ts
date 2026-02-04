import type { components } from "@/types/api.generated";
import type { CategorySummary } from "@/lib/domain";
import { getI18nText } from "@/lib/utils/i18n";
import { hashToNumber } from "@/lib/utils/hash";
import { CATEGORY_ICONS } from "@/lib/constants/categoryIcons";

type CategoryResponse = components["schemas"]["CategoryResponse"];
type CategoryDependencyChild =
  components["schemas"]["CategoryDependenciesResponse"]["children"][number];

const getFallbackIcon = (seed: string) => {
  const index = hashToNumber(seed, 0, CATEGORY_ICONS.length - 1);
  return CATEGORY_ICONS[index];
};

const PLAYER_AVATARS = ["⚽", "👑", "🔥", "⭐", "🎯", "🥅"];

export function toCategorySummary(
  category: CategoryResponse,
  locale = "en",
): CategorySummary {
  const playerCount = hashToNumber(`${category.id}-players`, 1200, 25000);
  const popularity = hashToNumber(`${category.id}-popularity`, 10, 100);
  const rank = hashToNumber(`${category.id}-rank`, 1, 500);
  const isNew = hashToNumber(`${category.id}-new`, 1, 10) <= 2;
  const isTrending = hashToNumber(`${category.id}-trend`, 1, 10) <= 2;
  const leaderboardTop = [1, 2, 3].map((rank) => {
    const seed = `${category.id}-${rank}`;
    const avatarIndex = hashToNumber(
      `${seed}-avatar`,
      0,
      PLAYER_AVATARS.length - 1,
    );
    return {
      rank,
      username: `Player${hashToNumber(seed, 100, 999)}`,
      avatar: PLAYER_AVATARS[avatarIndex],
      score: hashToNumber(`${seed}-score`, 800, 4500),
    };
  });

  return {
    id: category.id,
    name: getI18nText(category.name, locale),
    slug: category.slug,
    icon: category.icon ?? getFallbackIcon(category.id),
    description: getI18nText(category.description, locale),
    imageUrl: category.image_url ?? undefined,
    rank,
    playerCount,
    popularity,
    totalPlayers: playerCount,
    yourBestScore: 0,
    yourRank: 0,
    leaderboardTop,
    isNew: isNew,
    trending: isTrending,
  };
}

export function toCategorySummaryFromDependency(
  child: CategoryDependencyChild,
  locale = "en",
): CategorySummary {
  return {
    id: child.id,
    name: getI18nText(child.name, locale),
    slug: child.slug,
    icon: getFallbackIcon(child.id),
  };
}

export function toCategorySummaryFromDraft(
  draftCategory: { id: string; name: string; icon: string | null },
): CategorySummary {
  return {
    id: draftCategory.id,
    name: draftCategory.name,
    slug: draftCategory.id,
    icon: draftCategory.icon ?? getFallbackIcon(draftCategory.id),
  };
}
