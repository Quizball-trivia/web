/**
 * SCORE! — recreate-the-famous-goal data.
 *
 * Shared coordinate system for the 2D and 3D views: pitch metres, attacking
 * goal line at z=0, goal centred on x=0 (mouth 7.32m wide, 2.44m tall),
 * +x = attacker's right, +z = away from goal. Shot aiming is judged on the
 * gx crossing at z=0, so both views can report a plain ground point.
 */

export type StepKind = "pass" | "dribble" | "shot";

export interface GoalPlayer {
  id: string;
  name: string;
  number: number;
  team: "atk" | "def" | "gk";
  pos: [number, number];
}

export interface GoalStep {
  kind: StepKind;
  actorId: string;
  receiverId?: string;
  from: [number, number];
  to: [number, number];
  /** Goal-mouth target for shots: gx (-3.66..3.66), gy (0..2.44). */
  shotTarget?: [number, number];
  lofted?: boolean;
  /** Lateral bend in metres at mid-flight, +x direction. */
  curve?: number;
  /** Metres of slack around `to` (passes/dribbles). */
  tolerance?: number;
  caption: string;
  successCaption: string;
  /** Players shoved aside once this step lands (beaten defenders, keepers). */
  nudges?: { id: string; to: [number, number] }[];
}

export interface KitColors {
  shirt: string;
  shorts: string;
  accent: string;
  /** Sock colour; defaults to the shorts colour when omitted. */
  socks?: string;
}

export interface FamousGoal {
  id: string;
  scorer: string;
  match: string;
  competition: string;
  year: number;
  minute: string;
  atkKit: KitColors;
  defKit: KitColors;
  gkKit: KitColors;
  players: GoalPlayer[];
  steps: GoalStep[];
  fact: string;
  /** Farthest z the camera/viewport must frame at kickoff. */
  depth: number;
}

export const PASS_TOLERANCE = 5.5;
export const SHOT_TOLERANCE_GX = 1.9;
export const GOAL_HALF_W = 3.66;
export const GOAL_HEIGHT = 2.44;

export const FAMOUS_GOALS: FamousGoal[] = [
  {
    id: "carlos-alberto-1970",
    scorer: "Carlos Alberto",
    match: "Brazil 4–1 Italy",
    competition: "World Cup Final · Estadio Azteca",
    year: 1970,
    minute: "86'",
    atkKit: { shirt: "#ffdc00", shorts: "#1c4fd6", accent: "#137a3c", socks: "#f4f4f4" },
    defKit: { shirt: "#1f4fa3", shorts: "#f2f2f2", accent: "#12315f", socks: "#1f4fa3" },
    gkKit: { shirt: "#3d3d3d", shorts: "#222222", accent: "#111111" },
    players: [
      { id: "jairzinho", name: "Jairzinho", number: 7, team: "atk", pos: [-14, 24] },
      { id: "pele", name: "Pelé", number: 10, team: "atk", pos: [0, 20] },
      { id: "carlos-alberto", name: "Carlos Alberto", number: 4, team: "atk", pos: [17, 27] },
      { id: "tostao", name: "Tostão", number: 9, team: "atk", pos: [-4, 10] },
      { id: "facchetti", name: "Facchetti", number: 3, team: "def", pos: [-8, 14] },
      { id: "burgnich", name: "Burgnich", number: 2, team: "def", pos: [6, 12] },
      { id: "rosato", name: "Rosato", number: 5, team: "def", pos: [0, 8] },
      { id: "cera", name: "Cera", number: 6, team: "def", pos: [-3, 17] },
      { id: "albertosi", name: "Albertosi", number: 1, team: "gk", pos: [0, 1.6] },
    ],
    steps: [
      {
        kind: "pass",
        actorId: "jairzinho",
        receiverId: "pele",
        from: [-14, 24],
        to: [0, 20],
        caption: "86th minute. Jairzinho cuts infield and gives it up — who runs this team?",
        successCaption: "Pelé. Of course. He takes it on the edge, completely unhurried.",
      },
      {
        kind: "pass",
        actorId: "pele",
        receiverId: "carlos-alberto",
        from: [0, 20],
        to: [10, 16.5],
        tolerance: 6,
        caption: "Pelé waits… he's heard the stampede coming down the right. No look.",
        successCaption: "Rolled into the path of the captain — Carlos Alberto at full gallop.",
      },
      {
        kind: "shot",
        actorId: "carlos-alberto",
        from: [10, 16.5],
        to: [-2.6, 0],
        shotTarget: [-2.6, 0.55],
        caption: "First time. Across Albertosi. Hit it.",
        successCaption: "Low, flat, ferocious — the greatest team goal is finished.",
      },
    ],
    fact: "Eight of Brazil's ten outfield players touched the ball in the move. Widely voted the greatest team goal ever scored.",
    depth: 34,
  },
  {
    id: "van-basten-1988",
    scorer: "Marco van Basten",
    match: "Netherlands 2–0 USSR",
    competition: "Euro 88 Final · Munich",
    year: 1988,
    minute: "54'",
    atkKit: { shirt: "#f36f21", shorts: "#f36f21", accent: "#ffffff", socks: "#f4f4f4" },
    defKit: { shirt: "#cc2222", shorts: "#ffffff", accent: "#8f1616", socks: "#cc2222" },
    gkKit: { shirt: "#2a2a2a", shorts: "#1c1c1c", accent: "#000000" },
    players: [
      { id: "muhren", name: "Mühren", number: 6, team: "atk", pos: [-24, 26] },
      { id: "van-basten", name: "Van Basten", number: 12, team: "atk", pos: [14.5, 13] },
      { id: "gullit", name: "Gullit", number: 10, team: "atk", pos: [0, 14] },
      { id: "koeman", name: "R. Koeman", number: 4, team: "atk", pos: [-8, 30] },
      { id: "khidiatullin", name: "Khidiatullin", number: 4, team: "def", pos: [2, 10] },
      { id: "aleinikov", name: "Aleinikov", number: 8, team: "def", pos: [-5, 12] },
      { id: "demianenko", name: "Demianenko", number: 2, team: "def", pos: [8, 14.5] },
      { id: "dasaev", name: "Dasaev", number: 1, team: "gk", pos: [0, 1.6] },
    ],
    steps: [
      {
        kind: "pass",
        actorId: "muhren",
        receiverId: "van-basten",
        from: [-24, 26],
        to: [14.5, 13],
        lofted: true,
        tolerance: 6.5,
        caption: "Mühren looks up from the left… everyone thinks this cross is too deep. Everyone but one man.",
        successCaption: "It hangs in the Munich sky forever — Van Basten lets it drop.",
      },
      {
        kind: "shot",
        actorId: "van-basten",
        from: [14.5, 13],
        to: [-2.7, 0],
        shotTarget: [-2.7, 1.95],
        lofted: true,
        curve: -0.6,
        caption: "The angle barely exists. Don't control it — volley it.",
        successCaption: "Out of the air, over Dasaev, into the far top corner. Impossible.",
      },
    ],
    fact: "Dasaev — voted the world's best keeper that year — never moved. Van Basten later admitted: 'I meant it.'",
    depth: 32,
  },
  {
    id: "bergkamp-1998",
    scorer: "Dennis Bergkamp",
    match: "Netherlands 2–1 Argentina",
    competition: "World Cup Quarter-final · Marseille",
    year: 1998,
    minute: "89'",
    atkKit: { shirt: "#f36f21", shorts: "#ffffff", accent: "#1c2f5e", socks: "#f36f21" },
    defKit: { shirt: "#9ec7e8", shorts: "#101c3a", accent: "#ffffff", socks: "#9ec7e8" },
    gkKit: { shirt: "#caced4", shorts: "#2a2a2a", accent: "#77808c" },
    players: [
      { id: "f-de-boer", name: "F. de Boer", number: 2, team: "atk", pos: [-6, 46] },
      { id: "bergkamp", name: "Bergkamp", number: 8, team: "atk", pos: [15, 13] },
      { id: "kluivert", name: "Kluivert", number: 9, team: "atk", pos: [-2, 9] },
      { id: "ayala", name: "Ayala", number: 2, team: "def", pos: [13, 10.5] },
      { id: "chamot", name: "Chamot", number: 22, team: "def", pos: [2, 12] },
      { id: "sensini", name: "Sensini", number: 6, team: "def", pos: [-6, 10] },
      { id: "roa", name: "Roa", number: 1, team: "gk", pos: [1.2, 2] },
    ],
    steps: [
      {
        kind: "pass",
        actorId: "f-de-boer",
        receiverId: "bergkamp",
        from: [-6, 46],
        to: [15, 13],
        lofted: true,
        tolerance: 6.5,
        caption: "89th minute, 1–1. Frank de Boer, from inside his own half. Sixty metres. Pick out the run.",
        successCaption: "One touch and the ball is dead. It simply obeys Bergkamp.",
      },
      {
        kind: "dribble",
        actorId: "bergkamp",
        from: [15, 13],
        to: [12.5, 9.5],
        tolerance: 4.5,
        caption: "Second touch — cut inside, take Ayala out of the picture.",
        successCaption: "Inside the boot, inside the defender. Ayala is gone.",
        nudges: [{ id: "ayala", to: [15.2, 8.2] }],
      },
      {
        kind: "shot",
        actorId: "bergkamp",
        from: [12.5, 9.5],
        to: [2.6, 0],
        shotTarget: [2.6, 1.9],
        lofted: true,
        curve: 0.8,
        caption: "Third touch wins a World Cup tie. Outside of the right boot.",
        successCaption: "Flicked over Roa with the outside of the boot. Three touches, 2.2 seconds.",
      },
    ],
    fact: "Sixty-metre pass, three touches, 2.2 seconds. Dutch commentator Jack van Gelder just screamed 'DENNIS BERGKAMP!' six times.",
    depth: 50,
  },
  {
    id: "aguero-2012",
    scorer: "Sergio Agüero",
    match: "Man City 3–2 QPR",
    competition: "Premier League Final Day · Etihad",
    year: 2012,
    minute: "93:20",
    atkKit: { shirt: "#98c5e9", shorts: "#ffffff", accent: "#00285e", socks: "#98c5e9" },
    defKit: { shirt: "#1d5ba4", shorts: "#ffffff", accent: "#ffffff", socks: "#1d5ba4" },
    gkKit: { shirt: "#d9cf3e", shorts: "#2a2a2a", accent: "#8f8820" },
    players: [
      { id: "aguero", name: "Agüero", number: 16, team: "atk", pos: [0, 26] },
      { id: "balotelli", name: "Balotelli", number: 45, team: "atk", pos: [3, 15] },
      { id: "dzeko", name: "Džeko", number: 10, team: "atk", pos: [-7, 12] },
      { id: "taiwo", name: "Taiwo", number: 3, team: "def", pos: [11, 10] },
      { id: "onuoha", name: "Onuoha", number: 5, team: "def", pos: [5, 9] },
      { id: "hill", name: "Hill", number: 6, team: "def", pos: [-2, 8] },
      { id: "kenny", name: "Kenny", number: 1, team: "gk", pos: [0, 1.6] },
    ],
    steps: [
      {
        kind: "pass",
        actorId: "aguero",
        receiverId: "balotelli",
        from: [0, 26],
        to: [3, 15],
        caption: "93:20. The title is slipping away. Agüero plays it forward — one man can link this.",
        successCaption: "Balotelli — falling over, defenders hanging off him — keeps it alive.",
      },
      {
        kind: "pass",
        actorId: "balotelli",
        receiverId: "aguero",
        from: [3, 15],
        to: [8, 11],
        tolerance: 5,
        caption: "From the seat of his shorts — poke it first time into the run.",
        successCaption: "AGÜERO with it—",
      },
      {
        kind: "dribble",
        actorId: "aguero",
        from: [8, 11],
        to: [9.5, 8.6],
        tolerance: 4.5,
        caption: "Taiwo lunges. One touch to take him out of the game.",
        successCaption: "Skips the tackle. The Etihad holds its breath.",
        nudges: [{ id: "taiwo", to: [7.2, 9.8] }],
      },
      {
        kind: "shot",
        actorId: "aguero",
        from: [9.5, 8.6],
        to: [1.0, 0],
        shotTarget: [1.0, 0.5],
        caption: "Nothing clever now. Smash it.",
        successCaption: "AGUEROOOOOO! The most dramatic title-winning goal ever scored.",
      },
    ],
    fact: "93 minutes 20 seconds — the latest championship-deciding goal in Premier League history, ending a 44-year wait.",
    depth: 30,
  },
  {
    id: "maradona-1986",
    scorer: "Diego Maradona",
    match: "Argentina 2–1 England",
    competition: "World Cup Quarter-final · Estadio Azteca",
    year: 1986,
    minute: "55'",
    atkKit: { shirt: "#1c2c6b", shorts: "#0f1a44", accent: "#9ec7e8", socks: "#8a8f9c" },
    defKit: { shirt: "#f4f4f4", shorts: "#9ec7e8", accent: "#1c2c6b", socks: "#9ec7e8" },
    gkKit: { shirt: "#3d7a3d", shorts: "#2a2a2a", accent: "#245224" },
    players: [
      { id: "maradona", name: "Maradona", number: 10, team: "atk", pos: [14, 44] },
      { id: "valdano", name: "Valdano", number: 11, team: "atk", pos: [-6, 10] },
      { id: "burruchaga", name: "Burruchaga", number: 7, team: "atk", pos: [-12, 18] },
      { id: "reid", name: "Reid", number: 4, team: "def", pos: [12, 37] },
      { id: "butcher", name: "Butcher", number: 6, team: "def", pos: [9, 20] },
      { id: "fenwick", name: "Fenwick", number: 3, team: "def", pos: [5, 10] },
      { id: "stevens", name: "Stevens", number: 2, team: "def", pos: [-4, 12] },
      { id: "shilton", name: "Shilton", number: 1, team: "gk", pos: [0.8, 2] },
    ],
    steps: [
      {
        kind: "dribble",
        actorId: "maradona",
        from: [14, 44],
        to: [11, 30],
        tolerance: 6,
        caption: "He's turned Beardsley and Reid inside his own half… now he just runs. Carry it.",
        successCaption: "Reid is chasing a ghost. England backpedal in terror.",
        nudges: [{ id: "reid", to: [14, 34] }],
      },
      {
        kind: "dribble",
        actorId: "maradona",
        from: [11, 30],
        to: [8, 16],
        tolerance: 6,
        caption: "Butcher comes across. Don't slow down — take it past him.",
        successCaption: "Butcher swipes at air. Ten seconds of chaos and counting.",
        nudges: [{ id: "butcher", to: [11.5, 18] }],
      },
      {
        kind: "dribble",
        actorId: "maradona",
        from: [8, 16],
        to: [3.5, 6.5],
        tolerance: 5,
        caption: "Fenwick's lunge… and now Shilton rushes out. Go round him.",
        successCaption: "Feints, rounds Shilton — the goal is empty.",
        nudges: [
          { id: "fenwick", to: [6.8, 12.5] },
          { id: "shilton", to: [2.2, 4.6] },
        ],
      },
      {
        kind: "shot",
        actorId: "maradona",
        from: [3.5, 6.5],
        to: [-1.6, 0],
        shotTarget: [-1.6, 0.4],
        caption: "Butcher is sliding in for revenge. Finish it first.",
        successCaption: "The Goal of the Century, four minutes after the Hand of God.",
      },
    ],
    fact: "10.6 seconds, 44 strides, five England players plus Shilton beaten — voted FIFA's Goal of the Century.",
    depth: 48,
  },
];

/** Player positions once `completedSteps` steps have landed. */
export function positionsAfter(
  goal: FamousGoal,
  completedSteps: number,
): Record<string, [number, number]> {
  const pos: Record<string, [number, number]> = {};
  for (const p of goal.players) pos[p.id] = p.pos;
  for (let i = 0; i < completedSteps && i < goal.steps.length; i++) {
    const step = goal.steps[i];
    if (step.kind === "pass" && step.receiverId) pos[step.receiverId] = step.to;
    if (step.kind === "dribble") pos[step.actorId] = step.to;
    for (const n of step.nudges ?? []) pos[n.id] = n.to;
  }
  return pos;
}

/** Where a shot aimed at ground point `aim` crosses the goal line (gx). */
export function goalLineCrossing(from: [number, number], aim: [number, number]): number | null {
  const dz = aim[1] - from[1];
  if (dz >= -0.01) return null;
  const t = from[1] / (from[1] - aim[1]);
  return from[0] + (aim[0] - from[0]) * t;
}
