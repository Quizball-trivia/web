import type { Locale } from '@/lib/i18n/messages';
import type { Footballer, Formation, PositionGroup, SeasonSnapshot } from '@/features/auction/types';
import { FOOTBALLERS, SNAPSHOT_STAT_STEPS, getFootballerPlaceholderImage } from '@/features/auction/data';

/**
 * Canonical lots for the training auction. Everything the tutorial asserts
 * (budgets, profits, chemistry, placings) derives from these numbers, so they
 * are authored, never generated: the SCOUT season (first snapshot) sets the
 * starting price and the LAST snapshot is the hidden value paid out at the hammer.
 */
export const TRAINING_FORMATION: Formation = {
  name: '1-1-1',
  required: { GK: 1, DEF: 0, MID: 1, FWD: 1 },
  rows: [
    { pos: 'FWD', count: 1 },
    { pos: 'MID', count: 1 },
    { pos: 'GK', count: 1 },
  ],
};

type LocalizedHints = Record<Locale, [string, string]>;
type LocalizedName = Record<Locale, string>;

interface LotFixture {
  id: string;
  /** Reuses the live roster's artwork where it exists. */
  artworkId: string;
  name: LocalizedName;
  positionGroup: PositionGroup;
  nationality: string;
  club: string;
  league: string;
  snapshots: SeasonSnapshot[];
  hints: LocalizedHints;
}

const LOTS: LotFixture[] = [
  {
    id: 'training-fwd-messi',
    artworkId: 'fwd-messi',
    name: { en: 'Lionel Messi', ka: 'ლიონელ მესი', es: 'Lionel Messi', tr: 'Lionel Messi' },
    positionGroup: 'FWD',
    nationality: 'Argentina',
    club: 'FC Barcelona',
    league: 'La Liga',
    snapshots: [
      { season: '2006/07', league: 'La Liga', age: 19, apps: 26, goals: 14, assists: 3, valueEur: 26_000_000 },
      { season: '2009/10', league: 'La Liga', age: 22, apps: 35, goals: 34, assists: 11, valueEur: 80_000_000 },
      { season: '2012/13', league: 'La Liga', age: 25, apps: 32, goals: 46, assists: 12, valueEur: 120_000_000 },
    ],
    hints: {
      en: ['Wore the number 10 at Camp Nou for over a decade', 'Has won the Ballon d’Or eight times'],
      ka: ['ათ წელზე მეტხანს ატარებდა მე-10 ნომერს კამპ ნოუზე', 'რვაჯერ აქვს მოგებული ოქროს ბურთი'],
      es: ['Llevó el 10 en el Camp Nou durante más de una década', 'Ha ganado el Balón de Oro ocho veces'],
      tr: ['Camp Nou’da on yıldan uzun süre 10 numarayı giydi', 'Sekiz kez Ballon d’Or kazandı'],
    },
  },
  {
    id: 'training-mid-zidane',
    artworkId: 'mid-zidane',
    name: { en: 'Zinedine Zidane', ka: 'ზინედინ ზიდანი', es: 'Zinedine Zidane', tr: 'Zinedine Zidane' },
    positionGroup: 'MID',
    nationality: 'France',
    club: 'Real Madrid CF',
    league: 'La Liga',
    // Declining: the scout season is the peak, so paying above it is a loss.
    snapshots: [
      { season: '2001/02', league: 'La Liga', age: 29, apps: 31, goals: 7, assists: 6, valueEur: 75_000_000 },
      { season: '2003/04', league: 'La Liga', age: 31, apps: 33, goals: 6, assists: 8, valueEur: 55_000_000 },
      { season: '2005/06', league: 'La Liga', age: 33, apps: 29, goals: 9, assists: 8, valueEur: 25_000_000 },
    ],
    hints: {
      en: ['Headed two goals in a World Cup final', 'His last ever match ended with a red card in Berlin'],
      ka: ['მსოფლიოს ფინალში ორი გოლი თავით გაიტანა', 'მისი უკანასკნელი მატჩი ბერლინში წითელი ბარათით დასრულდა'],
      es: ['Marcó dos goles de cabeza en una final del Mundial', 'Su último partido terminó con roja en Berlín'],
      tr: ['Bir Dünya Kupası finalinde kafayla iki gol attı', 'Son maçı Berlin’de kırmızı kartla bitti'],
    },
  },
  {
    id: 'training-mid-iniesta',
    artworkId: 'mid-iniesta',
    name: { en: 'Andrés Iniesta', ka: 'ანდრეს ინიესტა', es: 'Andrés Iniesta', tr: 'Andrés Iniesta' },
    positionGroup: 'MID',
    nationality: 'Spain',
    club: 'FC Barcelona',
    league: 'La Liga',
    snapshots: [
      { season: '2004/05', league: 'La Liga', age: 20, apps: 37, goals: 2, assists: 3, valueEur: 12_000_000 },
      { season: '2008/09', league: 'La Liga', age: 24, apps: 26, goals: 4, assists: 8, valueEur: 40_000_000 },
      { season: '2011/12', league: 'La Liga', age: 27, apps: 29, goals: 8, assists: 10, valueEur: 60_000_000 },
    ],
    hints: {
      en: ['Scored the winning goal of a World Cup final', 'Camp Nou called him “Don Andrés”'],
      ka: ['მსოფლიოს ფინალში გამარჯვების გოლი გაიტანა', 'კამპ ნოუზე „დონ ანდრესს“ ეძახდნენ'],
      es: ['Marcó el gol de la victoria en una final del Mundial', 'En el Camp Nou lo llamaban “Don Andrés”'],
      tr: ['Bir Dünya Kupası finalinde galibiyet golünü attı', 'Camp Nou ona “Don Andrés” derdi'],
    },
  },
  {
    id: 'training-gk-casillas',
    artworkId: 'gk-casillas',
    name: { en: 'Iker Casillas', ka: 'იკერ კასილიასი', es: 'Iker Casillas', tr: 'Iker Casillas' },
    positionGroup: 'GK',
    nationality: 'Spain',
    club: 'Real Madrid CF',
    league: 'La Liga',
    snapshots: [
      { season: '1999/00', league: 'La Liga', age: 18, apps: 27, goals: 0, assists: 0, cleanSheets: 9, conceded: 35, valueEur: 8_000_000 },
      { season: '2004/05', league: 'La Liga', age: 23, apps: 38, goals: 0, assists: 0, cleanSheets: 15, conceded: 28, valueEur: 30_000_000 },
      { season: '2008/09', league: 'La Liga', age: 27, apps: 38, goals: 0, assists: 0, cleanSheets: 17, conceded: 22, valueEur: 45_000_000 },
    ],
    hints: {
      en: ['Real Madrid’s first-choice keeper at 18', 'Captained Spain to a World Cup'],
      ka: ['18 წლისა რეალ მადრიდის ძირითადი მეკარე გახდა', 'ესპანეთის კაპიტნად მსოფლიო ჩემპიონატი მოიგო'],
      es: ['Portero titular del Real Madrid con 18 años', 'Capitaneó a España hasta ganar un Mundial'],
      tr: ['18 yaşında Real Madrid’in ilk kalecisiydi', 'İspanya’yı kaptan olarak Dünya Kupası’na taşıdı'],
    },
  },
];

export function trainingLotFootballer(index: number, locale: Locale): Footballer {
  const lot = LOTS[index];
  const artwork = FOOTBALLERS.find((f) => f.id === lot.artworkId)?.imageUrl;
  const hints = lot.hints[locale] ?? lot.hints.en;
  return {
    id: lot.id,
    name: lot.name[locale] ?? lot.name.en,
    positionGroup: lot.positionGroup,
    value: lot.snapshots[lot.snapshots.length - 1].valueEur,
    startingPrice: lot.snapshots[0].valueEur,
    clues: [...SNAPSHOT_STAT_STEPS, ...hints],
    snapshots: lot.snapshots,
    nationality: lot.nationality,
    club: lot.club,
    league: lot.league,
    imageUrl: artwork ?? getFootballerPlaceholderImage(lot.artworkId),
  };
}

export const TRAINING_LOT_COUNT = LOTS.length;
