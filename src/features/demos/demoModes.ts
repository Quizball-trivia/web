import { DAILY_CHALLENGE_VISUALS } from "@/lib/domain/dailyChallengeVisuals";
import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";
import type { Locale } from "@/lib/i18n/messages";

type DemoI18nText = { en: string; ka: string };

export interface DemoModeCard {
  slug: string;
  title: DemoI18nText;
  description: DemoI18nText;
  icon: string;
  iconBgColor: string;
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
    icon: "\u{26BD}",
    iconBgColor: "bg-emerald-500/20",
    group: "featured",
  },
  {
    slug: "weekend-league",
    title: { en: "Weekend League", ka: "შაბათ-კვირის ლიგა" },
    description: {
      en: "The weekly tournament — qualifiers, playoff bracket and the 5-round Gauntlet.",
      ka: "ყოველკვირეული ტურნირი — შესარჩევი, პლეი-ოფი და 5-რაუნდიანი განტლეტი.",
    },
    icon: "\u{1F3C6}",
    iconBgColor: "bg-yellow-500/20",
    group: "featured",
  },
];

export const FEATURED_DEMO_MODES: DemoModeCard[] = [
  {
    slug: "auction",
    title: { en: "Auction", ka: "აუქციონი" },
    description: {
      en: "Bid against rivals to sign mystery footballers and build the best squad.",
      ka: "ივაჭრე მეტოქეების წინააღმდეგ იდუმალ ფეხბურთელებზე და ააწყვე საუკეთესო გუნდი.",
    },
    icon: "\u{1F528}",
    iconBgColor: "bg-purple-500/20",
    group: "featured",
  },
];

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
  icon: DAILY_CHALLENGE_VISUALS[type].icon,
  iconBgColor: DAILY_CHALLENGE_VISUALS[type].iconBgColor,
  group: "daily",
  dailyType: type,
});

export const DAILY_DEMO_MODES: DemoModeCard[] = (
  Object.keys(DAILY_CHALLENGE_VISUALS) as DailyChallengeType[]
)
  .filter((type) => !HIDDEN_DAILY_TYPES.includes(type))
  .map(buildDailyCard);

const HIDDEN_DAILY_MODES: DemoModeCard[] = HIDDEN_DAILY_TYPES.map(buildDailyCard);

export const ALL_DEMO_MODES: DemoModeCard[] = [
  ...FEATURED_DEMO_MODES,
  ...DAILY_DEMO_MODES,
  ...HIDDEN_DEMO_MODES,
  ...HIDDEN_DAILY_MODES,
];

export function findDemoMode(slug: string): DemoModeCard | undefined {
  return ALL_DEMO_MODES.find((mode) => mode.slug === slug);
}

export function demoText(text: DemoI18nText, locale: Locale): string {
  return text[locale] ?? text.en;
}
