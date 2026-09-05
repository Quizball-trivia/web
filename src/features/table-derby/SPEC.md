# Table Derby — game spec (accumulating, round by round)

Source: the Betsson Sport YouTube show "მაგიდის დერბი" + owner's descriptions
with show stills. The online game must feel like the broadcast graphics.
**All player-facing content is Georgian only — no English words anywhere in
the UI.** Internal code/docs stay English.

Match container: 1v1 real-time, best-of-4 rounds (rounds won decide; 2–2 →
penalties tiebreaker). Details per round below as they are specified.

---

## Round 1 — ჩამოთვალე ("List them")

**Format:** turn-based listing duel with lives. Maps to the existing
`countdown_list` question content (category prompt + accepted answers), but
with a NEW turn-based loop instead of the simultaneous time-window countdown.

**Flow:**
1. **Category draw** — the category is revealed first, alone, before play
   starts (e.g. „გაიხსენეთ ჰოლანდიელები რომლებსაც მილანის მაისურით გოლი
   აქვთ გატანილი."). Show treatment: full-width dark lower-third band,
   orange badge with a "?" glyph on the left, white Mtavruli text.
2. Both players start with **3 lives**.
3. Players give answers **one at a time, alternating turns**. Online the
   answer is typed; server validates with the fuzzy Georgian matcher
   against the accepted-answers list. Duplicates (already-given answers)
   don't count.
4. **Lose a life** when: the answer is wrong, OR no answer within
   **10 seconds** of the turn starting.
5. A correct answer keeps the turn chain going — turn passes to opponent.
6. **Round winner: the survivor** — first player to lose all 3 lives loses
   the round.

**Show UI (stills, to mirror):**
- *Category card*: dark charcoal rounded band across the lower third,
  subtle tone-on-tone pattern; left-anchored orange squircle/shield badge
  with a dark "?" glyph; category text in white Georgian Mtavruli caps over
  two lines.
- *Score header (top-left)*: compact dark pill — a white numeral on each
  end, an orange slashed parallelogram in the middle showing "0-0", small
  ✕ glyphs flanking the pill.
- *Player boards (bottom, mirrored left/right)*: dark charcoal panel with
  faint horizontal ruled lines where accepted answers get written; an
  orange vertical tab attached to the panel's inner edge with a large
  numeral on top and **3 white hearts** stacked below it; player name in
  orange Mtavruli caps at the bottom edge with a lightning-bolt glyph.
  Hearts empty/deplete as lives are lost.

**Owner rulings (2026-09-05):**
- Large numeral above the hearts = that player's **correct-answer count**
  in the current round.
- Header pill: **big white end numerals = match score in rounds won**;
  the small dark "N-N" in the orange center = **score inside the current
  round**.
- First turn decided by **rock-paper-scissors** (as in the show). No
  competitive advantage to starting — online implementation: a quick RPS
  pick between the two players before the round (tie → re-throw).
- **Pool exhaustion** (all accepted answers found, both players alive):
  the category is a **tie — a new category is drawn** and the round
  continues. *Assumption to confirm: lives reset with the new category.*

**Still open:**
- Whether a wrong answer's rejected text is shown to the opponent, and
  whether the 10s turn timer is a visible countdown (prototype shows an
  orange depleting bar).

**Prototype status (2026-09-05):** playable frontend-only build at
`/table-derby` (`src/features/table-derby/`, scripted opponent, mock
categories in `data/categories.ts`). Flow: home → matchmaking → showdown →
RPS → category intro → turn-based play → round end. Duplicate answers cost
a life (show-rule interpretation — confirm). Fuzzy matching via
`@/features/mini-games/lib/matching`. Server engine port comes after the
UX is approved and more rounds are specced.

**Engine mapping:**
- Content: `countdown_list` question type (backend `questions` table) —
  Georgian prompts + accepted answers with aliases.
- Matching: `possession-answer-matching.ts` v2 (ka-aware fuzzy, particle
  stoplist) — reuse verbatim.
- Found-set/duplicate rejection: existing countdown Redis overlay — reuse.
- NEW: turn-based lives state (whose turn, per-turn 10s durable timer,
  lives per seat, elimination check) in the Table Derby round state.

---

## Round 2 — (awaiting description)

## Round 3 — (awaiting description)

## Round 4 — (awaiting description)

## Tiebreaker — Penalties (awaiting description)
