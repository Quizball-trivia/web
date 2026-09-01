import { type NextRequest } from "next/server";
import { FIFA_CARDS } from "@/features/mini-games/data/guessFifaCard";
import { DAILY_CARD_SET } from "@/features/daily/dailyCardSet";

/**
 * Proxies a SoFIFA player face for the "Guess the Card" reveal. SoFIFA's image
 * CDN 403s hotlinks (it requires a sofifa.com Referer that a browser can't
 * send), so we fetch it server-side with that Referer and stream it back from
 * our own origin. Only id/version pairs that exist in our card dataset are
 * accepted, so the proxy can't be used to enumerate SoFIFA or amplify traffic
 * beyond the game's own ~720 faces.
 */
export const runtime = "nodejs";

const ID_RE = /^\d{1,7}$/;
const VER_RE = /^\d{2}$/;
const UPSTREAM_TIMEOUT_MS = 5000;

const KNOWN_FACES = new Set<string>(
  [...FIFA_CARDS, ...DAILY_CARD_SET]
    .filter((c) => c.photoId && c.photoVer)
    .map((c) => `${c.photoId}:${c.photoVer}`),
);

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const ver = request.nextUrl.searchParams.get("v") ?? "";
  if (!ID_RE.test(id) || !VER_RE.test(ver) || !KNOWN_FACES.has(`${Number(id)}:${ver}`)) {
    return new Response("bad request", { status: 400 });
  }

  const padded = id.length < 6 ? id.padStart(6, "0") : id;
  const url = `https://cdn.sofifa.net/players/${padded.slice(0, -3)}/${padded.slice(-3)}/${ver}_120.png`;

  try {
    const upstream = await fetch(url, {
      headers: {
        Referer: "https://sofifa.com/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      // let Next cache the fetched image at the data layer too
      next: { revalidate: 604800 },
    });
    if (!upstream.ok) {
      return new Response("not found", { status: 404 });
    }
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=604800, s-maxage=604800, immutable",
      },
    });
  } catch {
    return new Response("upstream error", { status: 502 });
  }
}
