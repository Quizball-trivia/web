# Table Derby — game spec (accumulating, round by round)

Source: the Betsson Sport YouTube show "მაგიდის დერბი" + owner's descriptions
with show stills. The online game must feel like the broadcast graphics.
**All player-facing content is Georgian only — no English words anywhere in
the UI.** Internal code/docs stay English.

Match container: 1v1 real-time, best-of-4 rounds (rounds won decide; 2–2 →
penalties tiebreaker). Details per round below as they are specified.

## Product shell (owner: 2026-09-05 "menu, main match, daily challenges,
## weekend league, leaderboard; every user has tickets, 5 each")

- **Menu**: Table Derby hero card (costs 1 ticket) + Daily Challenges +
  Weekend League + Leaderboard. Ticket pill under the logo.
- **Tickets**: 5 per user. *Prototype assumptions to confirm:* refill to 5
  every Georgian day; only the 1v1 match costs a ticket (daily challenge
  is free); 0 tickets → play blocked with a "renews tomorrow" notice.
- **Daily challenge** (prototype): solo ჩამოთვალე — one deterministic
  category per Georgian day, 3 lives, 10s per answer, score = correct
  answers, one attempt/day.
- **Weekend League** (prototype): matches earn qualification points —
  win +25 / loss +10, target 200 (values borrowed from Quizball WL —
  confirm for Table Derby); progress bar + rules + "prizes by
  Betsson.sport" (prize fulfilment is Betsson-side per the brief);
  qualified state shows a banner, entry CTA still "coming".
- **Leaderboard** (prototype): weekly list, mock players + your row (your
  QP), highlighted.
- Shell state is localStorage in the prototype (`lib/state.ts`); all of it
  moves server-side in the real build.

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

## Round 2 — ბარათონი ("Cards")

**Format:** draw-and-guess card round with steals. 20 face-down cards on
the table, one random category per round (e.g. African players).

**Flow (owner, 2026-09-05):**
1. Category appears randomly; 20 branded cards lie face-down.
2. Players alternate draws. The drawer flips a card — **both players see
   it** — and has **10 seconds** to guess.
3. If the drawer fails (wrong/timeout), the opponent can **steal** and
   guess the same card.
4. Round ends when all cards are drawn OR when a player's lead can no
   longer be caught ("no point continuing" → early end).
5. Higher score wins the round.

**From the stills:** black card backs with betsson.sport + orange show
logo; face = warm/light card with a big **corner number** (the show card
shows "3") + lightning + the image (club crest in the example) + X sticker.

**Prototype assumptions to confirm:**
- The corner number = the card's **point value** (mixed 1–3 values in the
  deck) — this is what makes the early-end math meaningful.
- Steal window uses the same 10s; a failed steal just discards the card
  (no penalty).
- Draw order alternates every card regardless of steal outcomes; round 2
  is started by the **loser of round 1** (RPS only before round 1).
- A tied round-2 score is reported as a round tie (no round awarded) —
  needs a ruling (sudden-death card?).
- Online card faces are text clues (country + club → name the player)
  until an image/CMS pipeline exists; the show uses images (crests,
  photos).

## Round 3 — პაპა კარლოს ყუთი (Papa Carlo's Box)

**Owner (2026-09-05):** a 3D box with **5 sides** that players can roll.
Each side holds **2 category cards**; each card shows how many questions
it has left. On your turn you roll the box, click a card, get its next
question, and the time limit starts. Turns alternate.

**Assumptions to confirm:**
- Steal rule: owner's text says "if he gets it correctly the 2nd player
  can steal" — assumed typo for "can NOT get it" (steal-on-failure, like
  ბარათონი).
- Questions per card: unspecified (older brief said 3) — prototype uses
  **2 per card** (10 cards × 2 = 20 questions) to keep online matches
  snappy.
- Time limit per question: unspecified — prototype uses **15s** (reading
  time), steal window 10s.
- Scoring: +1 per correct (incl. steals); early end when the lead is
  uncatchable; higher score wins.

## Round 4 — ვინ ვარ მე? (Who Am I, buzzer)

**Owner (2026-09-05):** clues appear one by one; **whoever presses the
buzzer first answers**. Right **+10**, wrong **−10**. **10 questions**
per round.

**Assumptions to confirm:**
- A player who answers wrong is locked out of that question; clues keep
  revealing for the other player.
- Clue cadence ~3.5s; buzzer-holder gets ~8s to type the answer; clues
  exhausted with no correct answer → reveal, nobody scores.
- Higher total wins the round (score can go negative).

## Match flow assumptions (pending owner rulings)
- Early clinch: at 3-0/3-1 the match ends without the remaining round(s).
- A tied round awards nobody the round; 2-2 (or tie-inflected equal
  scores) → penalties.
- Round N+1 is started by the loser of round N (RPS only before round 1).

## Tiebreaker — პენალტები (Penalties)

**Owner (2026-09-05):** if the match is tied after 4 rounds — **10 random
questions, buzzer format** (first press answers), **no minus points** for
wrong answers. *Assumptions:* wrong answer locks you out of that question
only; nobody buzzes → reveal and move on; still tied after 10 → sudden
death questions until decided.

## Results screen

**Owner (2026-09-05):** proper post-match results like Quizball ranked —
shows QP gained/lost. *Prototype:* win **+25 QP**, loss **−10 QP**
(floor 0; numbers need confirmation), animated WL progress bar to the
200 target, rounds score, play-again/menu.
