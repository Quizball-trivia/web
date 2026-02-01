```markdown
# QuizBall Frontend Coding Practices (Next.js App Router)

This document defines coding standards and architecture rules for the QuizBall frontend (**Next.js App Router**, **TypeScript**, **Tailwind**, **TanStack Query**, **Zustand**, **OpenAPI-generated types**).

---

## Non-Negotiables

1. **No `any`.** Use generated OpenAPI types or frontend domain types.
2. **Server state lives in TanStack Query.** (API responses, lists, details)
3. **Game session state lives in Zustand.** (round loop, timers, answers, score, stage machine)
4. **Gameplay does not depend on live queries mid-session.** Fetch once → map → hydrate store.
5. **Repositories never return UI/domain models.** Repos return raw OpenAPI-typed results.
6. **Mappers/DTOs own transformation.** UI components never “dig through” API response shapes.
7. **Next.js Server/Client boundaries are explicit.** Do not accidentally import client hooks into server components.

---

## Architecture Overview

### Data flow (server state)

OpenAPI Types (src/types/api.generated.ts)
↓
Repositories (src/lib/repositories/) // API calls, raw OpenAPI types
↓
Mappers/DTOs (src/lib/mappers/, src/lib/dtos/) // transform to frontend domain
↓
Query Hooks (src/lib/queries/) // TanStack Query hooks return domain models
↓
UI (src/app/, src/components/)

### Data flow (gameplay)

Query (fetch questions once) → map to GameQuestion[] → Zustand gameSession.startSession()
→ /game reads only from Zustand

---

## Next.js App Router Rules (Server vs Client)

### Server Components (default)
- Files under `src/app/**` are **Server Components by default**.
- Server components can:
  - render layout/page shell
  - import other server components
  - pass props to client components

### Client Components (`"use client"`)
Use `"use client"` only when you need:
- `useState`, `useEffect`, `useMemo`, `useCallback`
- TanStack Query hooks (`useQuery`, `useMutation`)
- Zustand hooks
- browser APIs (`localStorage`, `window`, `document`)
- navigation hooks (`useRouter`, `usePathname`)

**Rule:** Keep server layouts server-only; put client logic in dedicated client components.

✅ Good:
- `src/app/(app)/layout.tsx` (server) imports `<AppAuthGate />` (client)

❌ Bad:
- layout.tsx uses `useEffect` or Zustand directly.

---

## State Management Decision Tree (Updated)

Is it data from the backend (API)?
├── YES → TanStack Query (server-state)
│ - caching, retries, loading/error, refetch rules
│
└── NO → Is it the active game session (match runtime)?
├── YES → Zustand (game-state store)
│ - stages, timer, answers, score, opponent
│
└── NO → Is it shared UI state across many screens?
├── YES → Zustand (ui store) OR Context (rare)
└── NO → local useState/useReducer

### Examples
- **TanStack Query:** categories list, featured categories, question details, user profile.
- **Zustand game store:** current round index, selected answer, stage transitions, score.
- **Local state:** modal open/close, input field value, tab selection inside one page.

---

## OpenAPI Type Safety Rules

### Always prefer generated types for API shapes
```ts
import type { paths, components } from "@/types/api.generated";
type CategoryResponse = components["schemas"]["CategoryResponse"];
```

### Domain models are frontend-owned
Domain models live in src/lib/domain/* and represent what the UI/game needs — not what the API returns.

Example:
- API: CategoryResponse with i18n fields, metadata, nested wrappers
- Domain: CategorySummary { id, name, slug, ... }

### Repositories (API access layer)
Location: src/lib/repositories/*

Rules:
- Repositories only talk to the API.
- Return raw OpenAPI-typed results (or the typed client’s { data, error } shape).
- No mapping inside repos.
- Minimal surface area and easy to test.

Example:
```ts
// src/lib/repositories/categories.repo.ts
import { api } from "@/utils/api";

export function listCategories(query?: { status?: string }) {
  return api.GET("/api/v1/categories", { params: { query } });
}
```

### Mappers / DTOs (Transformation layer)
Location:
- src/lib/mappers/* (pure mapping functions)
- src/lib/dtos/* (optional: DTO types per screen/feature)

Rules:
- Mapping is deterministic and stable (no random values each render).
- If UI needs placeholders not in API (rank, popularity), do:
  - constants OR stable hash based on id.
- Never leak raw API shapes into UI components.

Example:
```ts
export function toCategorySummary(apiCategory: CategoryResponse): CategorySummary {
  return {
    id: apiCategory.id,
    name: apiCategory.name?.en ?? "Untitled",
    slug: apiCategory.slug,
  };
}
```

### TanStack Query Rules (Server-state)
Location: src/lib/queries/*

Rules:
- Each hook returns domain models, not raw API.
- Use queryKeys.ts for consistent keys.
- Use enabled for id-based queries.
- Prefer staleTime defaults; avoid refetch-on-focus unless needed.

Example:
```ts
export function useFeaturedCategories() {
  return useQuery({
    queryKey: queryKeys.featuredCategories(),
    queryFn: async () => {
      const { data, error } = await featuredRepo.listFeaturedCategories();
      if (error) throw new Error(error.message);
      return data.data.map(toFeaturedCategory);
    },
  });
}
```

### Gameplay Integration Rule (Hydrate Zustand)
Gameplay should not “depend on queries” mid-match.

Pattern:
- queryClient.fetchQuery(...) to get questions (server state)
- map -> GameQuestion[]
- gameSession.startSession({ questions })
- Navigate to /game
- /game renders from store only

---

## Component Structure (Updated for Next.js)

Use this structure for client components:

```tsx
// 1) Imports (ordered)
import { memo, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import type { GameQuestion } from "@/lib/domain/game";

// 2) Types
interface QuestionCardProps {
  question: GameQuestion;
  onAnswer: (index: number) => void;
  disabled?: boolean;
}

// 3) Component
export const QuestionCard = memo(function QuestionCard({
  question,
  onAnswer,
  disabled = false,
}: QuestionCardProps) {
  // 3a) Hooks
  const router = useRouter();

  // 3b) State
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 3c) Derived
  const isCorrect = useMemo(() => {
    if (selectedIndex === null) return false;
    return selectedIndex === question.correctIndex;
  }, [selectedIndex, question.correctIndex]);

  // 3d) Handlers
  const handleSelect = useCallback((index: number) => {
    if (disabled) return;
    setSelectedIndex(index);
  }, [disabled]);

  const handleSubmit = useCallback(() => {
    if (selectedIndex === null) return;
    onAnswer(selectedIndex);
  }, [selectedIndex, onAnswer]);

  // 3e) Render
  return (
    <div className="rounded-xl p-4">
      <h3 className="text-lg font-semibold">{question.prompt}</h3>
      <div className="mt-4 space-y-2">
        {question.options.map((opt, idx) => (
          <Button
            key={idx}
            onClick={() => handleSelect(idx)}
            disabled={disabled}
            variant={selectedIndex === idx ? "default" : "outline"}
            className="w-full justify-start"
          >
            {opt}
          </Button>
        ))}
      </div>
      <Button onClick={handleSubmit} disabled={selectedIndex === null} className="mt-4 w-full">
        Submit Answer
      </Button>
    </div>
  );
});
```

---

## Error Handling

### TanStack Query
- Query functions should throw on API error so Query handles state.
- UI uses isLoading, isError, error.

### ApiError handling
- If your typed client throws ApiError, handle globally where possible.
- For auth errors:
  - 401: refresh occurs in apiFetch logic (already implemented)
  - if refresh fails: clear tokens and redirect to login (in auth gate / store)

---

## Performance Guidelines
- Use memo only when the component is:
  - used in lists OR rerenders frequently OR has expensive rendering
- Use useMemo only for:
  - expensive derived data or stable objects passed to memo children
- Use useCallback for:
  - callbacks passed to memo children
- Avoid creating new objects inline for props when it breaks memoization.

---

## Naming and File Conventions

### Files
- Components: PascalCase.tsx
- Query hooks: *.queries.ts
- Repositories: *.repo.ts
- Mappers: *.mapper.ts
- Domain types: src/lib/domain/*.ts

### Exports
- Prefer named exports for utilities/mappers/repos.
- Default exports only for pages/layouts.

### Imports Order
1. React / Next core
2. Third-party
3. Stores/hooks
4. Components
5. Types
6. Utils/constants

---

## Testing / Verification Commands
```bash
npm run typecheck
npm run lint
npm run build
```

Manual test checklist (report as PASS/FAIL/NOT RUN):
- Logged out: protected routes redirect to /auth/login
- Logged in: /play loads real categories/featured
- Start session: /play -> /game, questions populated
- Refresh /game: idle redirects to /play (expected)
- OAuth callback hash parse stores tokens and bootstraps user

---

### What changed vs your old doc (high-signal)
- **Removed React Router conventions** (useNavigate, route-dom)
- **Added Next.js Server/Client boundary rules** (this is where teams usually break)
- **Replaced async custom hooks** (useEffect fetch patterns) with **TanStack Query** rules
- **Added repo/mapper/query architecture** so Codex doesn’t spaghetti-wire API into UI
- **Codified the “hydrate Zustand for gameplay” pattern** (super important)
```