/** Shared football trivia pool for the mini-games (Trivia Spin, Penalty
 *  Shootout, Daily Jackpot). Multiple choice with a single correct index. */

export interface TriviaQuestion {
  id: string;
  q: string;
  options: string[];
  answer: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const TRIVIA: TriviaQuestion[] = [
  { id: 'q1', q: 'Which country won the 2022 World Cup?', options: ['France', 'Argentina', 'Brazil', 'Croatia'], answer: 1, difficulty: 'easy' },
  { id: 'q2', q: 'Who has won the most Ballon d’Or awards?', options: ['Cristiano Ronaldo', 'Lionel Messi', 'Michel Platini', 'Johan Cruyff'], answer: 1, difficulty: 'easy' },
  { id: 'q3', q: 'Which club has won the most Champions League titles?', options: ['Barcelona', 'Bayern Munich', 'Real Madrid', 'AC Milan'], answer: 2, difficulty: 'easy' },
  { id: 'q4', q: 'Who scored the “Hand of God” goal?', options: ['Pelé', 'Zico', 'Diego Maradona', 'Romário'], answer: 2, difficulty: 'easy' },
  { id: 'q5', q: 'Which player is nicknamed “O Fenômeno”?', options: ['Ronaldinho', 'Ronaldo Nazário', 'Rivaldo', 'Kaká'], answer: 1, difficulty: 'medium' },
  { id: 'q6', q: 'What is the maximum number of players a team can have on the pitch?', options: ['10', '11', '12', '9'], answer: 1, difficulty: 'easy' },
  { id: 'q7', q: 'Which nation did Zinedine Zidane play for?', options: ['Italy', 'Portugal', 'France', 'Spain'], answer: 2, difficulty: 'easy' },
  { id: 'q8', q: 'Which club did Steven Gerrard spend his whole club career at?', options: ['Everton', 'Liverpool', 'Chelsea', 'Aston Villa'], answer: 1, difficulty: 'medium' },
  { id: 'q9', q: 'Who was the top scorer at the 2018 World Cup?', options: ['Kylian Mbappé', 'Harry Kane', 'Cristiano Ronaldo', 'Romelu Lukaku'], answer: 1, difficulty: 'medium' },
  { id: 'q10', q: 'Which goalkeeper is the only one to win the Ballon d’Or?', options: ['Gianluigi Buffon', 'Iker Casillas', 'Lev Yashin', 'Manuel Neuer'], answer: 2, difficulty: 'medium' },
  { id: 'q11', q: 'Which club plays at the Signal Iduna Park?', options: ['Schalke 04', 'Bayern Munich', 'Borussia Dortmund', 'RB Leipzig'], answer: 2, difficulty: 'medium' },
  { id: 'q12', q: 'Who holds the record for most goals in a single calendar year (2012)?', options: ['Cristiano Ronaldo', 'Lionel Messi', 'Robert Lewandowski', 'Gerd Müller'], answer: 1, difficulty: 'hard' },
  { id: 'q13', q: 'Which player made the most appearances in Serie A history?', options: ['Paolo Maldini', 'Gianluigi Buffon', 'Francesco Totti', 'Javier Zanetti'], answer: 1, difficulty: 'hard' },
  { id: 'q14', q: 'Who scored the fastest goal in World Cup history (2002, ~11s)?', options: ['Hakan Şükür', 'Ronaldo', 'Rivaldo', 'Oliver Bierhoff'], answer: 0, difficulty: 'hard' },
];

export const HARD_QUESTIONS = TRIVIA.filter((q) => q.difficulty === 'hard');
