# QuizBall Frontend

Quiz trivia game frontend built with Next.js 16, React 19, TanStack Query, and Zustand.

## Quick Start

```bash
npm install
cp .env.example .env.local  # Add your API URL
npm run dev
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (app)/              # Protected routes (requires auth)
│   ├── (auth)/             # Auth flows (login, register)
│   ├── (fullscreen)/       # No shell (game, onboarding)
│   └── (public)/           # Public pages (privacy, terms)
├── features/               # Feature modules (screens + components)
│   ├── game/               # Game gameplay
│   ├── store/              # In-app store
│   ├── tournaments/        # Tournament system
│   └── ...
├── components/
│   ├── ui/                 # Shadcn/ui primitives (Button, Card, etc.)
│   └── shared/             # Shared app components (LoadingScreen)
├── lib/
│   ├── api/                # API client
│   ├── repositories/       # API calls (raw types)
│   ├── mappers/            # API → Domain transforms
│   ├── queries/            # TanStack Query hooks
│   └── domain/             # Frontend domain types
├── stores/                 # Zustand stores
├── contexts/               # React contexts
├── hooks/                  # Shared hooks
├── services/               # Business logic services
├── data/                   # Static/mock data
├── types/                  # TypeScript types
└── utils/                  # Utility functions
```

## Adding a New Feature

1. Create `src/features/<name>/`
2. Add `<Name>Screen.tsx` (main screen)
3. Add `components/` for feature-specific components
4. Add `hooks/` for feature-specific hooks
5. Create route in `src/app/(app)/<name>/page.tsx`

## Architecture

See [CODING-PRACTICES.md](./CODING-PRACTICES.md) for detailed patterns.

**Data Flow:**
```
API → Repository → Mapper → Query Hook → UI Component
```

**State Management:**
- Server state: TanStack Query
- Client state: Zustand
- Local state: useState

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run typecheck  # TypeScript check
npm run lint       # ESLint
npm run api:sync:local  # Sync OpenAPI types
```
