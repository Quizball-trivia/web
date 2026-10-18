// Playground board only, with INVENTED clue words (the real boards and clues are private content, judged on the server).
import type { CardKind, DailyClue } from "./codenames.view";

const MINE = ["ferguson-hairdryer", "cantona-seagull", "oldtrafford-theatre", "messi-goat", "bombonera-chocolates", "zidane-ram", "bernabeu-toaster", "mourinho-bus"];
const THEIRS = ["ronaldo-bottle", "bale-golf", "guardiola-chess", "haaland-robot", "yellowwall-beehive", "klopp-guitar", "mbappe-turtle"];
const NEUTRAL = ["panenka-spoon", "sansiro-corkscrew", "cuckoo-71", "kvara-volcano"];
const OWN_GOAL = "maradona-hand";

const ORDER = [
  "cantona-seagull", "haaland-robot", "panenka-spoon", "messi-goat", "ronaldo-bottle",
  "oldtrafford-theatre", "maradona-hand", "bale-golf", "bombonera-chocolates", "sansiro-corkscrew",
  "guardiola-chess", "zidane-ram", "mourinho-bus", "klopp-guitar", "kvara-volcano",
  "ferguson-hairdryer", "mbappe-turtle", "cuckoo-71", "yellowwall-beehive", "bernabeu-toaster",
];

const kindOf = (id: string): CardKind =>
  MINE.includes(id) ? "mine" : THEIRS.includes(id) ? "theirs" : NEUTRAL.includes(id) ? "neutral" : id === OWN_GOAL ? "owngoal" : "neutral";

export const FIXTURE_CARDS = ORDER.map((id) => ({ id, kind: kindOf(id) }));

export interface FixtureClue extends DailyClue { targets: string[] }

export const FIXTURE_CLUES: FixtureClue[] = [
  { word: "Northbridge Rovers", count: 3, targets: ["ferguson-hairdryer", "cantona-seagull", "oldtrafford-theatre"],
    cards: [{ id: "ferguson-hairdryer", why: "The coach's hairdryer" }, { id: "cantona-seagull", why: "The kung-fu kick and the seagulls" }, { id: "oldtrafford-theatre", why: "The theatre of dreams" }] },
  { word: "Valdoria", count: 2, targets: ["messi-goat", "bombonera-chocolates"],
    cards: [{ id: "messi-goat", why: "The goat with the 10" }, { id: "bombonera-chocolates", why: "The chocolate-box stadium" }] },
  { word: "Costa Real", count: 2, targets: ["zidane-ram", "bernabeu-toaster"],
    cards: [{ id: "zidane-ram", why: "The headbutt" }, { id: "bernabeu-toaster", why: "The silver stadium" }] },
  { word: "Park the van", count: 1, targets: ["mourinho-bus"], cards: [{ id: "mourinho-bus", why: "A bus parked in front of the goal" }] },
];

/** The rival's scripted turns in the room prototype: a pick that is not theirs ends their turn. */
export const FIXTURE_RIVAL_TURNS: { word: string; count: number; picks: string[] }[] = [
  { word: "Lusitania", count: 1, picks: ["ronaldo-bottle", "sansiro-corkscrew"] },
  { word: "Yellow Hive FC", count: 3, picks: ["yellowwall-beehive", "haaland-robot", "klopp-guitar"] },
  { word: "Skyline City", count: 1, picks: ["guardiola-chess", "panenka-spoon"] },
  { word: "Dragonia", count: 1, picks: ["bale-golf"] },
  { word: "Gallia", count: 1, picks: ["mbappe-turtle"] },
];

/** One-card clues the bot Scouts fall back to once their script is used up. */
export const FIXTURE_SINGLE_CLUES: Record<string, string> = {
  "ferguson-hairdryer": "Hairdryer", "cantona-seagull": "Seagulls", "oldtrafford-theatre": "Theatre", "messi-goat": "Goat",
  "bombonera-chocolates": "Chocolate box", "zidane-ram": "Headbutt", "bernabeu-toaster": "Toaster", "mourinho-bus": "Bus",
  "ronaldo-bottle": "Bottle", "bale-golf": "Golf", "guardiola-chess": "Chess", "haaland-robot": "Robot",
  "yellowwall-beehive": "Beehive", "klopp-guitar": "Guitar", "mbappe-turtle": "Turtle",
};
