import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { decodePistasShare, PISTAS_SHARE_COPY } from "@/features/pistas/pistas.share";
import { SITE_OG_IMAGE_PATH, SITE_URL } from "@/lib/seo/site";

// Same runtime choice as the Buscaminas card (Edge fails with this deployment setup).
export const runtime = "nodejs";

const COLOR: Record<string, string> = { g: "#58CC02", y: "#FFE500", o: "#FF9600", r: "#FF4B4B" };

/** 1200×630 result card for a shared Pistas link: score and the ten player squares. */
export function GET(req: NextRequest) {
  const result = decodePistasShare(req.nextUrl.searchParams.get("c"));
  if (!result) return NextResponse.redirect(new URL(SITE_OG_IMAGE_PATH, SITE_URL), 302);
  // The default image font has no Georgian glyphs, so Georgian cards use the English lines.
  const copy = PISTAS_SHARE_COPY[result.locale === "ka" ? "en" : result.locale];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #1645FF 0%, #0b1530 70%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 58, fontWeight: 900, letterSpacing: -1, textTransform: "uppercase" }}>
          <span>{copy.brandA}</span>
          <span style={{ color: "#58CC02", marginLeft: 18 }}>{copy.brandB}</span>
          <span style={{ color: "rgba(255,255,255,0.6)", marginLeft: 18 }}>#{result.number}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 10 }}>
          <span style={{ fontSize: 150, fontWeight: 900 }}>{result.score}</span>
          <span style={{ fontSize: 48, fontWeight: 800, marginLeft: 14, color: "rgba(255,255,255,0.75)" }}>{copy.points}</span>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
          {[...result.letters].map((letter, i) => <div key={i} style={{ width: 70, height: 70, borderRadius: 14, background: COLOR[letter] }} />)}
        </div>
        <div style={{ display: "flex", marginTop: 38, fontSize: 40, fontWeight: 800, color: "#FFE500" }}>{copy.challenge}</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
