import portraits from '@/data/football-grid/player-portrait-overrides.json';
import { footballGridAssetUrl, footballGridStorageImageUrl } from '@/lib/football-grid/assets';

/** Resolve by player identity, never by a display name or the shared unknown key. */
export function footballGridPortraitSources(source: string | null | undefined, playerId?: string | null): string[] {
  const resolved = footballGridAssetUrl(source);
  const pathId = resolved?.match(/\/players\/([a-f0-9-]{36})\.webp$/i)?.[1];
  const id = playerId ?? pathId;
  const reviewed = id ? (portraits as Record<string, string>)[id] : null;
  const validId = id && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id);
  // Claims can carry a missing or blocked legacy roster URL even though the
  // same player's Grid portrait exists in the release's first-party bucket.
  const grid = validId ? footballGridStorageImageUrl(`players/${id}.webp`) : null;
  const roster = validId
    ? footballGridStorageImageUrl(`player-images/${id}.webp`)
    : null;
  return [reviewed, resolved, grid, roster]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
}
