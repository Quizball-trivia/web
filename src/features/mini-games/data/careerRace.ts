/**
 * Career Race mock data — transfer trails for the buzz race. Clubs are ordered
 * career steps; buzzing earlier (fewer clubs revealed) pays more. `accepted`
 * feeds the fuzzy matcher (surnames, transliterations, Georgian spellings).
 * `aiStep` ranges bias the AI rival: a famous trail gets buzzed early.
 */

export interface CareerPlayer {
  id: string;
  name: string;
  accepted: string[];
  clubs: string[];
  /** AI buzzes when this many clubs are revealed (min..max, rolled per game). */
  aiStep: [number, number];
  /** Chance the AI names them right once it buzzes. */
  aiSuccess: number;
}

export const CAREER_PLAYERS: CareerPlayer[] = [
  {
    id: 'zlatan',
    name: 'Zlatan Ibrahimović',
    accepted: ['zlatan', 'ibrahimovic', 'zlatan ibrahimovic', 'იბრაჰიმოვიჩი'],
    clubs: ['Malmö FF', 'Ajax', 'Juventus', 'Inter', 'FC Barcelona', 'AC Milan', 'Paris Saint-Germain', 'Manchester United'],
    aiStep: [3, 5],
    aiSuccess: 0.8,
  },
  {
    id: 'modric',
    name: 'Luka Modrić',
    accepted: ['modric', 'luka modric', 'მოდრიჩი'],
    clubs: ['Dinamo Zagreb', 'Tottenham Hotspur', 'Real Madrid CF'],
    aiStep: [2, 3],
    aiSuccess: 0.75,
  },
  {
    id: 'drogba',
    name: 'Didier Drogba',
    accepted: ['drogba', 'didier drogba', 'დროგბა'],
    clubs: ['Le Mans', 'Guingamp', 'Marseille', 'Chelsea', 'Galatasaray'],
    aiStep: [3, 4],
    aiSuccess: 0.7,
  },
  {
    id: 'kaka',
    name: 'Kaká',
    accepted: ['kaka', 'ricardo kaka', 'კაკა'],
    clubs: ['São Paulo', 'AC Milan', 'Real Madrid CF', 'Orlando City'],
    aiStep: [2, 3],
    aiSuccess: 0.72,
  },
  {
    id: 'lewa',
    name: 'Robert Lewandowski',
    accepted: ['lewandowski', 'robert lewandowski', 'lewa', 'ლევანდოვსკი'],
    clubs: ['Znicz Pruszków', 'Lech Poznań', 'Borussia Dortmund', 'FC Bayern Munich', 'FC Barcelona'],
    aiStep: [3, 4],
    aiSuccess: 0.78,
  },
  {
    id: 'dimaria',
    name: 'Ángel Di María',
    accepted: ['di maria', 'angel di maria', 'dimaria'],
    clubs: ['Rosario Central', 'Benfica', 'Real Madrid CF', 'Manchester United', 'Paris Saint-Germain', 'Juventus'],
    aiStep: [3, 5],
    aiSuccess: 0.68,
  },
  {
    id: 'kante',
    name: "N'Golo Kanté",
    accepted: ['kante', 'ngolo kante', 'n golo kante', 'კანტე'],
    clubs: ['Boulogne', 'Caen', 'Leicester City', 'Chelsea', 'Al-Ittihad'],
    aiStep: [3, 4],
    aiSuccess: 0.66,
  },
  {
    id: 'kvara',
    name: 'Khvicha Kvaratskhelia',
    accepted: ['kvaratskhelia', 'khvicha', 'kvara', 'კვარაცხელია', 'ხვიჩა'],
    clubs: ['Dinamo Batumi', 'Rubin Kazan', 'Napoli', 'Paris Saint-Germain'],
    aiStep: [2, 3],
    aiSuccess: 0.6,
  },
];

/** Points for naming the player with `revealed` clubs on the table. */
export function buzzPoints(revealed: number): number {
  return Math.max(20, 100 - (revealed - 1) * 20);
}
