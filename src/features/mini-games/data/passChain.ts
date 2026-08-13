/**
 * Pass Chain data: a small graph of players and the clubs they played for. Two
 * players are "linked" if they share a club. A puzzle gives a start + end player
 * that DON'T share a club; the user connects them via intermediates. The DB is
 * dense around big clubs so short chains exist. `solve` runs BFS for the optimal
 * link count (the "par").
 */

export interface ChainPlayer {
  id: string;
  name: string;
  accepted: string[];
  clubs: string[];
}

export const CHAIN_PLAYERS: ChainPlayer[] = [
  { id: 'beckham', name: 'David Beckham', accepted: ['beckham', 'david beckham'], clubs: ['Man United', 'Real Madrid', 'AC Milan', 'PSG'] },
  { id: 'zidane', name: 'Zinedine Zidane', accepted: ['zidane', 'zizou'], clubs: ['Juventus', 'Real Madrid'] },
  { id: 'ronaldo7', name: 'Cristiano Ronaldo', accepted: ['cristiano', 'ronaldo', 'cristiano ronaldo', 'cr7'], clubs: ['Man United', 'Real Madrid', 'Juventus'] },
  { id: 'r9', name: 'Ronaldo Nazário', accepted: ['ronaldo nazario', 'r9', 'ronaldo'], clubs: ['Barcelona', 'Inter', 'Real Madrid', 'AC Milan'] },
  { id: 'ibra', name: 'Zlatan Ibrahimović', accepted: ['ibrahimovic', 'zlatan', 'ibra'], clubs: ['Ajax', 'Juventus', 'Inter', 'Barcelona', 'AC Milan', 'PSG', 'Man United'] },
  { id: 'pirlo', name: 'Andrea Pirlo', accepted: ['pirlo', 'andrea pirlo'], clubs: ['Inter', 'AC Milan', 'Juventus'] },
  { id: 'thiago', name: 'Thiago Alcântara', accepted: ['thiago', 'thiago alcantara'], clubs: ['Barcelona', 'Bayern Munich', 'Liverpool'] },
  { id: 'alexis', name: 'Alexis Sánchez', accepted: ['alexis', 'sanchez', 'alexis sanchez'], clubs: ['Barcelona', 'Arsenal', 'Man United', 'Inter'] },
  { id: 'dimaria', name: 'Ángel Di María', accepted: ['di maria', 'dimaria', 'angel di maria'], clubs: ['Real Madrid', 'Man United', 'PSG', 'Juventus'] },
  { id: 'suarez', name: 'Luis Suárez', accepted: ['suarez', 'luis suarez'], clubs: ['Ajax', 'Liverpool', 'Barcelona', 'Atlético Madrid'] },
  { id: 'coutinho', name: 'Philippe Coutinho', accepted: ['coutinho', 'philippe coutinho'], clubs: ['Inter', 'Liverpool', 'Barcelona', 'Bayern Munich'] },
  { id: 'silva', name: 'David Silva', accepted: ['david silva', 'silva'], clubs: ['Valencia', 'Man City'] },
  { id: 'tevez', name: 'Carlos Tévez', accepted: ['tevez', 'carlos tevez'], clubs: ['Man United', 'Man City', 'Juventus'] },
  { id: 'henry', name: 'Thierry Henry', accepted: ['henry', 'thierry henry'], clubs: ['Juventus', 'Arsenal', 'Barcelona'] },
  { id: 'etoo', name: "Samuel Eto'o", accepted: ['etoo', "eto'o", 'samuel etoo'], clubs: ['Real Madrid', 'Barcelona', 'Inter', 'Chelsea'] },
  { id: 'sneijder', name: 'Wesley Sneijder', accepted: ['sneijder', 'wesley sneijder'], clubs: ['Ajax', 'Real Madrid', 'Inter'] },
  { id: 'pogba', name: 'Paul Pogba', accepted: ['pogba', 'paul pogba'], clubs: ['Man United', 'Juventus'] },
  { id: 'vidal', name: 'Arturo Vidal', accepted: ['vidal', 'arturo vidal'], clubs: ['Juventus', 'Bayern Munich', 'Barcelona', 'Inter'] },
  { id: 'robben', name: 'Arjen Robben', accepted: ['robben', 'arjen robben'], clubs: ['Chelsea', 'Real Madrid', 'Bayern Munich'] },
  { id: 'kaka', name: 'Kaká', accepted: ['kaka'], clubs: ['AC Milan', 'Real Madrid'] },
  { id: 'lewandowski', name: 'Robert Lewandowski', accepted: ['lewandowski', 'lewa'], clubs: ['Borussia Dortmund', 'Bayern Munich', 'Barcelona'] },
  { id: 'james', name: 'James Rodríguez', accepted: ['james', 'james rodriguez', 'rodriguez'], clubs: ['Porto', 'Monaco', 'Real Madrid', 'Bayern Munich', 'Everton'] },
  { id: 'fabregas', name: 'Cesc Fàbregas', accepted: ['fabregas', 'cesc', 'cesc fabregas'], clubs: ['Arsenal', 'Barcelona', 'Chelsea'] },
  { id: 'cavani', name: 'Edinson Cavani', accepted: ['cavani', 'edinson cavani'], clubs: ['Napoli', 'PSG', 'Man United'] },
];

const BY_ID = new Map(CHAIN_PLAYERS.map((p) => [p.id, p]));

export interface ChainPuzzle {
  startId: string;
  endId: string;
}

// Start/end pairs that don't directly share a club (so ≥1 intermediate needed).
export const CHAIN_PUZZLES: ChainPuzzle[] = [
  { startId: 'beckham', endId: 'lewandowski' },
  { startId: 'silva', endId: 'kaka' },
  { startId: 'suarez', endId: 'robben' },
  { startId: 'henry', endId: 'sneijder' },
  { startId: 'silva', endId: 'pirlo' },
  { startId: 'cavani', endId: 'kaka' },
];

export function getPlayer(id: string): ChainPlayer | undefined {
  return BY_ID.get(id);
}

export function shareClub(a: ChainPlayer, b: ChainPlayer): string | null {
  for (const c of a.clubs) if (b.clubs.includes(c)) return c;
  return null;
}

/** Find a player in the DB by fuzzy-ish accepted-name match (case-insensitive). */
export function findChainPlayer(input: string): ChainPlayer | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  for (const p of CHAIN_PLAYERS) {
    if (p.accepted.some((a) => a === q) || p.name.toLowerCase() === q) return p;
  }
  // loose contains on accepted tokens
  for (const p of CHAIN_PLAYERS) {
    if (p.accepted.some((a) => a.includes(q) && q.length >= 4)) return p;
  }
  return null;
}

/** Minimum number of LINKS (edges) between two players via shared clubs (BFS).
 *  A direct share = 1 link; one intermediate = 2 links. Infinity if unreachable. */
export function solve(startId: string, endId: string): number {
  if (startId === endId) return 0;
  const visited = new Set([startId]);
  let frontier = [startId];
  let depth = 0;
  while (frontier.length) {
    depth += 1;
    const next: string[] = [];
    for (const id of frontier) {
      const p = BY_ID.get(id)!;
      for (const other of CHAIN_PLAYERS) {
        if (visited.has(other.id)) continue;
        if (shareClub(p, other)) {
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
