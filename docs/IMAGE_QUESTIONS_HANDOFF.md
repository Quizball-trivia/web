# Image MCQ (Q4 of each half) — handoff

Branch: **`feat/featured-image-questions`** in BOTH repos (`frontend-web-next` and `backend-node`),
split off `staging` (supersedes the original `feat/image-questions` dev branch).
Status: the hardcoded test category is GONE — Q4 pulls from the **real drafted
(banned-survivor) categories**, the ranked draft pool is **featured categories only**, and the
Q4 image is **reserved + announced up-front** so the client preloads it from the half's first
question.

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
- **Reservation (NEW):** at the half's FIRST normal question, `ensureImageMcqReservedForHalf()`
  pre-picks the half's image MCQ from the drafted categories and stores
  `{ questionId, imageUrl }` in `state.imageMcq.half1|half2` (`null` = none available). The raw
  image URL is surfaced on every `match:state` of the half as `preloadImageUrls`, so the client
  warms it long before Q4. The reserved id is **excluded from normal picks** (Q1–Q3 can't steal
  it).
- When it's the image slot, `maybePickQuestionForState()` calls
  `pickImageMcqForState(matchId, state, categoryIds)`: it first re-validates the reserved
  question (`getImageMcqCandidateForMatchById` — still published/valid/unused), then falls back
  to a fresh random pick via
  `matchQuestionsRepo.getRandomImageMcqCandidatesForMatch({ matchId, categoryIds, limit })`.
  `categoryIds` are the REAL drafted categories from `categoryIdsForCurrentHalf(state, cache)`.
- If no image MCQ is available (empty pool / all already used), it **falls back to a normal
  MCQ** so the match never stalls.
- `pickFirstValidCandidate()` is the single validator used by both the normal and image paths
  (so they can't drift). It also extracts `imageUrl` for the reservation.

### Backend — featured-only ranked draft pool (NEW)
`backend-node/src/modules/lobbies/lobbies.repo.ts` → `listAllRankedEligibleCategories` /
`listRankedEligibleCategoryIds` now `JOIN featured_categories` — only **featured** categories
are offered in the ranked draft/ban phase. Since every ranked question (MCQ, put-in-order,
clue_chain "who am I", and the image MCQ) is drawn from the drafted categories, this one filter
guarantees all ranked content comes from featured categories. Feature/unfeature via the CMS
(`featured_categories` join table); the pool is cached ~5 min (`invalidateCategoryCache`).

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
  **preloads the same optimized URL** twice over: from `match:state.preloadImageUrls` the moment
  the half's first question arrives (so the picture is fully cached minutes before Q4), and
  again when the Q4 question payload itself lands (belt-and-braces; cache hit).

---

## ✅ The hardcoded TEST pin — REMOVED

`IMAGE_MCQ_TEST_CATEGORY_IDS` is gone. Q4 now pulls from the **real drafted (banned-survivor)
categories** of the current half (`categoryIdsForCurrentHalf(state, cache)`), with the
reservation + preload flow described above. The fallback covers categories that don't have
image questions yet, so the rollout is incremental: add image MCQs to more featured categories
and they start appearing automatically.

> Optional polish for later: weight selection so Q4 is image **only if** a drafted category has
> one. The current fallback already gives that behavior.

---

## When you add image questions to other categories

1. Create them via the CMS (image MCQs are `mcq_single` with an `image` in the payload — the
   image-MCQ generator already does this). Confirm they're **`published`**, the **category is
   `is_active = true`** AND **featured** (has a `featured_categories` row), otherwise the
   category can't be drafted in ranked at all.
2. No code change needed — the query finds any published image MCQ in an active drafted
   category automatically.
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
- Live: play a ranked match against staging; the draft only offers featured categories; Q4 of
  each half shows an image MCQ from a drafted category (when it has one), options auto-scroll
  into view, image is the small WebP. In the network tab the WebP request fires at the half's
  FIRST question (the `match:state` preload) and Q4's render is a cache hit.

## Notes / gotchas

- The frontend must point at a backend that accepts your origin. For local dev set
  `frontend-web-next/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:8001` and restart
  `npm run dev` (NEXT_PUBLIC vars are read at startup, not hot-reloaded).
- `.env.local` is gitignored — not part of this branch.
- Staging/prod must have at least some categories featured (`featured_categories` rows) or the
  ranked draft pool is EMPTY. Sanity check:
  ```sql
  SELECT count(*) FROM featured_categories fc JOIN categories c ON c.id = fc.category_id
  WHERE c.is_active = true;
  ```
- The ranked category pool is cached in-process for ~5 min — featuring/unfeaturing a category
  takes up to 5 min to affect new drafts (or restart / `invalidateCategoryCache`).
