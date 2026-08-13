/** Odds Board data: each answer is priced like a betting market. The favourite
 *  (obvious answer) is short-priced; contrarian correct answers pay big. Odds
 *  reflect crowd perception, NOT correctness. Questions sourced from the real
 *  published question pool (staging DB export). */

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
    q: 'Which Manchester City player was the first to score 30+ goals in a single Premier League season?',
    options: [
      { text: 'Sergio Agüero', odds: 2.8 },
      { text: 'Erling Haaland', odds: 1.4 },
      { text: 'Raheem Sterling', odds: 4.0 },
      { text: 'Carlos Tevez', odds: 9.0 },
    ],
    answer: 1,
  },
  {
    id: 'ob2',
    q: 'Manchester City\'s record European victory is a 7–0 win achieved in 2019 against which team?',
    options: [
      { text: 'RB Leipzig', odds: 3.2 },
      { text: 'Schalke 04', odds: 1.3 },
      { text: 'Real Madrid', odds: 5.0 },
      { text: 'Sporting CP', odds: 8.0 },
    ],
    answer: 1,
  },
  {
    id: 'ob3',
    q: 'In the 2018–19 season, Manchester City beat which team 6–0 in the FA Cup final to complete the domestic treble?',
    options: [
      { text: 'Watford', odds: 1.5 },
      { text: 'Brighton', odds: 2.5 },
      { text: 'Chelsea', odds: 4.5 },
      { text: 'Wigan Athletic', odds: 10.0 },
    ],
    answer: 0,
  },
  {
    id: 'ob4',
    q: 'Which Arsenal goalkeeper was sent off in the 2006 Champions League Final?',
    options: [
      { text: 'Manuel Almunia', odds: 3.0 },
      { text: 'Jens Lehmann', odds: 1.35 },
      { text: 'David Seaman', odds: 4.2 },
      { text: 'Richard Wright', odds: 7.5 },
    ],
    answer: 1,
  },
  {
    id: 'ob5',
    q: 'Who became the youngest player to ever play for Arsenal in a Premier League match in 2022?',
    options: [
      { text: 'Cesc Fàbregas', odds: 1.4 },
      { text: 'Jack Wilshere', odds: 2.8 },
      { text: 'Ethan Nwaneri', odds: 6.0 },
      { text: 'Theo Walcott', odds: 4.5 },
    ],
    answer: 2,
  },
  {
    id: 'ob6',
    q: 'Which Arsenal player holds the record for the most Premier League assists in a single season (20) for the club?',
    options: [
      { text: 'Mesut Özil', odds: 1.5 },
      { text: 'Cesc Fàbregas', odds: 3.0 },
      { text: 'Thierry Henry', odds: 5.5 },
      { text: 'Dennis Bergkamp', odds: 4.0 },
    ],
    answer: 2,
  },
];
