// FIFA / FC Universe — the collection of card-database prototypes on /demos.
// Hub copy is bilingual; in-game copy is English-only for now (prototypes).
import type { DemoModeCard } from '@/features/demos/demoModes';

type Text = { en: string; ka: string };

export interface FifaModeMeta extends DemoModeCard {
  duration: Text;
  format: Text;
  /** Player shown on the hub card art (name as in the dataset). */
  artPlayer: string;
  /** Edition of the art card. */
  artEdition: string;
}

const SOLO: Text = { en: 'Single-player', ka: 'სოლო' };
const RIVAL: Text = { en: '1v1 vs rival', ka: '1v1 მეტოქესთან' };
const SHORT: Text = { en: '1–2 min', ka: '1–2 წთ' };
const MEDIUM: Text = { en: '2–3 min', ka: '2–3 წთ' };
const LONG: Text = { en: '3–5 min', ka: '3–5 წთ' };
const ENDLESS: Text = { en: 'Endless', ka: 'უსასრულო' };

export const FIFA_MODES: FifaModeMeta[] = [
  {
    slug: 'fifa-higher-lower',
    title: { en: 'Higher or Lower', ka: 'მეტი თუ ნაკლები' },
    description: { en: 'Will the next season\'s rating be higher, the same or lower? One miss ends the run.', ka: 'შემდეგი სეზონის რეიტინგი მეტი, იგივე თუ ნაკლები იქნება? ერთი შეცდომა ამთავრებს სერიას.' },
    group: 'featured', duration: ENDLESS, format: SOLO, artPlayer: 'Lionel Messi', artEdition: 'FIFA18',
  },
  {
    slug: 'fifa-stat-battle',
    title: { en: 'Stat Battle', ka: 'სტატ-ბრძოლა' },
    description: { en: 'A hand of five cards, five categories — play the right card at the right time. Best of 5.', ka: 'ხუთი ბარათი, ხუთი კატეგორია — ითამაშე სწორი ბარათი სწორ დროს. საუკეთესო 5-დან.' },
    group: 'featured', duration: MEDIUM, format: RIVAL, artPlayer: 'Cristiano Ronaldo', artEdition: 'FIFA17',
  },
  {
    slug: 'fifa-card-detective',
    title: { en: 'Card Detective', ka: 'ბარათის დეტექტივი' },
    description: { en: 'Everything hidden, 100 clue coins — identify the card using the least information.', ka: 'ყველაფერი დამალულია, 100 მინიშნების ქოინი — ამოიცანი ბარათი მინიმალური ინფორმაციით.' },
    group: 'featured', duration: MEDIUM, format: SOLO, artPlayer: 'Mohamed Salah', artEdition: 'FIFA21',
  },
  {
    slug: 'fifa-evolution',
    title: { en: 'FIFA Evolution', ka: 'FIFA ევოლუცია' },
    description: { en: 'A career slides in card by card with its OVR curve, faces hidden — recognise the shape and buzz.', ka: 'კარიერა ბარათ-ბარათ იშლება OVR-ის მრუდით, სახეები დამალულია — ამოიცანი ფორმა და დააჭირე ზარს.' },
    group: 'featured', duration: MEDIUM, format: SOLO, artPlayer: 'Kevin De Bruyne', artEdition: 'FIFA20',
  },
  {
    slug: 'fifa-card-order',
    title: { en: 'Cards in Order', ka: 'ბარათები რიგზე' },
    description: { en: 'Four cards from one career — tap them into chronological, rating or pace order.', ka: 'ოთხი ბარათი ერთი კარიერიდან — დაალაგე ქრონოლოგიურად, რეიტინგით ან სისწრაფით.' },
    group: 'featured', duration: SHORT, format: SOLO, artPlayer: 'Gareth Bale', artEdition: 'FIFA17',
  },
  {
    slug: 'fifa-fake-stat',
    title: { en: 'One Stat Is Fake', ka: 'ერთი სტატი ყალბია' },
    description: { en: 'A fully revealed card with one doctored attribute — ±10, then ±5, then ±2.', ka: 'სრულად გახსნილი ბარათი ერთი შეცვლილი ატრიბუტით — ±10, შემდეგ ±5, შემდეგ ±2.' },
    group: 'featured', duration: SHORT, format: SOLO, artPlayer: 'Neymar Jr', artEdition: 'FIFA18',
  },
  {
    slug: 'fifa-guess-year',
    title: { en: 'Guess the FIFA Year', ka: 'გამოიცანი FIFA-ს წელი' },
    description: { en: 'Pure nostalgia — club, rating and stats shown, edition hidden. Which FIFA?', ka: 'წმინდა ნოსტალგია — კლუბი, რეიტინგი და სტატები ჩანს, გამოშვება დამალულია. რომელი FIFA?' },
    group: 'featured', duration: SHORT, format: SOLO, artPlayer: 'Eden Hazard', artEdition: 'FIFA15',
  },
  {
    slug: 'fifa-wonderkid',
    title: { en: 'Wonderkid', ka: 'ვუნდერკინდი' },
    description: { en: 'A modest early card and the rating it grew into — Career Mode nostalgia.', ka: 'მოკრძალებული ადრეული ბარათი და რეიტინგი, რომლამდეც გაიზარდა — Career Mode ნოსტალგია.' },
    group: 'featured', duration: SHORT, format: SOLO, artPlayer: 'Kylian Mbappé', artEdition: 'FIFA18',
  },
  {
    slug: 'fifa-whos-missing',
    title: { en: "Who's Missing?", ka: 'ვინ აკლია?' },
    description: { en: 'A club\'s strongest seven from one FIFA, two of them blanked — name them in 30s.', ka: 'კლუბის საუკეთესო შვიდეული ერთი FIFA-დან, ორი დამალულია — დაასახელე 30 წამში.' },
    group: 'featured', duration: SHORT, format: SOLO, artPlayer: 'Sergio Ramos', artEdition: 'FIFA16',
  },
  {
    slug: 'fifa-best-xi',
    title: { en: 'Build the Best XI', ka: 'ააწყვე საუკეთესო XI' },
    description: { en: 'Three choices per position and a 100-coin budget — stars cost more. Beat the rival\'s XI.', ka: 'სამი არჩევანი პოზიციაზე და 100 ქოინის ბიუჯეტი — ვარსკვლავები ძვირია. აჯობე მეტოქის XI-ს.' },
    group: 'featured', duration: MEDIUM, format: RIVAL, artPlayer: 'Robert Lewandowski', artEdition: 'FIFA20',
  },
  {
    slug: 'fifa-draft-battle',
    title: { en: 'Draft Battle', ka: 'დრაფტ-ბრძოლა' },
    description: { en: 'Answer fast for premium picks, draft an XI, then out-think the rival with tactics.', ka: 'უპასუხე სწრაფად პრემიუმ არჩევანისთვის, ააწყვე XI და აჯობე მეტოქეს ტაქტიკით.' },
    group: 'featured', duration: LONG, format: RIVAL, artPlayer: 'Erling Haaland', artEdition: 'FC24',
  },
  {
    slug: 'fifa-survival',
    title: { en: 'FIFA Survival', ka: 'FIFA სურვაივალი' },
    description: { en: 'Three lives, every round type, rising difficulty — the daily retention meta-mode.', ka: 'სამი სიცოცხლე, ყველა რაუნდის ტიპი, მზარდი სირთულე — ყოველდღიური მეტა-რეჟიმი.' },
    group: 'featured', duration: ENDLESS, format: SOLO, artPlayer: 'Virgil van Dijk', artEdition: 'FIFA20',
  },
  {
    slug: 'fifa-gauntlet',
    title: { en: 'FIFA Gauntlet', ka: 'FIFA განტლეტი' },
    description: { en: 'Mario Party × FIFA knowledge — seven random mini-games against a rival.', ka: 'Mario Party × FIFA ცოდნა — შვიდი შემთხვევითი მინი-თამაში მეტოქის წინააღმდეგ.' },
    group: 'featured', duration: LONG, format: RIVAL, artPlayer: 'Zlatan Ibrahimović', artEdition: 'FIFA15',
  },
];

export const FIFA_MODE_BY_SLUG = new Map(FIFA_MODES.map((m) => [m.slug, m]));
export const isFifaSlug = (slug: string) => slug.startsWith('fifa-');
