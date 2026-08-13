/**
 * Squad Spin mock data. Each "combo" is what the three core reels land on —
 * club · position · nation — and the players who satisfy all three. Harder modes
 * add reels that NARROW which of those answers count:
 *   - 4 reels → + Era (decade of the player's prime)
 *   - 5 reels → + Trophy (a trophy they won)
 * `pct` is the precomputed "percentage of players who gave this answer" (crowd
 * popularity): rarer correct answers (low pct) pay a bigger rarity multiplier.
 * `accepted` carries surname-only + transliterated spellings so the fuzzy
 * matcher is generous (typos, accents, Georgian, Turkish).
 */

export type ReelPosition = 'GK' | 'DEF' | 'MID' | 'FWD';
export type Era = '2000s' | '2010s' | '2020s';
export type Trophy = 'World Cup' | 'Champions League' | 'League Title';

export const POSITION_LABEL: Record<ReelPosition, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
};

export const POSITION_COLOR: Record<ReelPosition, string> = {
  GK: '#FFE500',
  DEF: '#1CB0F6',
  MID: '#58CC02',
  FWD: '#FB3101',
};

export const ERA_POOL: Era[] = ['2000s', '2010s', '2020s'];
export const TROPHY_POOL: Trophy[] = ['World Cup', 'Champions League', 'League Title'];
export const TROPHY_META: Record<Trophy, { emoji: string; short: string }> = {
  'World Cup': { emoji: '🌍', short: 'World Cup' },
  'Champions League': { emoji: '🏆', short: 'UCL' },
  'League Title': { emoji: '🥇', short: 'League' },
};

export interface SquadAnswer {
  name: string;
  accepted: string[];
  /** % of players who named this answer (crowd popularity). Lower = rarer = more points. */
  pct: number;
  era: Era;
  trophy: Trophy;
}

export interface SquadCombo {
  id: string;
  /** Club name — resolves to a crest via getClub(). */
  club: string;
  position: ReelPosition;
  /** Nation name — resolves to a flag via the country code. */
  nation: string;
  answers: SquadAnswer[];
}

export const SQUAD_COMBOS: SquadCombo[] = [
  {
    id: 'rma-fwd-bra',
    club: 'Real Madrid CF',
    position: 'FWD',
    nation: 'Brazil',
    answers: [
      { name: 'Ronaldo Nazário', accepted: ['ronaldo', 'ronaldo nazario', 'r9', 'რონალდო'], pct: 44, era: '2000s', trophy: 'World Cup' },
      { name: 'Vinícius Júnior', accepted: ['vinicius', 'vinicius junior', 'vini', 'ვინისიუსი'], pct: 33, era: '2020s', trophy: 'Champions League' },
      { name: 'Rodrygo', accepted: ['rodrygo', 'rodrygo goes'], pct: 16, era: '2020s', trophy: 'Champions League' },
      { name: 'Robinho', accepted: ['robinho'], pct: 7, era: '2000s', trophy: 'League Title' },
    ],
  },
  {
    id: 'bar-mid-esp',
    club: 'FC Barcelona',
    position: 'MID',
    nation: 'Spain',
    answers: [
      { name: 'Andrés Iniesta', accepted: ['iniesta', 'andres iniesta', 'ინიესტა'], pct: 41, era: '2010s', trophy: 'World Cup' },
      { name: 'Xavi', accepted: ['xavi', 'xavi hernandez', 'ჩავი'], pct: 38, era: '2010s', trophy: 'World Cup' },
      { name: 'Sergio Busquets', accepted: ['busquets', 'sergio busquets'], pct: 14, era: '2010s', trophy: 'Champions League' },
      { name: 'Pedri', accepted: ['pedri'], pct: 7, era: '2020s', trophy: 'League Title' },
    ],
  },
  {
    id: 'mun-fwd-eng',
    club: 'Manchester United',
    position: 'FWD',
    nation: 'England',
    answers: [
      { name: 'Wayne Rooney', accepted: ['rooney', 'wayne rooney'], pct: 52, era: '2010s', trophy: 'Champions League' },
      { name: 'Marcus Rashford', accepted: ['rashford', 'marcus rashford'], pct: 34, era: '2020s', trophy: 'League Title' },
      { name: 'Danny Welbeck', accepted: ['welbeck', 'danny welbeck'], pct: 9, era: '2010s', trophy: 'League Title' },
      { name: 'Mason Greenwood', accepted: ['greenwood', 'mason greenwood'], pct: 5, era: '2020s', trophy: 'League Title' },
    ],
  },
  {
    id: 'bay-def-ger',
    club: 'FC Bayern Munich',
    position: 'DEF',
    nation: 'Germany',
    answers: [
      { name: 'Philipp Lahm', accepted: ['lahm', 'philipp lahm'], pct: 39, era: '2010s', trophy: 'World Cup' },
      { name: 'Mats Hummels', accepted: ['hummels', 'mats hummels'], pct: 31, era: '2010s', trophy: 'World Cup' },
      { name: 'Jérôme Boateng', accepted: ['boateng', 'jerome boateng'], pct: 22, era: '2010s', trophy: 'Champions League' },
      { name: 'Holger Badstuber', accepted: ['badstuber'], pct: 8, era: '2010s', trophy: 'League Title' },
    ],
  },
  {
    id: 'juv-gk-ita',
    club: 'Juventus',
    position: 'GK',
    nation: 'Italy',
    answers: [
      { name: 'Gianluigi Buffon', accepted: ['buffon', 'gianluigi buffon', 'ბუფონი'], pct: 82, era: '2000s', trophy: 'World Cup' },
      { name: 'Mattia Perin', accepted: ['perin', 'mattia perin'], pct: 18, era: '2020s', trophy: 'League Title' },
    ],
  },
  {
    id: 'liv-mid-eng',
    club: 'Liverpool',
    position: 'MID',
    nation: 'England',
    answers: [
      { name: 'Steven Gerrard', accepted: ['gerrard', 'steven gerrard', 'stevie g'], pct: 63, era: '2000s', trophy: 'Champions League' },
      { name: 'Jordan Henderson', accepted: ['henderson', 'jordan henderson'], pct: 24, era: '2010s', trophy: 'Champions League' },
      { name: 'James Milner', accepted: ['milner', 'james milner'], pct: 9, era: '2010s', trophy: 'Champions League' },
      { name: 'Curtis Jones', accepted: ['curtis jones', 'jones'], pct: 4, era: '2020s', trophy: 'League Title' },
    ],
  },
  {
    id: 'psg-fwd-fra',
    club: 'Paris Saint-Germain',
    position: 'FWD',
    nation: 'France',
    answers: [
      { name: 'Kylian Mbappé', accepted: ['mbappe', 'kylian mbappe', 'მბაპე'], pct: 71, era: '2020s', trophy: 'World Cup' },
      { name: 'Ousmane Dembélé', accepted: ['dembele', 'ousmane dembele'], pct: 20, era: '2020s', trophy: 'World Cup' },
      { name: 'Kingsley Coman', accepted: ['coman', 'kingsley coman'], pct: 9, era: '2020s', trophy: 'Champions League' },
    ],
  },
  {
    id: 'aca-fwd-arg',
    club: 'Atlético Madrid',
    position: 'FWD',
    nation: 'Argentina',
    answers: [
      { name: 'Sergio Agüero', accepted: ['aguero', 'sergio aguero', 'kun aguero'], pct: 58, era: '2010s', trophy: 'League Title' },
      { name: 'Ángel Correa', accepted: ['correa', 'angel correa'], pct: 26, era: '2020s', trophy: 'World Cup' },
      { name: 'Julián Álvarez', accepted: ['alvarez', 'julian alvarez'], pct: 16, era: '2020s', trophy: 'World Cup' },
    ],
  },
  // Overlapping combos so "hold" is meaningful — these share a club / position /
  // nation with the ones above, so holding a reel gives something to respin toward.
  {
    id: 'rma-mid-fra',
    club: 'Real Madrid CF',
    position: 'MID',
    nation: 'France',
    answers: [
      { name: 'Zinedine Zidane', accepted: ['zidane', 'zizou', 'ზიდანი'], pct: 74, era: '2000s', trophy: 'World Cup' },
      { name: 'Eduardo Camavinga', accepted: ['camavinga'], pct: 18, era: '2020s', trophy: 'Champions League' },
      { name: 'Aurélien Tchouaméni', accepted: ['tchouameni', 'aurelien tchouameni'], pct: 8, era: '2020s', trophy: 'Champions League' },
    ],
  },
  {
    id: 'bar-fwd-bra',
    club: 'FC Barcelona',
    position: 'FWD',
    nation: 'Brazil',
    answers: [
      { name: 'Ronaldinho', accepted: ['ronaldinho', 'რონალდინიო'], pct: 49, era: '2000s', trophy: 'Champions League' },
      { name: 'Neymar', accepted: ['neymar', 'neymar jr', 'ნეიმარი'], pct: 39, era: '2010s', trophy: 'Champions League' },
      { name: 'Ronaldo Nazário', accepted: ['ronaldo', 'ronaldo nazario', 'r9'], pct: 12, era: '2000s', trophy: 'League Title' },
    ],
  },
  {
    id: 'mun-mid-eng',
    club: 'Manchester United',
    position: 'MID',
    nation: 'England',
    answers: [
      { name: 'Paul Scholes', accepted: ['scholes', 'paul scholes'], pct: 54, era: '2000s', trophy: 'Champions League' },
      { name: 'Michael Carrick', accepted: ['carrick', 'michael carrick'], pct: 26, era: '2010s', trophy: 'Champions League' },
      { name: 'Jesse Lingard', accepted: ['lingard', 'jesse lingard'], pct: 13, era: '2010s', trophy: 'League Title' },
      { name: 'Nicky Butt', accepted: ['nicky butt', 'butt'], pct: 7, era: '2000s', trophy: 'Champions League' },
    ],
  },
];

/** Rarity → points multiplier. Rarer crowd answers (low pct) pay much more. */
export function rarityMultiplier(pct: number): number {
  if (pct >= 60) return 1;
  if (pct >= 40) return 1.5;
  if (pct >= 25) return 2;
  if (pct >= 15) return 3;
  if (pct >= 8) return 4;
  return 6;
}

/** More reels = more constraints = harder = pays more. */
export function difficultyMultiplier(reels: number): number {
  return reels >= 5 ? 2.4 : reels >= 4 ? 1.6 : 1;
}

export const SQUAD_BASE_POINTS = 100;

/** The subset of a combo's answers that also satisfy the active era/trophy reels. */
export function validAnswers(combo: SquadCombo, era: Era | null, trophy: Trophy | null): SquadAnswer[] {
  return combo.answers.filter((a) => (era ? a.era === era : true) && (trophy ? a.trophy === trophy : true));
}
