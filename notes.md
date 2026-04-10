# Frontend Notes

## ESLint `react-hooks/exhaustive-deps` warnings in game hooks

**Files affected:**
- `src/features/possession/hooks/usePossessionGameLogic.ts`
- `src/features/possession/hooks/useShotOnGoal.ts`
- `src/features/game/hooks/useGameStageTransitions.ts`

**Why they exist:**
These files are game-loop hooks that intentionally omit dependencies from `useEffect` and `useCallback` arrays. The warnings fall into two categories:

1. **`store`** — Zustand's `getState()` returns a stable singleton ref that never changes identity. Adding it to deps is harmless but doesn't silence all warnings.

2. **`state.*` fields, `playSfx`, `advanceToNextQuestion`, etc.** — These are intentionally excluded to prevent infinite loops and unwanted re-fires. Game loops need effects that fire on specific triggers (e.g. question index change), not on every state mutation.

**Why we don't fix them:**
- The `exhaustive-deps` rule has no config to mark variables as stable.
- Adding the missing deps would cause infinite effect loops in game logic.
- These hooks manage frame-by-frame game state machines, not typical data-fetching effects.

**Options if we want zero warnings later:**
- Disable the rule per-file with `/* eslint-disable react-hooks/exhaustive-deps */` at the top of each game hook file.
- Add `// eslint-disable-next-line react-hooks/exhaustive-deps` per occurrence (noisy, 30+ lines).

**Current count:** ~34 warnings, 0 errors.
