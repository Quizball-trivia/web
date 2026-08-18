// Pass-chain graph for the promo quiz: link Shota Arveladze to a target
// player through shared clubs. Same mechanics as the mini-game prototype
// (src/features/mini-games/data/passChain.ts) but with promo-specific
// players, Georgian display names, and Georgian+Latin accepted inputs.

export interface ChainPlayer {
  id: string;
  name: string;
  accepted: string[];
  clubs: string[];
  /** Vendored headshot under public/promo/players/; initials fallback if absent. */
  imageUrl?: string;
}

export interface ChainPuzzle {
  startId: string;
  endId: string;
}

export const PROMO_CHAIN_PLAYERS: ChainPlayer[] = [
  {
    id: 'shota',
    imageUrl: '/promo/players/shota.jpg',
    name: 'შოთა არველაძე',
    accepted: ['შოთა', 'შოთა არველაძე', 'shota', 'shota arveladze'],
    clubs: ['დინამო თბილისი', 'ტრაბზონსპორი', 'აიაქსი', 'რეინჯერსი', 'ალკმაარი', 'ლევანტე'],
  },
  {
    id: 'kane',
    imageUrl: '/promo/players/kane.jpg',
    name: 'ჰარი კეინი',
    accepted: ['კეინი', 'ჰარი კეინი', 'kane', 'harry kane'],
    clubs: ['ტოტენჰემი', 'ბაიერნი'],
  },
  {
    id: 'ozil',
    imageUrl: '/promo/players/ozil.jpg',
    name: 'მესუთ იოზილი',
    accepted: ['იოზილი', 'ოზილი', 'მესუთ იოზილი', 'მესუთ ოზილი', 'ozil', 'mesut ozil', 'özil'],
    clubs: ['შალკე', 'ვერდერი', 'რეალ მადრიდი', 'არსენალი', 'ფენერბაჰჩე'],
  },
  {
    id: 'dembele',
    imageUrl: '/promo/players/dembele.jpg',
    name: 'მუსა დემბელე',
    accepted: ['დემბელე', 'მუსა დემბელე', 'dembele', 'mousa dembele', 'moussa dembele', 'musa dembele'],
    clubs: ['ალკმაარი', 'ფულჰემი', 'ტოტენჰემი'],
  },
  {
    id: 'vandervaart',
    imageUrl: '/promo/players/vandervaart.jpg',
    name: 'რაფაელ ვან დერ ვაარტი',
    accepted: ['ვან დერ ვაარტი', 'რაფაელ ვან დერ ვაარტი', 'van der vaart', 'rafael van der vaart'],
    clubs: ['აიაქსი', 'ჰამბურგი', 'რეალ მადრიდი', 'ტოტენჰემი'],
  },
  {
    id: 'arteta',
    imageUrl: '/promo/players/arteta.jpg',
    name: 'მიკელ არტეტა',
    accepted: ['არტეტა', 'მიკელ არტეტა', 'arteta', 'mikel arteta'],
    clubs: ['პსჟ', 'რეინჯერსი', 'რეალ სოსიედადი', 'ევერტონი', 'არსენალი'],
  },
  {
    id: 'pedroleon',
    name: 'პედრო ლეონი',
    accepted: ['პედრო ლეონი', 'ლეონი', 'pedro leon', 'pedro león'],
    clubs: ['ლევანტე', 'ხეტაფე', 'რეალ მადრიდი'],
  },
  {
    id: 'lovenkrands',
    imageUrl: '/promo/players/lovenkrands.jpg',
    name: 'პიტერ ლოვენკრანდსი',
    accepted: ['ლოვენკრანდსი', 'პიტერ ლოვენკრანდსი', 'lovenkrands', 'peter lovenkrands', 'løvenkrands'],
    clubs: ['რეინჯერსი', 'შალკე', 'ნიუკასლი'],
  },
  {
    id: 'litmanen',
    name: 'იარი ლიტმანენი',
    accepted: ['ლიტმანენი', 'იარი ლიტმანენი', 'litmanen', 'jari litmanen'],
    clubs: ['აიაქსი', 'ბარსელონა', 'ლივერპული'],
  },
  {
    id: 'caniggia',
    name: 'კლაუდიო კანიჯა',
    accepted: ['კანიჯა', 'კლაუდიო კანიჯა', 'caniggia', 'claudio caniggia'],
    clubs: ['რივერ პლეიტი', 'ბოკა ხუნიორსი', 'რეინჯერსი'],
  },
];

// Start/end never share a club directly, so at least one intermediate is
// required. Editorial routes: Shota → (ალკმაარი) Dembélé (ტოტენჰემი) → Kane,
// or Shota → (აიაქსი) Van der Vaart (ტოტენჰემი) → Kane; and Shota →
// (რეინჯერსი) Arteta (არსენალი) → Özil, or via Pedro León (ლევანტე → რეალ
// მადრიდი), or via Løvenkrands (რეინჯერსი → შალკე).
export const PROMO_CHAIN_PUZZLES: ChainPuzzle[] = [
  { startId: 'shota', endId: 'kane' },
  { startId: 'shota', endId: 'ozil' },
];

export function getPromoChainPlayer(players: ChainPlayer[], id: string): ChainPlayer | undefined {
  return players.find((p) => p.id === id);
}

export function promoShareClub(a: ChainPlayer, b: ChainPlayer): string | null {
  for (const c of a.clubs) if (b.clubs.includes(c)) return c;
  return null;
}

import { fuzzyMatchesAnswer } from '@/lib/answerMatching';

/** Find a player by accepted-name match: exact first, then loose contains
 *  (4+ chars), then the production fuzzy matcher (typo tolerance). */
export function findPromoChainPlayer(players: ChainPlayer[], input: string): ChainPlayer | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  for (const p of players) {
    if (p.accepted.some((a) => a === q) || p.name.toLowerCase() === q) return p;
  }
  for (const p of players) {
    if (p.accepted.some((a) => a.includes(q) && q.length >= 4)) return p;
  }
  for (const p of players) {
    if (fuzzyMatchesAnswer(q, [...p.accepted, p.name])) return p;
  }
  return null;
}

/** Minimum number of links between two players via shared clubs (BFS). */
export function solvePromoChain(players: ChainPlayer[], startId: string, endId: string): number {
  if (startId === endId) return 0;
  const byId = new Map(players.map((p) => [p.id, p]));
  const visited = new Set([startId]);
  let frontier = [startId];
  let depth = 0;
  while (frontier.length) {
    depth += 1;
    const next: string[] = [];
    for (const id of frontier) {
      const p = byId.get(id);
      if (!p) continue;
      for (const other of players) {
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
