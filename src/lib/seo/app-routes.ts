import type { Metadata } from "next";

// Metadata applied to every authenticated/runtime route group — the (app)
// and (fullscreen) layouts. These pages are client-only product surfaces
// (/play, /profile, /settings, /leaderboard, /store, /game, ...) and must
// never appear in search results.
//
// Without this, those routes export no metadata of their own and inherit the
// root layout's `index, follow` + `canonical: "/"`, which made every app page
// claim to be a duplicate of the homepage. Setting `index: false` here
// cascades to all children of each group via Next's metadata merge.
//
// Pair this with crawlable robots.txt (do NOT disallow these paths there):
// a `noindex` tag only works if Googlebot is allowed to fetch the page and
// see it. See src/app/robots.ts.
export const APP_ROUTE_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};
