import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type {
  ResolvedCluesQuestion,
  ResolvedPutInOrderQuestion,
} from '@/lib/realtime/socket.types';

export const PROMO_TOTAL_QUESTIONS = 7;

export type PromoQuestion =
  | { kind: 'multipleChoice'; points: number; question: GameQuestion }
  | { kind: 'putInOrder'; points: number; question: ResolvedPutInOrderQuestion }
  | { kind: 'clues'; points: number; question: ResolvedCluesQuestion };

// Shota Arveladze promo quiz — Georgian editorial content supplied by the
// owner for the 2026-08-18 video shoot. Photos are vendored under
// public/promo/ so nothing depends on external hosts during filming.
export const PROMO_QUESTIONS: PromoQuestion[] = [
  {
    kind: 'multipleChoice',
    points: 100,
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
    question: {
      id: 'promo-q2',
      prompt: 'რისი წაღება დაავიწყდა შოთა არველაძეს „აიაქსის“ პირველი ვარჯიშის დროს?',
      options: ['ფორმის', 'წინდების', 'სპორტული ჩანთის', 'ბუცების'],
      correctIndex: 3,
      categoryName: 'შოთა არველაძე',
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    question: {
      id: 'promo-q3',
      prompt: 'ვის წინააღმდეგ ჩაატარა შოთა არველაძემ საკლუბო კარიერის ბოლო თამაში?',
      options: ['ბარსელონა', 'ვალენსია', 'რეალ მადრიდი', 'ატლეტიკო მადრიდი'],
      correctIndex: 2,
      categoryName: 'შოთა არველაძე',
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
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
    kind: 'multipleChoice',
    points: 100,
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
  {
    kind: 'putInOrder',
    points: 100,
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
  {
    kind: 'clues',
    points: 100,
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
