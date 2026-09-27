import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { decodeShare, SHARE_COPY } from "@/features/buscaminas/buscaminas.share";
import { SITE_OG_IMAGE_PATH, SITE_URL } from "@/lib/seo/site";

export const runtime = "edge";

const COLOR = { perfect: "#58CC02", banked: "#FFE500", mine: "#FF4B4B" } as const;

/** 1200×630 result card for a shared Buscaminas link: score and the 20 round squares. */
export function GET(req: NextRequest) {
  const result = decodeShare(req.nextUrl.searchParams.get("c"));
  if (!result) return NextResponse.redirect(new URL(SITE_OG_IMAGE_PATH, SITE_URL), 302);
  // The default image font has no Georgian glyphs, so Georgian cards use the English lines.
  const copy = SHARE_COPY[result.locale === "ka" ? "en" : result.locale];
  const rows = [result.outcomes.slice(0, 10), result.outcomes.slice(10, 20)];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #1645FF 0%, #0b1530 70%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 58, fontWeight: 900, letterSpacing: -1, textTransform: "uppercase" }}>
          <span>{copy.brandA}</span>
          <span style={{ color: "#FFE500", marginLeft: 18 }}>{copy.brandB}</span>
          <span style={{ color: "rgba(255,255,255,0.6)", marginLeft: 18 }}>#{result.number}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 10 }}>
          <span style={{ fontSize: 150, fontWeight: 900 }}>{result.score}</span>
          <span style={{ fontSize: 48, fontWeight: 800, marginLeft: 14, color: "rgba(255,255,255,0.75)" }}>{copy.points}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          {rows.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: 12 }}>
              {row.map((outcome, i) => <div key={i} style={{ width: 58, height: 58, borderRadius: 12, background: COLOR[outcome] }} />)}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 40, fontWeight: 800, color: "#FFE500" }}>{copy.challenge}</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
