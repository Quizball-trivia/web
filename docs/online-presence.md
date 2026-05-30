# Online Presence ("X online" badge) — frontend

The frontend half of the site-wide online counter. Full design, Redis logic, and
the multi-server notes live in the backend doc:
`../backend-node/docs/online-presence.md`.

---

## What the frontend does

1. **Heartbeat** — on mount and every **30s**, a tiny `POST /api/v1/presence/ping`
   tells the backend "this visitor is here." It runs **app-wide, including the
   logged-out landing page**.
2. **Stores the count** — the ping response (`{ online }`) is saved in a small
   standalone store and rendered in the **"{count} online"** badge.

The badge is honestly labelled "X online" (not "players"), because it counts every
visitor — see the backend doc for why.

## Where it lives

| Piece | File |
|---|---|
| Heartbeat hook + count store | `src/hooks/usePresencePing.ts` (`usePresencePing`, `useSiteOnlineStore`) |
| Mount point (client component) | `src/components/PresencePingMount.tsx` |
| Wired into the app | `src/app/providers.tsx` (inside the client `Providers` tree) |
| Badge label | `src/features/friend/FriendMatchHubPage.tsx` + `presence.*` keys in `src/messages/{en,ka}.json` |

## Why a mount component (not the root layout)

`src/app/layout.tsx` is a **server component**, so it can't run a hook. The
`PresencePingMount` client component (`"use client"`) runs `usePresencePing()` and
renders nothing — it's mounted once inside `Providers` so the heartbeat fires
everywhere, landing page included.

## Implementation notes

- The ping is a **bare `fetch` POST** with `credentials: "include"` and **no headers
  or body** — on purpose, so it stays a CORS "simple request" and skips the preflight
  `OPTIONS` round-trip on every heartbeat.
- `credentials: "include"` carries/sets the `qb_presence_id` cookie that identifies
  the browser to the counter.
- Presence is best-effort: failed pings are swallowed and the interval keeps running.
