import type { Locale } from "@/lib/i18n/messages";
import {
  DAILY_DEMO_MODES,
  FEATURED_DEMO_MODES,
  MINI_GAME_DEMO_MODES,
  type DemoModeCard,
} from "./demoModes";

export type DemoI18nText = { en: string; ka: string };

export function tt(text: DemoI18nText, locale: Locale): string {
  return text[locale] ?? text.en;
}

// ── Hero ─────────────────────────────────────────────────────────────────────
export const SHOWCASE_HERO = {
  eyebrow: { en: "Player engagement suite", ka: "მოთამაშეთა ჩართულობის პაკეტი" },
  title: {
    en: "Football games that keep players on your platform",
    ka: "საფეხბურთო თამაშები, რომლებიც მოთამაშეებს თქვენს პლატფორმაზე აჩერებს",
  },
  subtitle: {
    en: "A plug-in library of quiz, prediction and bet-style games for sportsbooks and sports portals. Lift retention, session time and market cross-sell — fully brandable, bilingual and ready to embed.",
    ka: "ქვიზების, პროგნოზებისა და ფსონის სტილის თამაშების მზა ბიბლიოთეკა ბუკმეიკერებისა და სპორტული პორტალებისთვის. გაზარდეთ შენარჩუნება, სესიის ხანგრძლივობა და მარკეტების ჯვარედინი გაყიდვები — სრულად ბრენდირებადი, მრავალენოვანი და ინტეგრაციისთვის მზა.",
  },
  ctaPrimary: { en: "Book a demo", ka: "დაჯავშნეთ დემო" },
  ctaSecondary: { en: "Explore the games", ka: "იხილეთ თამაშები" },
  chips: [
    { en: "30+ games", ka: "30+ თამაში" },
    { en: "White-label", ka: "თეთრი ლეიბლი" },
    { en: "Web & mobile", ka: "ვები და მობილური" },
    { en: "EN / KA ready", ka: "EN / KA მზა" },
    { en: "No app install", ka: "აპლიკაციის გარეშე" },
  ] as DemoI18nText[],
} satisfies Record<string, unknown>;

// Where the "Book a demo" CTAs point. Placeholder address — swap for the real
// partnerships inbox before this ships.
export const CONTACT_EMAIL = "hello@quizball.io";
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Quizball for operators — demo request",
)}`;

// ── Operator benefits ────────────────────────────────────────────────────────
export type BenefitIcon = "retention" | "crossSell" | "brandable" | "football";

export interface ShowcaseBenefit {
  icon: BenefitIcon;
  title: DemoI18nText;
  body: DemoI18nText;
}

export const SHOWCASE_BENEFITS: ShowcaseBenefit[] = [
  {
    icon: "retention",
    title: { en: "Retention & daily actives", ka: "შენარჩუნება და აქტიური მოთამაშეები" },
    body: {
      en: "Daily challenges and streaks give players a reason to open your app every single day.",
      ka: "ყოველდღიური გამოწვევები და სერიები მოთამაშეს ყოველდღე თქვენს აპში დაბრუნების მიზეზს აძლევს.",
    },
  },
  {
    icon: "crossSell",
    title: { en: "Market cross-sell", ka: "მარკეტების ჯვარედინი გაყიდვა" },
    body: {
      en: "Bet-native mechanics — accumulators, cash-out, live odds — bridge casual play into your betting markets.",
      ka: "ფსონის სტილის მექანიკები — ექსპრესები, cash-out, ლაივ კოეფიციენტები — აკავშირებს თამაშს თქვენს მარკეტებთან.",
    },
  },
  {
    icon: "brandable",
    title: { en: "Fully brandable", ka: "სრულად ბრენდირებადი" },
    body: {
      en: "Your colours, logo and language. Embed via iframe or SDK in days, not months.",
      ka: "თქვენი ფერები, ლოგო და ენა. ინტეგრაცია iframe-ით ან SDK-ით დღეებში, არა თვეებში.",
    },
  },
  {
    icon: "football",
    title: { en: "Built for football fans", ka: "შექმნილია ფეხბურთის ფანებისთვის" },
    body: {
      en: "Deep, up-to-date football content that rewards genuine knowledge and keeps fans hooked.",
      ka: "ღრმა, განახლებადი საფეხბურთო კონტენტი, რომელიც ნამდვილ ცოდნას აჯილდოებს.",
    },
  },
];

// ── Game sections ────────────────────────────────────────────────────────────
export interface ShowcaseSection {
  id: "flagship" | "mini" | "daily";
  accent: string; // hex, used for accents/badges
  eyebrow: DemoI18nText;
  title: DemoI18nText;
  blurb: DemoI18nText;
  modes: DemoModeCard[];
}

export const SHOWCASE_SECTIONS: ShowcaseSection[] = [
  {
    id: "flagship",
    accent: "#FFD700",
    eyebrow: { en: "Tent-pole events", ka: "მთავარი მოვლენები" },
    title: { en: "Flagship experiences", ka: "მთავარი რეჟიმები" },
    blurb: {
      en: "Big multiplayer moments that create appointment viewing and spike concurrent traffic on match days.",
      ka: "მასშტაბური მულტიპლეიერ მოვლენები, რომლებიც ქმნის თავშეყრის მომენტს და ზრდის აქტივობას მატჩების დღეებში.",
    },
    modes: FEATURED_DEMO_MODES,
  },
  {
    id: "mini",
    accent: "#1CB0F6",
    eyebrow: { en: "Quick & monetizable", ka: "სწრაფი და მონეტიზებადი" },
    title: { en: "Bet-native mini-games", ka: "ფსონის სტილის მინი-თამაშები" },
    blurb: {
      en: "Fast, replayable games built on mechanics your users already know — a natural, low-friction bridge to your markets.",
      ka: "სწრაფი, გამეორებადი თამაშები ნაცნობ მექანიკებზე — ბუნებრივი ხიდი თქვენს მარკეტებამდე.",
    },
    modes: MINI_GAME_DEMO_MODES,
  },
  {
    id: "daily",
    accent: "#FF9600",
    eyebrow: { en: "Habit loop", ka: "ჩვევის ციკლი" },
    title: { en: "Daily challenges", ka: "ყოველდღიური გამოწვევები" },
    blurb: {
      en: "A fresh challenge every day — the retention loop behind daily active users, streaks and push re-engagement.",
      ka: "ახალი გამოწვევა ყოველდღე — ციკლი, რომელიც ზრდის აქტიურ მოთამაშეებს, სერიებსა და დაბრუნებას.",
    },
    modes: DAILY_DEMO_MODES,
  },
];

// ── Per-card operator metadata (tags shown on each card) ──────────────────────
export interface CardMeta {
  duration: DemoI18nText;
  format: DemoI18nText;
  /** Betting mechanic a game mirrors — shown only where it's a clear hook. */
  mechanic?: DemoI18nText;
}

const DURATION_SHORT: DemoI18nText = { en: "1–2 min", ka: "1–2 წთ" };

const FORMAT_SOLO: DemoI18nText = { en: "Solo · instant", ka: "სოლო · მყისიერი" };
const FORMAT_DAILY: DemoI18nText = { en: "Daily", ka: "ყოველდღიური" };

// Flagship formats/durations (bespoke — these are the big multiplayer modes).
const FLAGSHIP_META: Record<string, CardMeta> = {
  "weekend-league": {
    duration: { en: "~10 min", ka: "~10 წთ" },
    format: { en: "1,000-player live", ka: "1000 მოთამაშე ლაივში" },
  },
  auction: {
    duration: { en: "~5 min", ka: "~5 წთ" },
    format: { en: "Live multiplayer", ka: "ლაივ მულტიპლეიერი" },
  },
};

// Betting mechanic tags for the mini-games where the hook is unmistakable.
const MECHANIC_BY_SLUG: Record<string, DemoI18nText> = {
  "mini-accumulator": { en: "Accumulator", ka: "ექსპრესი" },
  "mini-cash-out-ladder": { en: "Cash-out", ka: "Cash-out" },
  "mini-odds-board": { en: "Odds market", ka: "კოეფიციენტები" },
  "mini-bet-slip-booster": { en: "Bet slip", ka: "ტალონი" },
  "mini-daily-jackpot": { en: "Jackpot", ka: "ჯექპოტი" },
  "mini-hi-lo-ride": { en: "Hi-Lo", ka: "Hi-Lo" },
  "mini-trivia-mines": { en: "Mines", ka: "Mines" },
  "mini-final-third": { en: "Cash-out", ka: "Cash-out" },
};

export function getCardMeta(mode: DemoModeCard): CardMeta {
  if (FLAGSHIP_META[mode.slug]) return FLAGSHIP_META[mode.slug];
  if (mode.group === "daily") {
    return { duration: DURATION_SHORT, format: FORMAT_DAILY };
  }
  return { duration: DURATION_SHORT, format: FORMAT_SOLO, mechanic: MECHANIC_BY_SLUG[mode.slug] };
}
