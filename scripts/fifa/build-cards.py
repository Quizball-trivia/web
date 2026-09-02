#!/usr/bin/env python3
"""
Build the "Guess the FIFA Card" dataset.

Downloads public, community-mirrored SoFIFA/FUTWIZ player exports (facts: name,
rating, 6 face stats, nation, league, club) for editions FIFA 15 -> EA FC 26,
keeps the top ~60 gold OUTFIELD cards per edition, generates typo/accent-tolerant
"accepted answer" variants, and emits:

    src/features/mini-games/data/guessFifaCard.ts

Re-run to refresh or to add a new edition (drop a source in SOURCES below).
No API keys required. One-time dev tool — not shipped to the browser.

    python3 scripts/fifa/build-cards.py

Data sources are third-party mirrors of SoFIFA / FUTWIZ (see SOURCES). We store
only factual attributes and recreate the card art ourselves (no EA assets).
"""
from __future__ import annotations
import csv, io, json, re, sys, urllib.request, unicodedata
from pathlib import Path
from collections import defaultdict

UA = {"User-Agent": "Mozilla/5.0 (fifa-card-builder)"}
TARGET_PER_EDITION = 100         # keep this many top cards per edition
MIN_PER_EDITION = 30             # warn if a fallback still can't reach this
MIN_OVERALL = 75                 # "gold" floor

# edition code (int) -> display label shown on the card
EDITION_LABEL = {
    12: "FIFA 12", 13: "FIFA 13", 14: "FIFA 14", 15: "FIFA 15", 16: "FIFA 16",
    17: "FIFA 17", 18: "FIFA 18", 19: "FIFA 19", 20: "FIFA 20", 21: "FIFA 21",
    22: "FIFA 22", 23: "FIFA 23", 24: "FC 24", 25: "FC 25", 26: "FC 26", 27: "FC 27",
}
EDITION_KEY = {
    12: "FIFA12", 13: "FIFA13", 14: "FIFA14", 15: "FIFA15", 16: "FIFA16",
    17: "FIFA17", 18: "FIFA18", 19: "FIFA19", 20: "FIFA20", 21: "FIFA21",
    22: "FIFA22", 23: "FIFA23", 24: "FC24", 25: "FC25", 26: "FC26", 27: "FC27",
}
# Editions that have real card data (Stefano-Leone exports start at FIFA 15).
WANTED = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]
# Every edition shown as a spinner CATEGORY (12–26). 12–14 have no bulk data yet
# but exist so hand-authored / CMS cards can use them; the demo's random draw
# only uses editions that actually have cards (PLAYABLE_EDITIONS = WANTED).
ALL_EDITIONS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]

# SoFIFA / FUTWIZ nation name -> flag-icons code (matches the football-grid CDN,
# which ships gb-eng / gb-sct / gb-wls / gb-nir for the UK home nations).
NATION_CODE = {
    "spain": "es", "france": "fr", "brazil": "br", "germany": "de",
    "england": "gb-eng", "argentina": "ar", "portugal": "pt", "italy": "it",
    "belgium": "be", "uruguay": "uy", "netherlands": "nl", "holland": "nl",
    "croatia": "hr", "senegal": "sn", "poland": "pl", "norway": "no",
    "egypt": "eg", "korea republic": "kr", "south korea": "kr", "korea dpr": "kp",
    "sweden": "se", "slovakia": "sk", "scotland": "gb-sct", "wales": "gb-wls",
    "northern ireland": "gb-nir", "gabon": "ga", "nigeria": "ng", "denmark": "dk",
    "chile": "cl", "bosnia and herzegovina": "ba", "austria": "at", "algeria": "dz",
    "serbia": "rs", "morocco": "ma", "georgia": "ge", "ecuador": "ec",
    "colombia": "co", "turkiye": "tr", "türkiye": "tr", "turkey": "tr",
    "switzerland": "ch", "guinea": "gn", "greece": "gr", "czech republic": "cz",
    "czechia": "cz", "ivory coast": "ci", "cote d'ivoire": "ci", "côte d'ivoire": "ci",
    "ghana": "gh", "cameroon": "cm", "mexico": "mx", "united states": "us",
    "usa": "us", "canada": "ca", "japan": "jp", "china pr": "cn", "china": "cn",
    "australia": "au", "republic of ireland": "ie", "ireland": "ie", "russia": "ru",
    "ukraine": "ua", "hungary": "hu", "romania": "ro", "slovenia": "si",
    "finland": "fi", "iceland": "is", "north macedonia": "mk", "albania": "al",
    "montenegro": "me", "kosovo": "xk", "wales ": "gb-wls", "paraguay": "py",
    "peru": "pe", "venezuela": "ve", "costa rica": "cr", "panama": "pa",
    "jamaica": "jm", "mali": "ml", "tunisia": "tn", "cape verde": "cv",
    "dr congo": "cd", "congo dr": "cd", "guinea-bissau": "gw", "zambia": "zm",
    "new zealand": "nz", "israel": "il", "armenia": "am", "cyprus": "cy",
}


def nation_code(name: str) -> str:
    key = (name or "").strip().lower()
    return NATION_CODE.get(key, "")

# Primary sources, then fallbacks. `kind`:
#   sofifa_version -> one big CSV with a `fifa_version` column (many editions)
#   sofifa_plain   -> one CSV = one edition, SoFIFA column names
#   futwiz         -> one CSV = one edition, FUTWIZ column names (Name/OVR/Team/...)
REPO_ROOT = Path(__file__).resolve().parents[2]
TS_OUT = REPO_ROOT / "src/features/mini-games/data/guessFifaCard.ts"
JSON_OUT = REPO_ROOT / "scripts/fifa/cards.json"
RAW = "https://raw.githubusercontent.com"
SOURCES = [
    # cheap, one-edition-per-file first
    {"kind": "sofifa_plain", "ed": 15, "url": f"{RAW}/ModhJainam/Fifa_Systems/main/Data/players_15.csv"},
    {"kind": "sofifa_plain", "ed": 16, "url": f"{RAW}/ModhJainam/Fifa_Systems/main/Data/players_16.csv"},
    {"kind": "sofifa_plain", "ed": 17, "url": f"{RAW}/ModhJainam/Fifa_Systems/main/Data/players_17.csv"},
    {"kind": "sofifa_plain", "ed": 18, "url": f"{RAW}/ModhJainam/Fifa_Systems/main/Data/players_18.csv"},
    {"kind": "sofifa_plain", "ed": 19, "url": f"{RAW}/ModhJainam/Fifa_Systems/main/Data/players_19.csv"},
    {"kind": "sofifa_plain", "ed": 20, "url": f"{RAW}/ModhJainam/Fifa_Systems/main/Data/players_20.csv"},
    {"kind": "sofifa_plain", "ed": 21, "url": f"{RAW}/ModhJainam/Fifa_Systems/main/Data/players_21.csv"},
    {"kind": "sofifa_plain", "ed": 22, "url": f"{RAW}/ModhJainam/Fifa_Systems/main/Data/players_22.csv"},
    {"kind": "sofifa_plain", "ed": 26, "url": f"{RAW}/preetiravikiran/FIFA2026/main/fifa26_player_data.csv"},
    {"kind": "futwiz",       "ed": 25, "url": f"{RAW}/tcdn7/12-Fifa-players-insights/main/data/raw/male_players.csv"},
    # big consolidated file, only mined for editions still missing (23, 24)
    {"kind": "sofifa_version", "eds": [23, 24], "url": f"{RAW}/BafanaCode/Advanced-Data-Analysis-and-Visualization-fc24-analysis/main/male_players.csv"},
]
FALLBACKS = [
    {"kind": "sofifa_version", "eds": [23], "url": f"{RAW}/aryansain1162/fifa-player-explorer/main/male_players_legacy.csv"},
]

# ---- helpers ---------------------------------------------------------------

def to_int(v):
    if v is None: return None
    m = re.match(r"\s*(\d+)", str(v))
    return int(m.group(1)) if m else None

def strip_accents(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))

def primary_position(positions: str) -> str:
    if not positions: return ""
    return re.split(r"[,/]", positions.strip())[0].strip().upper()

def is_gk(pos: str) -> bool:
    return pos == "GK"

def name_key(s: str) -> str:
    """Face-index key: accent-stripped, lower-cased tokens sorted, hyphens split —
    sources disagree on word order and hyphenation for East-Asian and compound names."""
    toks = re.split(r"[\s\-]+", strip_accents(s or "").lower())
    return " ".join(sorted(t for t in toks if t))

def latin_ok(s: str) -> bool:
    """True if every letter is Latin (drops Arabic/Cyrillic/etc. fragments)."""
    for ch in s:
        if ch.isalpha() and "LATIN" not in unicodedata.name(ch, ""):
            return False
    return True

def display_name(short: str, long: str) -> str:
    """Turn "K. Mbappé" into "Kylian Mbappé" by expanding the initial with the
    matching given name from the long name ("O. Dembélé" + "Masour Ousmane
    Dembélé" -> "Ousmane Dembélé", not "Masour Dembélé")."""
    short = (short or "").strip()
    long = (long or "").strip()
    # any single letter initial, including non-ASCII ("İ. Gündoğan", "Á. Di María")
    m = re.match(r"^(\S)\.\s*(.+)$", short)
    if m and m.group(1).isalpha() and long:
        initial = strip_accents(m.group(1)).lower()
        surname = m.group(2)
        given = next((tok for tok in long.split()
                      if strip_accents(tok)[:1].lower() == initial), None) or long.split()[0]
        return f"{given} {surname}".strip()
    return short or long

def accepted_variants(short, long, display):
    out = []
    for v in (display, short, long):
        v = (v or "").strip()
        if v and latin_ok(v) and v not in out:
            out.append(v)
    # surname from short name ("L. Messi" -> "Messi") — the app matcher handles the rest.
    # Never accept a generational suffix or particle on its own ("Jr.", "Neto", "II").
    if short:
        toks = short.strip().split()
        while toks and _is_suffix_token(toks[-1]):
            toks.pop()
        last = toks[-1] if toks else ""
        core = re.sub(r"[^A-Za-z\u00C0-\u024F]", "", last)
        # keep the particle with the surname ("De Bruyne", "van Dijk", "de Jong"),
        # not the bare second half — that's how people actually say the name
        if len(toks) >= 2 and toks[-2].lower() in PARTICLES:
            last = f"{toks[-2]} {last}"
        if last and latin_ok(last) and last not in out and len(core) >= 3:
            out.append(last)
    return out

PARTICLES = {"de", "da", "di", "van", "von", "der", "del", "la", "le", "dos", "el", "al", "du", "des", "den", "ter"}

SUFFIX_TOKENS = {"jr", "jr.", "junior", "sr", "sr.", "ii", "iii", "iv", "filho", "neto"}
def _is_suffix_token(tok: str) -> bool:
    return tok.strip().lower() in SUFFIX_TOKENS

def open_csv(url):
    print(f"  fetching {url.split('/')[-1]} ...", flush=True)
    req = urllib.request.Request(url, headers=UA)
    resp = urllib.request.urlopen(req, timeout=180)
    # stream-decode so 90MB files don't blow up memory as one string
    text = io.TextIOWrapper(resp, encoding="utf-8", errors="replace", newline="")
    return csv.reader(text)

def norm_header(cols):
    return {c.strip().lower(): i for i, c in enumerate(cols)}

# per-edition accumulator: keep best rows, dedup by normalized display name
class Bucket:
    def __init__(self):
        self.by_name = {}   # normkey -> row dict (highest overall wins)
    def add(self, card):
        k = strip_accents(card["name"]).lower()
        cur = self.by_name.get(k)
        if cur is None or card["overall"] > cur["overall"]:
            self.by_name[k] = card
    def top(self, n):
        rows = sorted(self.by_name.values(), key=lambda r: -r["overall"])
        return rows[:n]
    def count(self):
        return len(self.by_name)

buckets = defaultdict(Bucket)
# name key -> (photoId, photoVer) from every parsed row with a real face, across all sources
FACE_INDEX: dict = {}

def truthy(v):
    return str(v).strip().lower() in ("yes", "true", "1") if v is not None else False

def make_card(ed, name_short, name_long, overall, pos, nation, league, club, stats,
              photo_id=None, real_face=None):
    # index the face first: a player who misses this edition's rating cut may still
    # be the only source of a photo for their card in another edition
    _pid = to_int(photo_id)
    if _pid and truthy(real_face):
        _disp = display_name(name_short, name_long)
        if _disp:
            _key = name_key(_disp)
            _prev = FACE_INDEX.get(_key)
            if _prev is None or ed > int(_prev[1]):
                FACE_INDEX[_key] = (_pid, str(ed))
    if overall is None or overall < MIN_OVERALL: return None
    if is_gk(pos): return None
    if not (nation and club): return None
    if any(stats.get(k) is None for k in ("pac", "sho", "pas", "dri", "def", "phy")): return None
    disp = display_name(name_short, name_long)
    if not disp: return None
    card = {
        "edition": EDITION_KEY[ed], "editionLabel": EDITION_LABEL[ed],
        "name": disp, "accepted": accepted_variants(name_short, name_long, disp),
        "overall": overall, "position": pos or "",
        "nation": nation.strip(), "nationCode": nation_code(nation),
        "league": (league or "").strip(), "club": club.strip(),
        "stats": {k: int(round(stats[k])) for k in ("pac", "sho", "pas", "dri", "def", "phy")},
    }
    # SoFIFA face id + 2-digit edition, only for players with a real face photo
    # (faceless players fall back to our own silhouette). The image is served
    # through /api/fifa-face (SoFIFA's CDN needs a Referer we spoof server-side).
    pid = to_int(photo_id)
    if pid and truthy(real_face):
        card["photoId"] = pid
        card["photoVer"] = str(ed)
        key = name_key(disp)
        prev = FACE_INDEX.get(key)
        if prev is None or ed > int(prev[1]):
            FACE_INDEX[key] = (pid, str(ed))
    return card

# ---- parsers per schema ----------------------------------------------------

def parse_sofifa(reader, want_eds, version_col=False):
    header = norm_header(next(reader))
    def col(*names):
        for n in names:
            if n in header: return header[n]
        return None
    c_short = col("short_name"); c_long = col("long_name")
    c_pos = col("player_positions", "club_position", "position")
    c_ovr = col("overall"); c_nat = col("nationality_name", "nationality", "nation")
    c_lg = col("league_name", "league"); c_club = col("club_name", "club", "team_name", "club_team_name")
    c_ver = col("fifa_version") if version_col else None
    c_id = col("sofifa_id", "player_id", "id")
    c_rf = col("real_face")
    stat_cols = {k: col(full) for k, full in
                 (("pac","pace"),("sho","shooting"),("pas","passing"),
                  ("dri","dribbling"),("def","defending"),("phy","physic"))}
    if any(v is None for v in (c_short, c_ovr, c_nat, c_club)) or any(v is None for v in stat_cols.values()):
        print(f"    !! missing expected columns; header keys sample: {list(header)[:20]}")
        return 0
    want = set(want_eds); added = 0
    for row in reader:
        if not row or len(row) <= c_ovr: continue
        if c_ver is not None:
            ed = to_int(row[c_ver]) if len(row) > c_ver else None
            if ed not in want: continue
        else:
            ed = want_eds[0]
        try:
            stats = {k: to_int(row[i]) for k, i in stat_cols.items()}
        except IndexError:
            continue
        cell = lambda i: row[i] if i is not None and len(row) > i else None
        card = make_card(
            ed,
            row[c_short] if c_short is not None and len(row) > c_short else "",
            row[c_long] if c_long is not None and len(row) > c_long else "",
            to_int(row[c_ovr]),
            primary_position(row[c_pos]) if c_pos is not None and len(row) > c_pos else "",
            row[c_nat] if len(row) > c_nat else "",
            row[c_lg] if c_lg is not None and len(row) > c_lg else "",
            row[c_club] if len(row) > c_club else "",
            stats,
            photo_id=cell(c_id),
            real_face=cell(c_rf),
        )
        if card:
            buckets[ed].add(card); added += 1
    return added

def parse_futwiz(reader, ed):
    header = norm_header(next(reader))
    def col(*names):
        for n in names:
            if n in header: return header[n]
        return None
    c_name = col("name"); c_ovr = col("ovr", "overall"); c_pos = col("position")
    c_nat = col("nation", "nationality"); c_lg = col("league"); c_club = col("team", "club")
    stat_cols = {k: col(k) for k in ("pac", "sho", "pas", "dri", "def", "phy")}
    if any(v is None for v in (c_name, c_ovr, c_nat, c_club)) or any(v is None for v in stat_cols.values()):
        print(f"    !! futwiz missing columns; header sample: {list(header)[:20]}")
        return 0
    added = 0
    for row in reader:
        if not row or len(row) <= c_ovr: continue
        try:
            stats = {k: to_int(row[i]) for k, i in stat_cols.items()}
        except IndexError:
            continue
        pos = primary_position(row[c_pos]) if c_pos is not None and len(row) > c_pos else ""
        card = make_card(
            ed, row[c_name] if len(row) > c_name else "", "",
            to_int(row[c_ovr]), pos,
            row[c_nat] if len(row) > c_nat else "",
            row[c_lg] if c_lg is not None and len(row) > c_lg else "",
            row[c_club] if len(row) > c_club else "",
            stats,
        )
        if card:
            buckets[ed].add(card); added += 1
    return added

def run_source(src):
    try:
        reader = open_csv(src["url"])
        if src["kind"] == "sofifa_plain":
            n = parse_sofifa(reader, [src["ed"]], version_col=False)
        elif src["kind"] == "sofifa_version":
            n = parse_sofifa(reader, src["eds"], version_col=True)
        elif src["kind"] == "futwiz":
            n = parse_futwiz(reader, src["ed"])
        else:
            n = 0
        print(f"    +{n} rows")
    except Exception as e:
        print(f"    !! source failed: {e}")

# ---- main ------------------------------------------------------------------

def main():
    print("Building Guess-the-FIFA-Card dataset\n")
    for src in SOURCES:
        eds = src.get("eds", [src.get("ed")])
        # skip big consolidated pulls for editions already satisfied
        if src["kind"] == "sofifa_version":
            eds = [e for e in eds if buckets[e].count() < TARGET_PER_EDITION]
            if not eds:
                print(f"  skip {src['url'].split('/')[-1]} (targets already filled)")
                continue
            src = {**src, "eds": eds}
        run_source(src)

    # fallbacks for anything still short
    for src in FALLBACKS:
        eds = [e for e in src.get("eds", []) if buckets[e].count() < MIN_PER_EDITION]
        if not eds: continue
        print(f"  fallback for editions {eds}")
        run_source({**src, "eds": eds})

    print("\nCoverage:")
    cards = []
    for ed in WANTED:
        top = buckets[ed].top(TARGET_PER_EDITION)
        flag = "" if len(top) >= MIN_PER_EDITION else "   <-- LOW"
        sample = top[0]["name"] if top else "-"
        print(f"  {EDITION_LABEL[ed]:<8} {len(top):>3} cards  (top: {sample}){flag}")
        cards.extend(top)

    if not cards:
        print("\nNo cards produced — aborting.")
        sys.exit(1)

    # stable id + sort for a clean diff
    for c in cards:
        slug = re.sub(r"[^a-z0-9]+", "-", strip_accents(c["name"]).lower()).strip("-")
        c["id"] = f"{c['edition'].lower()}-{slug}"
    cards.sort(key=lambda c: (c["edition"], -c["overall"], c["name"]))

    # Reuse a player's face across editions: sources for FC25/FC26 carry no face
    # id, so map name -> (id, most-recent ver) from the editions that do, then
    # fill the rest. The same person's face is fine on any of their cards.
    face_by_name = dict(FACE_INDEX)
    for c in cards:
        if "photoId" in c:
            k = name_key(c["name"])
            prev = face_by_name.get(k)
            if prev is None or int(c["photoVer"]) > int(prev[1]):
                face_by_name[k] = (c["photoId"], c["photoVer"])
    filled = 0
    for c in cards:
        if "photoId" in c:
            c["faceSource"] = "own"
        else:
            hit = face_by_name.get(name_key(c["name"]))
            if hit:
                c["photoId"], c["photoVer"] = hit
                c["faceSource"] = "name-match"
                filled += 1
            else:
                c["faceSource"] = "none"
        # durable identity for DB upserts: edition + sofifa id when known, else edition + name slug
        c["sourceKey"] = f"sofifa:{c['edition'].lower()}:{c['photoId']}" if c.get("faceSource") == "own" else f"sofifa:{c['id']}"
    with_face = sum(1 for c in cards if "photoId" in c)
    print(f"  faces: {with_face}/{len(cards)} cards have a photo ({filled} filled by name-match)")

    write_ts(cards)
    write_json(cards)
    print(f"\nWrote {len(cards)} cards -> {TS_OUT.relative_to(REPO_ROOT)} and {JSON_OUT.relative_to(REPO_ROOT)}")

def ts_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'

def write_ts(cards):
    editions = [EDITION_KEY[e] for e in ALL_EDITIONS]
    playable = [EDITION_KEY[e] for e in WANTED]
    lines = []
    lines.append("// AUTO-GENERATED by scripts/fifa/build-cards.py — do not edit by hand.")
    lines.append("// Factual player attributes mirrored from SoFIFA / FUTWIZ; card art is our own.")
    lines.append(f"// {len(cards)} cards across {len(WANTED)} editions (FIFA 15 -> EA FC 26).")
    lines.append("")
    lines.append("export type FifaEdition =")
    lines.append("  | " + "\n  | ".join(f'"{e}"' for e in editions) + ";")
    lines.append("")
    lines.append("export interface FifaCardStats {")
    for k in ("pac", "sho", "pas", "dri", "def", "phy"):
        lines.append(f"  {k}: number;")
    lines.append("}")
    lines.append("")
    lines.append("export interface FifaCard {")
    lines.append("  id: string;")
    lines.append("  edition: FifaEdition;")
    lines.append("  /** Card badge label, e.g. \"FC 26\" or \"FIFA 18\". */")
    lines.append("  editionLabel: string;")
    lines.append("  /** Display name revealed once solved. */")
    lines.append("  name: string;")
    lines.append("  /** Accepted answers (typo/accent/surname tolerant via matchesName). */")
    lines.append("  accepted: string[];")
    lines.append("  overall: number;")
    lines.append("  position: string;")
    lines.append("  nation: string;")
    lines.append("  /** flag-icons code for the CDN flag, e.g. \"fr\" or \"gb-eng\" (\"\" if unmapped). */")
    lines.append("  nationCode: string;")
    lines.append("  league: string;")
    lines.append("  club: string;")
    lines.append("  stats: FifaCardStats;")
    lines.append("  /** SoFIFA face id + 2-digit edition for the reveal photo (served via /api/fifa-face). */")
    lines.append("  photoId?: number;")
    lines.append("  photoVer?: string;")
    lines.append("}")
    lines.append("")
    lines.append("/** Every edition, shown as a spinner category (FIFA 12 -> FC 26). */")
    lines.append("export const FIFA_EDITIONS: FifaEdition[] = [")
    lines.append("  " + ", ".join(f'"{e}"' for e in editions))
    lines.append("];")
    lines.append("")
    lines.append("/** Editions that have real card data — used for the demo's random draw. */")
    lines.append("export const PLAYABLE_EDITIONS: FifaEdition[] = [")
    lines.append("  " + ", ".join(f'"{e}"' for e in playable))
    lines.append("];")
    lines.append("")
    # One typed array per edition, then concatenated: a single 1,000+ element
    # literal makes tsc give up ("union type too complex", TS2590).
    by_edition = {}
    for c in cards:
        by_edition.setdefault(c["edition"], []).append(c)
    chunk_names = []
    for ed_key in [EDITION_KEY[e] for e in WANTED if EDITION_KEY[e] in by_edition]:
        chunk = f"CARDS_{ed_key}"
        chunk_names.append(chunk)
        lines.append(f"const {chunk}: FifaCard[] = [")
        for c in by_edition[ed_key]:
            acc = "[" + ", ".join(ts_str(a) for a in c["accepted"]) + "]"
            st = c["stats"]
            stats = "{ " + ", ".join(f"{k}: {st[k]}" for k in ("pac","sho","pas","dri","def","phy")) + " }"
            lines.append("  {")
            lines.append(f"    id: {ts_str(c['id'])}, edition: {ts_str(c['edition'])}, editionLabel: {ts_str(c['editionLabel'])},")
            lines.append(f"    name: {ts_str(c['name'])}, accepted: {acc},")
            lines.append(f"    overall: {c['overall']}, position: {ts_str(c['position'])},")
            lines.append(f"    nation: {ts_str(c['nation'])}, nationCode: {ts_str(c['nationCode'])}, league: {ts_str(c['league'])}, club: {ts_str(c['club'])},")
            photo = f" photoId: {c['photoId']}, photoVer: {ts_str(c['photoVer'])}," if c.get("photoId") else ""
            lines.append(f"    stats: {stats},{photo}")
            lines.append("  },")
        lines.append("];")
        lines.append("")
    lines.append("export const FIFA_CARDS: FifaCard[] = [" + ", ".join(f"...{n}" for n in chunk_names) + "];")
    lines.append("")
    TS_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(TS_OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

def write_json(cards):
    """Machine-readable sidecar (all fields incl. sourceKey/faceSource) for the
    backend data migration and the review gallery."""
    JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=1)
        f.write("\n")

if __name__ == "__main__":
    main()
