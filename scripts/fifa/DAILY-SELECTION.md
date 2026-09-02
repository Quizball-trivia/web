# FIFA Cards — daily set selection spec (backend)

The frontend `fifaCards` daily renders whatever 10 cards the backend session
returns. To make the daily a real challenge (not a parade of superstars), the
backend should pick those 10 by **difficulty** and **era**, not at random.

This is a **backend** change. The data it needs now ships in the generated
dataset (`scripts/fifa/cards.json`, ingested into the card pool).

## What's new in the card data

Each card now carries two extra fields (see `cards.json` / `guessFifaCard.ts`):

| field                     | type                                          | meaning |
| ------------------------- | --------------------------------------------- | ------- |
| `difficulty`              | `"easy" \| "medium" \| "hard" \| "veryHard"`  | How hard the player is to **name** from stats + one clue. |
| `internationalReputation` | `1..5` (optional)                             | SoFIFA reputation for **that edition** (informational; FC25 source omits it). |

`difficulty` is derived from the player's **peak career reputation** (max across
editions), their overall rating, and how old the edition is. A 4–5★ player can
never be `veryHard`, so superstars never land in the hard buckets — only genuine
role players / obscure names do. Ingest `difficulty` into the card pool (the rest
is optional). The generator prints the live histogram on every run.

## The rule

Every daily set of **10** cards must be:

- **3 `veryHard`** + **3 `hard`** + **4 from {`medium`, `easy`}**, and
- **at least 5** cards from editions **older than FIFA 2020** (i.e. edition year
  ≤ 2019 → `FIFA12`…`FIFA19`; only `FIFA15`…`FIFA19` currently have data).

The two constraints are independent — an "old" card can sit in any difficulty
tier — so they compose freely (see capacity below).

## Detecting "old"

```
OLD_EDITIONS = { FIFA12, FIFA13, FIFA14, FIFA15, FIFA16, FIFA17, FIFA18, FIFA19 }
isOld(card)  = card.edition in OLD_EDITIONS
```

(Equivalently: strip `FIFA`/`FC` from `edition` and compare the number < 20.)

## Algorithm

Deterministic per day (seed with the UTC date + challenge type so a reload can't
reroll and everyone gets the same set). Guarantee ≥5 old by **preferring old
cards** while filling the tiers — a safe split is `2 old veryHard + 2 old hard +
1 old medium/easy = 5`:

```
pick_daily(pool, dayseed, recentlyUsedIds):
    rng = seededRng(dayseed)
    usedNames = {}                       # never show the same player twice in a set

    draw(tier, n, oldQuota):
        cands = [c for c in pool
                 if c.difficulty in tier
                 and c.id not in recentlyUsedIds
                 and c.name not in usedNames]
        old = shuffle([c for c in cands if isOld(c)], rng)
        new = shuffle([c for c in cands if not isOld(c)], rng)
        picked = old[:oldQuota] + new[:n - oldQuota]
        # top up from whichever side has leftovers if a bucket ran short
        picked += (old[oldQuota:] + new[n-oldQuota:])[: n - len(picked)]
        for c in picked: usedNames.add(c.name)
        return picked

    ten = draw({"veryHard"}, 3, 2)
        + draw({"hard"},     3, 2)
        + draw({"medium","easy"}, 4, 1)

    assert count(isOld, ten) >= 5        # holds given the split above
    return shuffle(ten, rng)             # randomise presentation order
```

Tweak the medium/easy split if you want a guaranteed gimme — e.g. force at least
1 `easy` among the 4 so every set has one clearly-gettable card.

## Capacity (from the current 1,200-card pool)

| tier       | total | pre-FIFA20 | daily need | ~unique days @ 3–4/day |
| ---------- | ----- | ---------- | ---------- | ---------------------- |
| `veryHard` | 109   | 92         | 3          | ~36                    |
| `hard`     | 453   | 141        | 3          | plenty                 |
| `medium`   | 389   | 209        | 4 (w/easy) | plenty                 |
| `easy`     | 249   | 58         | ↑          | plenty                 |

`veryHard` is the tightest tier (~36 days before a 3/day draw must reuse one).
Recommend an anti-repeat window (e.g. don't reuse a card within the last ~21–30
days) and let it fall back to the full tier when exhausted. Numbers refresh each
time `build-cards.py` runs — read them from the build log, don't hard-code.
