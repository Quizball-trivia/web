# Image MCQ (Q4 of each half) — handoff

Branch: **`feat/image-questions`** in BOTH repos (`frontend-web-next` and `backend-node`).
Status: working end-to-end on staging. Q4 is **hardcoded to one test category** for now.

---

## What this feature does

In a **ranked possession match**, the **4th question of each half** (so **2 per game**) is a
**multiple-choice question with an image** shown above the prompt. The image is served
optimized (resized WebP, ~56 KB instead of the ~1.9 MB raw PNG) and preloaded so it appears
smoothly.

Everything else (Q1–3, Q5–6, penalties) is unchanged.

---

## How it works (the flow, end to end)

### Backend — pick an image MCQ for Q4
`backend-node/src/realtime/possession-question-dispatch.ts`

- The per-half question type sequence lives in `possession-payload-mappers.ts`
  (`NORMAL_HALF_SEQUENCE`). Slot index = `normalQuestionsAnsweredInHalf % POSSESSION_QUESTIONS_PER_HALF`.
  **Q4 = slot index 3.**
- `isImageMcqSlot(state)` detects slot 3 (`IMAGE_MCQ_SLOT_INDEX = 3`).
- When it's the image slot, `maybePickQuestionForState()` calls `pickImageMcqForState(matchId)`
  → `matchQuestionsRepo.getRandomImageMcqCandidatesForMatch({ matchId, categoryIds, limit })`.
- If no image MCQ is available (empty pool / all already used), it **falls back to a normal
  MCQ** so the match never stalls.
- `pickFirstValidCandidate()` is the single validator used by both the normal and image paths
  (so they can't drift).

### Backend — image-MCQ DB query
`backend-node/src/modules/matches/match-questions.repo.ts` → `getRandomImageMcqCandidatesForMatch`

Selects `published`, `mcq_single`, in an **active** category, whose payload has a non-empty
`image.url` (via the shared `MCQ_HAS_IMAGE_CONDITIONS_RAW` fragment in
`backend-node/src/db/sql-fragments.ts`), excluding questions already used in the match. Picks at
random.

> An image MCQ is just a normal `mcq_single` question whose `question_payloads.payload` contains
> an `image` object with a non-empty `url`. There is no separate question type.

### Backend — send the image to the client
`backend-node/src/realtime/socket.types.ts` (`QuestionImageDTO`, added to `MultipleChoiceQuestionDTO`)
`backend-node/src/modules/matches/matches.service.ts` (`buildQuestionAssets`, mcq_single case)

The MCQ DTO now carries `image?: { url, width, height, aspectRatio? }`, populated from the
parsed payload. This DTO is what `match:question` emits.

### Frontend — render + optimize + preload
- `frontend-web-next/src/lib/realtime/socket.types.ts` — mirrors `QuestionImageDTO` on
  `MultipleChoiceQuestionDTO` + `ResolvedMultipleChoiceQuestion`.
- `frontend-web-next/src/lib/domain/gameQuestion.ts` — `image?` on `GameQuestion`.
- `frontend-web-next/src/features/possession/realtimePossession.helpers.ts` —
  `toMultipleChoiceGameQuestion` passes `image` through.
- `frontend-web-next/src/components/game/QuestionImageCard.tsx` (NEW) — the card. Fixed height
  band, `object-contain` (never crops the answer), hides itself on error. Requests the
  **optimized** URL.
- `frontend-web-next/src/lib/images/optimizeSupabaseImage.ts` (NEW) — rewrites a Supabase
  storage object URL to its on-the-fly transform (`render/image/...?width=800&quality=70&format=webp&resize=contain`).
  `QUESTION_IMAGE_TRANSFORM` is the chosen variant. Passes non-Supabase URLs through unchanged.
- `frontend-web-next/src/components/game/PossessionQuestionPanel.tsx` — renders
  `<QuestionImageCard>` above the prompt and **auto-scrolls the options into view** on mobile
  (image MCQs push them below the fold).
- `frontend-web-next/src/features/possession/hooks/useRealtimePossessionMatchController.ts` —
  **preloads the same optimized URL** the moment the question arrives (so it's warm at render).

---

## ⚠️ The hardcoded TEST pin — what to change tomorrow

Right now **every Q4 is pinned to one category** ("Maradona's World Cup Legacy",
`a7e48fee-b708-4272-acdc-854588179393`), ignoring the categories the players actually drafted.
This was deliberate so we could test the UI with the only category that has image questions.

It lives in **one place**:

```ts
// backend-node/src/realtime/possession-question-dispatch.ts  (~line 77)
const IMAGE_MCQ_TEST_CATEGORY_IDS = ['a7e48fee-b708-4272-acdc-854588179393'];
```

and is used in `pickImageMcqForState` (~line 344):

```ts
async function pickImageMcqForState(matchId: string): Promise<PickedQuestion | null> {
  const rows = await matchQuestionsRepo.getRandomImageMcqCandidatesForMatch({
    matchId,
    categoryIds: IMAGE_MCQ_TEST_CATEGORY_IDS,   // ← hardcoded
    limit: SPECIAL_QUESTION_CANDIDATE_LIMIT,
  });
  ...
}
```

### To make Q4 read from the REAL drafted (banned-survivor) categories

The good news: `maybePickQuestionForState(matchId, state, categoryIds)` **already receives the
real categories** for the current half — `categoryIds` comes from
`categoryIdsForCurrentHalf(state, cache)` (see `possession-question-dispatch.ts` ~line 556).
These are exactly the categories left after the banning phase.

So the change is small:

1. **Pass the real categories into the image picker.** Thread `categoryIds` through:
   ```ts
   // in maybePickQuestionForState:
   const imagePicked = await pickImageMcqForState(matchId, categoryIds);

   // pickImageMcqForState(matchId, categoryIds):
   const rows = await matchQuestionsRepo.getRandomImageMcqCandidatesForMatch({
     matchId,
     categoryIds,                 // ← the drafted categories, not the hardcoded one
     limit: SPECIAL_QUESTION_CANDIDATE_LIMIT,
   });
   ```
2. **Delete** `IMAGE_MCQ_TEST_CATEGORY_IDS` and the `// TEST ONLY` comments.
3. The repo query already filters by `category_id = ANY($categoryIds)` + `c.is_active = true` +
   has-image, so once you pass the drafted categories it "just works": Q4 pulls an image MCQ
   **from one of the two drafted categories**, and falls back to a normal MCQ if neither drafted
   category has an image question yet.

That's it — the fallback already covers categories that don't have image questions, so you can
roll this out incrementally as you add image questions to more categories.

> Optional polish for later: prefer image questions when available but still pull from the
> drafted categories; maybe weight selection so Q4 is image **only if** a drafted category has
> one. The current fallback already gives that behavior.

---

## When you add image questions to other categories

1. Create them via the CMS (image MCQs are `mcq_single` with an `image` in the payload — the
   image-MCQ generator already does this). Confirm they're **`published`** and the **category is
   `is_active = true`**.
2. No code change needed once the TEST pin is removed (step above) — the query finds any
   published image MCQ in an active drafted category automatically.
3. Quick DB sanity check (psql against staging `nsdfiprfmhdqhbfxfwpv`):
   ```sql
   -- published image MCQs per category
   SELECT q.category_id, count(*)
   FROM questions q JOIN question_payloads qp ON qp.question_id = q.id
   WHERE q.status='published' AND q.type='mcq_single'
     AND (CASE WHEN jsonb_typeof(qp.payload)='object' THEN qp.payload
               WHEN jsonb_typeof(qp.payload)='string' THEN (qp.payload #>> '{}')::jsonb END) ? 'image'
   GROUP BY 1;
   ```

---

## Image optimization (WebP)

- Source images are full-res PNGs in Supabase storage (~1.9 MB). We serve a resized WebP via
  Supabase's transform endpoint: **`width=800, quality=70, format=webp, resize=contain`** →
  **~56 KB, visually identical** at card size. (`resize=contain` is required — Supabase defaults
  to `cover`, which distorts the aspect ratio when only width is set.)
- Chosen with the A/B tool at **`/dev/image-compare`** (loads raw vs WebP variants, shows real
  per-image load time + KB, warm/cold toggle).
- The transform is applied **frontend-side only** (`optimizeSupabaseImage` in `QuestionImageCard`
  and the preloader). The raw URL stays in the DB untouched. If you later want it server-side,
  apply the same transform in the backend DTO builder.

---

## Dev / preview tools (safe to keep or remove)

- `/dev/animations` → green **"🖼️ Q4 image MCQ"** button: jumps straight to the image MCQ
  (qIndex 3) so you can preview the card without playing a full match.
- `/dev/image-compare`: the raw-vs-WebP load/quality comparison tool.

---

## Verify

- Backend: `npm run build` (tsc) + `npm test` — green.
- Frontend: `npm run typecheck` + `npm run lint` (0 errors) + `npm test` — green.
- Live: play a ranked match against staging; Q4 of each half shows a Maradona image MCQ, options
  auto-scroll into view, image is the small WebP.

## Notes / gotchas

- The frontend must point at a backend that accepts your origin. For local dev set
  `frontend-web-next/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:8001` and restart
  `npm run dev` (NEXT_PUBLIC vars are read at startup, not hot-reloaded).
- `.env.local` is gitignored — not part of this branch.
- This branch was split off `staging` and contains ONLY the image-question work; other in-flight
  staging changes are not included.
