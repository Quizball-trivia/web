"use client";

/**
 * Dev-only map QA page: renders the matchmaking world map with EVERY search
 * pin location (CITY_DATA + EXTRA_SEARCH_LOCATIONS) at once — no shuffle, no
 * pin cap — each labeled with its city name, on the countries atlas (borders
 * visible) so placements can be eyeballed per country. Scroll to zoom, drag
 * to pan. Markers live inside the SVG so they track the zoom exactly; the
 * projection is identical to MatchmakingMapScreen.
 */

import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import countriesTopo from "world-atlas/countries-110m.json";
import { CITY_DATA, EXTRA_SEARCH_LOCATIONS } from "@/lib/geo/cities";
import { projectPoint, MAP_W, MAP_H, PROJ_SCALE, PROJ_CENTER } from "@/lib/geo";
import { useState } from "react";

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
  const [zoom, setZoom] = useState(1);
  // Keep marker/label size roughly constant on screen as the user zooms.
  const k = 1 / zoom;

  return (
    <div className="min-h-screen bg-[#0D1117] p-4">
      <div className="mb-2 text-sm text-white/70">
        dev/maps — all {ALL_LOCATIONS.length} search-pin locations. Red dot = exact projected point (the real
        pin&apos;s tip lands there). Blue = CITY_DATA, orange = EXTRA_SEARCH_LOCATIONS. Scroll to zoom, drag to pan.
        Zoom: {zoom.toFixed(1)}x
      </div>
      <div className="relative w-full" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
        <ComposableMap
          width={MAP_W}
          height={MAP_H}
          projection="geoNaturalEarth1"
          projectionConfig={{ scale: PROJ_SCALE, center: PROJ_CENTER }}
          style={{ width: "100%", height: "100%", position: "absolute", inset: 0, background: "#0D1117" }}
        >
          <ZoomableGroup
            minZoom={1}
            maxZoom={24}
            onMoveEnd={({ zoom: z }) => setZoom(z)}
          >
            <Geographies geography={countriesTopo}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#1C2733"
                    stroke="#3D5466"
                    strokeWidth={0.5 * k}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>
            {ALL_LOCATIONS.map((c) => {
              const [x, y] = projectPoint(c.lon, c.lat);
              return (
                <g key={c.city} transform={`translate(${x}, ${y})`}>
                  <circle r={3.5 * k} fill="#FF2B2B" stroke="#fff" strokeWidth={0.8 * k} />
                  <text
                    y={9 * k}
                    textAnchor="middle"
                    fontSize={7 * k}
                    fontWeight={700}
                    fill={c.extra ? "#FFB54D" : "#6FC7FF"}
                    stroke="#000"
                    strokeWidth={2 * k}
                    paintOrder="stroke"
                  >
                    {c.city}
                  </text>
                </g>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </div>
  );
}
