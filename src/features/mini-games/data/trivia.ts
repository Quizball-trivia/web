/** Shared football trivia pool for the mini-games (Trivia Spin, Penalty
 *  Shootout, Daily Jackpot). Multiple choice with a single correct index.
 *  Sourced from the real published question pool (staging DB export). */

export interface TriviaQuestion {
  id: string;
  q: string;
  options: string[];
  answer: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const TRIVIA: TriviaQuestion[] = [
  { id: 'q1', q: 'Which part of London is Arsenal\'s stadium located in?', options: ['South London', 'North London', 'West London', 'East London'], answer: 1, difficulty: 'easy' },
  { id: 'q2', q: 'What is the nickname for Arsenal F.C. and its players?', options: ['The Blues', 'The Gunners', 'The Lions', 'The Eagles'], answer: 1, difficulty: 'easy' },
  { id: 'q3', q: 'Who is the legendary Ivory Coast striker who scored many goals for Chelsea?', options: ['Didier Drogba', 'Mohamed Salah', 'Samuel Eto\'o', 'Sadio Mane'], answer: 0, difficulty: 'easy' },
  { id: 'q4', q: 'Which manager, known as "The Special One," led Chelsea to back-to-back Premier League titles in 2005 and 2006?', options: ['Carlo Ancelotti', 'Antonio Conte', 'Thomas Tuchel', 'José Mourinho'], answer: 3, difficulty: 'easy' },
  { id: 'q5', q: 'Which famous trophy did Chelsea win in 2012 and 2021?', options: ['The World Cup', 'The Champions League', 'The Super Bowl', 'The Wimbledon Cup'], answer: 1, difficulty: 'easy' },
  { id: 'q6', q: 'Which city is Chelsea F.C. located in?', options: ['Manchester', 'London', 'Liverpool', 'Leeds'], answer: 1, difficulty: 'easy' },
  { id: 'q7', q: 'In 2012, Chelsea became the first London club to win which major trophy?', options: ['The Premier League', 'The FA Cup', 'The UEFA Champions League', 'The League Cup'], answer: 2, difficulty: 'easy' },
  { id: 'q8', q: 'Which Bundesliga club has red bulls in its logo?', options: ['Bayern', 'RB Leipzig', 'Leverkusen', 'Mainz'], answer: 1, difficulty: 'easy' },
  { id: 'q9', q: 'Who is the all-time leading goalscorer for Chelsea, with 211 goals?', options: ['Didier Drogba', 'Eden Hazard', 'Frank Lampard', 'Bobby Tambling'], answer: 2, difficulty: 'medium' },
  { id: 'q10', q: 'What was the Chelsea\'s original nickname before they became known as "The Blues"?', options: ['The Pensioners', 'The Sailors', 'The Hammers', 'The Royals'], answer: 0, difficulty: 'medium' },
  { id: 'q11', q: 'Which of these is a major local rival for Chelsea?', options: ['Tottenham Hotspur', 'Real Madrid', 'Paris Saint-Germain', 'LA Galaxy'], answer: 0, difficulty: 'medium' },
  { id: 'q12', q: 'What is the official nickname of Chelsea F.C.?', options: ['The Reds', 'The Gunners', 'The Blues', 'The Lions'], answer: 2, difficulty: 'medium' },
  { id: 'q13', q: 'Which famous Russian billionaire owned Chelsea from 2003 to 2022?', options: ['Todd Boehly', 'Roman Abramovich', 'Alisher Usmanov', 'Mikhail Prokhorov'], answer: 1, difficulty: 'medium' },
  { id: 'q14', q: 'Which club’s logo features a "Biscione" (a large grass snake)?', options: ['AC Milan', 'Inter Milan', 'Atalanta', 'Brescia'], answer: 1, difficulty: 'medium' },
  { id: 'q15', q: 'Which Serie A team has a logo that features a "Zebretta" (Little Zebra)?', options: ['Juventus', 'Udinese', 'Siena', 'Spezia'], answer: 1, difficulty: 'medium' },
  { id: 'q16', q: 'The current Chelsea crest features a lion holding what object?', options: ['A football', 'An abbot’s staff', 'A shield', 'A crown'], answer: 1, difficulty: 'medium' },
  { id: 'q17', q: 'Which sponsor\'s logo is featured on the sleeve of the Bayern Munich jersey in 2025/26?', options: ['Qatar Airways', 'Audi', 'Emirates', 'Allianz'], answer: 1, difficulty: 'medium' },
  { id: 'q18', q: 'Who was the first player signed by Manchester City after the Abu Dhabi United Group takeover in 2008?', options: ['Vincent Kompany', 'Robinho', 'Pablo Zabaleta', 'Nigel de Jong'], answer: 1, difficulty: 'medium' },
  { id: 'q19', q: 'Arsenal’s 49-game unbeaten run was ended by which team in October 2004?', options: ['Chelsea', 'Manchester United', 'Liverpool', 'Bolton Wanderers'], answer: 1, difficulty: 'hard' },
  { id: 'q20', q: 'Who was the first Arsenal player to score a goal at the Emirates Stadium?', options: ['Thierry Henry', 'Gilberto Silva', 'Robin van Persie', 'Cesc Fàbregas'], answer: 1, difficulty: 'hard' },
  { id: 'q21', q: 'What is the main color of the Chelsea home kit?', options: ['Red', 'Blue', 'White', 'Yellow'], answer: 1, difficulty: 'hard' },
  { id: 'q22', q: 'Who was the famous Chelsea captain known as "Captain, Leader, Legend"?', options: ['John Terry', 'Wayne Rooney', 'Steven Gerrard', 'David Beckham'], answer: 0, difficulty: 'hard' },
  { id: 'q23', q: 'Which of these legends is Chelsea\'s all-time top goalscorer and a former manager?', options: ['John Terry', 'Frank Lampard', 'Petr Cech', 'Ashley Cole'], answer: 1, difficulty: 'hard' },
  { id: 'q24', q: 'What animal is featured on the current Chelsea club crest?', options: ['A Rooster', 'A Dragon', 'A Lion', 'An Eagle'], answer: 2, difficulty: 'hard' },
];

export const HARD_QUESTIONS = TRIVIA.filter((q) => q.difficulty === 'hard');
