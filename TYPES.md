# QuizBall Frontend (Next.js) — Types + Auth + Routing Guide

Goal
- Build a new Next.js App Router frontend (frontend-web-next) with clean routing + layout structure.
- Keep backend exactly as-is and integrate via a fully type-safe API client generated from backend OpenAPI.
- Recreate the SAME UI (components/colors/layout) from the old React app, but with better architecture (no prop drilling, no screen enum routing).

Non-negotiables
1) Full type safety via OpenAPI-generated types (no `any`, no `Record<string, unknown>` placeholders).
2) No “Screen enum” routing system. Use real URLs only.
3) Centralize auth refresh + retry logic inside the API client layer (single source of truth).
4) Next.js env vars use NEXT_PUBLIC_* (NOT VITE_*).

───────────────────────────────────────────────────────────────
Environment
- Backend base URL: http://localhost:8001
- Next.js env var (client accessible):
  NEXT_PUBLIC_API_URL=http://localhost:8001

───────────────────────────────────────────────────────────────
Backend Auth Endpoints (do not change backend)
Base: {NEXT_PUBLIC_API_URL}

POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/refresh          body: { refresh_token } (optional if cookie present)
POST /api/v1/auth/logout
POST /api/v1/auth/social-login     body: { provider: 'google', redirect_to: '/auth/callback' }
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password   token in header
GET  /api/v1/users/me
PUT  /api/v1/users/me

Auth transport (browser)
- Tokens are stored in **httpOnly cookies** (qb_access_token, qb_refresh_token)
- JS cannot read tokens (XSS-resistant)
- API requests must use `credentials: "include"`
- Bearer auth headers are still supported for non-browser clients

OAuth callback flow (implicit hash, Supabase-style)
- Redirect returns:
  /auth/callback#access_token=xxx&refresh_token=yyy&expires_in=3600&token_type=bearer
- Callback page must:
  1) parse URL hash
  2) call POST /api/v1/auth/refresh with refresh_token (sets cookies)
  3) call GET /api/v1/users/me
  4) route to "/"

───────────────────────────────────────────────────────────────
Types: OpenAPI → Generated TS → Typed Client

Type pipeline
Backend (Zod schemas)
  -> OpenAPI spec (http://localhost:8001/openapi.json)
  -> npm run api:sync:local
  -> src/types/api.generated.ts (DO NOT EDIT)
  -> src/utils/api.ts (type-safe client wrapper)
  -> app code uses api.GET / api.POST with full types

Required scripts (in package.json)
- api:sync:local   (fetch OpenAPI + regenerate src/types/api.generated.ts)
- typecheck        (tsc --noEmit)
- api:check        (runs api:sync:local and fails if generated file changed)

CI rule for api:check
- api:check should fail if `git diff -- src/types/api.generated.ts` is non-empty after sync
  (prevents silent drift)

Client usage example (must be fully typed)
const { data, error } = await api.GET('/api/v1/categories');
if (error) { ... }
data.data.forEach(category => category.name.en);

IMPORTANT: Do not create fake User types like `Record<string, unknown>`.
Always import real types from api.generated.ts.

───────────────────────────────────────────────────────────────
Auth architecture (clean + predictable)

We need an "Auth Gate" because:
- httpOnly cookies exist in the browser, but are not readable by JS
- On page load / refresh, we must decide:
  authenticated vs anonymous (and possibly refresh)

Terminology:
- bootstrap = one-time initialization on the client:
- Try /users/me
- If 401 → call /auth/refresh → retry /users/me
- If refresh fails → anonymous
- This must run ONCE per browser load, not on every render.

Implementation rules:
1) Keep Next.js layouts as Server Components (no hooks in layout.tsx).
2) Put client-side auth logic in client components:
   - <AppAuthGate> for protected routes
   - <PublicOnlyGate> for auth pages
3) The API client handles:
   - sending cookies (`credentials: "include"`)
   - on 401: refresh + retry once
   - if refresh fails: mark anonymous

When bootstrap completes:
- If authenticated → render protected children
- If anonymous → redirect to /auth/login (for protected routes)
- If authenticated visiting auth routes → redirect to "/"

NOTE: Bootstrap exists only to establish initial state on refresh / first load.
After that, normal navigation just uses the stored auth status.

───────────────────────────────────────────────────────────────
Routing Structure (Next.js App Router)

Route groups:
src/app
  (public)/
    terms/page.tsx
    privacy/page.tsx

  (auth)/
    auth/layout.tsx            (wrap children with <PublicOnlyGate>)
    auth/welcome/page.tsx
    auth/login/page.tsx
    auth/register/page.tsx
    auth/forgot-password/page.tsx
    auth/callback/page.tsx     (parse hash + refresh → /users/me + redirect)

  (app)/
    layout.tsx                 (shell: Sidebar + TopBar + <AppAuthGate>)
    page.tsx                   (home)
    play/page.tsx
    events/page.tsx
    leaderboard/page.tsx
    store/page.tsx
    profile/page.tsx
    settings/page.tsx
    career/page.tsx
    game/page.tsx              (/game is ONE URL; internal stages handled by state, not routing)

Sidebar items (same as old app)
- Play (/play)
- Events (/events)
- Ranks (/leaderboard)
- Store (/store)
- Profile (/profile)
- Settings (/settings)

───────────────────────────────────────────────────────────────
Migration strategy: UI recreation
- Copy/recreate UI components from old app into:
  src/components/*
- Keep styling identical (colors, spacing, typography).
- Avoid mixing routing logic into UI components (UI is dumb; navigation uses href/link).

───────────────────────────────────────────────────────────────
Immediate Next Steps (what to build next)

Checkpoint A: Types
1) Implement api generation scripts in Next.js project
2) Generate src/types/api.generated.ts from local backend
3) Implement src/utils/api.ts typed client wrapper
4) Add npm run typecheck and ensure it passes

Checkpoint B: Auth correctness
1) Implement cookie-based auth (credentials include)
2) Implement auth endpoints using typed client
3) Implement bootstrap + gates
4) Implement /auth/callback logic (refresh → /users/me)

Checkpoint C: UI wiring
1) Recreate Sidebar + TopBar styles from old app
2) Implement login/register pages UI identical to old
3) Hook forms to typed api.POST login/register

Definition of Done for this phase
- typecheck passes (no ignored build errors)
- api:check works (fails on mismatch)
- Logged-out: /profile redirects to /auth/login
- Logged-in: /auth/login redirects to /
- OAuth callback hash flow works
- UI shell matches old app visually
