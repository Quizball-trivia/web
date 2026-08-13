import type { TriviaQuestion } from './trivia';

/** Bet Slip Booster data: a 3-leg slip; answering the club question boosts that
 *  leg's odds. Each correct answer applies one capped boost (×BOOST_FACTOR). */

export interface Selection {
  club: string; // resolves to a crest
  match: string;
  pick: string;
  baseOdds: number;
  question: TriviaQuestion;
}

export const BOOST_FACTOR = 1.4; // per correct leg (the cap — applied once)

export const SLIP: Selection[] = [
  {
    club: 'Real Madrid CF',
    match: 'Real Madrid v Sevilla',
    pick: 'Real Madrid to win',
    baseOdds: 1.5,
    question: {
      id: 'bs1',
      q: 'Real Madrid signed Toni Kroos, Keylor Navas, and which other player in the summer of 2014?',
      options: ['Isco', 'James Rodríguez', 'Asier Illarramendi', 'Casemiro'],
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
      q: "Which player, who left Manchester City in 2021, is the club's all-time leading goalscorer?",
      options: ['Raheem Sterling', 'Sergio Agüero', 'Shaun Goater', 'Francis Lee'],
      answer: 1,
      difficulty: 'easy',
    },
  },
  {
    club: 'FC Bayern Munich',
    match: 'Bayern v Freiburg',
    pick: 'Bayern to win',
    baseOdds: 1.3,
    question: {
      id: 'bs3',
      q: 'Which player left Bayern Munich for Barcelona in 2022?',
      options: ['Robert Lewandowski', 'David Alaba', 'Thiago Alcântara', 'Philippe Coutinho'],
      answer: 0,
      difficulty: 'medium',
    },
  },
];
