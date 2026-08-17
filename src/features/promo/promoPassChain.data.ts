// Pass-chain graph for the promo quiz: link Shota Arveladze to a target
// player through shared clubs. Same mechanics as the mini-game prototype
// (src/features/mini-games/data/passChain.ts) but with promo-specific
// players, Georgian display names, and Georgian+Latin accepted inputs.

export interface ChainPlayer {
  id: string;
  name: string;
  accepted: string[];
  clubs: string[];
}

export interface ChainPuzzle {
  startId: string;
  endId: string;
}

export const PROMO_CHAIN_PLAYERS: ChainPlayer[] = [
  {
    id: 'shota',
    name: 'შოთა არველაძე',
    accepted: ['შოთა', 'შოთა არველაძე', 'shota', 'shota arveladze'],
    clubs: ['დინამო თბილისი', 'ტრაბზონსპორი', 'აიაქსი', 'რეინჯერსი', 'ალკმაარი', 'ლევანტე'],
  },
  {
    id: 'arteta',
    name: 'მიკელ არტეტა',
    accepted: ['არტეტა', 'მიკელ არტეტა', 'arteta', 'mikel arteta'],
    clubs: ['პსჟ', 'რეინჯერსი', 'რეალ სოსიედადი', 'ევერტონი', 'არსენალი'],
  },
  {
    id: 'henry',
    name: 'ტიერი ანრი',
    accepted: ['ანრი', 'ტიერი ანრი', 'henry', 'thierry henry', 'henri'],
    clubs: ['მონაკო', 'იუვენტუსი', 'არსენალი', 'ბარსელონა'],
  },
  {
    id: 'vandersar',
    name: 'ედვინ ვან დერ სარი',
    accepted: ['ვან დერ სარი', 'ედვინ ვან დერ სარი', 'van der sar', 'edwin van der sar'],
    clubs: ['აიაქსი', 'იუვენტუსი', 'ფულჰემი', 'მანჩესტერ იუნაიტედი'],
  },
  {
    id: 'cristiano',
    name: 'კრიშტიანუ რონალდუ',
    accepted: ['რონალდუ', 'კრიშტიანუ', 'კრიშტიანუ რონალდუ', 'ronaldo', 'cristiano', 'cristiano ronaldo', 'cr7'],
    clubs: ['სპორტინგი', 'მანჩესტერ იუნაიტედი', 'რეალ მადრიდი', 'იუვენტუსი'],
  },
  {
    id: 'litmanen',
    name: 'იარი ლიტმანენი',
    accepted: ['ლიტმანენი', 'იარი ლიტმანენი', 'litmanen', 'jari litmanen'],
    clubs: ['აიაქსი', 'ბარსელონა', 'ლივერპული'],
  },
  {
    id: 'kinkladze',
    name: 'გიორგი ქინქლაძე',
    accepted: ['ქინქლაძე', 'გიორგი ქინქლაძე', 'kinkladze', 'giorgi kinkladze'],
    clubs: ['დინამო თბილისი', 'მანჩესტერ სიტი', 'აიაქსი', 'დერბი'],
  },
  {
    id: 'ibra',
    name: 'ზლატან იბრაჰიმოვიჩი',
    accepted: ['ზლატანი', 'იბრაჰიმოვიჩი', 'ზლატან იბრაჰიმოვიჩი', 'zlatan', 'ibrahimovic', 'ibra'],
    clubs: ['აიაქსი', 'იუვენტუსი', 'ინტერი', 'ბარსელონა', 'მილანი', 'პსჟ', 'მანჩესტერ იუნაიტედი'],
  },
  {
    id: 'suarez',
    name: 'ლუის სუარესი',
    accepted: ['სუარესი', 'ლუის სუარესი', 'suarez', 'luis suarez'],
    clubs: ['აიაქსი', 'ლივერპული', 'ბარსელონა', 'ატლეტიკო მადრიდი'],
  },
  {
    id: 'caniggia',
    name: 'კლაუდიო კანიჯა',
    accepted: ['კანიჯა', 'კლაუდიო კანიჯა', 'caniggia', 'claudio caniggia'],
    clubs: ['რივერ პლეიტი', 'ბოკა ხუნიორსი', 'რეინჯერსი'],
  },
];

// Start/end never share a club directly, so at least one intermediate is
// required. Both puzzles have several valid par-2 routes (e.g. Shota →
// Arteta → Henry via Rangers/Arsenal, or Shota → Van der Sar → Ronaldo via
// Ajax/Man United).
export const PROMO_CHAIN_PUZZLES: ChainPuzzle[] = [
  { startId: 'shota', endId: 'henry' },
  { startId: 'shota', endId: 'cristiano' },
];

const BY_ID = new Map(PROMO_CHAIN_PLAYERS.map((p) => [p.id, p]));

export function getPromoChainPlayer(id: string): ChainPlayer | undefined {
  return BY_ID.get(id);
}

export function promoShareClub(a: ChainPlayer, b: ChainPlayer): string | null {
  for (const c of a.clubs) if (b.clubs.includes(c)) return c;
  return null;
}

/** Find a player by accepted-name match (case-insensitive, exact first, then
 *  loose contains for inputs of 4+ characters). */
export function findPromoChainPlayer(input: string): ChainPlayer | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  for (const p of PROMO_CHAIN_PLAYERS) {
    if (p.accepted.some((a) => a === q) || p.name.toLowerCase() === q) return p;
  }
  for (const p of PROMO_CHAIN_PLAYERS) {
    if (p.accepted.some((a) => a.includes(q) && q.length >= 4)) return p;
  }
  return null;
}

/** Minimum number of links between two players via shared clubs (BFS). */
export function solvePromoChain(startId: string, endId: string): number {
  if (startId === endId) return 0;
  const visited = new Set([startId]);
  let frontier = [startId];
  let depth = 0;
  while (frontier.length) {
    depth += 1;
    const next: string[] = [];
    for (const id of frontier) {
      const p = BY_ID.get(id);
      if (!p) continue;
      for (const other of PROMO_CHAIN_PLAYERS) {
        if (visited.has(other.id)) continue;
        if (promoShareClub(p, other)) {
          if (other.id === endId) return depth;
          visited.add(other.id);
          next.push(other.id);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}
