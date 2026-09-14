# Country probes on the web: one per tab

Two requests answered "which country is this visitor in" on every public page, with no cache:
the Georgian phone-sign-in availability probe (backend, mounted through the guest sign-in dialog
on every page) and `/api/geo` (edge, one fetch per consumer). A single guest session showed
22 + 8 of them. Reviewed with Codex (plan v1 → v2, 2026-09-14); the country source is unchanged.

## Phone availability (`src/lib/auth/phoneAuthAvailabilityResolver.ts`)
- One in-flight request shared by all mounts; an unmount never aborts it for the others.
- Result cached in memory and in `sessionStorage` (`qb.phoneAuthAvailability.v1`: country, flag,
  timestamp; validated on read, storage errors fall back to memory) for 1 hour → a reload does not probe.
- Failures are never cached: loading settles, a 30 s cooldown suppresses retries (and never hands out an expired entry
  in place of an answer), the next mount after it probes again — and every mounted screen hears that result, so a screen
  that mounted during the failure recovers.
- Resolver-owned 8 s timeout so a hanging request cannot strand later mounts.
- Sticky per mount: a mounted screen never flips from available to unavailable (an OTP or phone-linking flow in
  progress is never closed under the user); a later "false" reaches screens mounted after it.
- `PHONE_AUTH_ENABLED` off and local-dev forced-available never touch the cache or the network.

## Geo (`src/lib/geo/useGeoEligibility.ts`)
- No request at all while `NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED` is not `"true"` (its only consumer,
  `useActiveEventMode`, ignores geo then). The flag is `"false"` on production and staging today.
- With the flag on: one memory-cached fetch per page (1 h TTL, failures not cached, 8 s timeout), and the
  page's query string is no longer forwarded (the `?geo=GE` preview trick is gone; use the route directly).
- `showBetson` and `isGeoExperimentEnabled` had no consumers and are removed from the response.

## Notes
- Freshness changes: a successful answer (true or false) is reused for up to an hour across navigation and reloads. A visitor
  whose country changes mid-visit (VPN off, border) keeps the earlier answer until the TTL runs out; before, every page probed
  again. Expiry (of the TTL or of a failure cooldown) does not refresh screens by itself: the next mount probes, and its
  result is broadcast to every screen still mounted. Experiments that read availability at submission time (onboarding, mobile-verification reminder) now see the cached
  value, earlier. Annotate the rollout date in their analysis.
- Acceptance on staging: a fresh guest tab shows exactly one phone-availability request, then zero across
  navigation AND a hard reload within the hour; zero `/api/geo` requests.
- Later, separately: validate `x-vercel-ip-country` against the backend from Georgian connections on both domains
  before considering it as the country source (Cloudflare in front can report the proxy's location).
