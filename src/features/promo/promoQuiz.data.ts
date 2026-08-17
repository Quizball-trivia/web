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

// Shota Arveladze — Georgia's record scorer: Dinamo Tbilisi, Trabzonspor,
// Ajax, Rangers, AZ. Image rounds use local club crests (public/clubs/) so
// nothing depends on the network during filming. Facts checked against his
// actual career: Ajax 1997–2001, Rangers 2001–05, and Rangers' 2003/04
// Champions League group (Manchester United, VfB Stuttgart, Panathinaikos).
export const PROMO_QUESTIONS: PromoQuestion[] = [
  {
    kind: 'multipleChoice',
    points: 100,
    question: {
      id: 'promo-q1',
      prompt: 'Which Dutch club did Shota Arveladze join in 1997?',
      options: ['PSV Eindhoven', 'Feyenoord', 'Ajax', 'AZ Alkmaar'],
      correctIndex: 2,
      categoryName: 'Shota Arveladze',
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    question: {
      id: 'promo-q2',
      prompt:
        'Arveladze is Georgia’s all-time leading scorer. How many goals did he score for the national team?',
      options: ['18 goals', '26 goals', '31 goals', '22 goals'],
      correctIndex: 1,
      categoryName: 'Shota Arveladze',
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    question: {
      id: 'promo-q3',
      prompt:
        'At which Turkish club did Shota Arveladze become a fan favourite before moving to the Netherlands?',
      options: ['Galatasaray', 'Beşiktaş', 'Fenerbahçe', 'Trabzonspor'],
      correctIndex: 3,
      categoryName: 'Shota Arveladze',
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    question: {
      id: 'promo-q4',
      prompt:
        'Arveladze’s Rangers faced this English club in the 2003/04 Champions League group stage. Who is it?',
      options: ['Liverpool', 'Manchester United', 'Arsenal', 'Chelsea'],
      correctIndex: 1,
      categoryName: 'Shota Arveladze',
      image: {
        url: '/clubs/manchester-united.webp',
        width: 512,
        height: 512,
      },
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    question: {
      id: 'promo-q5',
      prompt: 'Rangers also met this German side in that 2003/04 Champions League group. Name the club.',
      options: ['Bayern Munich', 'Borussia Dortmund', 'VfB Stuttgart', 'Bayer Leverkusen'],
      correctIndex: 2,
      categoryName: 'Shota Arveladze',
      image: {
        url: '/clubs/vfb-stuttgart.webp',
        width: 512,
        height: 512,
      },
    },
  },
  {
    kind: 'putInOrder',
    points: 100,
    question: {
      kind: 'putInOrder',
      id: 'promo-q6',
      prompt: 'Shota Arveladze’s career',
      instruction: 'Put these clubs in the order he played for them',
      direction: 'asc',
      // Deliberately scrambled so there is real dragging to film; the correct
      // chronological order is PROMO_PUT_IN_ORDER_CORRECT_IDS below.
      items: [
        { id: 'ajax', label: 'Ajax', details: '1997–2001' },
        { id: 'rangers', label: 'Rangers', details: '2001–2005' },
        { id: 'dinamo', label: 'Dinamo Tbilisi', details: '1991–1993' },
        { id: 'trabzon', label: 'Trabzonspor', details: '1995–1997' },
      ],
      categoryName: 'Shota Arveladze',
    },
  },
  {
    kind: 'clues',
    points: 100,
    question: {
      kind: 'clues',
      id: 'promo-q7',
      prompt: 'Who am I?',
      clues: [
        { type: 'text', content: 'I was born in Tbilisi in 1973.' },
        { type: 'text', content: 'I have an identical twin who also played professionally.' },
        { type: 'text', content: 'I won the Eredivisie and scored in the Champions League for Ajax.' },
        { type: 'text', content: 'At Rangers I scored over 40 goals in Scottish football.' },
        { type: 'text', content: 'I am my country’s all-time top scorer.' },
      ],
      categoryName: 'Shota Arveladze',
    },
  },
];

// The correct final order for the put-in-order round, in chronological order.
export const PROMO_PUT_IN_ORDER_CORRECT_IDS = ['dinamo', 'trabzon', 'ajax', 'rangers'];

export const PROMO_CLUES_ANSWER = 'Shota Arveladze';

// Exact accepted guesses (lowercased): full name, surname, or first name, in
// Latin or Georgian script. Deliberately NOT a substring match — a stray
// letter must never count as correct on camera.
export const PROMO_CLUES_ACCEPTED = [
  'shota arveladze',
  'arveladze',
  'shota',
  'შოთა არველაძე',
  'არველაძე',
  'შოთა',
];
