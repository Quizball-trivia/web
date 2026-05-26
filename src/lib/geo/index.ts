// Barrel re-exports for the geo dataset + opponent-location resolver.
// The data and resolution logic was extracted from
// `src/features/game/components/MatchmakingMapScreen.tsx` so that
// component can stay focused on rendering and animation. Anything that
// just needs to resolve a player's location to a map pin should import
// from `@/lib/geo`, not the screen component.

export type { OpponentLocationCandidate } from "./cities";
export {
  CITY_DATA,
  EXTRA_SEARCH_LOCATIONS,
  SEARCH_PLAYER_NAMES,
} from "./cities";
export {
  CITY_ALIASES,
  CITY_LOCATION_OVERRIDES,
  COUNTRY_ALIASES,
  COUNTRY_CODE_TO_KEY,
  COUNTRY_LOCATION_FALLBACKS,
} from "./countries";
export { getGeoObject, resolveOpponentLocation } from "./resolveLocation";
export {
  MAP_W,
  MAP_H,
  PROJ_SCALE,
  PROJ_CENTER,
  clamp,
  projectPoint,
} from "./projection";
