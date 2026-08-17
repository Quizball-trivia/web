import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type {
  FootballLogicSession,
  ImposterSession,
  TrueFalseSession,
} from '@/lib/domain/dailyChallenge';
import type {
  ResolvedCluesQuestion,
  ResolvedPutInOrderQuestion,
} from '@/lib/realtime/socket.types';
import type { ChainPlayer, ChainPuzzle } from './promoPassChain.data';
import { PROMO_CHAIN_PLAYERS, PROMO_CHAIN_PUZZLES } from './promoPassChain.data';

// Shota Arveladze promo quiz — Georgian editorial content supplied by the
// owner for the video shoot. Photos are vendored under public/promo/ so
// nothing depends on external hosts during filming.

export type PromoRound =
  | { kind: 'multipleChoice'; points: number; units: 1; question: GameQuestion }
  | { kind: 'putInOrder'; points: number; units: 1; question: ResolvedPutInOrderQuestion }
  | { kind: 'clues'; points: number; units: 1; question: ResolvedCluesQuestion }
  | { kind: 'trueFalse'; units: number; session: TrueFalseSession }
  | { kind: 'imposter'; units: number; session: ImposterSession }
  | { kind: 'footballLogic'; units: number; session: FootballLogicSession }
  | { kind: 'passChain'; units: number; players: ChainPlayer[]; puzzles: ChainPuzzle[] };

// Generous per-question clock for the embedded daily-challenge games: they
// auto-submit at zero, and a mid-take auto-fail would ruin the shot.
const EMBEDDED_SECONDS = 99;

const TRUE_FALSE_SESSION: TrueFalseSession = {
  challengeType: 'trueFalse',
  title: 'მართალია თუ ტყუილია?',
  description: 'შოთა არველაძის კარიერის ფაქტები',
  questionCount: 2,
  secondsPerQuestion: EMBEDDED_SECONDS,
  questions: [
    {
      id: 'promo-tf-1',
      category: 'შოთა არველაძე',
      difficulty: 'medium',
      prompt: 'შოთა არველაძემ უეფას თასზე „აიაქსის“ მაისურით ჰეთ-ტრიკი „მარიბორს“ გაუტანა.',
      trueLabel: 'მართალია',
      falseLabel: 'ტყუილია',
      correctAnswer: true,
    },
    {
      id: 'promo-tf-2',
      category: 'შოთა არველაძე',
      difficulty: 'easy',
      prompt: 'შოთა არველაძემ თავისი პირველი სანაკრებო გოლი უელსს გაუტანა.',
      trueLabel: 'მართალია',
      falseLabel: 'ტყუილია',
      correctAnswer: false,
    },
  ],
};

const IMPOSTER_SESSION: ImposterSession = {
  challengeType: 'imposter',
  title: 'იპოვე თვითმარქვია',
  description: 'რომელ კლუბებში არასდროს უთამაშია შოთა არველაძეს?',
  questionCount: 1,
  secondsPerQuestion: EMBEDDED_SECONDS,
  questions: [
    {
      id: 'promo-imp-1',
      category: 'შოთა არველაძე',
      difficulty: 'medium',
      prompt: 'მონიშნე ორი კლუბი, რომლებშიც შოთა არველაძეს არასდროს უთამაშია',
      options: [
        { id: 'dinamo', text: 'დინამო თბილისი' },
        { id: 'galatasaray', text: 'გალათასარაი' },
        { id: 'trabzon', text: 'ტრაბზონსპორი' },
        { id: 'ajax', text: 'აიაქსი' },
        { id: 'feyenoord', text: 'ფეიენოორდი' },
        { id: 'rangers', text: 'რეინჯერსი' },
      ],
      correctOptionIds: ['galatasaray', 'feyenoord'],
    },
  ],
};

const FOOTBALL_LOGIC_SESSION: FootballLogicSession = {
  challengeType: 'footballLogic',
  title: 'საფეხბურთო ლოგიკა',
  description: 'გამოიცანი ფეხბურთელი ორი კლუბით',
  questionCount: 1,
  secondsPerQuestion: EMBEDDED_SECONDS,
  questions: [
    {
      id: 'promo-fl-1',
      category: 'შოთა არველაძე',
      difficulty: 'medium',
      prompt: 'ამ ორ კლუბში თამაშობდა შოთას თანაგუნდელი „აიაქსიდან“. ვინ არის?',
      imageAUrl: '/clubs/fc-barcelona.webp',
      imageBUrl: '/clubs/liverpool-fc.webp',
      displayAnswer: 'იარი ლიტმანენი',
      acceptedAnswers: ['იარი ლიტმანენი', 'ლიტმანენი', 'litmanen', 'jari litmanen'],
      explanation:
        '„აიაქსის“ ლეგენდარული მე-10 ნომერი 1990-იანების ბოლოს შოთა არველაძესთან ერთად თამაშობდა, 2000-იანების დასაწყისში კი — „ბარსელონასა“ და „ლივერპულში“.',
    },
  ],
};

export const PROMO_ROUNDS: PromoRound[] = [
  {
    kind: 'multipleChoice',
    points: 100,
    units: 1,
    question: {
      id: 'promo-q1',
      prompt: 'რა მეტსახელი ჰქონდა შოთა არველაძეს „რეინჯერსში“ თამაშის დროს?',
      options: ['სუპერ შოთა', 'მისტერ ბინი', 'ქართველი ტანკი', 'ჯადოქარი'],
      correctIndex: 1,
      categoryName: 'შოთა არველაძე',
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    units: 1,
    question: {
      id: 'promo-q2',
      prompt: 'რისი წაღება დაავიწყდა შოთა არველაძეს „აიაქსის“ პირველი ვარჯიშის დროს?',
      options: ['ფორმის', 'წინდების', 'სპორტული ჩანთის', 'ბუცების'],
      correctIndex: 3,
      categoryName: 'შოთა არველაძე',
    },
  },
  { kind: 'trueFalse', units: 2, session: TRUE_FALSE_SESSION },
  {
    kind: 'multipleChoice',
    points: 100,
    units: 1,
    question: {
      id: 'promo-q4',
      prompt: 'ჩემპიონთა ლიგის რომელი გუნდის წინააღმდეგ არის გადაღებული ეს სურათი 2003 წელს?',
      options: ['შტუტგარტი', 'კოპენჰაგენი', 'მანჩესტერ იუნაიტედი', 'პანათინაიკოსი'],
      correctIndex: 0,
      categoryName: 'შოთა არველაძე',
      image: {
        url: '/promo/shota-cl-2003.jpg',
        width: 399,
        height: 501,
      },
    },
  },
  {
    kind: 'putInOrder',
    points: 100,
    units: 1,
    question: {
      kind: 'putInOrder',
      id: 'promo-q6',
      prompt: 'შოთა არველაძის კარიერის მნიშვნელოვანი მოვლენები',
      instruction: 'დაალაგეთ ეს მოვლენები ქრონოლოგიურად (ყველაზე ადრინდელიდან უახლესისკენ)',
      direction: 'asc',
      // Displayed scrambled; the chronological answer is
      // PROMO_PUT_IN_ORDER_CORRECT_IDS below.
      items: [
        { id: 'scot-title', label: 'მოიგო შოტლანდიის პრემიერლიგის პირველი ტიტული' },
        { id: 'retire', label: 'დაასრულა პროფესიონალური საფეხბურთო კარიერა' },
        { id: 'debut', label: 'შედგა მისი დებიუტი საქართველოს ეროვნულ ნაკრებში' },
        { id: 'top-scorer', label: 'გახდა თურქეთის სუპერლიგის საუკეთესო ბომბარდირი' },
      ],
      categoryName: 'შოთა არველაძე',
    },
  },
  { kind: 'passChain', units: 2, players: PROMO_CHAIN_PLAYERS, puzzles: PROMO_CHAIN_PUZZLES },
  {
    kind: 'multipleChoice',
    points: 100,
    units: 1,
    question: {
      id: 'promo-q5',
      prompt: 'რომელ წელს არის გადაღებული ეს სურათი?',
      options: ['1998', '1999', '1997', '2000'],
      correctIndex: 2,
      categoryName: 'შოთა არველაძე',
      image: {
        url: '/promo/shota-archil-nac.jpg',
        width: 676,
        height: 471,
      },
    },
  },
  { kind: 'footballLogic', units: 1, session: FOOTBALL_LOGIC_SESSION },
  { kind: 'imposter', units: 1, session: IMPOSTER_SESSION },
  {
    kind: 'clues',
    points: 100,
    units: 1,
    question: {
      kind: 'clues',
      id: 'promo-q7',
      prompt: 'ვინ ვარ მე?',
      clues: [
        { type: 'text', content: 'ვარ საქართველოს ნაკრების ყოფილი თავდამსხმელი, დავიბადე თბილისში 1973 წლის 22 თებერვალს.' },
        { type: 'text', content: 'კარიერის ნაწილი თურქეთში, ნიდერლანდებსა და გერმანიაში მაქვს გატარებული.' },
        { type: 'text', content: 'ვთამაშობდი „ნაკ ბრედაში“ და ერედივიზიონში ჩემი ძმის წინააღმდეგ ვითამაშე.' },
        { type: 'text', content: 'საქართველოს სამგზის ჩემპიონი ვარ.' },
        { type: 'text', content: 'შოთა არველაძის ტყუპისცალი ვარ.' },
      ],
      categoryName: 'შოთა არველაძე',
    },
  },
];

export const PROMO_TOTAL_ROUNDS = PROMO_ROUNDS.length;

/** Total answerable units across all rounds — the accuracy denominator. */
export const PROMO_TOTAL_UNITS = PROMO_ROUNDS.reduce((sum, round) => sum + round.units, 0);

// The correct final order for the put-in-order round: national-team debut
// (1992) → Turkish Süper Lig top scorer (1995/96) → first Scottish title
// (2002) → retirement (2008).
export const PROMO_PUT_IN_ORDER_CORRECT_IDS = ['debut', 'top-scorer', 'scot-title', 'retire'];

export const PROMO_CLUES_ANSWER = 'არჩილ არველაძე';

// Exact accepted guesses (lowercased): full name or first name, Georgian or
// Latin script. Deliberately NOT a substring match. Bare "არველაძე"/"arveladze"
// is NOT accepted — the surname alone doesn't distinguish Archil from Shota.
export const PROMO_CLUES_ACCEPTED = [
  'არჩილ არველაძე',
  'არჩილი',
  'არჩილ',
  'archil arveladze',
  'archil',
];
