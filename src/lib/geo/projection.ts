import { geoNaturalEarth1 } from "d3-geo";

/**
 * Map projection constants for the matchmaking world map.
 *
 * Decoupled from the React component so the same projection can be
 * shared by anything else that needs to translate lon/lat → screen
 * coordinates (currently only the matchmaking screen, but kept here
 * alongside the geo dataset for findability).
 *
 * Values are tuned to match react-simple-maps' ComposableMap config:
 * keep them in sync with the props the screen passes to <ComposableMap>.
 */
export const MAP_W = 1000;
export const MAP_H = 550;
export const PROJ_SCALE = 170;
export const PROJ_CENTER: [number, number] = [10, 5];

const proj = geoNaturalEarth1()
  .scale(PROJ_SCALE)
  .center(PROJ_CENTER)
  .translate([MAP_W / 2, MAP_H / 2]);

/** Clamp `value` into the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Project `[lon, lat]` to `[px, py]` matching ComposableMap's internal projection. */
export function projectPoint(lon: number, lat: number): [number, number] {
  return proj([lon, lat]) ?? [MAP_W / 2, MAP_H / 2];
}
