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

// Shota Arveladze — Georgia's record-era striker: Dinamo Tbilisi, Trabzonspor,
// Ajax, Rangers, AZ. Placeholder imagery uses existing in-repo category art so
// the image rounds render without new asset uploads.
export const PROMO_QUESTIONS: PromoQuestion[] = [
  {
    kind: 'multipleChoice',
    points: 100,
    question: {
      id: 'promo-q1',
      prompt: 'Which Dutch club did Shota Arveladze join in 1997?',
      options: ['Ajax', 'PSV Eindhoven', 'Feyenoord', 'AZ Alkmaar'],
      correctIndex: 0,
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
      options: ['26 goals', '18 goals', '31 goals', '22 goals'],
      correctIndex: 0,
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
      options: ['Trabzonspor', 'Galatasaray', 'Beşiktaş', 'Fenerbahçe'],
      correctIndex: 0,
      categoryName: 'Shota Arveladze',
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    question: {
      id: 'promo-q4',
      prompt: 'Arveladze scored in the Champions League against this club. Which is it?',
      options: ['Bayern Munich', 'Real Madrid', 'AC Milan', 'FC Barcelona'],
      correctIndex: 0,
      categoryName: 'Shota Arveladze',
      image: {
        url: '/clubs/bayern-munich.webp',
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
      prompt: 'Name this Italian giant — a Champions League opponent during Arveladze’s Ajax years.',
      options: ['Juventus', 'Inter Milan', 'AC Milan', 'AS Roma'],
      correctIndex: 0,
      categoryName: 'Shota Arveladze',
      image: {
        url: '/clubs/juventus-fc.webp',
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
