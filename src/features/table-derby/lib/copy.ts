/** All player-facing Table Derby strings. Georgian only — no English may
 *  reach the UI (product rule; see CLAUDE.md design section). */
export const TD = {
  title: 'მაგიდის დერბი',
  titleLine1: 'მაგიდის',
  titleLine2: 'დერბი',
  tagline: 'პირისპირ დუელი · 4 რაუნდი',
  playCta: 'თამაშის დაწყება',
  poweredBy: 'betsson.sport', // brand wordmark, not translatable copy

  // Menu
  menuMatchSub: 'პირისპირ დუელი · 4 რაუნდი',
  menuDaily: 'დღიური გამოწვევები',
  menuDailySub: 'ყოველდღე ახალი გამოწვევა',
  menuDailyNew: 'ახალი',
  menuDailyDone: 'შესრულებულია',
  menuWl: 'უიქენდის ლიგა',
  menuWlSub: 'დააგროვე ქულები და მოხვდი ლიგაში',
  menuLb: 'ლიდერბორდი',
  menuLbSub: 'საუკეთესო მოთამაშეები',
  playNow: 'თამაში',
  ticketCost: '1 ბილეთი',
  tickets: 'ბილეთები',
  noTickets: 'ბილეთები აღარ გაქვს — განახლდება ხვალ',
  back: 'უკან',

  // Daily
  dailyToday: 'დღევანდელი გამოწვევა',
  dailyYourScore: 'შენი შედეგი',
  dailyComeBack: 'ახალი გამოწვევა ხვალ',
  dailyFinish: 'დასრულება',

  // Weekend League
  wlQpLabel: 'საკვალიფიკაციო ქულები',
  wlHowTo: 'ითამაშე მაგიდის დერბი და დააგროვე ქულები',
  wlWin: 'მოგება: +25 ქულა',
  wlLoss: 'წაგება: +10 ქულა',
  wlSchedule: 'ლიგა იწყება ყოველ შაბათს',
  wlPrizes: 'პრიზები Betsson.sport-ისგან',
  wlQualified: 'კვალიფიკაცია მიღებულია!',
  wlEnterSoon: 'ლიგაში შესვლა · მალე',
  qpEarned: 'საკვალიფიკაციო ქულა',

  // Leaderboard
  lbWeekly: 'კვირის რეიტინგი',

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
