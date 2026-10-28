/** Backend partner fake-fact.service FakeFactState: an open card never carries its fake or explanation. */
type Label = { en: string; es: string; tr: string; ru: string; pt?: string; de?: string; ka: string };
type ServerArt =
  | { kind: "crest" | "flag"; src: string }
  | { kind: "trophy"; src?: string }
  | { kind: "shirt"; number: number }
  | { kind: "text" };

export interface FakeFactCard {
  id: string;
  category: "clubs" | "leagues" | "worldCups" | "numbers" | "trophies" | "coachedClubs";
  player: { name: Label; portrait: string | null };
  options: Array<{ label: Label; art: ServerArt }>;
}

export interface FakeFactState {
  playId: string;
  step: "card1" | "between" | "card2" | "done";
  serverNow: string;
  deadline: string | null;
  graceMs: number;
  cardSeconds: number;
  score: number;
  maxScore: number;
  card: FakeFactCard | null;
  results: Array<{ pick: number | null; right: boolean; points: number; timedOut: boolean; card: FakeFactCard; fake: number; explain: Label }>;
  finished: { playId: string; score: number; sent: boolean } | null;
}
