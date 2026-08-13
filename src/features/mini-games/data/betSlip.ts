import type { MiniLocale } from '../lib/i18n';
import type { TriviaQuestion } from './trivia';

/** Bet Slip Booster data: a 3-leg slip; answering the club question boosts that
 *  leg's odds. Questions sourced from the real published question pool,
 *  bilingual EN/KA — resolve with getSlip(locale). Pick labels are translated
 *  at the component level via the mini-games t(). */

interface BilingualText {
  en: string;
  ka: string;
}

export interface Selection {
  club: string; // resolves to a crest
  match: string;
  pick: string;
  baseOdds: number;
  question: TriviaQuestion;
}

interface BilingualSelection extends Omit<Selection, 'question'> {
  question: Omit<TriviaQuestion, 'q' | 'options'> & { q: BilingualText; options: BilingualText[] };
}

export const BOOST_FACTOR = 1.4; // per correct leg (the cap — applied once)

const SLIP_BANK: BilingualSelection[] = [
  {
    club: 'Real Madrid CF',
    match: 'Real Madrid v Sevilla',
    pick: 'Real Madrid to win',
    baseOdds: 1.5,
    question: {
      id: 'bs1',
      q: { en: 'Real Madrid signed Toni Kroos, Keylor Navas, and which other player in the summer of 2014?', ka: 'მადრიდის რეალმა 2014 წლის ზაფხულში ტონი კროოსთან და კეილორ ნავასთან ერთად კიდევ რომელი მოთამაშე დაიმატა?' },
      options: [
        { en: 'Isco', ka: 'ისკო' },
        { en: 'James Rodríguez', ka: 'ხამეს როდრიგესი' },
        { en: 'Asier Illarramendi', ka: 'ასიერ ილიარამენდი' },
        { en: 'Casemiro', ka: 'კაზემირო' },
      ],
      answer: 1,
      difficulty: 'medium',
    },
  },
  {
    club: 'Manchester City',
    match: 'Man City v Everton',
    pick: 'Man City to win',
    baseOdds: 1.4,
    question: {
      id: 'bs2',
      q: { en: 'Which Manchester City player was the first to score 30+ goals in a single Premier League season?', ka: 'მანჩესტერ სიტის რომელი მოთამაშე იყო პირველი, ვინც პრემიერ ლიგის ერთ სეზონში 30-ზე მეტი გოლი გაიტანა?' },
      options: [
        { en: 'Sergio Agüero', ka: 'სერხიო აგუერო' },
        { en: 'Erling Haaland', ka: 'ერლინგ ჰოლანდი' },
        { en: 'Raheem Sterling', ka: 'რაჰიმ სტერლინგი' },
        { en: 'Carlos Tevez', ka: 'კარლოს ტევესი' },
      ],
      answer: 1,
      difficulty: 'medium',
    },
  },
  {
    club: 'FC Bayern Munich',
    match: 'Bayern v Freiburg',
    pick: 'Bayern to win',
    baseOdds: 1.3,
    question: {
      id: 'bs3',
      q: { en: 'Which player left Bayern Munich for Barcelona in 2022?', ka: 'რომელმა ფეხბურთელმა დატოვა მიუნხენის „ბაიერნი“ „ბარსელონასთვის“ 2022 წელს?' },
      options: [
        { en: 'Robert Lewandowski', ka: 'რობერტ ლევანდოვსკი' },
        { en: 'David Alaba', ka: 'დავიდ ალაბა' },
        { en: 'Thiago Alcântara', ka: 'ტიაგო ალკანტარა' },
        { en: 'Philippe Coutinho', ka: 'ფილიპე კოუტინიო' },
      ],
      answer: 0,
      difficulty: 'medium',
    },
  },
];

export function getSlip(locale: MiniLocale): Selection[] {
  return SLIP_BANK.map((s) => ({
    ...s,
    question: {
      ...s.question,
      q: s.question.q[locale],
      options: s.question.options.map((o) => o[locale]),
    },
  }));
}

// Back-compat for the /dev pages and not-yet-localized callers.
export const SLIP: Selection[] = getSlip('en');
