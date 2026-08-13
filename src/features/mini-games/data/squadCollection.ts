/** Squad Collection mock data: a pool of collectable player cards by position,
 *  each with a FUT-style rarity + rating. Answering questions draws cards
 *  (weighted toward commons); rarer pulls glow harder in the pack reveal. */

export type CardPos = 'GK' | 'DEF' | 'MID' | 'FWD';
export type Rarity = 'bronze' | 'silver' | 'gold' | 'special';

export interface PlayerCard {
  name: string;
  club: string;
  nation: string;
  rating: number;
  pos: CardPos;
  rarity: Rarity;
}

export const RARITY_META: Record<Rarity, { label: string; from: string; to: string; text: string; glow: string; weight: number }> = {
  bronze: { label: 'Bronze', from: '#7A4A24', to: '#4A2C12', text: '#F0C89A', glow: '#B87333', weight: 48 },
  silver: { label: 'Silver', from: '#9AA7B0', to: '#5E6B75', text: '#0b0f14', glow: '#C0CBD3', weight: 30 },
  gold: { label: 'Gold', from: '#F5D247', to: '#B8901F', text: '#3A2A00', glow: '#FFD700', weight: 19 },
  special: { label: 'Special', from: '#2B2B2B', to: '#0B0B0B', text: '#FFE500', glow: '#FFE500', weight: 3 },
};

// Formation 4-3-3 → the XI to complete.
export const FORMATION: { pos: CardPos; slots: number }[] = [
  { pos: 'FWD', slots: 3 },
  { pos: 'MID', slots: 3 },
  { pos: 'DEF', slots: 4 },
  { pos: 'GK', slots: 1 },
];

export const CARD_POOL: PlayerCard[] = [
  // GK
  { name: 'Gianluigi Buffon', club: 'Juventus', nation: 'Italy', rating: 90, pos: 'GK', rarity: 'gold' },
  { name: 'Manuel Neuer', club: 'FC Bayern Munich', nation: 'Germany', rating: 90, pos: 'GK', rarity: 'gold' },
  { name: 'Iker Casillas', club: 'Real Madrid CF', nation: 'Spain', rating: 89, pos: 'GK', rarity: 'silver' },
  { name: 'Thibaut Courtois', club: 'Real Madrid CF', nation: 'Belgium', rating: 88, pos: 'GK', rarity: 'silver' },
  { name: 'David de Gea', club: 'Manchester United', nation: 'Spain', rating: 84, pos: 'GK', rarity: 'bronze' },
  // DEF
  { name: 'Paolo Maldini', club: 'AC Milan', nation: 'Italy', rating: 94, pos: 'DEF', rarity: 'special' },
  { name: 'Sergio Ramos', club: 'Real Madrid CF', nation: 'Spain', rating: 89, pos: 'DEF', rarity: 'gold' },
  { name: 'Roberto Carlos', club: 'Real Madrid CF', nation: 'Brazil', rating: 89, pos: 'DEF', rarity: 'gold' },
  { name: 'Rúben Dias', club: 'Manchester City', nation: 'Portugal', rating: 88, pos: 'DEF', rarity: 'silver' },
  { name: 'Kyle Walker', club: 'Manchester City', nation: 'England', rating: 84, pos: 'DEF', rarity: 'bronze' },
  { name: 'David Alaba', club: 'Real Madrid CF', nation: 'Austria', rating: 84, pos: 'DEF', rarity: 'bronze' },
  // MID
  { name: 'Zinedine Zidane', club: 'Real Madrid CF', nation: 'France', rating: 96, pos: 'MID', rarity: 'special' },
  { name: 'Kevin De Bruyne', club: 'Manchester City', nation: 'Belgium', rating: 91, pos: 'MID', rarity: 'gold' },
  { name: 'Luka Modrić', club: 'Real Madrid CF', nation: 'Croatia', rating: 89, pos: 'MID', rarity: 'gold' },
  { name: 'Andrés Iniesta', club: 'FC Barcelona', nation: 'Spain', rating: 90, pos: 'MID', rarity: 'gold' },
  { name: 'Jude Bellingham', club: 'Real Madrid CF', nation: 'England', rating: 86, pos: 'MID', rarity: 'silver' },
  { name: 'Rodri', club: 'Manchester City', nation: 'Spain', rating: 89, pos: 'MID', rarity: 'silver' },
  // FWD
  { name: 'Lionel Messi', club: 'FC Barcelona', nation: 'Argentina', rating: 95, pos: 'FWD', rarity: 'special' },
  { name: 'Cristiano Ronaldo', club: 'Real Madrid CF', nation: 'Portugal', rating: 95, pos: 'FWD', rarity: 'special' },
  { name: 'Kylian Mbappé', club: 'Paris Saint-Germain', nation: 'France', rating: 91, pos: 'FWD', rarity: 'gold' },
  { name: 'Erling Haaland', club: 'Manchester City', nation: 'Norway', rating: 91, pos: 'FWD', rarity: 'gold' },
  { name: 'Mohamed Salah', club: 'Liverpool', nation: 'Egypt', rating: 89, pos: 'FWD', rarity: 'silver' },
  { name: 'Vinícius Júnior', club: 'Real Madrid CF', nation: 'Brazil', rating: 86, pos: 'FWD', rarity: 'silver' },
];

const rand = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/** Draw a card for one of the still-open positions, weighted toward commons. */
export function drawCard(openPositions: CardPos[]): PlayerCard {
  const pos = rand(openPositions);
  const candidates = CARD_POOL.filter((c) => c.pos === pos);
  const weights = candidates.map((c) => RARITY_META[c.rarity].weight);
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
