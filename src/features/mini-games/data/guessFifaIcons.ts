import type { FifaCardStats } from './guessFifaCard';
import type { PlayStyle } from '../components/PlayStyleIcon';

/**
 * Icon cards for "Guess the Card". Two kinds:
 *  - real FUT Icons (football legends), and
 *  - "What If" icons: Georgian legends who never had a FIFA card, imagined as
 *    Icons (`whatIf: true`) with invented-but-plausible stats.
 * Stats/PlayStyles are our own approximation; the card art is recreated in CSS.
 */
export interface IconCard {
  id: string;
  /** Always "ICON" — drives the icon card variant + spinner tile. */
  editionLabel: string;
  name: string;
  accepted: string[];
  overall: number;
  position: string;
  nation: string;
  nationCode: string;
  league: string;
  club: string;
  stats: FifaCardStats;
  playStyle: PlayStyle;
  /** True for the imagined Georgian-legend cards. */
  whatIf?: boolean;
  photoId?: number;
  photoVer?: string;
}

const st = (pac: number, sho: number, pas: number, dri: number, def: number, phy: number): FifaCardStats =>
  ({ pac, sho, pas, dri, def, phy });

function icon(
  name: string,
  accepted: string[],
  overall: number,
  position: string,
  nation: string,
  nationCode: string,
  league: string,
  club: string,
  stats: FifaCardStats,
  playStyle: PlayStyle,
  whatIf = false,
): IconCard {
  const slug = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { id: `icon-${slug}`, editionLabel: 'ICON', name, accepted, overall, position, nation, nationCode, league, club, stats, playStyle, whatIf };
}

export const REAL_ICONS: IconCard[] = [
  icon('Pelé', ['Pelé', 'Pele', 'Edson Arantes'], 98, 'ST', 'Brazil', 'br', 'Brasileirão', 'Santos', st(95, 96, 93, 96, 60, 76), 'Trickster'),
  icon('Diego Maradona', ['Diego Maradona', 'Maradona'], 97, 'CAM', 'Argentina', 'ar', 'Serie A', 'Napoli', st(92, 90, 91, 97, 45, 71), 'Trickster'),
  icon('Zinedine Zidane', ['Zinedine Zidane', 'Zidane', 'Zizou'], 96, 'CAM', 'France', 'fr', 'La Liga', 'Real Madrid', st(80, 84, 93, 95, 66, 82), 'Tiki Taka'),
  icon('Ronaldo', ['Ronaldo', 'Ronaldo Nazário', 'Ronaldo Nazario', 'R9', 'O Fenômeno'], 96, 'ST', 'Brazil', 'br', 'La Liga', 'Real Madrid', st(96, 95, 82, 95, 45, 79), 'Rapid'),
  icon('Johan Cruyff', ['Johan Cruyff', 'Cruyff'], 95, 'CAM', 'Netherlands', 'nl', 'Eredivisie', 'Ajax', st(89, 88, 92, 94, 60, 70), 'Trickster'),
  icon('Ronaldinho', ['Ronaldinho', 'Ronaldinho Gaúcho'], 94, 'CAM', 'Brazil', 'br', 'La Liga', 'Barcelona', st(90, 89, 90, 95, 42, 76), 'Trickster'),
  icon('Thierry Henry', ['Thierry Henry', 'Henry'], 94, 'ST', 'France', 'fr', 'Premier League', 'Arsenal', st(96, 92, 84, 92, 45, 80), 'Rapid'),
  icon('Franz Beckenbauer', ['Franz Beckenbauer', 'Beckenbauer', 'Der Kaiser'], 94, 'CB', 'Germany', 'de', 'Bundesliga', 'Bayern München', st(80, 74, 88, 84, 92, 85), 'Jockey'),
  icon('Ferenc Puskás', ['Ferenc Puskás', 'Puskas', 'Puskás'], 93, 'ST', 'Hungary', 'hu', 'La Liga', 'Real Madrid', st(80, 95, 86, 90, 40, 78), 'Finesse Shot'),
  icon('Paolo Maldini', ['Paolo Maldini', 'Maldini'], 93, 'CB', 'Italy', 'it', 'Serie A', 'AC Milan', st(84, 55, 82, 82, 93, 85), 'Jockey'),
  icon('Steven Gerrard', ['Steven Gerrard', 'Gerrard'], 92, 'CM', 'England', 'gb-eng', 'Premier League', 'Liverpool', st(80, 90, 88, 85, 78, 84), 'Power Shot'),
  icon('Kaká', ['Kaká', 'Kaka', 'Ricardo Kaká'], 92, 'CAM', 'Brazil', 'br', 'Serie A', 'AC Milan', st(90, 86, 87, 90, 55, 80), 'Finesse Shot'),
  icon('Didier Drogba', ['Didier Drogba', 'Drogba'], 91, 'ST', 'Ivory Coast', 'ci', 'Premier League', 'Chelsea', st(84, 90, 76, 84, 45, 90), 'Power Shot'),
  icon('George Best', ['George Best', 'Best'], 91, 'RW', 'Northern Ireland', 'gb-nir', 'Premier League', 'Manchester United', st(90, 87, 82, 93, 42, 68), 'Trickster'),
  icon('Andrea Pirlo', ['Andrea Pirlo', 'Pirlo'], 91, 'CM', 'Italy', 'it', 'Serie A', 'Juventus', st(66, 84, 93, 86, 68, 66), 'Dead Ball'),
];

// "What If": Georgian legends imagined as Icons (no real FIFA card ever existed).
export const WHATIF_ICONS: IconCard[] = [
  icon('Shota Arveladze', ['Shota Arveladze', 'Arveladze'], 88, 'ST', 'Georgia', 'ge', 'Eredivisie', 'Ajax', st(84, 92, 78, 86, 34, 80), 'Finesse Shot', true),
  icon('Georgi Kinkladze', ['Georgi Kinkladze', 'Kinkladze'], 87, 'CAM', 'Georgia', 'ge', 'Premier League', 'Manchester City', st(82, 80, 85, 95, 40, 66), 'Trickster', true),
  icon('David Kipiani', ['David Kipiani', 'Kipiani'], 89, 'CAM', 'Georgia', 'ge', 'Soviet Top League', 'Dinamo Tbilisi', st(76, 82, 92, 90, 45, 70), 'Tiki Taka', true),
  icon('Kakha Kaladze', ['Kakha Kaladze', 'Kaladze'], 86, 'CB', 'Georgia', 'ge', 'Serie A', 'AC Milan', st(78, 45, 72, 66, 89, 86), 'Jockey', true),
  icon('Temuri Ketsbaia', ['Temuri Ketsbaia', 'Ketsbaia'], 84, 'CAM', 'Georgia', 'ge', 'Premier League', 'Newcastle United', st(80, 82, 82, 84, 55, 74), 'Incisive Pass', true),
  icon('Levan Kobiashvili', ['Levan Kobiashvili', 'Kobiashvili'], 84, 'CM', 'Georgia', 'ge', 'Bundesliga', 'Schalke 04', st(76, 80, 84, 80, 74, 78), 'Dead Ball', true),
  icon('Ramaz Shengelia', ['Ramaz Shengelia', 'Shengelia'], 87, 'ST', 'Georgia', 'ge', 'Soviet Top League', 'Dinamo Tbilisi', st(85, 88, 76, 82, 40, 80), 'Power Shot', true),
  icon('Slava Metreveli', ['Slava Metreveli', 'Metreveli'], 86, 'RW', 'Georgia', 'ge', 'Soviet Top League', 'Dinamo Tbilisi', st(89, 80, 80, 86, 40, 72), 'Rapid', true),
  icon('Murtaz Khurtsilava', ['Murtaz Khurtsilava', 'Khurtsilava'], 85, 'CB', 'Georgia', 'ge', 'Soviet Top League', 'Dinamo Tbilisi', st(74, 44, 68, 62, 88, 85), 'Aerial', true),
];

export const ICON_CARDS: IconCard[] = [...REAL_ICONS, ...WHATIF_ICONS];

const rand = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

/** Random unused icon (falls back to any if all used). */
export function pickIcon(used: Set<string>): IconCard | null {
  const fresh = ICON_CARDS.filter((c) => !used.has(c.name));
  return fresh.length ? rand(fresh) : ICON_CARDS.length ? rand(ICON_CARDS) : null;
}
