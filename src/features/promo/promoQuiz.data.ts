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
const EMBEDDED_SECONDS = 999;

function trueFalseSession(question: TrueFalseSession['questions'][number]): TrueFalseSession {
  return {
    challengeType: 'trueFalse',
    title: 'მართალია თუ ტყუილია?',
    description: 'შოთა არველაძის კარიერის ფაქტები',
    questionCount: 1,
    secondsPerQuestion: EMBEDDED_SECONDS,
    questions: [question],
  };
}

const TRUE_FALSE_SESSION_1 = trueFalseSession({
  id: 'promo-tf-1',
  category: 'შოთა არველაძე',
  difficulty: 'medium',
  prompt: '2005 წელს შოთა არველაძის სატრანსფერო ღირებულება უფრო მეტი იყო, ვიდრე ლეონელ მესის.',
  trueLabel: 'მართალია',
  falseLabel: 'ტყუილია',
  correctAnswer: true,
});

const TRUE_FALSE_SESSION_2 = trueFalseSession({
  id: 'promo-tf-2',
  category: 'შოთა არველაძე',
  difficulty: 'medium',
  prompt: 'შოთა არველაძეს ეროვნული ნაკრების მაისურით ყველაზე მეტი გოლი სომხეთის წინააღმდეგ აქვს გატანილი.',
  trueLabel: 'მართალია',
  falseLabel: 'ტყუილია',
  correctAnswer: false,
});

const IMPOSTER_SESSION: ImposterSession = {
  challengeType: 'imposter',
  title: 'იპოვე თვითმარქვია',
  description: 'ჰეტრიკები საკლუბო კარიერაში',
  questionCount: 1,
  secondsPerQuestion: EMBEDDED_SECONDS,
  questions: [
    {
      id: 'promo-imp-1',
      category: 'შოთა არველაძე',
      difficulty: 'hard',
      prompt:
        'ამ გუნდებიდან ექვსს შოთა არველაძემ საკლუბო კარიერაში ჰეტრიკი გაუტანა — მონიშნე 4 „თვითმარქვია“, რომლებსაც არ გაუტანია',
      options: [
        { id: 'feyenoord', text: 'ფეიენოორდი' },
        { id: 'heerenveen', text: 'ჰერენვენი' },
        { id: 'vitesse', text: 'ვიტესი' },
        { id: 'groningen', text: 'გრონინგენი' },
        { id: 'roosendaal', text: 'როზენდალი' },
        { id: 'forfar', text: 'ფორფარ ატლეტიკი' },
        { id: 'karsiyaka', text: 'ქარშიაქა' },
        { id: 'roda', text: 'როდა' },
        { id: 'istanbulspor', text: 'ისტანბულსპორი' },
        { id: 'alkmaar', text: 'ალკმაარი' },
      ],
      // Hat-tricks (per the owner's editors, 6-4 split): Feyenoord,
      // Heerenveen, Groningen, Roosendaal, Roda, İstanbulspor. The imposters
      // are the other four.
      correctOptionIds: ['vitesse', 'forfar', 'karsiyaka', 'alkmaar'],
    },
  ],
};

const FOOTBALL_LOGIC_SESSION: FootballLogicSession = {
  challengeType: 'footballLogic',
  title: 'საფეხბურთო ლოგიკა',
  description: 'გამოიცანი ფეხბურთელი',
  questionCount: 1,
  secondsPerQuestion: EMBEDDED_SECONDS,
  questions: [
    {
      id: 'promo-fl-1',
      category: 'შოთა არველაძე',
      difficulty: 'medium',
      prompt: '2003 წელს „აიაქსიდან“ „რომაში“ გადავიდა. ვინ არის?',
      imageAUrl: '/promo/ajax-crest.png',
      imageBUrl: '/clubs/as-roma.webp',
      displayAnswer: 'კრისტიან კივუ',
      acceptedAnswers: ['კრისტიან კივუ', 'კივუ', 'chivu', 'cristian chivu', 'kivu'],
      explanation:
        'კრისტიან კივუ „აიაქსის“ კაპიტანი იყო შოთა არველაძის თანაგუნდელობის პერიოდში და 2003 წელს „რომაში“ გადავიდა.',
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
      prompt:
        '95/96 სეზონში „ტრაბზონსპორმა“ „ბეშიქთაშთან“ 3-1 მოიგო და აჩიმ ორი გოლი გაიტანა. რა ქენი შენ ამ თამაშში?',
      options: ['გოლი და ასისტი', 'ასისტი და ბარათი', 'გოლი და ბარათი', 'არ გითამაშია'],
      correctIndex: 1,
      categoryName: 'შოთა არველაძე',
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    units: 1,
    question: {
      id: 'promo-q3',
      prompt:
        '„აიაქსში“ პირველივე სეზონში 25 გოლი გაიტანე. რომელ გუნდთან შეასრულე შენი პირველი ჰეტრიკი?',
      options: ['ვილემი', 'ჰერენვენი', 'მაასტრიხტი', 'გრონინგენი'],
      correctIndex: 2,
      categoryName: 'შოთა არველაძე',
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    units: 1,
    question: {
      id: 'promo-q4',
      prompt: 'რომელმა თანაგუნდელმა გაიტანა ამ მატჩში ჰეტრიკი?',
      options: ['ლიტმანენი', 'ტიჯანი ბაბანგიდა', 'ლაუდრუპი', 'რონალდ დე ბური'],
      correctIndex: 3,
      categoryName: 'შოთა არველაძე',
      image: {
        url: '/promo/shota-hattrick-match.jpg',
        width: 885,
        height: 510,
      },
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    units: 1,
    question: {
      id: 'promo-q5',
      prompt: 'რომელ წელს არის გადაღებული ეს სურათი?',
      options: ['1995', '1996', '1997', '1998'],
      correctIndex: 1,
      categoryName: 'შოთა არველაძე',
      image: {
        url: '/promo/shota-1996.jpg',
        width: 1232,
        height: 1699,
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
      prompt: 'შოთა არველაძის კარიერის სტატისტიკა',
      instruction: 'დაალაგეთ ეს მაჩვენებლები რაოდენობის მიხედვით, მაღლიდან დაბლისკენ',
      direction: 'desc',
      // Displayed scrambled; the correct order is
      // PROMO_PUT_IN_ORDER_CORRECT_IDS below.
      items: [
        { id: 'nt-goals', label: 'ეროვნული ნაკრების გოლები' },
        { id: 'cards', label: 'ყვითელი ბარათები საკლუბო კარიერაში' },
        { id: 'assists', label: 'ასისტები ერედივიზიაში' },
        { id: 'uefa-goals', label: 'გოლები უეფას თასზე (ევროპა ლიგაზე)' },
      ],
      categoryName: 'შოთა არველაძე',
    },
  },
  {
    kind: 'clues',
    points: 100,
    units: 1,
    question: {
      kind: 'clues',
      id: 'promo-q7',
      prompt: 'ვინ ვარ მე?',
      clues: [
        { type: 'text', content: 'ვარ ყოფილი ბელგიელი ნახევარმცველი, რომელიც გამოვირჩეოდი განსაკუთრებული დრიბლინგითა და ბურთის შენარჩუნების უნარით.' },
        { type: 'text', content: 'კარიერა თავდამსხმელის პოზიციაზე დავიწყე, სანამ ცენტრალურ ნახევარმცველად გადავკვალიფიცირდებოდი.' },
        { type: 'text', content: 'პრემიერლიგაში ვთამაშობდი „ფულჰემსა“ და „ტოტენჰემ ჰოტსპურში“.' },
        { type: 'text', content: 'ნიდერლანდების ერედივიზიონში შოთა არველაძესთან ერთად „ალკმაარის“ რიგებში ვთამაშობდი.' },
        { type: 'text', content: 'შოთა არველაძე ჩემი კაპიტანი იყო, როდესაც ლუი ვან გალის ხელმძღვანელობით „ალკმაარმა“ უეფას თასზე შორს მიაღწია.' },
      ],
      categoryName: 'შოთა არველაძე',
    },
  },
  { kind: 'trueFalse', units: 1, session: TRUE_FALSE_SESSION_1 },
  { kind: 'trueFalse', units: 1, session: TRUE_FALSE_SESSION_2 },
  { kind: 'passChain', units: 1, players: PROMO_CHAIN_PLAYERS, puzzles: [PROMO_CHAIN_PUZZLES[0]] },
  { kind: 'passChain', units: 1, players: PROMO_CHAIN_PLAYERS, puzzles: [PROMO_CHAIN_PUZZLES[1]] },
  { kind: 'footballLogic', units: 1, session: FOOTBALL_LOGIC_SESSION },
  { kind: 'imposter', units: 1, session: IMPOSTER_SESSION },
];

export const PROMO_TOTAL_ROUNDS = PROMO_ROUNDS.length;

/** Total answerable units across all rounds — the accuracy denominator. */
export const PROMO_TOTAL_UNITS = PROMO_ROUNDS.reduce((sum, round) => sum + round.units, 0);

// The correct put-in-order ranking, high to low: club-career yellow cards →
// UEFA Cup goals → national-team goals → Eredivisie assists.
export const PROMO_PUT_IN_ORDER_CORRECT_IDS = ['cards', 'uefa-goals', 'nt-goals', 'assists'];

export const PROMO_CLUES_ANSWER = 'მუსა დემბელე';

// Exact accepted guesses (lowercased): full name or surname, Georgian or
// Latin script. Deliberately NOT a substring match.
export const PROMO_CLUES_ACCEPTED = [
  'მუსა დემბელე',
  'დემბელე',
  'mousa dembele',
  'moussa dembele',
  'musa dembele',
  'dembele',
];
