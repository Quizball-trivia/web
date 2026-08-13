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
      q: 'How many Champions League titles has Real Madrid won (most all-time)?',
      options: ['12', '13', '14', '15'],
      answer: 3,
      difficulty: 'hard',
    },
  },
  {
    club: 'Manchester City',
    match: 'Man City v Everton',
    pick: 'Man City to win',
    baseOdds: 1.4,
    question: {
      id: 'bs2',
      q: 'Who was Man City’s manager for their 2023 treble?',
      options: ['Mikel Arteta', 'Pep Guardiola', 'Roberto Mancini', 'Manuel Pellegrini'],
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
      q: 'Which stadium does Bayern Munich play at?',
      options: ['Signal Iduna Park', 'Allianz Arena', 'Olympiastadion', 'Veltins-Arena'],
      answer: 1,
      difficulty: 'medium',
    },
  },
];
