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

Follow the established visual language consistently:

**Colors:**
- Background: `#131F24`
- Cards: `#1B2F36`
- Blue (primary): `#1CB0F6`
- Green (success): `#58CC02`
- Red (error): `#FF4B4B`
- Orange (warning): `#FF9600`
- Purple (accent): `#CE82FF`
- Muted text: `#56707A`

**UI patterns:**
- Chunky 3D borders: `border-b-4 border-[darker shade]` on cards, buttons, badges
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
