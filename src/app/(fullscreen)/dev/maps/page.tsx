"use client";

/**
 * Dev-only map QA page: renders the matchmaking world map with EVERY search
 * pin location (CITY_DATA + EXTRA_SEARCH_LOCATIONS) at once — no shuffle, no
 * pin cap, no camera pan/zoom — each labeled with its city name, on the
 * countries atlas (borders visible) so placements can be eyeballed per
 * country. Uses the exact same projection + percentage positioning as
 * MatchmakingMapScreen/MapPlayerPin.
 */

import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import countriesTopo from "world-atlas/countries-110m.json";
import { CITY_DATA, EXTRA_SEARCH_LOCATIONS } from "@/lib/geo/cities";
import { projectPoint, MAP_W, MAP_H, PROJ_SCALE, PROJ_CENTER } from "@/lib/geo";

const ALL_LOCATIONS = (() => {
  const seen = new Set<string>();
  return [
    ...CITY_DATA.map(({ lon, lat, city, country }) => ({ lon, lat, city, country, extra: false })),
    ...EXTRA_SEARCH_LOCATIONS.map(({ lon, lat, city, country }) => ({ lon, lat, city, country, extra: true })),
  ].filter((c) => {
    if (seen.has(c.city)) return false;
    seen.add(c.city);
    return true;
  });
})();

export default function DevMapsPage() {
  return (
    <div className="min-h-screen bg-[#0D1117] p-4">
      <div className="mb-2 text-sm text-white/70">
        dev/maps — all {ALL_LOCATIONS.length} search-pin locations (red dot = exact projected point, tip of the real pin lands there).
        Blue = CITY_DATA, orange = EXTRA_SEARCH_LOCATIONS.
      </div>
      <div className="relative w-full" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
        <ComposableMap
          width={MAP_W}
          height={MAP_H}
          projection="geoNaturalEarth1"
          projectionConfig={{ scale: PROJ_SCALE, center: PROJ_CENTER }}
          style={{ width: "100%", height: "100%", position: "absolute", inset: 0, background: "#0D1117" }}
        >
          <Geographies geography={countriesTopo}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1C2733"
                  stroke="#3D5466"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
        </ComposableMap>

        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {ALL_LOCATIONS.map((c) => {
            const [x, y] = projectPoint(c.lon, c.lat);
            return (
              <div
                key={c.city}
                className="absolute"
                style={{ left: `${(x / MAP_W) * 100}%`, top: `${(y / MAP_H) * 100}%` }}
              >
                {/* exact projected point */}
                <div
                  className="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white"
                  style={{ backgroundColor: "#FF2B2B" }}
                />
                <div
                  className="absolute left-1/2 top-[5px] -translate-x-1/2 whitespace-nowrap rounded-sm bg-black/75 px-1 py-px text-center text-[9px] font-bold leading-tight"
                  style={{ color: c.extra ? "#FFB54D" : "#6FC7FF" }}
                >
                  {c.city}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
