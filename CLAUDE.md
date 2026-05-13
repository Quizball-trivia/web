# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this frontend repository.

## MANDATORY: Read Before Writing Code

Before writing ANY code, you MUST:
- **Follow existing patterns** — Look at how similar components/hooks/stores are already written in the codebase
- **Read backend `TYPES.md`** (`../backend-node/TYPES.md`) — Understand how API types flow from Zod → OpenAPI → frontend
- **Read backend `socket.types.ts`** (`../backend-node/src/realtime/socket.types.ts`) — Source of truth for all realtime event types
- **Read backend `docs/coding-patterns.md`** — Understand architecture rules that apply across both projects

Always match existing patterns. When in doubt, look at how similar code is already written.

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run start            # Start production server
npm run typecheck        # TypeScript check (tsc --noEmit)
npm run lint             # ESLint

# API Type Sync (backend must be running on localhost:8001)
npm run api:sync:local   # Regenerate types from backend OpenAPI spec
npm run api:check        # CI: verify types are up-to-date
```

## Architecture

Next.js App Router frontend with feature-based organization.

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
│   └── (app)/              # Main app layout group
├── features/               # Feature modules (components, hooks, logic)
│   ├── game/               # Core game UI and hooks
│   ├── possession/         # Possession match mode (game engine UI)
│   ├── home/               # Home screen
│   ├── play/               # Play/matchmaking
│   ├── tournaments/        # Events/tournaments
│   ├── profile/            # User profile
│   ├── leaderboard/        # Rankings
│   ├── dev/                # Dev tools (DevOverlay)
│   └── ...
├── stores/                 # Zustand state stores
│   ├── auth.store.ts       # Auth state
│   ├── realtimeMatch.store.ts  # Realtime match state (from socket events)
│   ├── possessionMatch.store.ts # Local possession game state
│   └── gameSession.store.ts    # Game session state
├── lib/                    # Shared libraries
│   ├── api/                # API client (openapi-fetch, type-safe)
│   ├── realtime/           # Socket.IO client, handlers, types
│   ├── auth/               # Auth utilities
│   ├── queries/            # React Query hooks
│   └── utils/              # Shared utilities
├── components/             # Shared UI components (shadcn/ui based)
├── hooks/                  # Shared React hooks
├── types/                  # TypeScript types (including api.generated.ts)
└── styles/                 # Global styles
```

### Key Patterns

**Feature modules:** Each feature in `src/features/` is self-contained with its own components, hooks, and logic. Features should NOT import from other features directly — use shared stores or libs instead.

**State management:** Zustand stores for global state. No Redux. Stores are in `src/stores/`.

**Realtime events:** Socket.IO client in `src/lib/realtime/`. Event types mirror backend `socket.types.ts`. Handlers in `src/lib/realtime/socket-handlers.ts`.

**API calls:** Type-safe API client using `openapi-fetch`. Types auto-generated from backend OpenAPI spec. Use React Query (`@tanstack/react-query`) for data fetching.

**UI components:** shadcn/ui (Radix UI primitives + Tailwind). Shared components in `src/components/`.

## Type Safety — STRICT

- Strict TypeScript (`strict: true` in tsconfig)
- **No `any`** — use proper types or `unknown` with type guards
- API types auto-generated: `npm run api:sync:local` → `src/types/api.generated.ts`
- Socket event types in `src/lib/realtime/socket.types.ts` — must mirror backend `socket.types.ts`
- Always run `npm run typecheck` before considering code complete
- When backend types change, regenerate with `npm run api:sync:local`

### Type Sync Flow

```
Backend Zod Schemas → OpenAPI Spec (/openapi.json) → openapi-typescript → src/types/api.generated.ts
Backend socket.types.ts ────── manually mirrored ────── src/lib/realtime/socket.types.ts
```

**After backend API changes:** Run `npm run api:sync:local` then `npm run typecheck`.
**After backend socket type changes:** Manually update `src/lib/realtime/socket.types.ts` to match.

## Design System — Duolingo-Inspired

Follow the established visual language consistently.

### Colors — use tokens, NOT raw hex

All colors are defined as Tailwind v4 design tokens in `src/styles/globals.css`
under the `:root` (HSL CSS variables) and `@theme inline` (Tailwind utility
classes) blocks. **Never write `bg-[#hex]` / `text-[#hex]` / `border-[#hex]/20`
in class strings** — use the tokens.

```tsx
// ❌ DON'T — raw hex blocks the audit test and CodeRabbit reviews
<button className="bg-[#38B60E] text-white border-[#1CB0F6]/20">Play</button>

// ✅ DO — semantic tokens, opacity modifiers work automatically
<button className="bg-brand-green text-white border-brand-cyan/20">Play</button>
```

**Brand palette — primary:**
| Token | Hex | Use |
|---|---|---|
| `brand-blue` | `#1645FF` | Score pill, navbar avatar, QUESTION pill |
| `brand-yellow` | `#FFE500` | RP pills, level XP bar, splash, COUNTDOWN tag |
| `brand-yellow-deep` | `#FCD200` | Slightly darker yellow accents |
| `brand-yellow-soft` | `#F8D34A` | Softer yellow tint |
| `brand-green` | `#38B60E` | PLAY AGAIN, correct answer, RP bar fill |
| `brand-green-deep` | `#2D950B` | `brand-green` hover/active state |
| `brand-green-light` | `#58CC02` | Bright lime, success accents (was `duo-lime`) |
| `brand-red` | `#FB3101` | DEFEAT heading, wrong answer text |
| `brand-red-soft` | `#FF4B4B` | Opponent ring, error states |
| `brand-red-light` | `#FF6B6B` | Lighter red accent |
| `brand-red-deep` | `#E04242` | Deeper red accent |
| `brand-cyan` | `#1CB0F6` | Info accent, settings icon, default link |
| `brand-cyan-deep` | `#1899D6` | Deeper cyan accent |

**Brand palette — accents & neutrals:**
| Token | Hex | Use |
|---|---|---|
| `brand-orange` | `#FF9600` | Warm accents, warnings |
| `brand-orange-light` | `#FF8A3D` | Softer orange |
| `brand-purple` | `#CE82FF` | Special-mode accents |
| `brand-gold` | `#FFD700` | RP / leaderboard highlights |
| `brand-gold-deep` | `#B8860B` | Darker gold |
| `brand-slate` | `#56707A` | Muted text, secondary metadata |
| `brand-slate-deep` | `#3A4F56` | Darker slate |
| `brand-slate-light` | `#9CB6C2` | Light muted text on dark surfaces |

**Surface palette:**
| Token | Hex | Use |
|---|---|---|
| `surface-page` | `#071013` | Deepest page background |
| `surface-page-alt` | `#0F1420` | Alternate page background |
| `surface-page-deep` | `#101820` | Deeper page variant |
| `surface-darkest` | `#0D1117` | Deepest standalone surface |
| `surface-card-deep` | `#0D1B21` | Chunky card bottom border |
| `surface-card-deeper` | `#0F1F26` | Deepest card surface |
| `surface-card` | `#1B2F36` | Card body |
| `surface-card-tint` | `#243B44` | Card tint, hover state |
| `surface-card-light` | `#2A4A55` | Slate-like card surface |
| `surface-deep` | `#131F24` | Overlay surface |
| `surface-input` | `#17222A` | Input field background |

**Pre-existing semantic tokens** (still work as before): `bg-card`, `bg-background`,
`text-primary`, `text-foreground`, `border-border`, `text-muted-foreground`,
`text-destructive` — see `globals.css` for the full list.

### Opacity

HSL CSS vars compose with Tailwind's opacity modifier — `bg-brand-cyan/20`,
`border-brand-yellow/30`, `text-brand-red/50` all work without further config.

### Adding a new color

1. **First, check the existing palette.** 90% of new UI should map to an
   existing token. If you find yourself typing `bg-[#…]`, pause and ask
   whether `bg-brand-X` / `bg-surface-X` covers it.

2. **Run `npm run colors:audit`** — if your hex appears in the report and is
   used 5+ times across the codebase, it deserves a token.

3. **Add the token** in `src/styles/globals.css`:
   - Add an HSL value to `:root` with a comment explaining the use
     (e.g. `--brand-amber: 45 100% 50%; /* #FFC107 — coin counter */`)
   - Expose it via `@theme inline` (`--color-brand-amber: hsl(var(--brand-amber));`)

4. **Register the mapping** in `scripts/audit-brand-colors.mjs` →
   `KNOWN_TOKENS` map so the audit knows the hex → token translation.

5. **Run `node scripts/migrate-brand-colors.mjs --write`** to migrate any
   existing raw-hex usages of that color across the codebase.

6. **Update this section** of `CLAUDE.md` with the new token row.

### Verifying — the audit ratchet

A regression test (`src/__tests__/no-hex-class-colors.test.ts`) fails CI if a
file outside the allowlist (`scripts/brand-colors-allowlist.json`) introduces
new hex classes, or if the allowlist has stale entries. As you migrate files
off raw hex, remove them from the allowlist — the test enforces it stays gone.

```bash
npm run colors:audit    # human-readable per-color/per-file report
npm run colors:check    # CI-style: exit 1 on offenders / stale entries
npm run colors:update   # rewrite allowlist from the current state
```

For the full migration guide, see `docs/BRAND_COLORS.md`.

### When NOT to use a token

- **Inline `style={{ backgroundColor: '#hex' }}` props** — these aren't
  Tailwind classes and the audit ignores them. If you need dynamic colors
  (e.g. a generated user avatar bg), inline-style is fine.
- **Complex shadow expressions** like `shadow-[0_4px_8px_rgba(0,0,0,0.4)]`
  with rgba — leave as-is until we have a shadow-token system.
- **Genuine one-offs** used 1–2 times for a specific visual (e.g. a unique
  gradient stop). Keep them on the allowlist if they don't deserve a global
  token.

### UI patterns
- Chunky 3D borders: `border-b-4 border-surface-card-deep` on cards, buttons, badges
- `font-fun` class for game typography (Nunito)
- Rounded corners: `rounded-2xl` or `rounded-3xl` for game elements

**Animations:** Use `motion/react` (NOT `framer-motion`). Example:
```tsx
import { motion } from 'motion/react';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
/>
```

## Game Stage Router Pattern

When building game UI that switches between stages (matchmaking → draft → playing → results):
- **Stage Router (container):** Reads store state, coordinates transitions, selects which screen to render
- **Stage Transitions Hook:** Encapsulates side effects (socket events, stage changes) in a dedicated hook
- **Screen Components (presentational):** Accept typed props only, no store access, no socket logic

Keep routing logic in one place, not inside each screen.

## PR Checklist

Before submitting code, verify:
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] No `any` types
- [ ] Socket types match backend `socket.types.ts`
- [ ] Components follow Duolingo design patterns (colors, borders, font-fun)
- [ ] Animations use `motion/react` (not `framer-motion`)
- [ ] Feature code is self-contained in `src/features/`
- [ ] Shared state goes through Zustand stores
