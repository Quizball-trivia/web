/** Fixture mock data for Half-Time Trivia (a live match sitting at half time,
 *  with a list of betting markets rendered below the trivia widget). */

export interface MarketOption {
  label: string;
  odds: number;
}
export interface Market {
  name: string;
  options: MarketOption[];
}

export interface Fixture {
  competition: string;
  home: { name: string; short: string; club: string; score: number };
  away: { name: string; short: string; club: string; score: number };
  minute: string; // "HT"
  markets: Market[];
}

export const HT_FIXTURE: Fixture = {
  competition: 'Champions League · Group Stage',
  home: { name: 'Real Madrid', short: 'RMA', club: 'Real Madrid CF', score: 1 },
  away: { name: 'Manchester City', short: 'MCI', club: 'Manchester City', score: 1 },
  minute: 'HT',
  markets: [
    {
      name: 'Full Time Result',
      options: [
        { label: 'Real Madrid', odds: 2.6 },
        { label: 'Draw', odds: 3.2 },
        { label: 'Man City', odds: 2.5 },
      ],
    },
    {
      name: 'Next Goal',
      options: [
        { label: 'Real Madrid', odds: 2.1 },
        { label: 'No more goals', odds: 4.5 },
        { label: 'Man City', odds: 2.2 },
      ],
    },
    {
      name: 'Total Goals Over/Under 3.5',
      options: [
        { label: 'Over 3.5', odds: 2.75 },
        { label: 'Under 3.5', odds: 1.44 },
      ],
    },
    {
      name: 'Both Teams to Score — 2nd Half',
      options: [
        { label: 'Yes', odds: 1.8 },
        { label: 'No', odds: 1.95 },
      ],
    },
  ],
};
