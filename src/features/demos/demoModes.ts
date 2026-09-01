import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";
import type { Locale } from "@/lib/i18n/messages";

type DemoI18nText = { en: string; ka: string };

export interface DemoModeCard {
  slug: string;
  title: DemoI18nText;
  description: DemoI18nText;
  group: "featured" | "daily";
  dailyType?: DailyChallengeType;
}

// The 1v1 training match demo is hidden from the hub for now — it will be
// continued as a separate feature. The /demos/match route (DemoTraining)
// stays wired so it can still be reached directly.
const HIDDEN_DEMO_MODES: DemoModeCard[] = [
  {
    slug: "match",
    title: { en: "1v1 Match", ka: "1v1 მატჩი" },
    description: {
      en: "The flagship head-to-head quiz duel — bans, halves and a live scoreboard.",
      ka: "მთავარი რეჟიმი — პირისპირ ქვიზ-დუელი ბანებით, ტაიმებით და ცოცხალი ანგარიშით.",
    },
    group: "featured",
  },
];

export const FEATURED_DEMO_MODES: DemoModeCard[] = [
  {
    slug: "weekend-league",
    title: { en: "Weekend League", ka: "შაბათ-კვირის ლიგა" },
    description: {
      en: "Live multiplayer tournament — 1,000 players answer the same quiz at the same time.",
      ka: "ლაივ მულტიპლეიერ ტურნირი — 1000 მოთამაშე ერთდროულად პასუხობს ერთსა და იმავე კითხვებს.",
    },
    group: "featured",
  },
  {
    slug: "auction",
    title: { en: "Auction", ka: "აუქციონი" },
    description: {
      en: "Bid against rivals to sign mystery footballers and build the best squad.",
      ka: "ივაჭრე მეტოქეების წინააღმდეგ იდუმალ ფეხბურთელებზე და ააწყვე საუკეთესო გუნდი.",
    },
    group: "featured",
  },
];

// Prototype mini-games (features/mini-games) — self-contained, no backend.
// In-game copy is English-only for now (prototypes); hub cards are bilingual.
const ALL_MINI_GAME_DEMO_MODES: DemoModeCard[] = [
  {
    slug: "mini-final-third",
    title: { en: "Free Kicks", ka: "თავისუფალი დარტყმები" },
    description: {
      en: "Know football, read the goal, take the shot — cash out or ride the multiplier.",
      ka: "ფეხბურთის ცოდნით ამოიცანი მეკარის ზონა და დაარტყი — აიღე მოგება ან გარისკე მეტ მამრავლზე.",
    },
    group: "featured",
  },
  {
    slug: "mini-road-to-goal",
    title: { en: "Road to Goal", ka: "გზა გოლისკენ" },
    description: {
      en: "Beat 11 defenders with 11 football questions — bank each zone or risk the tackle.",
      ka: "აჯობე 11 მცველს 11 საფეხბურთო კითხვით — აიღე მოგება ან გარისკე ჩაჭრაზე.",
    },
    group: "featured",
  },
  {
    slug: "mini-squad-spin",
    title: { en: "Squad Spin", ka: "Squad Spin" },
    description: {
      en: "Spin the reels — club, position, nation — then name a player who fits.",
      ka: "დაატრიალე — კლუბი, პოზიცია, ქვეყანა — და დაასახელე შესაბამისი ფეხბურთელი.",
    },
    group: "featured",
  },
  {
    slug: "mini-trivia-spin",
    title: { en: "Trivia Spin", ka: "Trivia Spin" },
    description: {
      en: "Answer to earn spins, then let the wheel decide your payout.",
      ka: "უპასუხე, მოაგროვე დატრიალებები და ბორბალმა გადაწყვიტოს შენი მოგება.",
    },
    group: "featured",
  },
  {
    slug: "mini-penalty-shootout",
    title: { en: "Penalty Shootout", ka: "პენალტების სერია" },
    description: {
      en: "Answer to earn a shot, pick your corner against the keeper — five rounds.",
      ka: "უპასუხე, მოიგე დარტყმა და აირჩიე კუთხე მეკარის წინააღმდეგ — ხუთი რაუნდი.",
    },
    group: "featured",
  },
  {
    slug: "mini-daily-jackpot",
    title: { en: "Daily Jackpot", ka: "Daily Jackpot" },
    description: {
      en: "One hard question a day — a pot that climbs until someone cracks it.",
      ka: "დღეში ერთი რთული კითხვა — ჯექპოტი იზრდება, სანამ ვინმე გატეხავს.",
    },
    group: "featured",
  },
  {
    slug: "mini-pass-chain",
    title: { en: "Pass Chain", ka: "Pass Chain" },
    description: {
      en: "Link two players through shared clubs — fewer links score higher.",
      ka: "დააკავშირე ორი ფეხბურთელი საერთო კლუბებით — ნაკლები რგოლი, მეტი ქულა.",
    },
    group: "featured",
  },
  {
    slug: "mini-accumulator",
    title: { en: "Accumulator", ka: "ექსპრესი" },
    description: {
      en: "Pick 5 legs, one stake, all must land — odds multiply, cash out late.",
      ka: "აირჩიე 5 პასუხი ერთი ფსონით — კოეფიციენტები მრავლდება, დროულად დააქეშაუთე.",
    },
    group: "featured",
  },
  {
    slug: "mini-squad-collection",
    title: { en: "Squad Collection", ka: "Squad Collection" },
    description: {
      en: "Answer to pull player cards and fill your formation — pack-opening reveals.",
      ka: "უპასუხე, ამოიღე ბარათები და შეავსე შენი შემადგენლობა — პაკეტების გახსნით.",
    },
    group: "featured",
  },
  {
    slug: "mini-cash-out-ladder",
    title: { en: "Cash Out Ladder", ka: "Cash Out Ladder" },
    description: {
      en: "1x to 32x — bank or climb after each answer; one miss wipes it.",
      ka: "1x-დან 32x-მდე — ყოველი პასუხის შემდეგ აიღე ან აძვერი; ერთი შეცდომა შლის ყველაფერს.",
    },
    group: "featured",
  },
  {
    slug: "mini-bet-slip-booster",
    title: { en: "Bet Slip Booster", ka: "Bet Slip Booster" },
    description: {
      en: "A 3-leg slip — answer club questions to boost each leg's odds.",
      ka: "3-პოზიციანი ტალონი — უპასუხე კლუბების კითხვებს და გაზარდე კოეფიციენტები.",
    },
    group: "featured",
  },
  {
    slug: "mini-half-time-trivia",
    title: { en: "Half-Time Trivia", ka: "Half-Time Trivia" },
    description: {
      en: "A live match at half-time — a 60-second quiz above the markets.",
      ka: "მატჩის შესვენება — 60-წამიანი ქვიზი მარკეტების თავზე.",
    },
    group: "featured",
  },
  {
    slug: "mini-odds-board",
    title: { en: "Odds Board", ka: "Odds Board" },
    description: {
      en: "Every answer is priced like a market — obvious pays 1.2x, contrarian 6x.",
      ka: "ყველა პასუხი მარკეტივით ფასდება — აშკარა 1.2x-ს იხდის, სარისკო 6x-ს.",
    },
    group: "featured",
  },
  {
    slug: "mini-football-grid",
    title: { en: "Football Tic Tac Toe", ka: "საფეხბურთო იქს-ნული" },
    description: {
      en: "Tic-tac-toe on a club × nation grid — claim cells by naming players.",
      ka: "იქს-ნული კლუბი × ქვეყანა ბადეზე — დაიკავე უჯრები ფეხბურთელების დასახელებით.",
    },
    group: "featured",
  },
  {
    slug: "mini-survivor",
    title: { en: "Survivor", ka: "სურვაივერი" },
    description: {
      en: "Sudden death — questions get harder until one mistake ends the run.",
      ka: "უეცარი სიკვდილი — კითხვები მძიმდება, ერთი შეცდომა ამთავრებს სერიას.",
    },
    group: "featured",
  },
  {
    slug: "mini-hi-lo-ride",
    title: { en: "Hi-Lo Ride", ka: "Hi-Lo Ride" },
    description: {
      en: "Chain higher-or-lower stat calls — hard matchups pay bigger odds.",
      ka: "მეტი-ნაკლების ჯაჭვი სტატისტიკაზე — რთული წყვილები მეტს იხდიან.",
    },
    group: "featured",
  },
  {
    slug: "mini-trivia-mines",
    title: { en: "Trivia Mines", ka: "Trivia Mines" },
    description: {
      en: "Dribble past hidden defenders — scout them out with your knowledge.",
      ka: "გაუარე დამალულ მცველებს — დაზვერე ისინი შენი ცოდნით.",
    },
    group: "featured",
  },
  {
    slug: "mini-quiz-board",
    title: { en: "Quiz Board", ka: "ქვიზის დაფა" },
    description: {
      en: "Jeopardy-style value board vs the AI — steal tiles when it slips.",
      ka: "ჯეპარდის სტილის დაფა AI-ს წინააღმდეგ — მოიპარე უჯრები, როცა შეცდება.",
    },
    group: "featured",
  },
  {
    slug: "mini-last-one-standing",
    title: { en: "Last One Standing", ka: "უკანასკნელი გადარჩენილი" },
    description: {
      en: "100 players, nine cuts, one survivor — answer fast to stay alive.",
      ka: "100 მოთამაშე, ცხრა გადარჩევა, ერთი გადარჩენილი — უპასუხე სწრაფად.",
    },
    group: "featured",
  },
  {
    slug: "mini-golden-goal",
    title: { en: "Golden Goal", ka: "ოქროს გოლი" },
    description: {
      en: "Blitz duel — speed and accuracy push the ball; first goal wins.",
      ka: "ბლიც-დუელი — სისწრაფე და სიზუსტე წევს ბურთს; პირველი გოლი იგებს.",
    },
    group: "featured",
  },
  {
    slug: "mini-career-race",
    title: { en: "Career Race", ka: "კარიერის რბოლა" },
    description: {
      en: "Transfer trail reveals club by club — buzz before your rival.",
      ka: "კარიერა იხსნება კლუბ-კლუბ — დააჭირე ზარს მეტოქეზე ადრე.",
    },
    group: "featured",
  },
  {
    slug: "mini-guess-the-goal",
    title: { en: "Guess the Goal", ka: "გამოიცანი გოლი" },
    description: {
      en: "An iconic goal replays on the tactics board — name it early for more points.",
      ka: "ლეგენდარული გოლი ტაქტიკურ დაფაზე — ადრე გამოიცანი და მეტი ქულა აიღე.",
    },
    group: "featured",
  },
  {
    slug: "mini-guess-fifa-card",
    title: { en: "FIFA Cards", ka: "FIFA ბარათები" },
    description: {
      en: "A gold FUT card, stats only — name the player as nation, league and club unlock.",
      ka: "ოქროს FUT ბარათი მხოლოდ სტატისტიკით — გამოიცანი მოთამაშე, სანამ ქვეყანა, ლიგა და კლუბი გაიხსნება.",
    },
    group: "featured",
  },
  {
    slug: "mini-stat-sniper",
    title: { en: "Stat Sniper", ka: "სტატ-სნაიპერი" },
    description: {
      en: "No options — slide to your best guess and score on proximity.",
      ka: "ვარიანტების გარეშე — გაასრიალე შენი ვარაუდი და დააგროვე სიზუსტით.",
    },
    group: "featured",
  },
];

// Hidden from the hub per owner (2026-08-18); routes stay reachable directly.
const HIDDEN_MINI_SLUGS = [
  "mini-trivia-spin",
  "mini-penalty-shootout",
  "mini-daily-jackpot",
  "mini-golden-goal",
  "mini-survivor",
];

export const MINI_GAME_DEMO_MODES: DemoModeCard[] = ALL_MINI_GAME_DEMO_MODES.filter(
  (mode) => !HIDDEN_MINI_SLUGS.includes(mode.slug),
);

const HIDDEN_MINI_MODES: DemoModeCard[] = ALL_MINI_GAME_DEMO_MODES.filter((mode) =>
  HIDDEN_MINI_SLUGS.includes(mode.slug),
);

const DAILY_DEMO_COPY: Record<DailyChallengeType, { title: DemoI18nText; description: DemoI18nText }> = {
  moneyDrop: {
    title: { en: "Money Drop", ka: "ფულის ვარდნა" },
    description: {
      en: "Protect your prize money — every wrong answer costs you.",
      ka: "დაიცავი შენი საპრიზო თანხა — ყოველი შეცდომა ძვირად დაგიჯდება.",
    },
  },
  trueFalse: {
    title: { en: "True or False", ka: "მართალია თუ ტყუილი" },
    description: {
      en: "Quick-fire football statements — call them true or false.",
      ka: "სწრაფი საფეხბურთო მტკიცებები — მართალია თუ ტყუილი?",
    },
  },
  clues: {
    title: { en: "Who Am I?", ka: "ვინ ვარ მე?" },
    description: {
      en: "Clues reveal one by one — guess the player before they run out.",
      ka: "მინიშნებები სათითაოდ იხსნება — გამოიცანი ფეხბურთელი ვიდრე ამოიწურება.",
    },
  },
  countdown: {
    title: { en: "Countdown", ka: "უკუთვლა" },
    description: {
      en: "Name as many correct answers as you can before the clock hits zero.",
      ka: "დაასახელე რაც შეიძლება მეტი სწორი პასუხი, სანამ დრო ამოიწურება.",
    },
  },
  putInOrder: {
    title: { en: "Put In Order", ka: "დაალაგე რიგზე" },
    description: {
      en: "Drag and drop to rank players and clubs in the right order.",
      ka: "გადაათრიე და დაალაგე მოთამაშეები და კლუბები სწორი თანმიმდევრობით.",
    },
  },
  imposter: {
    title: { en: "Imposter", ka: "იმპოსტერი" },
    description: {
      en: "Spot every real answer — and don't get fooled by the imposters.",
      ka: "იპოვე ყველა ნამდვილი პასუხი — არ მოტყუვდე იმპოსტერებზე.",
    },
  },
  careerPath: {
    title: { en: "Career Path", ka: "კარიერის გზა" },
    description: {
      en: "Follow the transfer trail and name the player behind the career.",
      ka: "მიჰყევი ტრანსფერების კვალს და გამოიცანი ვისი კარიერაა.",
    },
  },
  highLow: {
    title: { en: "Higher or Lower", ka: "მეტი თუ ნაკლები" },
    description: {
      en: "Compare the stats — pick which side is higher and keep the chain alive.",
      ka: "შეადარე სტატისტიკა — აირჩიე მეტი და შეინარჩუნე ჯაჭვი.",
    },
  },
  footballLogic: {
    title: { en: "Football Logic", ka: "საფეხბურთო ლოგიკა" },
    description: {
      en: "Two pictures, one player — decode the visual riddle.",
      ka: "ორი სურათი, ერთი ფეხბურთელი — ამოხსენი ვიზუალური თავსატეხი.",
    },
  },
};

// Hidden from the hub per owner (2026-08-13); routes stay reachable directly.
const HIDDEN_DAILY_TYPES: DailyChallengeType[] = ["clues", "putInOrder"];

const buildDailyCard = (type: DailyChallengeType): DemoModeCard => ({
  slug: `daily-${type}`,
  title: DAILY_DEMO_COPY[type].title,
  description: DAILY_DEMO_COPY[type].description,
  group: "daily",
  dailyType: type,
});

export const DAILY_DEMO_MODES: DemoModeCard[] = (
  Object.keys(DAILY_DEMO_COPY) as DailyChallengeType[]
)
  .filter((type) => !HIDDEN_DAILY_TYPES.includes(type))
  .map(buildDailyCard);

const HIDDEN_DAILY_MODES: DemoModeCard[] = HIDDEN_DAILY_TYPES.map(buildDailyCard);

export const ALL_DEMO_MODES: DemoModeCard[] = [
  ...FEATURED_DEMO_MODES,
  ...MINI_GAME_DEMO_MODES,
  ...DAILY_DEMO_MODES,
  ...HIDDEN_DEMO_MODES,
  ...HIDDEN_MINI_MODES,
  ...HIDDEN_DAILY_MODES,
];

export function findDemoMode(slug: string): DemoModeCard | undefined {
  return ALL_DEMO_MODES.find((mode) => mode.slug === slug);
}

export function demoText(text: DemoI18nText, locale: Locale): string {
  return locale === 'ka' ? text.ka : text.en;
}
