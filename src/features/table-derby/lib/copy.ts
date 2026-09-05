/** All player-facing Table Derby strings. Georgian only — no English may
 *  reach the UI (product rule; see CLAUDE.md design section). */
export const TD = {
  title: 'მაგიდის დერბი',
  titleLine1: 'მაგიდის',
  titleLine2: 'დერბი',
  tagline: 'პირისპირ დუელი · 4 რაუნდი',
  playCta: 'თამაშის დაწყება',
  poweredBy: 'betsson.sport', // brand wordmark, not translatable copy

  // Matchmaking
  searching: 'მოწინააღმდეგის ძებნა',
  found: 'მოწინააღმდეგე ნაპოვნია!',
  you: 'შენ',

  // Showdown
  bestOfRounds: 'საუკეთესო 4 რაუნდიდან',

  // RPS
  rpsTitle: 'ვინ დაიწყებს?',
  rpsSubtitle: 'ქვა · ქაღალდი · მაკრატელი',
  rpsRock: 'ქვა',
  rpsPaper: 'ქაღალდი',
  rpsScissors: 'მაკრატელი',
  rpsTie: 'ფრე! კიდევ ერთხელ',
  rpsYouStart: 'შენ იწყებ!',
  rpsOpponentStarts: 'იწყებს მოწინააღმდეგე',

  // Round 1 — ჩამოთვალე
  round1Name: 'ჩამოთვალე',
  roundLabel: 'რაუნდი',
  yourTurn: 'შენი ჯერია — ჩაწერე პასუხი',
  opponentTurn: 'ფიქრობს...',
  answerPlaceholder: 'ჩაწერე პასუხი...',
  submit: 'პასუხი',
  correct: 'სწორია!',
  wrong: 'არასწორია',
  duplicate: 'ეს პასუხი უკვე დასახელდა',
  timeUp: 'დრო ამოიწურა',
  livesLabel: 'სიცოცხლე',
  poolExhausted: 'ფრე — ახალი კატეგორია!',

  // Round end / match end
  roundWon: 'რაუნდი შენია!',
  roundLost: 'რაუნდი წააგე',
  matchScore: 'ანგარიში რაუნდებში',
  nextRoundsSoon: 'შემდეგი რაუნდები მალე დაემატება',
  playAgain: 'თავიდან თამაში',
  backHome: 'მთავარზე დაბრუნება',
} as const;

/** Mock opponent display names (Georgian). */
export const OPPONENT_NAMES = [
  'გიორგი მ.',
  'ნიკა კ.',
  'ლუკა წ.',
  'სანდრო ბ.',
  'დათო ხ.',
  'თორნიკე გ.',
] as const;
