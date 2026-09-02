import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextRequest } from "next/server";
import { FIFA_CARDS } from "@/features/mini-games/data/guessFifaCard";

/**
 * Proxies a SoFIFA player face for the FIFA Cards reveal. SoFIFA's image CDN
 * 403s hotlinks (it requires a sofifa.com Referer a browser can't send), so we
 * fetch it server-side with that Referer and stream it back from our origin.
 *
 * A request is served only if it refers to a card we actually show:
 *   - preferred: a signature minted by the backend for the daily-challenge
 *     session (HMAC over `id:version` with FIFA_FACE_SIGNING_SECRET, shared
 *     with the API deployment), or
 *   - transitional: an id/version pair present in the bundled free-play
 *     dataset (the standalone mini-game still builds URLs client-side).
 * Either way the route cannot be used to enumerate the upstream CDN.
 */
export const runtime = "nodejs";

const ID_RE = /^\d{1,7}$/;
const VER_RE = /^\d{2}$/;
const SIG_RE = /^[0-9a-f]{32}$/;
const UPSTREAM_TIMEOUT_MS = 5000;
// Largest size SoFIFA serves; the card renders the face at ~236 CSS px.
const FACE_SIZE = 240;

const KNOWN_FACES = new Set<string>(
  FIFA_CARDS.filter((c) => c.photoId && c.photoVer).map((c) => `${c.photoId}:${c.photoVer}`),
);

function signatureMatches(id: string, ver: string, sig: string): boolean {
  const secret = process.env.FIFA_FACE_SIGNING_SECRET;
  if (!secret || !SIG_RE.test(sig)) return false;
  const expected = createHmac("sha256", secret).update(`${Number(id)}:${ver}`).digest("hex").slice(0, 32);
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const ver = request.nextUrl.searchParams.get("v") ?? "";
  const sig = request.nextUrl.searchParams.get("sig") ?? "";
  if (!ID_RE.test(id) || !VER_RE.test(ver)) {
    return new Response("bad request", { status: 400 });
  }
  // Either proof is enough: a valid backend signature, or a face from the bundled
  // dataset. A rotated or missing secret must never break faces we ship anyway.
  const allowed = (sig !== "" && signatureMatches(id, ver, sig)) || KNOWN_FACES.has(`${Number(id)}:${ver}`);
  if (!allowed) {
    return new Response("bad request", { status: 400 });
  }

  const padded = id.length < 6 ? id.padStart(6, "0") : id;
  const url = `https://cdn.sofifa.net/players/${padded.slice(0, -3)}/${padded.slice(-3)}/${ver}_${FACE_SIZE}.png`;

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
