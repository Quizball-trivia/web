/** Odds Board data: each answer is priced like a betting market. The favourite
 *  (obvious answer) is short-priced; contrarian correct answers pay big. Odds
 *  reflect crowd perception, NOT correctness — so the underdog is sometimes right. */

export interface OddsOption {
  text: string;
  odds: number;
}
export interface OddsQuestion {
  id: string;
  q: string;
  options: OddsOption[];
  answer: number;
}

export const ODDS_QUESTIONS: OddsQuestion[] = [
  {
    id: 'ob1',
    q: 'Which country won the 2022 World Cup?',
    options: [
      { text: 'Argentina', odds: 1.4 },
      { text: 'France', odds: 2.5 },
      { text: 'Brazil', odds: 3.5 },
      { text: 'Croatia', odds: 12 },
    ],
    answer: 0, // favourite is right
  },
  {
    id: 'ob2',
    q: 'Who scored the fastest goal in World Cup history (~11s, 2002)?',
    options: [
      { text: 'Ronaldo', odds: 2.2 },
      { text: 'Rivaldo', odds: 4.0 },
      { text: 'Hakan Şükür', odds: 6.0 },
      { text: 'Oliver Bierhoff', odds: 8.0 },
    ],
    answer: 2, // contrarian pays 6x
  },
  {
    id: 'ob3',
    q: 'Only goalkeeper to win the Ballon d’Or?',
    options: [
      { text: 'Gianluigi Buffon', odds: 1.8 },
      { text: 'Iker Casillas', odds: 3.2 },
      { text: 'Lev Yashin', odds: 4.5 },
      { text: 'Manuel Neuer', odds: 7.0 },
    ],
    answer: 2, // underdog is right
  },
  {
    id: 'ob4',
    q: 'Which club has won the most Champions League titles?',
    options: [
      { text: 'Real Madrid', odds: 1.2 },
      { text: 'AC Milan', odds: 5.0 },
      { text: 'Bayern Munich', odds: 4.5 },
      { text: 'Barcelona', odds: 6.0 },
    ],
    answer: 0, // heavy favourite
  },
  {
    id: 'ob5',
    q: 'Most goals in a single calendar year (91 in 2012)?',
    options: [
      { text: 'Lionel Messi', odds: 1.5 },
      { text: 'Cristiano Ronaldo', odds: 3.0 },
      { text: 'Robert Lewandowski', odds: 6.0 },
      { text: 'Gerd Müller', odds: 9.0 },
    ],
    answer: 0,
  },
  {
    id: 'ob6',
    q: 'Which player made the most Serie A appearances?',
    options: [
      { text: 'Paolo Maldini', odds: 2.0 },
      { text: 'Francesco Totti', odds: 2.6 },
      { text: 'Gianluigi Buffon', odds: 3.5 },
      { text: 'Javier Zanetti', odds: 6.5 },
    ],
    answer: 2, // Buffon — a mid-priced surprise
  },
];
